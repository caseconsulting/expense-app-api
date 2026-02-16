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
class AccessRoles extends Crud {
  constructor() {
    super();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;

    // get employees that are 'members' of the roles that an employee is in
    this._router.get(
      '/employee/members/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getEmployeeRoleMembers.bind(this)
    );
    // get employees that are 'users' in roles that an employees is a 'member' of
    this._router.get(
      '/employee/roleUsers/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getEmployeeRoleUsers.bind(this)
    );
    // get employees that are 'users' in roles that an employee is a 'member' of, only including
    // ones that have the "show on profile" flag active
    this._router.get(
      '/link/showOnProfile/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getEmployeeShowOnProfileUsers.bind(this)
    );
    // get linked contract leaders
    this._router.get(
      '/link/type/:type',
      this._checkJwt,
      this._getUserInfo,
      this._getContractOrProjectLinkedLeaders.bind(this)
    );

    this.tagsDynamo = new DatabaseModify('tags');
    this.contractsDynamo = new DatabaseModify('contracts');
    this.employeesDynamo = new DatabaseModify('employees');
    this.databaseModify = new DatabaseModify('access-groups');
  }

  /**
   * Create an object. Returns the object created.
   *
   * @param body - data of object
   * @return Object - object created
   */
  async _create(data) {
    logger.log(2, '_create', `Preparing to create access role with id: ${data.id}`);
    return data;
  }

  /**
   * Reads an access role from the database. Returns the access role read.
   *
   * @param data - parameters of access role
   * @return access role read
   */
  async _read(data) {
    logger.log(2, '_read', `Attempting to read access role ${data.id}`);
    try {
      // fetch
      let accessRole = await this.databaseModify.getEntry(data.id);
      // log/return success
      logger.log(2, '_read', `Successfully read access role ${data.id}`);
      return accessRole;
    } catch (err) {
      // log/return error
      logger.log(2, '_read', `Failed to read access role ${data.id}`);
      return Promise.reject(err);
    }
  }

