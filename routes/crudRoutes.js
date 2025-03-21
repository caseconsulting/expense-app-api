const _ = require('lodash');
const express = require('express');
const Budget = require(process.env.AWS ? 'budget' : '../models/budget');
const TrainingUrl = require(process.env.AWS ? 'trainingUrls' : '../models/trainingUrls');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');
const { generateUUID, getExpressJwt, isAdmin, isManager, isUser, isIntern } = require(process.env.AWS
  ? 'utils'
  : '../js/utils');

const ISOFORMAT = 'YYYY-MM-DD';
const logger = new Logger('crudRoutes');
const STAGE = process.env.STAGE;

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class Crud {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.post('/', this._checkJwt, this._getUserInfo, this._createWrapper.bind(this));
    this._router.get('/', this._checkJwt, this._getUserInfo, this._readAllWrapper.bind(this));
    this._router.get('/:id', this._checkJwt, this._getUserInfo, this._readWrapper.bind(this));
    this._router.get('/:id/:category', this._checkJwt, this._getUserInfo, this._readWrapper.bind(this));
    this._router.patch('/:attribute', this._checkJwt, this._getUserInfo, this._updateAttributeWrapper.bind(this));
    this._router.patch('/attributes/:id', this._checkJwt, this._getUserInfo, this._updateAttributesWrapper.bind(this));
    this._router.put('/', this._checkJwt, this._getUserInfo, this._updateWrapper.bind(this));
    this._router.delete('/:id', this._checkJwt, this._getUserInfo, this._deleteWrapper.bind(this));
    this.employeeDynamo = new DatabaseModify('employees');
    this.employeeSensitiveDynamo = new DatabaseModify('employees-sensitive');
    this.budgetDynamo = new DatabaseModify('budgets');
    this.expenseDynamo = new DatabaseModify('expenses');
    this.expenseTypeDynamo = new DatabaseModify('expense-types');
    this.tagDynamo = new DatabaseModify('tags');
  } // constructor

  /**
   * Calculates the adjusted budget amount for an expense type based on an employee's work status or tag budget.
   * Returns the adjusted amount.
   *
   * @param employee - Employee to adjust amount for
   * @param expenseType - ExpenseType budget to be adjusted
   * @param tags - The list of tags from the tags database
   * @return Number - adjusted budget amount
   */
  calcAdjustedAmount(employee, expenseType, tags) {
    // log method
    logger.log(
      4,
      'calcAdjustedAmount',
      `Calculating adjusted budget amount for employee ${employee.id} and expense type ${expenseType.id}`
    );

    // compute method
    let result;

    if (this.hasAccess(employee, expenseType)) {
      // default budget if employee is not in a budgeted tag
      let budgetAmount = expenseType.budget;

      if (expenseType.tagBudgets && expenseType.tagBudgets.length > 0) {
        let foundHighestPriorityTag = false;
        _.forEach(expenseType.tagBudgets, (tagBudget) => {
          _.forEach(tagBudget.tags, (tagId) => {
            let tag = _.find(tags, (t) => t.id === tagId);
            if (tag) {
              if (tag.employees.includes(employee.id) && !foundHighestPriorityTag) {
                // employee is included in a tag with a different budget amount
                foundHighestPriorityTag = true;
                budgetAmount = tagBudget.budget;
              }
            }
          });
        });
      }

      if (!expenseType.proRated) {
        result = budgetAmount;
      } else {
        result = Number((budgetAmount * (employee.workStatus / 100.0)).toFixed(2));
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
   * Calculates the carry over amount to the next anniversary budget. If a user spent
   * $3500 on a Training expense, then the budget was lowered to $3000, the user gets
   * $500 in legacy carry over so they are not incorrectly affected by overdraft.
   *
   * @param {Object} budget - The old budget object
   * @param {Number} adjustedAmount - The new budget amount
   * @returns Number - The carry over amount for a user's next anniversary budget
   */
  calcLegacyCarryover(budget, adjustedAmount) {
    let carryover = budget.legacyCarryover || 0;
    // only add carryover if new budget amount is being decreased
    if (adjustedAmount > budget.amount) {
      // if legacy carryover already exists, update the amount
      carryover -= adjustedAmount - budget.amount;
      return Math.max(carryover, 0);
    }
    // only add carryover if user spent more than the new budget amount
    let spent = budget.reimbursedAmount + budget.pendingAmount;
    let maxCarryover = budget.amount - adjustedAmount;
    if (spent > adjustedAmount) {
      if (spent - adjustedAmount > maxCarryover) {
        carryover += maxCarryover;
      } else {
        carryover += spent - adjustedAmount;
      }
    }
    return 0;
  } // calcLegacyCarryover

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
    logger.log(
      3,
      '_checkPermissionToCreate',
      `Checking if employee ${employee.id} has permission to create to the ${this._getTableName()} table`
    );

    // compute method
    let userPermissions = isUser(employee) && this._checkTableName(['expenses', 'training-urls', 'pto-cashouts']);
    let managerPermissions =
      isManager(employee) &&
      this._checkTableName(['training-urls', 'expenses', 'employees', 'contracts', 'pto-cashouts', 'tags']);
    let adminPermissions =
      isAdmin(employee) &&
      this._checkTableName([
        'expenses',
        'expense-types',
        'employees',
        'training-urls',
        'contracts',
        'pto-cashouts',
        'tags'
      ]);
    let internPermissions = isIntern(employee) && this._checkTableName(['expenses', 'training-urls']);

    let result = userPermissions || adminPermissions || internPermissions || managerPermissions;

    // log result
    if (result) {
      logger.log(
        3,
        '_checkPermissionToCreate',
        `Employee ${employee.id} has permission to create to the ${this._getTableName()} table`
      );
    } else {
      logger.log(
        3,
        '_checkPermissionToCreate',
        `Employee ${employee.id} does not have permission to create to the ${this._getTableName()} table`
      );
    }

    // return result
    return result;
  } // _checkPermissionToCreate

  /**
   * Check employee permissions to delete from a table. A user has permissions to delete an expense or ptoCashOut.
   * An admin has permissions to delete an expense, expense type, ptoCashOut, or employee. Returns true if the
   * employee has permissions, otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee permission to delete
   */
  _checkPermissionToDelete(employee) {
    // log method
    logger.log(
      3,
      '_checkPermissionToDelete',
      `Checking if employee ${employee.id} has permission to delete from the ${this._getTableName()} table`
    );

    // compute method
    let userPermissions = isUser(employee) && this._checkTableName(['expenses', 'pto-cashouts']);
    let adminPermissions =
      isAdmin(employee) &&
      this._checkTableName(['expenses', 'expense-types', 'employees', 'contracts', 'pto-cashouts', 'tags']);
    let internPermissions = isIntern(employee) && this._checkTableName(['expenses']);
    let managerPermissions =
      isManager(employee) && this._checkTableName(['expenses', 'employees', 'contracts', 'pto-cashouts', 'tags']);

    let result = userPermissions || adminPermissions || internPermissions || managerPermissions;

    // log result
    if (result) {
      logger.log(
        3,
        '_checkPermissionToDelete',
        `Employee ${employee.id} has permission to delete from the ${this._getTableName()} table`
      );
    } else {
      logger.log(
        3,
        '_checkPermissionToDelete',
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
    logger.log(
      3,
      '_checkPermissionToRead',
      `Checking if employee ${employee.id} has permission to read from the ${this._getTableName()} table`
    );

    // compute method
    let userPermissions =
      isUser(employee) && this._checkTableName(['expense-types', 'training-urls', 'contracts', 'pto-cashouts']);
    let adminPermissions =
      isAdmin(employee) &&
      this._checkTableName([
        'expenses',
        'expense-types',
        'employees',
        'training-urls',
        'contracts',
        'pto-cashouts',
        'tags'
      ]);
    let internPermissions = isIntern(employee) && this._checkTableName(['employees', 'training-urls', 'contracts']);
    let managerPermissions =
      isManager(employee) &&
      this._checkTableName([
        'employees',
        'training-urls',
        'expense-types',
        'expenses',
        'contracts',
        'pto-cashouts',
        'tags'
      ]);
    let result = userPermissions || adminPermissions || internPermissions || managerPermissions;

    // log result
    if (result) {
      logger.log(
        3,
        '_checkPermissionToRead',
        `Employee ${employee.id} has permission to read from the ${this._getTableName()} table`
      );
    } else {
      logger.log(
        3,
        '_checkPermissionToRead',
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
    logger.log(
      3,
      '_checkPermissionToReadAll',
      `Checking if employee ${employee.id} has permission to read all entries from the ${this._getTableName()} table`
    );
    // compute method
    let userPermissions = isUser(employee) && this._checkTableName(['employees', 'training-urls', 'contracts', 'tags']);
    let adminPermissions =
      isAdmin(employee) &&
      this._checkTableName([
        'expenses',
        'expense-types',
        'employees',
        'employees-sensitive',
        'training-urls',
        'contracts',
        'pto-cashouts',
        'tags'
      ]);
    let internPermissions = isIntern(employee) && this._checkTableName(['employees', 'training-urls', 'contracts']);
    let managerPermissions =
      isManager(employee) &&
      this._checkTableName([
        'employees',
        'employees-sensitive',
        'training-urls',
        'expense-types',
        'contracts',
        'pto-cashouts',
        'expenses',
        'tags'
      ]);
    let result = userPermissions || adminPermissions || internPermissions || managerPermissions;

    // log result
    if (result) {
      logger.log(
        3,
        '_checkPermissionToReadAll',
        `Employee ${employee.id} has permission to read all entries from the ${this._getTableName()} table`
      );
    } else {
      logger.log(
        3,
        '_checkPermissionToReadAll',
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
    logger.log(
      3,
      '_checkPermissionToUpdate',
      `Checking if employee ${employee.id} has permission to update the ${this._getTableName()} table`
    );

    // compute method
    let userPermissions =
      isUser(employee) && this._checkTableName(['expenses', 'employees', 'training-urls', 'pto-cashouts']);
    let adminPermissions =
      isAdmin(employee) &&
      this._checkTableName([
        'expenses',
        'expense-types',
        'employees',
        'training-urls',
        'contracts',
        'pto-cashouts',
        'tags'
      ]);
    let internPermissions = isIntern(employee) && this._checkTableName(['expenses', 'employees', 'training-urls']);
    let managerPermissions =
      isManager(employee) &&
      this._checkTableName(['employees', 'training-urls', 'expenses', 'contracts', 'pto-cashouts', 'tags']);
    let result = userPermissions || adminPermissions || internPermissions || managerPermissions;

    // log result
    if (result) {
      logger.log(
        3,
        '_checkPermissionToUpdate',
        `Employee ${employee.id} has permission to update the ${this._getTableName()} table`
      );
    } else {
      logger.log(
        3,
        '_checkPermissionToUpdate',
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
    logger.log(
      5,
      '_checkTableName',
      `Checking if ${this._getTableName()} is in the list of table names [${tableNames}]`
    );

    // compute method
    let envTableNames = [];
    _.forEach(tableNames, (tableName) => {
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
   * @param annualStart - the start date of the budget if it is annual
   * @return Budget - budget created
   */
  async createNewBudget(employee, expenseType, annualStart, tags) {
    // log method
    logger.log(
      2,
      'createNewBudget',
      `Attempting to create a new budget for employee ${employee.id} with expense type ${expenseType.id}`
    );
    try {
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
          budgetData.fiscalEndDate = dateUtils.subtract(dateUtils.add(annualStart, 1, 'year', ISOFORMAT), 1, 'day');
        } else {
          // set fiscal dates to current anniversary date if no start date provided
          let dates = this.getBudgetDates(employee.hireDate);
          budgetData.fiscalStartDate = dates.startDate;
          budgetData.fiscalEndDate = dates.endDate;
        }
      } else {
        budgetData.fiscalStartDate = expenseType.startDate;
        budgetData.fiscalEndDate = expenseType.endDate;
      }

      // set the amount of the new budget
      budgetData.amount = this.calcAdjustedAmount(employee, expenseType, tags);

      let newBudget = new Budget(budgetData);

      let budget = await this.budgetDynamo.addToDB(newBudget); // add budget to database

      // log success
      logger.log(
        2,
        'createNewBudget',
        `Successfully created new budget ${budget.id} for employee ${employee.id} with expense type ${expenseType.id}`
      );

      // return new budget
      return budget;
    } catch (err) {
      // log error
      logger.log(
        2,
        'createNewBudget',
        `Failed to create new budget for employee ${employee.id} and expense type ${expenseType.id}`
      );

      // throw error
      throw err;
    }
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
    try {
      if (this._checkPermissionToCreate(req.employee)) {
        // employee has permissions to create to table
        let objectCreated = await this._create(req.body); // create object
        let objectValidated = await this._validateInputs(objectCreated); // validate inputs
        let dataCreated = await this.databaseModify.addToDB(objectValidated); // add object to database

        // log success, created an expense, expense type, or employee
        logger.log(1, '_createWrapper', `Successfully created object ${dataCreated.id} in ${this._getTableName()}`);

        // send successful 200 status
        res.status(200).send(dataCreated);

        // return created data
        return dataCreated;
      } else {
        // employee does not have permissions to create table
        throw {
          code: 403,
          message: 'Unable to create object in database due to insufficient employee permissions.'
        };
      }
    } catch (err) {
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
    try {
      if (this._checkPermissionToDelete(req.employee)) {
        // employee has permission to delete from table
        let objectDeleted = await this._delete(req.params.id); // delete object
        let dataDeleted = await this.databaseModify.removeFromDB(objectDeleted.id); // remove from database

        // log success
        logger.log(1, '_deleteWrapper', `Successfully deleted object ${dataDeleted.id} from ${this._getTableName()}`);

        // send successful 200 status
        res.status(200).send(dataDeleted);

        // return object removed
        return dataDeleted;
      } else {
        // employee does not have permissions to delete from table
        throw {
          code: 403,
          message: 'Unable to delete object from database due to insufficient employee permissions.'
        };
      }
    } catch (err) {
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
   * @param date - ISO formatted hire date String
   * @return Object - start date and end date
   */
  getBudgetDates(date) {
    if (!date) return { startDate: null, endDate: null };
    // log method
    logger.log(4, 'getBudgetDates', `Getting current annual budget dates for ${date}`);

    // compute method
    let startYear;
    let hireDate = dateUtils.format(date, null, ISOFORMAT);
    let [hireYear, hireMonth, hireDay] = hireDate.split('-');
    let today = dateUtils.getTodaysDate();

    // determine start date year
    if (dateUtils.isBefore(hireDate, today)) {
      // hire date is before today
      // if anniversary hasn't occured yet this year, set the start of the budget to last year
      // if the anniversary already occured this year, set the start of the budget to this year
      let budgetDate = `${dateUtils.getYear(today)}-${hireMonth}-${hireDay}`;
      startYear = dateUtils.isBefore(today, budgetDate) ? dateUtils.getYear(today) - 1 : dateUtils.getYear(today);
    } else {
      // hire date is after today
      startYear = hireYear;
    }

    // ensure year is always 4 digits
    startYear = String(startYear).padStart(4, '0');

    let startDate = `${startYear}-${hireMonth}-${hireDay}`;
    let endDate = dateUtils.subtract(dateUtils.add(startDate, 1, 'year'), 1, 'day');
    let result = {
      startDate,
      endDate
    };

    // log result
    logger.log(
      4,
      'getBudgetDates',
      `Current annual budget date for ${date} starts on ${startDate} and ends on`,
      `${endDate}`
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
    return generateUUID();
  } // getUUID

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
    } else if (expenseType.accessibleBy.includes('Intern') && employee.employeeRole == 'intern') {
      result = true;
    } else if (
      expenseType.accessibleBy.includes('FullTime') &&
      employee.employeeRole != 'intern' &&
      employee.workStatus == 100
    ) {
      result = true;
    } else if (
      expenseType.accessibleBy.includes('PartTime') &&
      employee.employeeRole != 'intern' &&
      employee.workStatus < 100
    ) {
      result = true;
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
   * Checks if a value is a valid iso-format date (YYYY-MM-DD). Returns true if it is isoformat, otherwise returns
   * false.
   *
   * @param value - value to check
   * @return boolean - value is in iso-format
   */
  isIsoFormat(value) {
    return /[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]/.test(value);
  } // isIsoFormat

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

    try {
      if (this._checkPermissionToRead(req.employee)) {
        // employee has permission to read from table
        let dataRead = await this._read(req.params); // read object

        // validate user permission to the read expense
        if ((isUser(req.employee) || isManager(req.employee)) && this._checkTableName(['expenses'])) {
          // user is reading an expense
          // check the expense belongs to the user
          if (dataRead.employeeId !== req.employee.id) {
            // expense does not belong to user
            throw FORBIDDEN;
          }
        }

        // log success
        if (dataRead instanceof TrainingUrl) {
          // read a training url
          logger.log(
            1,
            '_readWrapper',
            `Successfully read object ${dataRead.id} with category ${dataRead.category} from ${this._getTableName()}`
          );
        } else {
          // read an expense, expense-type, or employee
          logger.log(1, '_readWrapper', `Successfully read object ${dataRead.id} from ${this._getTableName()}`);
        }

        // send successful 200 status
        res.status(200).send(dataRead);

        // return read data
        return dataRead;
      } else {
        // employee does not have permission to read
        throw FORBIDDEN;
      }
    } catch (err) {
      // log error
      logger.log(1, '_readWrapper', `Failed to read object from ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _readWrapper

  // temporary
  /**
   * gets all entries in the DB
   *
   * @return all entries
   */
  async _readAll() {
    return await this.databaseModify.getAllEntriesInDB();
  } // _readAll

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
    try {
      if (this._checkPermissionToReadAll(req.employee)) {
        // employee has permission to read all objects from table
        let dataRead = await this._readAll(req.employee); // read from database

        // log success
        logger.log(1, '_readAllWrapper', `Successfully read all objects from ${this._getTableName()}`);

        // send successful 200 status
        res.status(200).send(dataRead);

        // return read data
        return dataRead;
      } else {
        // employee does not have permission to read all objects from table
        throw {
          code: 403,
          message: 'Unable to read all objects from database due to insufficient employee permissions.'
        };
      }
    } catch (err) {
      // log error
      logger.log(1, '_readAllWrapper', `Failed to read all objects from ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

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
    if (err.code && err.message) {
      logger.log(3, '_sendError', `Sending ${err.code} error status: ${err.message}`);

      // return error status
      return res.status(err.code).send(err);
    } else {
      logger.log(3, '_sendError', `Sending 500 error status: ${err.message}`);

      // return error status
      return res.status(500).send(err);
    }
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
    try {
      if (this._checkPermissionToUpdate(req.employee)) {
        // employee has permission to update table
        let objectUpdated = await this._update(req); // update object
        let objectValidated = await this._validateInputs(objectUpdated); // validate inputs
        let dataUpdated;
        // add object to database
        if (objectValidated.id == req.body.id) {
          // update database if the id's are the same
          dataUpdated = await this.databaseModify.updateEntryInDB(objectValidated);
        } else {
          // id's are different (database updated when changing expense types in expenseRoutes)
          dataUpdated = objectValidated;
        }

        // log success
        if (dataUpdated instanceof TrainingUrl) {
          // updated a training url
          logger.log(
            1,
            '_updateWrapper',
            `Successfully updated object ${dataUpdated.id} with category ${dataUpdated.category} from`,
            `${this._getTableName()}`
          );
        } else {
          // updated an expense, expense-type, or employee
          logger.log(1, '_updateWrapper', `Successfully updated object ${dataUpdated.id} from ${this._getTableName()}`);
        }

        // send successful 200 status
        res.status(200).send(dataUpdated);

        // return updated data
        return dataUpdated;
      } else {
        // employee does not have permissions to update table
        throw {
          code: 403,
          message: 'Unable to update object in database due to insufficient employee permissions.'
        };
      }
    } catch (err) {
      // log error
      logger.log(1, '_updateWrapper', `Failed to update object in ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _updateWrapper

  // eslint-disable-next-line no-unused-vars

  /**
   * Updates an attribute of an object. Returns the object updated.
   *
   * @param body - data of object
   * @return Object - object updated
   */
  // eslint-disable-next-line no-unused-vars
  async _updateAttribute(body) {
    // This function must be overwritten
  } // _updateAttribute

  /**
   * Update object in database. If successful, sends 200 status request with the object updated and returns the object.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - object updated
   */
  async _updateAttributeWrapper(req, res) {
    // log method
    logger.log(1, '_updateAttributeWrapper', `Attempting to update an object in ${this._getTableName()}`);

    // compute method
    try {
      if (this._checkPermissionToUpdate(req.employee)) {
        // employee has permission to update table
        let { objectUpdated, table } = await this._updateAttribute(req); // update object
        let objectValidated = await this._validateInputs(objectUpdated); // validate inputs
        let dataUpdated;
        // add object to database
        if (objectValidated.id == req.body.id) {
          table = table || this.databaseModify;
          // update database if the id's are the same
          dataUpdated = await table.updateAttributeInDB(objectValidated, req.params.attribute);
        } else {
          // id's are different (database updated when changing expense types in expenseRoutes)
          dataUpdated = objectValidated;
        }
        // updated an attribute expense, expense-type, or employee
        logger.log(1, '_updateWrapper', `Successfully updated object ${dataUpdated.id} from ${this._getTableName()}`);

        // send successful 200 status
        res.status(200).send(dataUpdated);

        // return updated data
        return dataUpdated;
      } else {
        // employee does not have permissions to update table
        throw {
          code: 403,
          message: 'Unable to update attribute in database due to insufficient employee permissions.'
        };
      }
    } catch (err) {
      // log error
      logger.log(1, '_updateWrapper', `Failed to update attribute in ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _updateWrapper

  /**
   * Updates an attributes of an object. Returns the object updated.
   *
   * @param req - request
   * @return Object - object updated
   */
  // eslint-disable-next-line no-unused-vars
  async _updateAttributes(req) {
    // This function must be overwritten
  } // _updateAttribute

  /**
   * Update object in database. If successful, sends 200 status request with the object updated and returns the object.
   * Note: updates multiple attributes for an object
   *
   * @param req - api request
   * @param res - api response
   * @return Object - object updated
   */
  async _updateAttributesWrapper(req, res) {
    // log method
    logger.log(1, '_updateAttributesWrapper', `Attempting to update an object in ${this._getTableName()}`);
    // compute method
    try {
      if (this._checkPermissionToUpdate(req.employee)) {
        // employee has permission to update table
        let { objectUpdated, tables } = await this._updateAttributes(req); // update object
        let objectValidated = await this._validateInputs(objectUpdated); // validate inputs
        let dataUpdated = [];
        // add object to database
        if (objectValidated.id == req.params.id) {
          // no tables returned no updates
          tables = tables || [{ table: this.databaseModify.tableName, attributes: [] }];
          // update databases if the id's are the same
          dataUpdated = await DatabaseModify.updateAttributesInDB(objectValidated, tables);
        } else {
          // id's are different (database updated when changing expense types in expenseRoutes)
          dataUpdated = objectValidated;
        }
        // updated an attribute expense, expense-type, or employee
        logger.log(
          1,
          '_updateAttributesWrapper',
          `Successfully updated object ${dataUpdated.id} from ${this._getTableName()}`
        );

        // send successful 200 status
        res.status(200).send(dataUpdated);

        // return updated data
        return dataUpdated;
      } else {
        // employee does not have permissions to update table
        throw {
          code: 403,
          message: 'Unable to update attributes in database due to insufficient employee permissions.'
        };
      }
    } catch (err) {
      // log error
      logger.log(1, '_updateAttributesWrapper', `Failed to update attributes in ${this._getTableName()}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _updateAttributesWrapper

  /**
   * Validate inputs. Returns the object if all inputs are valid.
   *
   * @param object - object to be validated
   * @return Object - object validated
   */
  async _validateInputs(object) {
    // log method
    logger.log(3, '_validateInputs', `Validating inputs for ${this._getTableName()}`);

    // compute method
    if (object.id) {
      // object id exists
      var checkAttributes = function (obj) {
        return _.includes(obj, '');
      };

      let checkAttributesCurried = _.curry(checkAttributes);
      // return curried promise
      return new Promise(function (resolve, reject) {
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
      let err = {
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
