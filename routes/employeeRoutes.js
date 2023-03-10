const Budget = require('./../models/budget');
const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const Employee = require('./../models/employee');
const EmployeeSensitive = require('../models/employee-sensitive');
const ExpenseType = require('./../models/expenseType');
const Logger = require('../js/Logger');
const dateUtils = require('../js/dateUtils');
const _ = require('lodash');

const IsoFormat = 'YYYY-MM-DD';
const logger = new Logger('employeeRoutes');

class EmployeeRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new DatabaseModify('employees');
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
      let oldEmployee = new Employee(await this.databaseModify.getEntry(data.id));
      let oldEmployeeSensitive = new EmployeeSensitive(await this.employeeSensitiveDynamo.getEntry(data.id));
      let newEmployee = new Employee(data);
      let newEmployeeSensitive = new EmployeeSensitive(data);
      newEmployeeSensitive.handleEEOData(oldEmployeeSensitive, req.employee);
      await Promise.all([
        this._validateEmployee(newEmployee, newEmployeeSensitive),
        this._validateUpdate(oldEmployee, newEmployee),
        this._updateBudgets(oldEmployee, newEmployee)
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
        let dataUpdated;
        // add object to database
        if (employeeValidated.id == req.body.id) {
          // update database if the id's are the same
          dataUpdated = await this.databaseModify.updateEntryInDB(employeeValidated);
        } else {
          // id's are different (database updated when changing expense types in expenseRoutes)
          dataUpdated = employeeValidated;
        }

        if (employeeUpdated instanceof Employee) {
          let sensitiveData = new EmployeeSensitive(req.body);
          let objectValidated = await this._validateInputs(sensitiveData); // validate inputs
          let sensitiveDataUpdated = await this.employeeSensitiveDynamo.updateEntryInDB(objectValidated);
          // updated an entry for an employees sensitive data
          logger.log(
            1,
            '_createWrapper',
            `Successfully created object ${dataUpdated.id} in ${this.STAGE}-employees-sensitive`
          );
          dataUpdated = { ...dataUpdated, ...sensitiveDataUpdated };
        }

        // log success
        logger.log(1, '_updateWrapper', `Successfully updated object ${dataUpdated.id} from ${this._getTableName()}`);

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
      let [budgetsData, expenseTypes] = await Promise.all([
        this.budgetDynamo.querySecondaryIndexInDB('employeeId-expenseTypeId-index', 'employeeId', oldEmployee.id),
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
          budgets[i].amount = this.calcAdjustedAmount(newEmployee, expenseType);
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
   * @return Employee - validated employee
   */
  async _validateUpdate(oldEmployee, newEmployee) {
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
