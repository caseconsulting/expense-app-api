const Crud = require(process.env.AWS ? 'crudRoutes' : './crudRoutes');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;

const {
  getExpressJwt,
  getContractEmployees,
  getProjectEmployees,
  indexBy
} = require(process.env.AWS ? 'utils' : '../js/utils');
const checkJwt = getExpressJwt();

const DATABASES = {};
const INDEXES = {};

const logger = new Logger('accessGroups');
class AccessGroups extends Crud {
  constructor() {
    super();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this.databaseModify = new DatabaseModify('access-groups');
    // get employees that are 'members' of the groups that an employee is in
    this._router.get(
      '/employee/members/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getEmployeeGroupMembers.bind(this)
    );
    // get employees that are 'users' in groups that an employees is a 'member' of
    this._router.get(
      '/employee/groupUsers/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getEmployeeGroupUsers.bind(this)
    );
    // get employees that are 'users' in groups that an employee is a 'member' of, only including
    // ones that have the "show on profile" flag active
    this._router.get(
      '/employee/showOnProfile/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getEmployeeShowOnProfileUsers.bind(this)
    );

    this.tagsDynamo = new DatabaseModify('tags');
    this.contractsDynamo = new DatabaseModify('contracts');
    this.employeesDynamo = new DatabaseModify('employees');
    this.accessGroupsDynamo = new DatabaseModify('access-groups');
  }

  /**
   * Create an object. Returns the object created.
   *
   * @param body - data of object
   * @return Object - object created
   */
  async _create(data) {
    logger.log(2, '_create', `Preparing to create access group with id: ${data.id}`);
    return data;
  }

