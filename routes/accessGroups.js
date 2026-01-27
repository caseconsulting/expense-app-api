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
      let oldGroup = await this.databaseModify.getEntry(data.id);
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
   * Gets database data with caching
   */
  async getDatabase(type) {
    logger.log(2, 'getDatabase', `Running getDatabase for type ${type}`);

    // return cache if possible
    if (DATABASES[type]) {
      logger.log(2, 'getDatabase', 'Found database cache!');
      return DATABASES[type];
    }

    // get the dynamo type
    logger.log(2, 'getDatabase', 'Fetching from remote DB');
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
        dynamo = this.databaseModify;
        break;
    }

    // fetch, cache, return data
    logger.log(2, 'getDatabase', 'Setting cache and returning data');
    let data = await dynamo.getAllEntriesInDB();
    DATABASES[type] = data;
    return data;
  }

  /**
   * Converts an ID of a given type to a list of employees
   */
  async expand(id, type) {
    logger.log(2, 'expand', `Expanding type ${type} with ID ${id}`);
    let employeeIds = new Set();
    let addArray = (array) => (array || []).forEach((a) => employeeIds.add(a));

    let employees, emps;
    switch (type) {
      case 'employees':
        logger.log(2, 'expand', 'Adding employee directly');
        employeeIds.add(id);
        break;
      case 'tags':
        logger.log(2, 'expand', 'Adding tags by tag.employees');
        let tags = await this.getDatabase('tags');
        for (let tag of tags) {
          if (tag.id !== id) continue;
          addArray(tag.employees);
        }
        break;
      case 'contracts':
        logger.log(2, 'expand', 'Adding projects util getContractEmployees');
        employees = await this.getDatabase('employees');
        emps = getContractEmployees({ id }, employees);
        emps = emps.map(e => e.id);
        addArray(emps);
        break;
      case 'projects':
        logger.log(2, 'expand', 'Adding projects util getProjectEmployees');
        employees = await this.getDatabase('employees');
        emps = getProjectEmployees({ id }, employees);
        emps = emps.map(e => e.id);
        addArray(emps);
        break;
    }

    logger.log(2, 'expand', `Returning ${employeeIds.size} items`);
    return Array.from(employeeIds);
  }

  /**
   * Takes the structure of 'users' 'members' and converts it into
   * an array of employees
   */
  async expandAll(obj) {
    logger.log(2, 'expandAll', 'Expanding all for user or members');
    let employeeIds = new Set();
    let types = ['employees', 'tags', 'contracts', 'projects'];

    let expanded;
    for (let type of types) {
      logger.log(2, 'expandAll', `Expanding type ${type}`);
      for (let id of obj[type]) {
        logger.log(2, 'expandAll', `Expanding id ${id}`);
        expanded = await this.expand(id, type);
        expanded.forEach((id) => employeeIds.add(id));
      }
    }

    logger.log(2, 'expandAll', `Returning ${employeeIds.size} items`);
    return Array.from(employeeIds);
  }

  /**
   * Finds the users/members that the eId is a member/user on. Groups them
   * by group, returning and object instead of array of IDs.
   */
  async getGroupedEmployees(eId, idType, filter) {
    logger.log(2, 'getGroupedEmployees', 'Getting group employees');
    let groups = await this.getDatabase('accessGroups');
    let otherType = idType === 'members' ? 'users' : 'members';
    
    // get each group's employees as a set
    let groupEmployees = {};
    for (let group of groups) {
      logger.log(2, 'getGroupedEmployees', `Finding employees for group ${group.name}`);
      // allow for custom filter
      if (filter && !filter(group)) continue;
      for (let assignment of group.assignments) {
        logger.log(2, 'getGroupedEmployees', `Finding employees for assignment ${assignment.name}`);
        // skip assignments where user is not assigned on idType
        let onType = await this.expandAll(assignment[idType]);
        if (!onType.includes(eId)) continue;
        // fetch all employees on otherType and add them to the group
        let assigned = await this.expandAll(assignment[otherType]);
        logger.log(2, 'getGroupedEmployees', `Found ${assigned.length} employees, adding`);
        if (assigned?.length) {
          groupEmployees[group.name] ??= new Set();
          assigned.forEach((id) => groupEmployees[group.name].add(id));
        }
      }
    }

    let nGroups = Object.keys(groupEmployees).length;

    // convert group sets to arrays
    logger.log(2, 'getGroupedEmployees', `Converting ${nGroups} sets`);
    for (let [k, v] of Object.entries(groupEmployees)) {
      groupEmployees[k] = Array.from(v);
    }

    logger.log(2, 'getGroupedEmployees', `Returning ${nGroups} groups`);
    return groupEmployees;
  }

  /**
   * Finds the users/members that the eId is a member/user on. Returns the IDs
   * of all employees that match.
   * 
   * TODO: make this a util when used in other places
   */
  async getEmployees(eId, idType) {
    logger.log(2, 'getEmployees', `Getting employees where ${eId} is in column ${idType}`);
    let groups = await this.getDatabase('accessGroups');
    let otherType = idType === 'members' ? 'users' : 'members';
    let employeeIds = new Set();

    // get each group's employees
    for (let group of groups) {
      for (let assignment of group.assignments) {
        // skip assignments where user is not assigned on idType
        let onType = await this.expandAll(assignment[idType]);
        if (!onType.includes(eId)) continue;
        // fetch all employees on otherType and add them to the group
        let assigned = await this.expandAll(assignment[otherType]);
        (assigned || []).forEach((id) => employeeIds.add(id));
      }
    }

    // return as array
    logger.log(2, 'getEmployees', `Returning ${employeeIds.size} employees`);
    return Array.from(employeeIds);
  }

  /**
   * Gets all members of all groups that an employee is a user on.
   * Eg. Gets employees that are on the project that this user is Manager for
   */
  async _getEmployeeGroupMembers(req, res) {
    try {
      logger.log(2, '_getEmployeeGroupMembers', 'Getting members for groups employee is a user on');
      const members = this.getEmployees(req.params.id, 'users');
      logger.log(2, '_getEmployeeGroupMembers', `Returning ${users.length} members`);
      res.status(200).send(members);
    } catch (err) {
      this._sendError(res, err);
    }
  }

  /**
   * Gets all users of all groups that an employee is a member on.
   * Eg. Gets a user's Project Manager and Team Lead
   */
  async _getEmployeeGroupUsers(req, res) {
    try {
      logger.log(2, '_getEmployeeGroupUsers', 'Getting users for groups employee is a member on');
      const users = this.getEmployees(req.params.id, 'members');
      logger.log(2, '_getEmployeeGroupUsers', `Returning ${users.length} users`);
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
      logger.log(2, '_getEmployeeShowOnProfileUsers', 'Getting users for employee profile');
      const users = await this.getGroupedEmployees(req.params.id, 'members', (g) => g.flags?.showOnMemberProfile);
      logger.log(2, '_getEmployeeShowOnProfileUsers', `Returning ${users.length} users`);
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