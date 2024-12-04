const _ = require('lodash');
const Budget = require(process.env.AWS ? 'budget' : '../models/budget');
const Crud = require(process.env.AWS ? 'crudRoutes' : './crudRoutes');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Employee = require(process.env.AWS ? 'employee' : '../models/employee');
const EmployeeSensitive = require(process.env.AWS ? 'employee-sensitive' : '../models/employee-sensitive');
const ExpenseType = require(process.env.AWS ? 'expenseType' : '../models/expenseType');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');
const { SNSClient, OptInPhoneNumberCommand } = require('@aws-sdk/client-sns');

const snsClient = new SNSClient({});

const IsoFormat = 'YYYY-MM-DD';
const logger = new Logger('employeeRoutes');
const STAGE = process.env.STAGE;

class EmployeeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new DatabaseModify('employees');
    this.employeeSensitiveDynamo = new DatabaseModify('employees-sensitive');
  } // constructor

  /**
   * Prepares an employee to be created. Returns the employee if it can be successfully created.
   *
   * @param data - data of employee
   * @return Employee - employee prepared to create
   */
  async _create(data) {
    // log method
    logger.log(2, '_create', `Preparing to create employee ${data.id}`);

    // compute method
    try {
      // sets all non sensitive data
      let employee = new Employee(data);
      // sets all sensitive data
      let employeeSensitive = new EmployeeSensitive(data);

      await this._validateEmployee(employee, employeeSensitive); // validate employee
      await this._validateCreate(employee); // validate create

      // log success
      logger.log(2, '_create', `Successfully prepared to create employee ${data.id}`);

      // return prepared employee
      return employee;
    } catch (err) {
      // log error
      logger.log(2, '_create', `Failed to prepare create for employee ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _create

  /**
   * Creates employee and employee-sensitive object in database. If successful, sends 200 status
   * response with the newly created employee object and returns new employee object.
   *
   * @param {*} req - api request
   * @param {*} res - api response
   * @returns Object - employee object created
   */
  async _createWrapper(req, res) {
    // log method
    logger.log(1, '_createWrapper', `Attempting to create an object in ${this._getTableName()}`);

    // compute method
    try {
      if (this._checkPermissionToCreate(req.employee)) {
        // employee has permissions to create to table
        let employeeObjectCreated = await this._create(req.body); // create object
        let employeeObjectValidated = await this._validateInputs(employeeObjectCreated); // validate inputs

        // log success
        let sensitiveData = new EmployeeSensitive(req.body);
        let sensitiveObjectValidated = await this._validateInputs(sensitiveData); // validate inputs

        // Uses transact write items feature to execute API requests. If one invocation fails, all fails
        await this.addEmployeeToDB(employeeObjectValidated, sensitiveObjectValidated);

        // created an entry for an employees sensitive data
        logger.log(
          1,
          '_createWrapper',
          `Successfully created object ${employeeObjectValidated.id} in ${STAGE}-employees-sensitive`
        );

        // send successful 200 status
        res.status(200).send(employeeObjectValidated);

        // return created data
        return employeeObjectValidated;
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
  } // _createdWrapper

  /**
   * Adds employee and employeeSensitive objects to DynamoDB simultaneously, if one request fails, both
   * requests fail.
   *
   * @param {*} employee employee object
   * @param {*} employeeSensitive employee sensitive object
   */
  async addEmployeeToDB(employee, employeeSensitive) {
    let items = [
      {
        Put: {
          TableName: `${STAGE}-employees`,
          Item: employee
        }
      },
      {
        Put: {
          TableName: `${STAGE}-employees-sensitive`,
          Item: employeeSensitive
        }
      }
    ];
    await DatabaseModify.TransactItems(items);
    return employee;
  } // addEmployeeToDB

  /**
   * Prepares an employee to be deleted. Returns the employee if it can be successfully deleted.
   *
   * @param id - id of employee
   * @return Employee - employee prepared to delete
   */
  async _delete(id) {
    // log method
    logger.log(2, '_delete', `Preparing to delete employee ${id}`);

    // compute method
    try {
      let employee = new Employee(await this.databaseModify.getEntry(id));
      await this._validateDelete(employee);

      // log success
      logger.log(2, '_delete', `Successfully prepared to delete employee ${id}`);

      // return employee deleted
      return employee;
    } catch (err) {
      // log error
      logger.log(2, '_delete', `Failed to prepare delete for employee ${id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _delete

  /**
   * Delete employee and employee-sensitive object in database. If succcesful, sends 200 status
   * response with the deleted employee object and returns deleted employee object.
   *
   * @param req - api request
   * @param res - api response
   * @returns Object - employee object deleted
   */
  async _deleteWrapper(req, res) {
    // log method
    logger.log(1, '_deleteWrapper', `Attempting to delete an object from ${this._getTableName()}`);

    // compute method
    try {
      if (this._checkPermissionToDelete(req.employee)) {
        // employee has permission to delete from table
        let objectDeleted = await this._delete(req.params.id); // delete object
        await this.deleteEmployeeFromDB(objectDeleted.id);

        // log success
        logger.log(1, '_deleteWrapper', `Successfully deleted object ${objectDeleted.id} from ${this._getTableName()}`);

        // deleted an entry of an employees sensitive data
        logger.log(
          1,
          '_deleteWrapper',
          `Successfully deleted object ${objectDeleted.id} in ${STAGE}-employees-sensitive`
        );

        // send successful 200 status
        res.status(200).send(objectDeleted);

        // return object removed
        return objectDeleted;
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
   * Deletes employee and employeeSensitive object from DynamoDB simultaneously. If one request fails, both
   * request fails.
   *
   * @param employeeId employee ID to delete
   * @returns employee object
   */
  async deleteEmployeeFromDB(employeeId) {
    let items = [
      {
        Delete: {
          TableName: `${STAGE}-employees`,
          Key: {
            id: employeeId
          },
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD'
        }
      },
      {
        Delete: {
          TableName: `${STAGE}-employees-sensitive`,
          Key: {
            id: employeeId
          },
          ReturnValuesOnConditionCheckFailure: 'ALL_OLD'
        }
      }
    ];
    return await DatabaseModify.TransactItems(items);
  } // deleteEmployeeFromDB

  /**
   * Gets all expensetype data and then parses the categories
   *
   * @return - all the expense types
   */
  async getAllExpenseTypes() {
    let expenseTypesData = await this.expenseTypeDynamo.getAllEntriesInDB();
    let expenseTypes = _.map(expenseTypesData, (expenseTypeData) => {
      expenseTypeData.categories = _.map(expenseTypeData.categories, (category) => {
        return JSON.parse(category);
      });
      return new ExpenseType(expenseTypeData);
    });

    return expenseTypes;
  } // getAllExpenseTypes

  /**
   * Reads an employee from the database. Returns the employee read.
   *
   * @param data - parameters of employee
   * @return Employee - employee read
   */
  async _read(data) {
    // log method
    logger.log(2, '_read', `Attempting to read employee ${data.id}`);

    // compute method
    try {
      let employee = new Employee(await this.databaseModify.getEntry(data.id)); // read from database

      // log success
      logger.log(2, '_read', `Successfully read employee ${data.id}`);

      // return employee
      return employee;
    } catch (err) {
      // log error
      logger.log(2, '_read', `Failed to read employee ${data.id}`);

      // return error
      return Promise.reject(err);
    }
  } // _read

  /**
   * Read employee and employee-sensitive object (if permissions suffice) in database. If successful, sends 200
   * status response with the employee object read and returns the employee object.
   *
   * @param req - api request
   * @param res - api response
   * @returns Object - object read
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
        if ((this.isUser(req.employee) || this.isManager(req.employee)) && this._checkTableName(['expenses'])) {
          // user is reading an expense
          // check the expense belongs to the user
          if (dataRead.employeeId !== req.employee.id) {
            // expense does not belong to user
            throw FORBIDDEN;
          }
        }

        // log success
        let sensitiveData = new EmployeeSensitive(await this.employeeSensitiveDynamo.getEntry(dataRead.id));
        // combine employee regular data with sensitive data
        dataRead = { ...dataRead, ...sensitiveData };
        // created an entry for an employees sensitive data
        logger.log(
          1,
          '_createWrapper',
          `Successfully created object ${sensitiveData.id} in ${STAGE}-employees-sensitive`
        );

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

  /**
   * Reads all employees from the database. Returns all employees.
   *
   * @param employee - employee user signed in
   * @return Array - all employees
   */
  async _readAll(employee) {
    // log method
    logger.log(2, '_readAll', 'Attempting to read all employees');

    // compute method
    try {
      // get public and sensitive data from different DBs
      let [employeesData, employeesSensitiveData] = await Promise.all([
        this.databaseModify.getAllEntriesInDB(),
        this.employeeSensitiveDynamo.getAllEntriesInDB()
      ]);
      let employees = _.map(employeesData, (e) => {
        let emp = new Employee(e);
        if (employee.employeeRole == 'admin' || employee.employeeRole == 'manager') {
          // include sensitive data for employees if the user has a high enough role
          let empSensitive = new EmployeeSensitive(employeesSensitiveData.find((em) => em.id == e.id));
          if (empSensitive) {
            emp = { ...emp, ...empSensitive };
          }
        }
        return emp;
      });

      // log success
      logger.log(2, '_readAll', 'Successfully read all employees');

      // return all employees
      return employees;
    } catch (err) {
      // log error
      logger.log(2, '_readAll', 'Failed to read all employees');

      // return error
      return Promise.reject(err);
    }
  } // readAll

  /**
   * Prepares an employee to be updated. Returns the employee if it can be successfully updated.
   *
   * @param req - request
   * @return Employee - employee prepared to update
   */
  async _update(req) {
    let data = req.body;
    // log method
    logger.log(2, '_update', `Preparing to update employee ${data.id}`);

    // compute method
    try {
      let oldEmployeeBasic = new Employee(await this.databaseModify.getEntry(data.id));
      let oldEmployeeSensitive = new EmployeeSensitive(await this.employeeSensitiveDynamo.getEntry(data.id));
      let newEmployeeBasic = new Employee(data);
      let newEmployeeSensitive = new EmployeeSensitive(data);
      newEmployeeSensitive.handleEEOData(oldEmployeeSensitive, req.employee);
      let newEmployee = { ...newEmployeeBasic, ...newEmployeeSensitive };
      await Promise.all([
        this._validateEmployee(newEmployeeBasic, newEmployeeSensitive),
        this._validateUpdate(oldEmployeeBasic, newEmployeeBasic, req.employee),
        oldEmployeeBasic.workStatus !== newEmployeeBasic.workStatus ||
        oldEmployeeSensitive.employeeRole !== newEmployeeSensitive.employeeRole
          ? this._updateBudgets(oldEmployeeBasic, newEmployeeBasic)
          : _
      ]);

      // log success
      logger.log(2, '_update', `Successfully prepared to update employee ${data.id}`);

      // return employee to update
      return newEmployee;
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for employee ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

  /**
   * Prepares an employee's attribute to be updated. Returns the employee if it can be successfully updated.
   *
   * @param req - request
   * @return Employee - employee prepared to update
   */
  async _updateAttribute(req) {
    let data = req.body;
    let tableToUpdate = this.databaseModify;
    // log method
    logger.log(2, '_update', `Preparing to update employee ${data.id}`);

    // compute method
    try {
      let newEmployee = await this._validateAttributes(req, data.id);

      if (EmployeeSensitive.getFields()?.includes(req.params.attribute)) tableToUpdate = this.employeeSensitiveDynamo;

      // log success
      logger.log(2, '_update', `Successfully prepared to update employee ${data.id}`);

      // return employee to update
      return { objectUpdated: newEmployee, table: tableToUpdate };
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for employee ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _updateAttribute

  /**
   * Prepares an employee's attributes to be updated.
   * Returns the employee if it can be successfully updated along with tables to update.
   *
   * @param req - request
   * @return {{objectUpdated: object, tables: [{ tableName: any, attributes: string[]}]}}
   */
  async _updateAttributes(req) {
    let data = req.body;
    let databaseTable = { table: this.databaseModify.tableName, attributes: [] };
    let sensitiveTable = { table: this.employeeSensitiveDynamo.tableName, attributes: [] };
    let tablesToUpdate = [databaseTable];

    // log method
    logger.log(2, '_updateAttributes', `Preparing to update employee ${req.params.id}`);

    // compute method
    try {
      let newEmployee = await this._validateAttributes(req, req.params.id);
      const basicFields = Employee.getFields();
      const sensitiveFields = EmployeeSensitive.getFields();
      //populate table attributes to update
      for (const key of Object.keys(data)) {
        if (sensitiveFields.includes(key)) {
          //add sensitive data table to update
          if (tablesToUpdate.length == 1) {
            tablesToUpdate.push(sensitiveTable);
          }
          tablesToUpdate[1].attributes.push(key);
        } else if (basicFields.includes(key)) {
          tablesToUpdate[0].attributes.push(key);
        } else {
          throw {
            code: 400,
            message: `${key} attribute does not exist`
          };
        }
      }
      // log success
      logger.log(2, '_updateAttributes', `Successfully prepared to update employee ${newEmployee.id}`);

      // return employee to update
      return { objectUpdated: newEmployee, tables: tablesToUpdate };
    } catch (err) {
      // log error
      logger.log(2, '_updateAttributes', `Failed to prepare update for employee ${req.params.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _updateAttributes

  /**
   * Update employee in database. If successful, sends 200 status request with the
   * object updated and returns the object.
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
        let employeeUpdated = await this._update(req); // update employee
        let employeeValidated = await this._validateInputs(employeeUpdated); // validate inputs
        // add object to database
        let sameIds = false;
        if (employeeValidated.id == req.body.id) {
          // update database if the id's are the same
          sameIds = true;
        }

        let basicData = new Employee(employeeValidated);
        let sensitiveData = new EmployeeSensitive(employeeValidated);
        if (sameIds) {
          await this.updateEmployeeInDB(basicData, sensitiveData);
        }
        // updated an entry for an employees sensitive data
        logger.log(
          1,
          '_createWrapper',
          `Successfully created object ${employeeValidated.id} in ${this.STAGE}-employees-sensitive`
        );
        employeeValidated = { ...employeeValidated, ...sensitiveData };

        // log success
        logger.log(
          1,
          '_updateWrapper',
          `Successfully updated object ${employeeValidated.id} from ${this._getTableName()}`
        );

        // send successful 200 status
        res.status(200).send(employeeValidated);

        // return updated data
        return employeeValidated;
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

  /**
   * Updates employee and employeeSensitive object simultaneously, if one request fails, both requests fail.
   *
   * @param employee employee object to update
   * @param employeeSensitive employee sensitive object to update
   */
  async updateEmployeeInDB(employee, employeeSensitive) {
    let items = [
      {
        Put: {
          TableName: `${STAGE}-employees`,
          Item: employee
        }
      },
      {
        Put: {
          TableName: `${STAGE}-employees-sensitive`,
          Item: employeeSensitive
        }
      }
    ];
    await DatabaseModify.TransactItems(items);
  } // updateEmployeeInDB

  /**
   * Updates budgets when changing an employee.
   *
   * @param oldEmployee - Employee to be updated from
   * @param newEmployee - Employee to be updated to
   * @return Array - Array of employee Budgets
   */
  async _updateBudgets(oldEmployee, newEmployee) {
    // log method
    logger.log(2, '_updateBudgets', `Attempting to update budgets for employee ${oldEmployee.id}`);

    // compute method
    try {
      let budgets = [];

      // need to update budgets
      let [budgetsData, tags, expenseTypes] = await Promise.all([
        this.budgetDynamo.querySecondaryIndexInDB('employeeId-expenseTypeId-index', 'employeeId', oldEmployee.id),
        this.tagDynamo.getAllEntriesInDB(),
        this.getAllExpenseTypes()
      ]);

      budgets = _.map(budgetsData, (budgetData) => {
        return new Budget(budgetData);
      });

      let i; // index of budgets
      let promises = [];
      for (i = 0; i < budgets.length; i++) {
        // update budget amount
        let start = dateUtils.format(budgets[i].fiscalStartDate, null, IsoFormat); // budget start date
        let end = dateUtils.format(budgets[i].fiscalEndDate, null, IsoFormat); // budget end date
        if (dateUtils.isBetween(dateUtils.getTodaysDate(), start, end, 'day', '[]')) {
          // only update active budgets
          let expenseType = _.find(expenseTypes, ['id', budgets[i].expenseTypeId]);
          let adjustedAmount = this.calcAdjustedAmount(newEmployee, expenseType, tags);
          budgets[i].legacyCarryover = this.calcLegacyCarryover(budgets[i], adjustedAmount);
          budgets[i].amount = adjustedAmount;
          logger.log(2, '_updateBudgets', `Budget: ${expenseType}, Amount: ${budgets[i].amount}`);
          // update budget in database
          try {
            promises.push(this.budgetDynamo.updateEntryInDB(budgets[i]));

            // log budget update success
            logger.log(2, '_updateBudgets', `Successfully updated budget ${budgets[i].id}`);
          } catch (err) {
            // log and throw budget update failure
            logger.log(2, '_updateBudgets', `Failed updated budget ${budgets[i].id}`);
            throw err;
          }
        }
      }
      await Promise.all(promises);

      // log success
      logger.log(2, '_updateBudgets', `Successfully updated budgets for employee ${oldEmployee.id}`);

      // return updated bugets
      return budgets;
    } catch (err) {
      // log error
      logger.log(2, '_updateBudgets', `Failed to update budgets for employee ${oldEmployee.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _updateBudgets

  /**
   * Validates updates to employee attribute updates.
   *
   * @param req - request object
   * @param id - id of employee
   * @returns newEmployee - validated employee object.
   */
  async _validateAttributes(req, id) {
    let data = req.body;
    let [employeeBasic, employeeSensitive] = await Promise.all([
      this.databaseModify.getEntry(id),
      this.employeeSensitiveDynamo.getEntry(id)
    ]);
    employeeBasic = new Employee(employeeBasic);
    employeeSensitive = new EmployeeSensitive(employeeSensitive);
    let newEmployeeBasic = new Employee({ ...employeeBasic, ...data });
    let newEmployeeSensitive = new EmployeeSensitive({ ...employeeSensitive, ...data });
    newEmployeeSensitive.handleEEOData(employeeSensitive, req.employee);
    let oldEmployee = { ...employeeBasic, ...employeeSensitive };
    let newEmployee = { ...newEmployeeBasic, ...newEmployeeSensitive };
    await Promise.all([
      this._validateEmployee(newEmployeeBasic, newEmployeeSensitive),
      this._validateUpdate(employeeBasic, newEmployeeBasic),
      employeeBasic.workStatus !== newEmployeeBasic.workStatus ||
      employeeSensitive.employeeRole !== newEmployeeSensitive.employeeRole
        ? this._updateBudgets(employeeBasic, newEmployeeBasic)
        : _
    ]);

    let oldPhoneNumbers = [...(oldEmployee.publicPhoneNumbers || []), ...(oldEmployee.privatePhoneNumbers || [])];
    let newPhoneNumbers = [...(newEmployee.publicPhoneNumbers || []), ...(newEmployee.privatePhoneNumbers || [])];
    let command = null;
    _.forEach(oldPhoneNumbers, (oldPhoneNumber) => {
      let newNum = _.find(newPhoneNumbers, (newPhoneNumber) => newPhoneNumber.number === oldPhoneNumber.number);
      if (newNum && oldPhoneNumber.smsOptedOut && !newNum.smsOptedOut) {
        const input = { phoneNumber: `+1${newNum.number?.replace(/-/g, '')}` };
        command = new OptInPhoneNumberCommand(input);
      }
    });
    if (command) await snsClient.send(command);

    return newEmployee;
  }

  /**
   * Validate that an employee can be created. Returns the employee if the employee can be created.
   *
   * @param employee - Employee to be created
   * @return Employee - validated employee
   */
  async _validateCreate(employee) {
    // log method
    logger.log(3, '_validateCreate', `Validating create for employee ${employee.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating create for employee.'
      };

      let employees = await this.databaseModify.getAllEntriesInDB();

      // validate duplicate employee id
      if (employees.some((e) => e.id === employee.id)) {
        // log error
        logger.log(3, '_validateCreate', `Employee ID ${employee.id} is duplicated`);

        // throw error
        err.message = 'Unexpected duplicate id created. Please try submitting again.';
        throw err;
      }

      // validateduplicate employee number
      if (employees.some((e) => e.employeeNumber === employee.employeeNumber)) {
        // log error
        logger.log(3, '_validateCreate', `Employee number ${employee.employeeNumber} is duplicated`);

        // throw error
        err.message = `Employee number ${employee.employeeNumber} already taken. Please enter a new number.`;
        throw err;
      }

      // validate duplicate employee email
      if (employees.some((e) => e.email === employee.email)) {
        // log error
        logger.log(3, '_validateCreate', `Employee ID ${employee.id} is duplicated`);

        // throw error
        err.message = `Employee email ${employee.email} already taken. Please enter a new email.`;
        throw err;
      }

      // log success
      logger.log(3, '_validateCreate', `Successfully validated create for employee ${employee.id}`);

      // return employee on success
      return Promise.resolve(employee);
    } catch (err) {
      // log error
      logger.log(3, '_validateCreate', `Failed to validate create for employee ${employee.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateCreate

  /**
   * Validate that an employee can be deleted. Returns the employee if successfully validated, otherwise returns an
   * error.
   *
   * @param employee - employee to validate delete
   * @return Employee - validated employee
   */
  async _validateDelete(employee) {
    // log method
    logger.log(3, '_validateDelete', `Validating delete for employee ${employee.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating delete for employee.'
      };

      // get all expenses for this employee
      let expenses = await this.expenseDynamo.querySecondaryIndexInDB('employeeId-index', 'employeeId', employee.id);

      // validate the employee does not have any expenses
      if (expenses.length > 0) {
        // log error
        logger.log(2, '_validateDelete', `Expenses exist for employee ${employee.id}`);

        // throw error
        err.message = 'Cannot delete an employee with expenses.';
        throw err;
      }

      // log success
      logger.log(3, '_validateDelete', `Successfully validated delete for employee ${employee.id}`);

      // return employee on success
      return employee;
    } catch (err) {
      // log error
      logger.log(3, '_validateDelete', `Failed to validate delete for employee ${employee.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateDelete

  /**
   * Validate that an employee is valid. Returns the employee if successfully validated, otherwise returns an error.
   *
   * @param employee - Employee object to be validated
   * @param employeeSensitive - Employee sensitive data object to be validated
   * @return Employee - validated employee
   */
  async _validateEmployee(employee, employeeSensitive) {
    // log method
    logger.log(3, '_validateEmployee', `Validating employee ${employee.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating employee.'
      };

      // validate id
      if (_.isNil(employee.id)) {
        // log error
        logger.log(3, '_validateEmployee', 'Employee id is empty');

        // throw error
        err.message = 'Invalid employee id.';
        throw err;
      }

      // validate first name
      if (_.isNil(employee.firstName)) {
        // log error
        logger.log(3, '_validateEmployee', 'Employee first name is empty');

        // throw error
        err.message = 'Invalid employee first name.';
        throw err;
      }

      // validate last name
      if (_.isNil(employee.lastName)) {
        // log error
        logger.log(3, '_validateEmployee', 'Employee last name is empty');

        // throw error
        err.message = 'Invalid employee last name.';
        throw err;
      }

      // validate employee number
      if (_.isNil(employee.employeeNumber)) {
        // log error
        logger.log(3, '_validateEmployee', 'Employee number is empty');

        // throw error
        err.message = 'Invalid employee number.';
        throw err;
      }

      // validate hire date
      if (_.isNil(employee.hireDate)) {
        // log error
        logger.log(3, '_validateEmployee', 'Employee hire date is empty');

        // throw error
        err.message = 'Invalid employee hire date.';
        throw err;
      }

      // validate email
      if (_.isNil(employee.email)) {
        // log error
        logger.log(3, '_validateEmployee', 'Employee email is empty');

        // throw error
        err.message = 'Invalid employee email.';
        throw err;
      }

      // validate employee role
      if (_.isNil(employeeSensitive.employeeRole)) {
        // log error
        logger.log(3, '_validateEmployee', 'Employee role is empty');

        // throw error
        err.message = 'Invalid employee role.';
        throw err;
      }

      // validate work status
      if (_.isNil(employee.workStatus)) {
        // log error
        logger.log(3, '_validateEmployee', 'Employee work status is empty');

        // throw error
        err.message = 'Invalid employee work status.';
        throw err;
      }

      // log success
      logger.log(3, '_validateEmployee', `Successfully validated employee ${employee.id}`);

      // return employee on success
      return Promise.resolve(employee);
    } catch (err) {
      // log error
      logger.log(3, '_validateEmployee', `Failed to validate employee ${employee.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateEmployee

  /**
   * Validates that an employee can be updated. Returns the employee if the employee being updated is valid.
   *
   * @param oldEmployee - Employee being updated from
   * @param newEmployee - Employee being updated to
   * @param currentEmployee - Employee thats sending the update request
   * @return Employee - validated employee
   */
  async _validateUpdate(oldEmployee, newEmployee, currentEmployee) {
    // log method
    logger.log(3, '_validateUpdate', `Validating update for employee ${oldEmployee.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating update for employee.'
      };

      // validate employee id
      if (oldEmployee.id != newEmployee.id) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `Old employee id ${oldEmployee.id} does not match new employee id ${newEmployee.id}`
        );

        // throw error
        err.message = 'Error validating employee IDs.';
        throw err;
      }

      if (oldEmployee.email !== newEmployee.email || oldEmployee.employeeNumber !== newEmployee.employeeNumber) {
        let employeesData = await this.databaseModify.getAllEntriesInDB();
        let employees = _.map(employeesData, (employeeData) => {
          return new Employee(employeeData);
        });

        employees = _.reject(employees, (e) => {
          return _.isEqual(e, oldEmployee);
        });

        // validateduplicate employee number
        if (employees.some((e) => e.employeeNumber === newEmployee.employeeNumber)) {
          // log error
          logger.log(3, '_validateUpdate', `Employee number ${newEmployee.employeeNumber} is duplicated`);

          // throw error
          err.message = `Employee number ${newEmployee.employeeNumber} already taken. Please enter a new number.`;
          throw err;
        }

        // validate duplicate employee email
        if (employees.some((e) => e.email === newEmployee.email)) {
          // log error
          logger.log(3, '_validateUpdate', `Employee ID ${newEmployee.id} is duplicated`);

          // throw error
          err.message = `Employee email ${newEmployee.email} already taken. Please enter a new email.`;
          throw err;
        }
      }

      // validate no budgets exist when changing hire date
      if (oldEmployee.hireDate != newEmployee.hireDate) {
        let budgets = await this.budgetDynamo.querySecondaryIndexInDB(
          'employeeId-expenseTypeId-index',
          'employeeId',
          oldEmployee.id
        );

        if (budgets.length > 0) {
          // budgets for employee exist
          // log error
          logger.log(
            3,
            '_validateUpdate',
            `Cannot change hire date for employee ${oldEmployee.id} because budgets exist`
          );

          // throw error
          err.message = 'Cannot change hire date for employees with existing budgets.';
          throw err;
        }
      }

      // fail safe to prevent any users from updating their employee role without permission on prod
      if (oldEmployee.employeeRole != newEmployee.employeeRole && STAGE == 'prod'
        && currentEmployee.employeeRole != 'admin'){
        
        // log error
        logger.log(3, '_validateUpdate',
          `Cannot update your employee role, ${oldEmployee.id} does not have permissions to do so`);

        // throw error
        err.message = 'Only admins can change your employee role.';
        throw err;
      }

      // log success
      logger.log(3, '_validateUpdate', `Successfully validated update for employee ${oldEmployee.id}`);

      // return new employee on success
      return Promise.resolve(newEmployee);
    } catch (err) {
      // log error
      logger.log(3, '_validateUpdate', `Failed to validate update for employee ${oldEmployee.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate
} // EmployeeRoutes

module.exports = EmployeeRoutes;