  /**
   * Updates an attribute of an object. Returns the object updated.
   *
   * @param body - data of object
   * @return Object - object updated
   */
  async _updateAttribute(req) {
    let data = req.body;
    logger.log(2, '_update', `Preparing to update access group with id: ${data.id}`);

    try {
      let oldGroup = await this.accessGroupsDynamo.getEntry(data.id);
      let newGroup = { ...oldGroup, ...data };
      return { objectUpdated: newGroup };
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for access group with id: ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  }

  /**
   * Returns an index of the given database, caching where possible
   */
  async getIndex(type, data, by = 'id') {
    logger.log(2, 'getIndex', 'running getIndex');
    if (!INDEXES[type]) INDEXES[type] = indexBy(data, by);
    return INDEXES[type];
  }

  /**
   * Returns a promise while also using the cached DBs if possible 
   */
  async cachedDBPromise(type) {
    logger.log(2, 'cachedDBPromise', `running cachedDBPromise on type ${type}`);
    // return cache
    if (DATABASES[type]) {
      logger.log(2, 'cachedDBPromise', 'Found cache! Using it.');
      return new Promise((resolve) => resolve(DATABASES[type]));
    }

    // otherwise return promise that updates the cache
    let dynamo;
    switch (type) {
      case 'tags':
        dynamo = this.tagsDynamo;
        break;
      case 'contracts':
        dynamo = this.contractsDynamo;
        break;
      case 'employees':
        dynamo = this.employeesDynamo;
        break;
      case 'accessGroups':
        dynamo = this.accessGroupsDynamo;
        break;
    }

    return new Promise(async (res, rej) => {
      try {
        logger.log(2, 'cachedDBPromise', 'Getting Dynamo entries');
        let data = await dynamo.getAllEntriesInDB();
        logger.log(2, 'cachedDBPromise', 'Setting the cache');
        DATABASES[type] = data;
        logger.log(2, 'cachedDBPromise', 'Returning the data');
        res(data);
      } catch (err) {
        rej(err);
      }
    });
  }

  /**
   * Gets all employees, tags, contracts, and access groups from DynamoDB.
   */
  async _getDynamoData(exclude = {}) {
    logger.log(2, '_getDynamoData', `Running _getDynamoData, excluding ${Object.keys(exclude).join(', ')}`);
    // build promises
    let promises = [];
    promises.push(exclude.tags ? '' : this.cachedDBPromise('tags'));
    promises.push(exclude.contracts ? '' : this.cachedDBPromise('contracts'));
    promises.push(exclude.employees ? '' : this.cachedDBPromise('employees'));
    promises.push(exclude.accessGroups ? '' : this.cachedDBPromise('accessGroups'));
    // execute all and return
    logger.log(2, '_getDynamoData', 'Getting all promises at once');
    let [employees, tags, contracts, accessGroups] = await Promise.all(promises);
    logger.log(2, '_getDynamoData', 'Returning promise data');
    return { employees, tags, contracts, accessGroups };
  }

  /**
   * Converts any type of database ID into an array of employee IDs.
   */
  async _extractEmployees(type, id, databases) {
    logger.log(2, '_extractEmployees', 'Running _extractEmployees');
    logger.log(2, '_extractEmployees', `type: ${type}, id: ${id}, databases: ${Object.keys(databases).join(', ')}`);
    let employees = new Set();

    let fromEmployee = () => {
      logger.log(2, '_extractEmployees', 'Running fromEmployees');
      employees.add(id);
    };
    let fromTag = () => {
      logger.log(2, '_extractEmployees', 'Running fromTag');
      for (let tag of databases.tags) {
        if (tag.id !== id) continue;
        employees.add(...(tag.employees || []));
      }
    };
    let fromContract = () => {
      logger.log(2, '_extractEmployees', 'Running fromContract');
      let emps = getContractEmployees({ id }, databases.employees).map(e => e.id);
      employees.add(...emps);
    };
    let fromProject = () => {
      logger.log(2, '_extractEmployees', 'Running fromProject');
      let emps = getProjectEmployees({ id }, databases.employees).map(e => e.id);
      employees.add(...emps);
    };

    switch (type) {
      case 'employees':
        fromEmployee();
        break;
      case 'tags':
        fromTag();
        break;
      case 'contracts':
        fromContract();
        break;
      case 'projects':
        fromProject();
        break;
    }

    logger.log(2, '_extractEmployees', `Returning Set results as array: ${Array.from(employees).join(', ')}`);
    return Array.from(employees);
  }

  /**
   * Helper to get all types (employee, tag, contract, project) from diverged member or user objects
   */
  async extractAll(obj, databases) {
    logger.log(2, 'extractAll', `Running extractAll with obj ${JSON.stringify(obj)}`);
    let employeeIds = new Set();
    databases ??= await this._getDynamoData();
    let types = ['employees', 'tags', 'contracts', 'projects'];
    for (let type of types) {
      logger.log(2, 'extractAll', `Running for type ${type} (obj[${type}].length = ${obj[type].length})`);
      for (let id of (obj[type] || [])) {
        logger.log(2, 'extractAll', `Running for id ${id} of type ${type}`);
        let extracted = await this._extractEmployees(type, id, databases);
        logger.log(2, 'extractAll', `Found ${extracted.length}: ${extracted.join(', ')}`);
        employeeIds.add(...extracted);
      }
    }
    logger.log(2, 'extractAll', 'Finished going through types. Returning:');
    logger.log(2, 'extractAll', Array.from(employeeIds).join(', '));
    return Array.from(employeeIds);
  }

  /**
   * Helper to get groups that an employee is on.
   */
  async fetchGroups(userId, type) {
    logger.log(2, 'fetchGroups', 'Running fetchGroups');
    let databases = await this._getDynamoData();
    let groups = [];
    for (let group of databases.accessGroups) {
      logger.log(2, 'fetchGroups', `Running for group ${group.name}`);
      for (let assignment of group.assignments) {
        logger.log(2, 'fetchGroups', `Extracting ${type} from ${assignment.name}`);
        logger.log(2, 'fetchGroups', `    employees: ${(assignment[type].employees || []).length}`);
        logger.log(2, 'fetchGroups', `    tags: ${(assignment[type].tags || []).length}`);
        logger.log(2, 'fetchGroups', `    contracts: ${(assignment[type].contracts || []).length}`);
        logger.log(2, 'fetchGroups', `    projects: ${(assignment[type].projects || []).length}`);
        let all = await this.extractAll(assignment[type]);
        if (all.includes(userId)) {
          logger.log(2, 'fetchGroups', 'Adding a group for user ID ' + userId);
          groups.push(group);
        } else {
          logger.log(2, 'fetchGroups', `::${JSON.stringify(all)}:: does not include ${userId}`);
        }
      }
    }
    return groups;
  }

  /**
   * Gets all members of all groups that an employee is on.
   * Eg. Gets employees that are on the project that this user is Manager for
   */
  async _getEmployeeGroupMembers(req, res) {
    try {
      const groups = await this.fetchGroups(req.params.id, 'users');
      let members = {};
      for (let group of groups) {
        for (let assignment of group.assignments) {
          let assigned = await this.extractAll(assignment.members);
          if (assigned?.length) {
            users[group.name] ??= [];
            users[group.name].push(...assigned);
          }
        }
      }
      res.status(200).send(members);
    } catch (err) {
      this._sendError(res, err);
    }
  }

  /**
   * Gets all users of all groups that an employee is on.
   * Eg. Gets a user's Project Manager and Team Lead
   */
  async _getEmployeeGroupUsers(req, res) {
    try {
      const groups = await this.fetchGroups(req.params.id, 'members');
      logger.log(2, '_getEmployeeGroupUsers', `id ${req.params.id} is member in ${groups.length} groups`);
      let users = {};
      for (let group of groups) {
        for (let assignment of group.assignments) {
          let assigned = await this.extractAll(assignment.users);
          if (assigned?.length) {
            users[group.name] ??= [];
            users[group.name].push(...assigned);
          }
        }
      }
      res.status(200).send(users);
    } catch (err) {
      this._sendError(res, err);
    }
  }

  /**
   * Gets all users of groups that an employee is on that also
   * have the "show on profile" flag turned on.
   */
  async _getEmployeeShowOnProfileUsers(req, res) {
    try {
      const groups = await this.fetchGroups(req.params.id, 'members');
      logger.log(2, '_getEmployeeShowOnProfileUsers', `id ${req.params.id} is member in ${groups.length} groups`);
      let users = {};
      for (let group of groups) {
        if (!group.flags?.showOnMemberProfile) continue;
        for (let assignment of group.assignments) {
          let assigned = await this.extractAll(assignment.users);
          if (assigned?.length) {
            users[group.name] ??= [];
            users[group.name].push(...assigned);
          }
        }
      }
      res.status(200).send(users);
    } catch (err) {
      this._sendError(res, err);
    }
  }

  _sendError(res, err) {
    let error = {
      code: err.status || 500,
      message: err.message || 'Unknown error in accessGroups.js'
    };
    // log method
    logger.log(3, '_sendError', `Sending ${error.code} error status: ${error.message}`);
    // return error status
    return res.status(error.code).send(error);
  } // _sendError
}

module.exports = AccessGroups;