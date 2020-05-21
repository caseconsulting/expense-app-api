const Budget = require('./../models/budget');
const DatabaseModify = require('../js/databaseModify');
const Logger = require('../js/Logger');
const TrainingUrl = require('../models/trainingUrls');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const moment = require('moment');
const { v4: uuid } = require('uuid');
const _ = require('lodash');

const ISOFORMAT = 'YYYY-MM-DD';
const logger = new Logger('crudRoutes');
const STAGE = process.env.STAGE;

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS
  // endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: process.env.VUE_APP_AUTH0_AUDIENCE,
  issuer: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

class Crud {

  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.post('/', this._checkJwt, this._getUserInfo, this._createWrapper.bind(this));
    this._router.get('/', this._checkJwt, this._getUserInfo, this._readAllWrapper.bind(this));
    this._router.get('/:id', this._checkJwt, this._getUserInfo, this._readWrapper.bind(this));
    this._router.get('/:id/:category', this._checkJwt, this._getUserInfo, this._readWrapper.bind(this));
    this._router.put('/', this._checkJwt, this._getUserInfo, this._updateWrapper.bind(this));
    this._router.delete('/:id', this._checkJwt, this._getUserInfo, this._deleteWrapper.bind(this));
    this.budgetDynamo = new DatabaseModify('budgets');
    this.employeeDynamo = new DatabaseModify('employees');
    this.expenseDynamo = new DatabaseModify('expenses');
    this.expenseTypeDynamo = new DatabaseModify('expense-types');
  } // constructor

  /**
   * Calculates the adjusted budget amount for an expense type based on an employee's work status. Returns the adjust
   * amount.
   *
   * @param employee - Employee to adjust amount for
   * @param expenseType - ExpenseType budget to be adjusted
   * @return Number - adjusted budget amount
   */
  calcAdjustedAmount(employee, expenseType) {
    // log method
    logger.log(4, 'calcAdjustedAmount',
      `Calculating adjusted budget amount for employee ${employee.id} and expense type ${expenseType.id}`
    );

    // compute method
    let result;

    if (this.hasAccess(employee, expenseType)) {
      if (expenseType.accessibleBy == 'FULL' || expenseType.accessibleBy == 'FULL TIME') {
        result = expenseType.budget;
      } else {
        result = Number((expenseType.budget * (employee.workStatus / 100.0)).toFixed(2));
      }
    } else {
      result = 0;
    }

    // log result
    logger.log(4, 'calcAdjustedAmount', `Adjusted budget amount is $${result}`);

    // return result
    return result;
  } // calcAdjustedAmount

  /**
   * Check employee permissions to create to a table. A user has permissions to create an expense or training url. An
   * admin has permissions to create an expense, expense type, employee, or training url. Returns true if the employee
   * has permissions, otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee permission to create
   */
  _checkPermissionToCreate(employee) {
    // log method
    logger.log(3, '_checkPermissionToCreate',
      `Checking if employee ${employee.id} has permission to create to the ${this._getTableName()} table`
    );

    // compute method
    let userPermissions = this.isUser(employee) && this._checkTableName(['expenses', 'training-urls']);
    let adminPermissions = this.isAdmin(employee)
      && this._checkTableName(['expenses', 'expense-types', 'employees', 'training-urls']);

    let result = userPermissions || adminPermissions;

    // log result
    if (result) {
      logger.log(3, '_checkPermissionToCreate',
        `Employee ${employee.id} has permission to create to the ${this._getTableName()} table`
      );
    } else {
      logger.log(3, '_checkPermissionToCreate',
        `Employee ${employee.id} does not have permission to create to the ${this._getTableName()} table`
      );
    }

    // return result
    return result;
  } // _checkPermissionToCreate

  /**
   * Check employee permissions to delete from a table. A user has permissions to delete an expense. An admin has
   * permissions to delete an expense, expense type, or employee. Returns true if the employee has permissions,
   * otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee permission to delete
   */
  _checkPermissionToDelete(employee) {
  // log method
    logger.log(3, '_checkPermissionToDelete',
      `Checking if employee ${employee.id} has permission to delete from the ${this._getTableName()} table`
    );

    // compute method
    let userPermissions = this.isUser(employee) && this._checkTableName(['expenses']);
    let adminPermissions = this.isAdmin(employee) && this._checkTableName(['expenses', 'expense-types', 'employees']);

    let result = userPermissions || adminPermissions;

    // log result
    if (result) {
      logger.log(3, '_checkPermissionToDelete',
        `Employee ${employee.id} has permission to delete from the ${this._getTableName()} table`
      );
    } else {
      logger.log(3, '_checkPermissionToDelete',
        `Employee ${employee.id} does not have permission to delete from the ${this._getTableName()} table`
      );
    }

    // return result
    return result;
  } // _checkPermissionToDelete

  /**
   * Check employee permissions to read from a table. A user has permissions to read an expense, expnse type, or
   * training url. An admin has permissions to read an expense, expense type, employee, or training url. Returns
   * true if the employee has permissions, otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee permission to read
   */
  _checkPermissionToRead(employee) {
    // log method
    logger.log(3, '_checkPermissionToRead',
      `Checking if employee ${employee.id} has permission to read from the ${this._getTableName()} table`
    );

    // compute method
    let userPermissions = this.isUser(employee) && this._checkTableName(['expenses', 'expense-types', 'training-urls']);
    let adminPermissions = this.isAdmin(employee)
      && this._checkTableName(['expenses', 'expense-types', 'employees', 'training-urls']);

    let result = userPermissions || adminPermissions;

    // log result
    if (result) {
      logger.log(3, '_checkPermissionToRead',
        `Employee ${employee.id} has permission to read from the ${this._getTableName()} table`
      );
    } else {
      logger.log(3, '_checkPermissionToRead',
        `Employee ${employee.id} does not have permission to read from the ${this._getTableName()} table`
      );
    }

    // return result
    return result;
  } // _checkPermissionToRead

  /**
   * Check employee permissions to read all entries from a table. User has permission to read all expense types,
   * employees, or training urls. An admin has permissions to read all expenses, expense types, employees, and training
   * urls. Returns true if the employee has permissions, otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee permission to read all entries
   */
  _checkPermissionToReadAll(employee) {
    // log method
    logger.log(3, '_checkPermissionToReadAll',
      `Checking if employee ${employee.id} has permission to read all entries from the ${this._getTableName()} table`
    );
    // compute method
    let userPermissions = this.isUser(employee)
      && this._checkTableName(['expense-types', 'employees', 'training-urls']);
    let adminPermissions = this.isAdmin(employee)
      && this._checkTableName(['expenses', 'expense-types', 'employees', 'training-urls']);

    let result = userPermissions || adminPermissions;

    // log result
    if (result) {
      logger.log(3, '_checkPermissionToReadAll',
        `Employee ${employee.id} has permission to read all entries from the ${this._getTableName()} table`
      );
    } else {
      logger.log(3, '_checkPermissionToReadAll',
        `Employee ${employee.id} does not have permission to read all entries from the ${this._getTableName()} table`
      );
    }

    // return result
    return result;
  } // _checkPermissionToReadAll

  /**
   * Check employee permissions to update a table. A user has permissions to update an expense, employee, or training
   * url. An admin has permissions to update an expense, expense type, employee, or training url. Returns true if the
   * employee has permissions, otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee permission to update
   */
  _checkPermissionToUpdate(employee) {
    // log method
    logger.log(3, '_checkPermissionToUpdate',
      `Checking if employee ${employee.id} has permission to update the ${this._getTableName()} table`
    );

    // compute method
    let userPermissions = this.isUser(employee) && this._checkTableName(['expenses', 'employees', 'training-urls']);
    let adminPermissions = this.isAdmin(employee)
      && this._checkTableName(['expenses', 'expense-types', 'employees', 'training-urls']);

    let result = userPermissions || adminPermissions;

    // log result
    if (result) {
      logger.log(3, '_checkPermissionToUpdate',
        `Employee ${employee.id} has permission to update the ${this._getTableName()} table`
      );
    } else {
      logger.log(3, '_checkPermissionToUpdate',
        `Employee ${employee.id} does not have permission to update the ${this._getTableName()} table`
      );
    }

    // return result
    return result;
  } // _checkPermissionToUpdate

  /**
   * Check if the database table is in a given list of table names. Returns true if the table is in the list, otherwise
   * returns false.
   *
   * @param tableNames - array list of table name strings
   * @return boolean - database table is in list of table names
   */
  _checkTableName(tableNames) {
    // log method
    logger.log(5, '_checkTableName',
      `Checking if ${this._getTableName()} is in the list of table names [${tableNames}]`
    );

    // compute method
    let envTableNames = [];
    _.forEach(tableNames, tableName => {
      envTableNames.push(`${STAGE}-${tableName}`);
    });

    let result = _.includes(envTableNames, this._getTableName());

    // log result
    if (result) {
      logger.log(5, '_checkTableName', `${this._getTableName()} is in the list of table names [${tableNames}]`);
    } else {
      logger.log(5, '_checkTableName', `${this._getTableName()} is not in the list of table names [${tableNames}]`);
    }

    // return result
    return result;
  } // _checkTableName

  /* eslint-disable no-unused-vars */

  /**
   * Create an object. Returns the object created.
   *
   * @param body - data of object
   * @return Object - object created
   */
  async _create(body) {
    // This function must be overwritten
  } // _create

  /* eslint-enable no-unused-vars */

  /**
   * Creates a new budget for a given employee and expense type. Returns the budget if successful, otherwise returns
   * an error.
   *
   * @param employee - Employee to create budget for
   * @param expenseType - ExpenseType of the budget
   * @return Budget - budget created
   */
  async createNewBudget(employee, expenseType, annualStart) {
    // log method
    logger.log(2, 'createNewBudget',
      `Attempting to create a new budget for employee ${employee.id} with expense type ${expenseType.id}`
    );

    // compute method
    let budgetData = {
      id: this.getUUID(),
      expenseTypeId: expenseType.id,
      employeeId: employee.id,
      reimbursedAmount: 0,
      pendingAmount: 0,
      amount: 0
    };

    // set fiscal start and end date
    if (expenseType.recurringFlag) {
      if (annualStart) {
        // set fiscal dates to the provided start date
        budgetData.fiscalStartDate = annualStart;
        budgetData.fiscalEndDate = moment(annualStart, ISOFORMAT).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
      } else {
        // set fiscal dates to current anniversary date if no start date provided
        let dates = this.getBudgetDates(employee.hireDate);
        budgetData.fiscalStartDate = dates.startDate.format(ISOFORMAT);
        budgetData.fiscalEndDate = dates.endDate.format(ISOFORMAT);
      }
    } else {
      budgetData.fiscalStartDate = expenseType.startDate;
      budgetData.fiscalEndDate = expenseType.endDate;
    }

    // set the amount of the new budget
    budgetData.amount = this.calcAdjustedAmount(employee, expenseType);

    let newBudget = new Budget(budgetData);
    return this.budgetDynamo.addToDB(newBudget) // add budget to database
      .then(budget => {
        // log success
        logger.log(2, 'createNewBudget',
          `Successfully created new budget ${budget.id} for employee ${employee.id} with expense type ${expenseType.id}`
        );

        // return new budget
        return budget;
      })
      .catch(err => {
        // log error
        logger.log(2, 'createNewBudget',
          `Failed to create new budget for employee ${employee.id} and expense type ${expenseType.id}`
        );

        // throw error
        throw err;
      });
  } // createNewBudget

  /**
   * Create object in database. If successful, sends 200 status request with the object created and returns the object.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - object created
   */
  async _createWrapper(req, res) {
    // log method
    logger.log(1, '_createWrapper', `Attempting to create an object in ${this._getTableName()}`);

    // compute method
    if (this._checkPermissionToCreate(req.employee)) {
      // employee has permissions to create to table
      return this._create(req.body) // create object
        .then(objectCreated => this._validateInputs(objectCreated)) // validate inputs
        .then(objectValidated => this.databaseModify.addToDB(objectValidated)) // add object to database
        .then(data => {
          // log success
          if (data instanceof TrainingUrl) {
            // created a training url
            logger.log(1, '_createWrapper',
              `Successfully created object ${data.id} with category ${data.category} in ${this._getTableName()}`
            );
          } else {
            // created an expense, expense type, or employee
            logger.log(1, '_createWrapper',
              `Successfully created object ${data.id} in ${this._getTableName()}`
            );
          }

          // send successful 200 status
          res.status(200).send(data);

          // return created data
          return data;
        })
        .catch(err => {
          // log error
          logger.log(1, '_createWrapper', `Failed to create object in ${this._getTableName()}`);

          // send error status
          this._sendError(res, err);

          // return error
          return err;
        });
    } else {
      // employee does not have permissions to create to table
      let err = {
        code: 403,
        message: 'Unable to create object in database due to insufficient employee permissions.'
      };

      // log error
      logger.log(1, '_createWrapper', `Failed to create object in ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _createWrapper

  /* eslint-disable no-unused-vars */

  /**
   * Delete an object. Returns the object deleted.
   *
   * @param id - id of object
   * @return Object - object deleted
   */
  async _delete(id) {
    // This function must be overwritten
  } // _delete

  /* eslint-enable no-unused-vars */

  /**
   * Delete object in database. If successful, sends 200 status request with the object deleted and returns the object.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - object deleted
   */
  async _deleteWrapper(req, res) {
    // log method
    logger.log(1, '_deleteWrapper', `Attempting to delete an object from ${this._getTableName()}`);

    // compute method
    if (this._checkPermissionToDelete(req.employee)) {
      // employee has permission to delete from table
      return this._delete(req.params.id) // delete object
        .then(objectDeleted => this.databaseModify.removeFromDB(objectDeleted.id)) // remove from database
        .then(data => {
          // log success
          logger.log(1, '_deleteWrapper',
            `Successfully deleted object ${data.id} from ${this._getTableName()}`
          );

          // send sucessful 200 status
          res.status(200).send(data);

          // return deleted data
          return data;
        })
        .catch(err => {
          // log error
          logger.log(1, '_deleteWrapper', `Failed to delete object from ${this._getTableName()}`);

          // send error status
          this._sendError(res, err);

          // return error
          return err;
        });
    } else {
      // employee does not have permissions to delete from table
      let err = {
        code: 403,
        message: 'Unable to delete object from database due to insufficient employee permissions.'
      };

      // log error
      logger.log(1, '_deleteWrapper', `Failed to delete object from ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _deleteWrapper

  /**
   * Get the current annual budget start and end dates based on a given hire date.
   *
   * @param hireDate - ISO formatted hire date String
   * @return Object - moment start date and moment end date
   */
  getBudgetDates(date) {
    // log method
    logger.log(4, 'getBudgetDates', `Getting current annual budget dates for ${date}`);

    // compute method
    let startYear;
    let hireDate = moment(date, ISOFORMAT);
    let hireYear = hireDate.year();
    let hireMonth = hireDate.month(); // form 0-11
    let hireDay = hireDate.date(); // from 1 to 31
    let today = moment();

    // determine start date year
    if (hireDate.isBefore(today)) {
      // hire date is before today
      // if anniversary hasn't occured yet this year, set the start of the budget to last year
      // if the anniversary already occured this year, set the start of the budget to this year
      startYear = today.isBefore(moment([today.year(), hireMonth, hireDay]))
        ? today.year() - 1
        : today.year();
    } else {
      // hire date is after today
      startYear = hireYear;
    }

    let startDate = moment([startYear, hireMonth, hireDay]);
    let endDate = moment([startYear, hireMonth, hireDay])
      .add('1', 'years')
      .subtract('1', 'days');

    let result = {
      startDate,
      endDate
    };

    // log result
    logger.log(4, 'getBudgetDates',
      `Current annual budget date for ${date} starts on ${startDate.format(ISOFORMAT)} and ends on`,
      `${endDate.format(ISOFORMAT)}`
    );

    // return result
    return result;
  } // getBudgetDates

  /**
   * Returns the database table name.
   *
   * @return String - database table name
   */
  _getTableName() {
    // log method
    logger.log(5, '_getTableName', 'Getting database table name');

    // compute method
    let result = this.databaseModify.tableName;

    // log result
    logger.log(5, '_getTableName', `Database table name is ${result}`);

    // return result
    return result;
  } // _getTableName

  /**
   * Generates and returns a new uuid.
   *
   * @return String - new uuid
   */
  getUUID() {
    return uuid();
  }

  /**
   * Check if an employee has access to an expense type. Returns true if employee has access, otherwise returns false.
   *
   * @param employee - Employee to access
   * @param expenseType - ExpenseType to be accessed
   * @return Boolean - employee has access to expense type
   */
  hasAccess(employee, expenseType) {
    // log method
    logger.log(3, 'hasAccess', `Checking if employee ${employee.id} has access to ${expenseType.id}`);

    // compute method
    let result;

    if (employee.workStatus == 0) {
      result = false;
    } else if (expenseType.accessibleBy == 'ALL' || expenseType.accessibleBy == 'FULL') {
      result = true;
    } else if (expenseType.accessibleBy == 'FULL TIME') {
      result = employee.workStatus == 100;
    } else {
      result = expenseType.accessibleBy.includes(employee.id);
    }

    // log result
    if (result) {
      logger.log(3, 'hasAccess', `Employee ${employee.id} has access to ${expenseType.id}`);
    } else {
      logger.log(3, 'hasAccess', `Employee ${employee.id} does not have access to ${expenseType.id}`);
    }

    // return result
    return result;
  } // hasAccess

  /**
   * Check if an employee is an admin. Returns true if employee role is 'admin', otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee is admin
   */
  isAdmin(employee) {
    // log method
    logger.log(5, 'isAdmin', `Checking if employee ${employee.id} is an admin`);

    // compute method
    let result = employee.employeeRole === 'admin';

    // log result
    if (result) {
      logger.log(5, 'isAdmin', `Employee ${employee.id} is an admin`);
    } else {
      logger.log(5, 'isAdmin', `Employee ${employee.id} is not an admin`);
    }

    // return result
    return result;
  } // isAdmin

  /**
   * Checks if a value is empty. Returns true if the value is null or a single character space String.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  isEmpty(value) {
    // log method
    logger.log(5, 'isEmpty', `Checking if value ${value} is empty`);

    // compute method
    let result = value == null || value === ' ' || value === '';

    // log result
    if (result) {
      logger.log(5, 'isEmpty', `Value ${value} is empty`);
    } else {
      logger.log(5, 'isEmpty', `Value ${value} is not empty`);
    }

    // return result
    return result;
  } // isEmpty

  /**
   * Check if an employee is a user. Returns true if employee role is 'user', otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee is user
   */
  isUser(employee) {
    // log method
    logger.log(5, 'isUser', `Checking if employee ${employee.id} is a user`);

    // compute method
    let result = employee.employeeRole === 'user';

    // log result
    if (result) {
      logger.log(5, 'isUser', `Employee ${employee.id} is a user`);
    } else {
      logger.log(5, 'isUser', `Employee ${employee.id} is not a user`);
    }

    // return result
    return result;
  } // isUser

  /* eslint-disable no-unused-vars */

  /**
   * Read an object. Returns the object read.
   *
   * @param params - parameters (keys) of object
   * @return Object - object read
   */
  async _read(params) {
    // This function must be overwritten
  } // _read

  /* eslint-enable no-unused-vars */

  /**
   * Read object in database. If successful, sends 200 status request with the object read and returns the object.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - object read
   */
  async _readWrapper(req, res) {
    // log method
    logger.log(1, '_readWrapper', `Attempting to read an object from ${this._getTableName()}`);

    // compute method
    const FORBIDDEN = {
      code: 403,
      message: 'Unable to read object from database due to insufficient employee permissions.'
    };

    if (this._checkPermissionToRead(req.employee)) {
      // employee has permission to read from table
      return this._read(req.params) // read object
        .then(data => {
          // validate user permission to the read expense
          if (this.isUser(req.employee) && this._checkTableName(['expenses'])) {
            // user is reading an expense
            // check the expense belongs to the user
            if (data.employeeId !== req.employee.id) {
              // expense does not belong to user
              return Promise.reject(FORBIDDEN);
            }
          }

          // log success
          if (data instanceof TrainingUrl) {
            // read a training url
            logger.log(1, '_readWrapper',
              `Successfully read object ${data.id} with category ${data.category} from ${this._getTableName()}`
            );
          } else {
            // read an expense, expense-type, or employee
            logger.log(1, '_readWrapper',
              `Successfully read object ${data.id} from ${this._getTableName()}`
            );
          }

          // send successful 200 status
          res.status(200).send(data);

          // return object read data
          return data;
        })
        .catch(err => {
          // log error
          logger.log(1, '_readWrapper', `Failed to read object from ${this._getTableName()}`);

          // send error status
          this._sendError(res, err);

          // return error
          return err;
        });
    } else {
      // employee does not have permission to read
      // log error
      logger.log(1, '_readWrapper', `Failed to read an object from ${this._getTableName()}`);

      // send error status
      this._sendError(res, FORBIDDEN);

      // return error
      return FORBIDDEN;
    }
  } // _readWrapper

  /**
   * Read all objects in database. If successful, sends 200 status request with the objects read and returns the
   * objects.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - objects read
   */
  async _readAllWrapper(req, res) {
    // log method
    logger.log(1, '_readAllWrapper', `Attempting to read all objects from ${this._getTableName()}`);

    // compute method
    if (this._checkPermissionToReadAll(req.employee)) {
      // employee has permission to read all objects from table
      return this.databaseModify.getAllEntriesInDB() // read from database
        .then(data => {
          // log success
          logger.log(1, '_readAllWrapper', `Successfully read all objects from ${this._getTableName()}`);

          // send successful 200 status
          res.status(200).send(data);

          // return read data
          return data;
        })
        .catch(err => {
          // log error
          logger.log(1, '_readAllWrapper', `Failed to read all objects from ${this._getTableName()}`);

          // send error status
          this._sendError(res, err);

          return err;
        });
    } else {
      // employee does not have permission to read all objects from table
      let err = {
        code: 403,
        message: 'Unable to read all objects from database due to insufficient employee permissions.'
      };

      // log error
      logger.log(1, '_readAllWrapper', `Failed to read all objects from ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _readAllWrapper

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
   * Send api response error status.
   *
   * @param res - api response
   * @param err - status error
   * @return API Status - error status
   */
  _sendError(res, err) {
    // log method
    logger.log(3, '_sendError', `Sending ${err.code} error status: ${err.message}`);

    // return error status
    return res.status(err.code).send(err);
  } // _sendError

  /* eslint-disable no-unused-vars */

  /**
   * Update an object. Returns the object updated.
   *
   * @param body - data of object
   * @return Object - object updated
   */
  async _update(body) {
    // This function must be overwritten
  } // _update

  /* eslint-enable no-unused-vars */

  /**
   * Update object in database. If successful, sends 200 status request with the object updated and returns the object.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - object updated
   */
  async _updateWrapper(req, res) {
    // log method
    logger.log(1, '_updateWrapper', `Attempting to update an object in ${this._getTableName()}`);

    // compute method
    if (this._checkPermissionToUpdate(req.employee)) {
      // employee has permission to update table
      return this._update(req.body) // update object
        .then(objectUpdated => this._validateInputs(objectUpdated)) // validate inputs
        .then(objectValidated => {
          // add object to database
          if (objectValidated.id == req.body.id) {
            // update database if the id's are the same
            return this.databaseModify.updateEntryInDB(objectValidated);
          } else {
            // id's are different (database updated when changing expense types in expenseRoutes)
            return objectValidated;
          }
        })
        .then(data => {
          // log success
          if (data instanceof TrainingUrl) {
            // updated a training url
            logger.log(1, '_updateWrapper',
              `Successfully updated object ${data.id} with category ${data.category} from ${this._getTableName()}`
            );
          } else {
            // updated an expense, expense-type, or employee
            logger.log(1, '_updateWrapper',
              `Successfully updated object ${data.id} from ${this._getTableName()}`
            );
          }

          // send successful 200 status
          res.status(200).send(data);

          // return updated data
          return data;
        })
        .catch(err => {
          // log error
          logger.log(1, '_updateWrapper', `Failed to update object in ${this._getTableName()}`);

          // send error status
          this._sendError(res, err);

          // return error
          return err;
        });
    } else {
      // employee does not have permissions to update table
      let err = {
        code: 403,
        message: 'Unable to update object in database due to insufficient employee permissions.'
      };

      // log error
      logger.log(1, '_updateWrapper', `Failed to update object in ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _updateWrapper

  /**
   * Validate inputs. Returns the object if all inputs are valid.
   *
   * @param res - api response
   * @param object - object to be validated
   * @return Object - object validated
   */
  async _validateInputs(object) {
    // log method
    logger.log(3, '_validateInputs', `Validating inputs for ${this._getTableName()}`);

    // compute method
    if (object.id) {
      // object id exists
      var checkAttributes = function(obj) {
        return _.includes(obj, '');
      };

      let checkAttributesCurried = _.curry(checkAttributes);
      // return curried promise
      return new Promise(function(resolve, reject) {
        if (checkAttributesCurried.bind(this)(object)) {
          let err = {
            code: 406, //Not Acceptable
            message: 'Failed to validate inputs. All fields are needed.'
          };

          // log error
          logger.log(3, '_validateInputs', 'Failed to validate inputs');

          // reject error
          reject(err);
        }

        // log success
        logger.log(3, '_validateInputs', 'Successfully validated inputs');

        // resolve object
        resolve(object);
      });
    } else {
      // object id does not exist
      let err =  {
        code: 400, //Bad Request
        message: 'Failed to validate inputs.'
      };

      // log error
      logger.log(3, '_validateInputs', `Failed to validate inputs for ${this._getTableName()}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateInputs
} // Crud

module.exports = Crud;