  /**
   * Updates an attribute of an object. Returns the object updated.
   *
   * @param body - data of object
   * @return Object - object updated
   */
  async _updateAttribute(req) {
    let data = req.body;
    logger.log(2, '_update', `Preparing to update access role with id: ${data.id}`);

    try {
      let oldRole = await this.databaseModify.getEntry(data.id);
      let newRole = { ...oldRole, ...data };
      return { objectUpdated: newRole };
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for access role with id: ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  }

  /**
   * Prepares an access role to be deleted. Returns the role if it can be successfully deleted.
   *
   * @param id - id of role
   * @return access role prepared to delete
   */
  async _delete(id) {
    // log method
    logger.log(2, '_delete', `Preparing to delete access role ${id}`);
    try {
      // get access role to delete
      let role = await this.databaseModify.getEntry(id);
      logger.log(2, '_delete', `Successfully prepared to delete access role ${id}`);
      return role;
    } catch (err) {
      // log and return error
      logger.log(2, '_delete', `Failed to prepare delete for access role ${id}`);
      return Promise.reject(err);
    }
  } // _delete

  /**
   * Returns whether or not the given role is the admin role
   */
  isAdminRole(role) {
    let result = role.name === 'Admin';
    logger.log(2, 'isAdminRole', `${role.name} ${result ? 'IS' : 'is NOT'} the admin role`);
    return result;
  }

  /**
   * Gets database data with caching
   * 
   * Note that this persists between executions, so database updates will be cached 
   * with some persistence even if the db updates. The accessGroups database is
   * excluded for this reason.
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
    if (type !== 'accessGroups') DATABASES[type] = data;
    return data;
  }

  /**
   * Gets indexed data with caching
   */
  async getIndex(type, by = 'id') {
    logger.log(2, 'getIndex', `Running getIndex for type ${type}`);

    // return cache if possible
    if (INDEXES[type]) {
      logger.log(2, 'getIndex', 'Found index cache!');
      return INDEXES[type];
    }

    // get dynamo data
    logger.log(2, 'getIndex', 'Getting data from database');
    let data = await this.getDatabase(type);

    // index, cache, return data
    logger.log(2, 'getIndex', 'Setting cache and returning data');
    let indexed = indexBy(data, by);
    INDEXES[type] = indexed;
    return indexed;
  }

  /**
   * Converts an ID of a given type to a list of employees
   */
  async expand(id, type) {
    logger.log(2, 'expand', `Expanding type ${type} with ID ${id}`);
    let employeeIds = new Set();
    let employeeIndex = await this.getIndex('employees');

    // helpers
    let isActive = (eId) => employeeIndex[eId].workStatus > 0;
    let addArray = (array) => (array || []).forEach((id) => { if (isActive(id)) employeeIds.add(id); });

    // add employees as needed based on type
    let employees, emps;
    switch (type) {
      case 'employees':
        // already employee, just add the id
        logger.log(2, 'expand', 'Adding employee directly');
        employeeIds.add(id);
        break;
      case 'tags':
        // tags have .employees listed by id, add the array
        logger.log(2, 'expand', 'Adding tags by tag.employees');
        let tags = await this.getDatabase('tags');
        for (let tag of tags) {
          if (tag.id !== id) continue;
          addArray(tag.employees);
        }
        break;
      case 'contracts':
        // contracts have a util, use that and add the returned array
        logger.log(2, 'expand', 'Adding projects util getContractEmployees');
        employees = await this.getDatabase('employees');
        emps = getContractEmployees({ id }, employees);
        emps = emps.map(e => e.id);
        addArray(emps);
        break;
      case 'projects':
        // projects have a util, use that and add the returned array
        logger.log(2, 'expand', 'Adding projects util getProjectEmployees');
        employees = await this.getDatabase('employees');
        emps = getProjectEmployees({ id }, employees);
        emps = emps.map(e => e.id);
        addArray(emps);
        break;
    }

    // Return as array
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

    // expand each type into employee ids
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
   * Helper to get all employees if the role is admin and the type is members,
   * otherwise expand normally with expandAll
   */
  async expandAllWithAdmin(role, type, assignment) {
    // admins have all employees as their 'members', just return
    // all employee ids
    if (this.isAdminRole(role) && type === 'members') {
      let emps = await this.getDatabase('employees');
      emps = emps.map(e => e.id);
      logger.log(2, 'expandAllWithAdmin', `Role is admin and type is members, returning all ${emps.length} employees`);
      return emps;
    }
  
    // non-admins need to expand all types as needed
    logger.log(2, 'expandAllWithAdmin', 'Role is not admin or type is not employees, using expandAll');
    return await this.expandAll(assignment[type]);
  }

  /**
   * Gets users (aka leaders) of a given type.
   * 
   * @param id ID of item to filter by
   * @param type type of ID
   */
  async getTypeLeaders(type) {
    logger.log(2, 'getLeadersByType', `Getting leaders of all ${type}`);
    let roles = await this.getDatabase('accessGroups');

    let leaders = {};
    for (let role of roles) {
      logger.log(2, 'getLeadersByType', `Checking role ${role.name}`);
      // get all leaders on for each assignment
      for (let assignment of role.assignments) {
        let users = await this.expandAll(assignment.users || []);
        logger.log(2, 'getLeadersByType', `${role.name} has ${users?.length || 0} users`);
        if (!users || users.length === 0) continue;
        // add leaders to this item
        for (let id of assignment.members?.[type] || []) {
          logger.log(2, 'getLeadersByType', `${role.name}: adding id ${id}`);
          leaders[id] ??= [];
          leaders[id].push(...users);
        }
      }
    }

    logger.log(2, 'getLeadersByType', `Returning ${JSON.stringify(leaders)}`);
    logger.log(2, 'getLeadersByType', `Returning leaders for ${type}`);
    return leaders;
  }

  /**
   * Finds the users/members that the eId is a member/user on. Groups them
   * by role, returning and object instead of array of IDs.
   */
  async getRoledEmployees(eId, idType, filter) {
    logger.log(2, 'getRoledEmployees', 'Getting role employees');
    let roles = await this.getDatabase('accessGroups');
    let otherType = idType === 'members' ? 'users' : 'members';
    
    // get each role's employees as a set
    let roleEmployees = {};
    let onType, assigned;
    for (let role of roles) {
      logger.log(2, 'getRoledEmployees', `Finding employees for role ${role.name}`);
      // allow for custom filter
      if (filter && !filter(role)) {
        logger.log(2, 'getRoledEmployees', `Skipping role ${role.name} based on custom filter`);
        continue;
      }
      logger.log(2, 'getRoledEmployees', `Filter did not trigger for role ${role.name}`);
      for (let assignment of role.assignments) {
        logger.log(2, 'getRoledEmployees', `Finding employees for assignment ${assignment.name}`);
        // skip assignments where user is not assigned on idType
        onType = await this.expandAllWithAdmin(role, idType, assignment);
        if (!onType.includes(eId)) continue;
        // fetch all employees on otherType
        assigned = await this.expandAllWithAdmin(role, otherType, assignment);
        logger.log(2, 'getRoledEmployees', `Found ${assigned.length} employees, adding`);
        // add to role list
        if (assigned?.length) {
          roleEmployees[role.name] ??= new Set();
          assigned.forEach((id) => roleEmployees[role.name].add(id));
        }
      }
    }

    let nRoles = Object.keys(roleEmployees).length;

    // convert role sets to arrays
    logger.log(2, 'getRoledEmployees', `Converting ${nRoles} sets`);
    for (let [k, v] of Object.entries(roleEmployees)) {
      roleEmployees[k] = Array.from(v);
    }

    logger.log(2, 'getRoledEmployees', `Returning ${nRoles} roles`);
    return roleEmployees;
  }

  /**
   * Finds the users/members that the eId is a member/user on. Returns the IDs
   * of all employees that match.
   * 
   * TODO: make this a util when used in other places
   */
  async getEmployees(eId, idType) {
    logger.log(2, 'getEmployees', `Getting employees where ${eId} is in column ${idType}`);
    let roles = await this.getDatabase('accessGroups');
    let otherType = idType === 'members' ? 'users' : 'members';
    let employeeIds = new Set();

    // get each role's employees
    let onType, assigned;
    for (let role of roles) {
      for (let assignment of role.assignments) {
        // skip assignments where user is not assigned on idType
        onType = await this.expandAll(assignment[idType]);
        if (!onType.includes(eId)) continue;
        // 'members' is everyone if this is the admin role
        // otherwise fetch all employees on 'otherType'
        if (this.isAdminRole(role) && otherType === 'members')
          assigned = (await this.getDatabase('employees')).map(e => e.id);
        else
          assigned = await this.expandAll(assignment[otherType]);
        // add to return list
        (assigned || []).forEach((id) => employeeIds.add(id));
      }
    }

    // return as array
    logger.log(2, 'getEmployees', `Returning ${employeeIds.size} employees`);
    return Array.from(employeeIds);
  }

  /**
   * Gets all members of all roles that an employee is a user on.
   * Eg. Gets employees that are on the project that this user is Manager for
   */
  async _getEmployeeRoleMembers(req, res) {
    try {
      logger.log(2, '_getEmployeeRoleMembers', 'Getting members for roles employee is a user on');
      // get all members of role assignments that id is a user on
      const members = this.getEmployees(req.params.id, 'users');
      logger.log(2, '_getEmployeeRoleMembers', `Returning ${users.length} members`);
      res.status(200).send(members);
    } catch (err) {
      this._sendError(res, err);
    }
  }

  /**
   * Gets all users of all roles that an employee is a member on.
   * Eg. Gets a user's Project Manager and Team Lead
   */
  async _getEmployeeRoleUsers(req, res) {
    try {
      logger.log(2, '_getEmployeeRoleUsers', 'Getting users for roles employee is a member on');
      // get all users of role assignments that id is a member on
      const users = this.getEmployees(req.params.id, 'members');
      logger.log(2, '_getEmployeeRoleUsers', `Returning ${users.length} users`);
      res.status(200).send(users);
    } catch (err) {
      this._sendError(res, err);
    }
  }

  /**
   * Gets all users of roles that an employee is on that also
   * have the "show on profile" flag turned on.
   */
  async _getEmployeeShowOnProfileUsers(req, res) {
    try {
      logger.log(2, '_getEmployeeShowOnProfileUsers', 'Getting users for employee profile');
      // for each item that the user id is a member on, get the users who have access to them
      // only including those with the "show on profile" flag turned on
      const users = await this.getRoledEmployees(req.params.id, 'members', (g) => g.flags?.showOnMemberProfile);
      logger.log(2, '_getEmployeeShowOnProfileUsers', `Returning ${users.length} users`);
      res.status(200).send(users);
    } catch (err) {
      this._sendError(res, err);
    }
  }

  /**
   * Gets an object of Contract IDs mapped to leaders of that contract, where the
   * "link to contracts" checkbox is checked
   */
  async _getContractOrProjectLinkedLeaders(req, res) {
    try {
      logger.log(2, '_getContractOrProjectLinkedLeaders', 'Getting user map for type ' + req.params.type);
      const mapped = await this.getTypeLeaders(req.params.type);
      logger.log(2, '_getContractOrProjectLinkedLeaders', 'Returning mapped users');
      res.status(200).send(mapped);
    } catch (err) {
      this._sendError(res, err);
    }
  }

  /**
   * Returns the instace express router.
   *
   * @return Router Object - express router
   */
  get router() {
    // log method
    logger.log(5, 'router', 'Getting router');

    return this._router;
  } // router

  /**
   * Error helper
   */
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

module.exports = AccessRoles;