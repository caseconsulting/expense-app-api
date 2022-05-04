const Budget = require('./../models/budget');
const DatabaseModify = require('../js/databaseModify');
const Employee = require('./../models/employee');
const Expense = require('./../models/expense');
const ExpenseType = require('./../models/expenseType');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const Logger = require('../js/Logger');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');
const _ = require('lodash');
const Basecamp = require('../routes/basecampRoutes');

const ISOFORMAT = 'YYYY-MM-DD';
const logger = new Logger('utilityRoutes');

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

class Utility {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;

    // this._router.get('/', this._checkJwt, this._getUserInfo, this.showList.bind(this));
    this._router.get(
      '/getAllAggregateExpenses',
      this._checkJwt,
      this._getUserInfo,
      this._getAllAggregateExpenses.bind(this)
    );
    this._router.get('/getAllExpenses', this._checkJwt, this._getUserInfo, this._getAllExpenses.bind(this));
    this._router.get(
      '/getAllActiveEmployeeBudgets/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getAllActiveEmployeeBudgets.bind(this)
    );
    this._router.get(
      '/getEmployeeBudget/:id/:expenseTypeId/:date',
      this._checkJwt,
      this._getUserInfo,
      this._getEmployeeBudget.bind(this)
    );
    this._router.get(
      '/getFiscalDateViewBudgets/:id/:fiscalStartDate',
      this._checkJwt,
      this._getUserInfo,
      this._getFiscalDateViewBudgets.bind(this)
    );
    this._router.get('/getAllEvents', this._checkJwt, this._getUserInfo, this._getAllEvents.bind(this));
    this._router.get(
      '/getAllEmployeeExpenses/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getAllEmployeeExpenses.bind(this)
    );
    this._router.get(
      '/getAllExpenseTypeExpenses/:id',
      this._checkJwt,
      this._getUserInfo,
      this._getAllExpenseTypeExpenses.bind(this)
    );

    this.employeeDynamo = new DatabaseModify('employees');
    this.expenseDynamo = new DatabaseModify('expenses');
    this.expenseTypeDynamo = new DatabaseModify('expense-types');
    this.budgetDynamo = new DatabaseModify('budgets');
    this.trainingDynamo = new DatabaseModify('training-urls');
  } // constructor

  /**
   * Async function to loop an array.
   *
   * @param array - Array of elements to iterate over
   * @param callback - callback function
   */
  async asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  } // asyncForEach

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
    logger.log(
      4,
      'calcAdjustedAmount',
      `Calculating adjusted budget amount for employee ${employee.id} and expense type ${expenseType.id}`
    );

    // compute method
    let result;

    if (this.hasAccess(employee, expenseType)) {
      if (!expenseType.proRated) {
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
   * Converts the employeeId of all expenses to the employee's full name and the expenseTypeId of all expesnes to the
   * expense type's budget name.
   *
   * @param expenses - list of expenses
   * @param employees - list of employees
   * @param expenseTypes - list of expense types
   * @return Objects - list of aggregate expenses with substituted names
   */
  _aggregateExpenseData(expenses, employees, expenseTypes) {
    // log method
    logger.log(
      4,
      '_aggregateExpenseData',
      'Converting expense employee and expense type IDs to their respective names'
    );

    // compute method
    let aggregateExpenses = _.cloneDeep(expenses);
    _.forEach(aggregateExpenses, (expense) => {
      let expenseType = _.find(expenseTypes, (expenseType) => expenseType.id === expense.expenseTypeId);
      let employee = _.find(employees, (emp) => emp.id === expense.employeeId);
      if (expenseType == null || employee == null) {
        // expense type or employee not found
        let err = {
          code: 404,
          message: 'Failed to find expense type or employee for an expense.'
        };

        // log error
        logger.log(4, '_aggregateExpenseData', `Failed to find expense type or employee for expense ${expense.id}`);

        throw err;
      }

      expense.budgetName = expenseType.budgetName;
      expense.employeeName = employee.fullName();
      expense.firstName = employee.firstName;
      expense.middleName = employee.middleName;
      expense.lastName = employee.lastName;
      expense.campfire = expenseType.campfire;
      expense.nickname = employee.nickname;
    });

    // log complete
    logger.log(
      4,
      '_aggregateExpenseData',
      'Finished converting expense employee and expense type IDs to their respective names'
    );

    // return aggregate expenses
    return aggregateExpenses;
  } // _aggregateExpenseData

  /**
   * Gets the active aggregate budget for an employee with a given expense type.
   *
   * @param employee - the employee
   * @param expenseType - the expense type
   * @return Object - employee active aggregate Budget
   */
  async _getActiveBudget(employee, expenseType) {
    // log method
    logger.log(
      3,
      '_getActiveBudget',
      `Attempting to get the active aggregate budget for employee ${employee.id} and expense type ${expenseType.id}`
    );

    // compute method
    try {
      let today = moment().format(ISOFORMAT); // today isoformat string

      // get all budgets for employee and expense type
      let expenseTypeBudgetsData = await this.budgetDynamo.queryWithTwoIndexesInDB(employee.id, expenseType.id);
      let expenseTypeBudgets = _.map(expenseTypeBudgetsData, (budgetData) => {
        return new Budget(budgetData);
      });

      // find the budget object for today
      let budgetObject = _.find(expenseTypeBudgets, (expenseTypeBudget) => {
        return expenseTypeBudget.isDateInRange(today);
      });

      if (!budgetObject) {
        // budget does not exist, create a temporary budget
        budgetObject = new Budget({
          expenseTypeId: expenseType.id,
          employeeId: employee.id,
          pendingAmount: 0,
          reimbursedAmount: 0,
          amount: 0
        });

        if (expenseType.recurringFlag) {
          // use Anniversary dates for budget if expense type is recurring
          let dates = this.getBudgetDates(employee.hireDate);
          budgetObject.fiscalStartDate = dates.startDate.format(ISOFORMAT);
          budgetObject.fiscalEndDate = dates.endDate.format(ISOFORMAT);
        } else {
          // use expense type dates for buet if expense type is not recurring
          budgetObject.fiscalStartDate = expenseType.startDate;
          budgetObject.fiscalEndDate = expenseType.endDate;
        }

        // set the budget amount based on the employee and expense type
        budgetObject.amount = this.calcAdjustedAmount(employee, expenseType);
      }

      let aggregateBudget = {
        expenseTypeName: expenseType.budgetName,
        description: expenseType.description,
        odFlag: expenseType.odFlag,
        expenseTypeId: expenseType.id,
        budgetObject: budgetObject
      };

      // log success
      logger.log(
        3,
        '_getActiveBudget',
        `Successfully got the active aggregate budget for employee ${employee.id} and expense type ${expenseType.id}`
      );

      return aggregateBudget;
    } catch (err) {
      // log error
      logger.log(
        3,
        '_getActiveBudget',
        `Failed to get the active aggregate budget for employee ${employee.id} and expense type ${expenseType.id}`
      );

      // throw error
      throw err;
    }
  } // _getActiveBudget

  /**
   * Gets all active budgets for an employee. Creates temporary budgets if the budget does not exist.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - employee active Budgets
   */
  async _getAllActiveEmployeeBudgets(req, res) {
    // log method
    logger.log(1, '_getAllActiveEmployeeBudgets', `Attempting to get all active budgets for employee ${req.params.id}`);

    // compute method
    try {
      // get employee
      let employee = new Employee(await this.employeeDynamo.getEntry(req.params.id));

      // get all expense types
      let expenseTypes = await this.getAllExpenseTypes();

      let activeBudgets = []; // store active budgets
      let today = moment().format(ISOFORMAT); // today isoformat string

      // loop all expense types
      await this.asyncForEach(expenseTypes, async (expenseType) => {
        if (expenseType.isDateInRange(today) && this.hasAccess(employee, expenseType)) {
          // expense type is active today
          // push the current active budget
          activeBudgets.push(await this._getActiveBudget(employee, expenseType));
        }
      });

      // log success
      logger.log(
        1,
        '_getAllActiveEmployeeBudgets',
        `Successfully got all active budgets for employee ${req.params.id}`
      );

      // send successful 200 status
      res.status(200).send(activeBudgets);

      // return active budgets
      return activeBudgets;
    } catch (err) {
      // log error
      logger.log(1, '_getAllActiveEmployeeBudgets', `Failed to get all active budgets for employee ${req.params.id}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getAllActiveEmployeeBudgets

  /**
   * queries the expenses based on expenseTypes and cutOffDate
   *
   * @param expenseType - expenseType to use to get expenses
   * @param cutOffDate - expenses with reimbursedDate before this date are not returned
   * @return - the queried expenses
   */
  async queryExpenses(expenseType, cutOffDate) {
    //use additional params option of querySecondaryIndex to filter things.
    cutOffDate = cutOffDate.format('YYYY-MM-DD');
    //default attributes for two
    let expressionAttributes = {
      ':queryKey': expenseType.id,
      ':cutOffDate': cutOffDate
    };
    let additionalParams = {
      ExpressionAttributeValues: expressionAttributes,
      KeyConditionExpression: 'expenseTypeId = :queryKey and reimbursedDate >= :cutOffDate'
    };
    try {
      let ret = await this.expenseDynamo.querySecondaryIndexInDB(
        'expenseTypeId-reimbursedDate-index',
        'expenseTypeId',
        expenseType.id,
        additionalParams
      );
      return ret;
    } catch (err) {
      return err;
    }
  } // queryExpenses

  /**
   * gets the basecamp token
   *
   * @return - the basecamp authorization token
   */
  async getBasecampToken() {
    const basecamp = new Basecamp();

    return await basecamp._getBasecampToken();
  } // getBasecampToken

  /**
   * gets the basecamp info
   *
   * @return - the info for basecamp
   */
  getBasecampInfo() {
    const basecamp = new Basecamp();

    return basecamp.getBasecampInfo();
  } // getBasecampInfo

  /**
   * get the entries in the basecamp schedule for a given project
   *
   * @param accessToken - the basecamp access token
   * @param project - the basecamp project
   * @return - the schedule entries
   */
  async getScheduleEntries(accessToken, project) {
    const basecamp = new Basecamp();

    return await basecamp._getScheduleEntries(accessToken, project);
  } // getScheduleEntries

  /**
   * Getting all aggregate expenses. Converts employeeId to employee full name and expenseTypeId to budget name and
   * returns all expenses.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - objects read
   */
  async _getAllExpenses(req, res) {
    // log method
    logger.log(1, '_getAllExpenses', 'Attempting to get all expenses');

    // compute method
    try {
      if (
        this.isAdmin(req.employee) ||
        this.isUser(req.employee) ||
        this.isIntern(req.employee) ||
        this.isManager(req.employee)
      ) {
        // employee is an admin or user
        // get expense types
        let expenseTypes = await this.getAllExpenseTypes();

        let employeesData;
        let expensesData;

        // get all employee and expense data if admin
        employeesData = await this.employeeDynamo.getAllEntriesInDB();
        expensesData = await this.expenseDynamo.getAllEntriesInDB();
        let employees = _.map(employeesData, (employeeData) => {
          return new Employee(employeeData);
        });

        let expenses = _.map(expensesData, (expenseData) => {
          return new Expense(expenseData);
        });

        let aggregateExpenses = this._aggregateExpenseData(expenses, employees, expenseTypes);

        // log success
        logger.log(1, '_getAllExpenses', 'Successfully got all aggregate expenses');

        // send successful 200 status
        res.status(200).send(aggregateExpenses);

        // return aggregate expenses
        return aggregateExpenses;
      } else {
        // insuffient employee permissions
        let err = {
          code: 403,
          message: 'Unable to get all aggregate expenses due to insufficient employee permissions.'
        };

        throw err; // handled by try-catch
      }
    } catch (err) {
      // log error
      logger.log(1, '_getAllExpenses', 'Failed to get all expenses');

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getAllExpenses

  /**
   * Getting all expense data that fits the criteria for the feed as well as all employees and other events
   *
   * @param req - api request
   * @param res - api response
   * @return - all info needed for activity feed
   */
  async _getAllEvents(req, res) {
    // log method
    logger.log(1, '_getAllEvents', 'Attempting to get all event data');

    try {
      let expenseTypes = await this.getAllExpenseTypes();

      let now = moment();
      let cutOff = now.subtract(6, 'months').startOf('day');

      let filteredExpenseTypes = _.map(expenseTypes, (expenseType) => {
        let endDate = moment(expenseType.endDate, 'YYYY-MM-DD');
        if (expenseType.isInactive || cutOff.isAfter(endDate.startOf('day'))) {
          return;
        } else {
          return expenseType;
        }
      });
      filteredExpenseTypes = _.compact(filteredExpenseTypes);

      let employeesData;
      let expensesData = [];

      employeesData = await this.employeeDynamo.getAllEntriesInDB();

      await this.asyncForEach(filteredExpenseTypes, async (expenseType) => {
        try {
          let queryExpensesData = await this.queryExpenses(expenseType, cutOff);

          // log success
          logger.log(1, 'getAllEvents', `Successfully read all expenses for expenseType ${expenseType.budgetName}`);

          let expenses = _.map(queryExpensesData, (expenseData) => {
            return new Expense(expenseData);
          });

          expensesData = _.union(expensesData, expenses);
        } catch (err) {
          // log error
          logger.log(1, 'getAllEvents', `Failed to read all expenses for expenseType ${expenseType.budgetName}`);
          return Promise.reject(err);
        }
      });

      let employees = _.map(employeesData, (employeeData) => {
        return new Employee(employeeData);
      });

      let aggregateExpenses = this._aggregateExpenseData(expensesData, employees, expenseTypes);

      let accessToken = await this.getBasecampToken();

      let entries = [];

      const basecampInfo = this.getBasecampInfo();

      for (let proj in basecampInfo) {
        entries.push(await this.getScheduleEntries(accessToken, basecampInfo[proj]));
      }
      let payload = {
        employees: employees,
        expenses: aggregateExpenses,
        schedules: entries
      };
      // log success
      logger.log(1, '_getAllEvents', 'Successfully got all event data');

      // send successful 200 status
      res.status(200).send(payload);

      return payload;
    } catch (err) {
      // log error
      logger.log(1, '_getAllEvents', 'Failed to get all event data');

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getAllEvents

  /**
   * Gets all expensetype data and then parses the categories
   *
   * @return - all the expenseTypes
   */
  async getAllExpenseTypes() {
    try {
      let expenseTypesData = await this.expenseTypeDynamo.getAllEntriesInDB();
      let expenseTypes = _.map(expenseTypesData, (expenseTypeData) => {
        expenseTypeData.categories = _.map(expenseTypeData.categories, (category) => {
          return JSON.parse(category);
        });
        return new ExpenseType(expenseTypeData);
      });

      return expenseTypes;
    } catch (err) {
      return err;
    }
  } // getAllExpenseTypes

  /**
   * Getting all aggregate expenses. Converts employeeId to employee full name and expenseTypeId to budget name and
   * returns all expenses if the employee is an admin or just the requesting employee's expenses if the employee is a
   * user.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - objects read
   */
  async _getAllAggregateExpenses(req, res) {
    // log method
    logger.log(1, '_getAllAggregateExpenses', 'Attempting to get all aggregate expenses');

    // compute method
    try {
      if (
        this.isAdmin(req.employee) ||
        this.isUser(req.employee) ||
        this.isIntern(req.employee) ||
        this.isManager(req.employee)
      ) {
        // employee is an admin or user
        // get expense types
        let expenseTypes = await this.getAllExpenseTypes();

        let employeesData;
        let expensesData;
        if (this.isAdmin(req.employee)) {
          // get all employee and expense data if admin
          employeesData = await this.employeeDynamo.getAllEntriesInDB();
          expensesData = await this.expenseDynamo.getAllEntriesInDB();
        } else {
          // get the requesting employee and expenses
          employeesData = [await this.employeeDynamo.getEntry(req.employee.id)];
          expensesData = await this.expenseDynamo.querySecondaryIndexInDB(
            'employeeId-index',
            'employeeId',
            req.employee.id
          );
        }

        let employees = _.map(employeesData, (employeeData) => {
          return new Employee(employeeData);
        });

        let expenses = _.map(expensesData, (expenseData) => {
          return new Expense(expenseData);
        });

        let aggregateExpenses = this._aggregateExpenseData(expenses, employees, expenseTypes);

        // log success
        logger.log(1, '_getAllAggregateExpenses', 'Successfully got all aggregate expenses');

        // send successful 200 status
        res.status(200).send(aggregateExpenses);

        // return aggregate expenses
        return aggregateExpenses;
      } else {
        // insuffient employee permissions
        let err = {
          code: 403,
          message: 'Unable to get all aggregate expenses due to insufficient employee permissions.'
        };

        throw err; // handled by try-catch
      }
    } catch (err) {
      // log error
      logger.log(1, '_getAllAggregateExpenses', 'Failed to get all aggregate expenses');

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getAllAggregateExpenses

  /**
   * Get all expenses for an employee.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - employee Expenses
   */
  async _getAllEmployeeExpenses(req, res) {
    // log method
    logger.log(1, '_getAllEmployeeExpenses', `Attempting to get all expenses for employee ${req.params.id}`);

    // compute method
    try {
      // Restricts access to admin, manager and signed-in user
      if (this.isUser(req.employee) && this.isIntern(req.employee) && req.params.id != req.employee.id) {
        let err = {
          code: 403,
          message: `Unable to get all expenses for employee ${req.params.id} due to insufficient
           employee permissions.`
        };
        throw err; // handled by try-catch
      }

      let expensesData = await this.expenseDynamo.querySecondaryIndexInDB(
        'employeeId-index',
        'employeeId',
        req.params.id
      );
      let expenses = _.map(expensesData, (expenseData) => {
        return new Expense(expenseData);
      });

      // log success
      logger.log(1, '_getAllEmployeeExpenses', `Successfully got all expenses for employee ${req.params.id}`);

      // send successful 200 status
      res.status(200).send(expenses);

      // return expenses
      return expenses;
    } catch (err) {
      // log error
      logger.log(1, '_getAllEmployeeExpenses', `Failed get all expenses for employee ${req.params.id}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getAllEmployeeExpenses

  /**
   * Get all expenses for an expense type.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - expense type Expenses
   */
  async _getAllExpenseTypeExpenses(req, res) {
    // log method
    logger.log(1, '_getAllExpenseTypeExpenses', `Getting all expenses for expense type ${req.params.id}`);

    // compute method
    try {
      // restrict access only to admin and manager
      if (!this.isAdmin(req.employee)) {
        let err = {
          code: 403,
          message: `Unable to get all expenses for expense type ${req.params.id} due to insufficient
           employee permissions.`
        };
        throw err; // handled by try-catch
      }

      let expensesData = await this.expenseDynamo.querySecondaryIndexInDB(
        'expenseTypeId-index',
        'expenseTypeId',
        req.params.id
      );
      let expenses = _.map(expensesData, (expenseData) => {
        return new Expense(expenseData);
      });

      // log success
      logger.log(1, '_getAllExpenseTypeExpenses', `Successfully got all expenses for expense type ${req.params.id}`);

      // send successful 200 status
      res.status(200).send(expenses);

      // return expenses
      return expenses;
    } catch (err) {
      // log error
      logger.log(1, '_getAllExpenseTypeExpenses', `Failed to get all expenses for expense type ${req.params.id}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getAllExpenseTypeExpenses

  /**
   * Get the current annual budget start and end dates based on a given hire date.
   *
   * @param date - ISO formatted hire date String
   * @return Object - moment start date and moment end date
   */
  getBudgetDates(date) {
    // log method
    logger.log(4, 'getBudgetDates', `Attempting to get current annual budget dates for ${date}`);

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
      startYear = today.isBefore(moment([today.year(), hireMonth, hireDay])) ? today.year() - 1 : today.year();
    } else {
      // hire date is after today
      startYear = hireYear;
    }

    let startDate = moment([startYear, hireMonth, hireDay]);
    let endDate = moment([startYear, hireMonth, hireDay]).add('1', 'years').subtract('1', 'days');

    let result = {
      startDate,
      endDate
    };

    // log result
    logger.log(
      4,
      'getBudgetDates',
      `Current annual budget date for ${date} starts on ${startDate.format(ISOFORMAT)} and ends on`,
      `${endDate.format(ISOFORMAT)}`
    );

    // return result
    return result;
  } // getBudgetDates

  /**
   * Gets an employee's budget for a given expense type and containing the given date. Returns the budget if it exists
   * or undefined if it does not.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - employee Budgets
   */
  async _getEmployeeBudget(req, res) {
    // log method
    logger.log(
      1,
      '_getEmployeeBudget',
      `Attempting to get budget for employee ${req.params.id} with expense type ${req.params.expenseTypeId} an`,
      `containing the date ${req.params.date}`
    );

    // compute method
    try {
      // get employee
      const employee = new Employee(await this.employeeDynamo.getEntry(req.params.id));

      // get expense type
      let expenseType = await this.expenseTypeDynamo.getEntry(req.params.expenseTypeId);
      expenseType.categories = _.map(expenseType.categories, (category) => {
        return JSON.parse(category);
      });
      expenseType = new ExpenseType(expenseType);

      // get all budgets for employee and expense type
      let budgetsData = await this.budgetDynamo.queryWithTwoIndexesInDB(employee.id, expenseType.id);
      let budgets = _.map(budgetsData, (budgetData) => {
        return new Budget(budgetData);
      });

      // find the budget object for the given date
      let budget = _.find(budgets, (budget) => {
        return budget.isDateInRange(req.params.date);
      });

      // log success
      logger.log(
        1,
        '_getEmployeeBudget',
        `Successfully got budget for employee ${req.params.id} with expense type ${req.params.expenseTypeId} and`,
        `containing the date ${req.params.date}`
      );

      // send successful 200 status
      res.status(200).send(budget);

      // return budget
      return budget;
    } catch (err) {
      // log error
      logger.log(
        1,
        '_getEmployeeBudget',
        `Failed to get budget for employee ${req.params.id} with expense type ${req.params.expenseTypeId} and`,
        `containing the date ${req.params.date}`
      );

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getEmployeeBudget

  /**
   * Gets an employee's budgets in a given anniversary range if recurring and budgets that are within the anniversary
   * year if non recurring.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - employee Budgets
   */
  async _getFiscalDateViewBudgets(req, res) {
    // log method
    logger.log(
      1,
      '_getFiscalDateViewBudgets',
      `Attempting to get budgets for employee ${req.params.id} anniversary date ${req.params.fiscalStartDate}`
    );

    // compute method
    try {
      // anniversary range
      let anniversaryStartDate = req.params.fiscalStartDate;
      let anniversaryEndDate = moment(req.params.fiscalStartDate).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);

      // get employee
      let employee = new Employee(await this.employeeDynamo.getEntry(req.params.id));

      // get all expense types
      let allExpenseTypes = await this.getAllExpenseTypes();

      // get all budgets
      let budgetsData = await this.budgetDynamo.querySecondaryIndexInDB(
        'employeeId-expenseTypeId-index',
        'employeeId',
        employee.id
      );

      let budgets = _.map(budgetsData, (budgetData) => {
        return new Budget(budgetData);
      });

      // filter budgets within date range
      budgets = _.filter(budgets, (budget) => {
        let expenseType = _.find(allExpenseTypes, ['id', budget.expenseTypeId]);

        if (expenseType.recurringFlag) {
          return budget.isDateInRange(anniversaryStartDate) || budget.isDateInRange(anniversaryEndDate);
        } else {
          let startOfYear = anniversaryStartDate.slice(0, 5) + '01-01';
          let endOfYear = anniversaryEndDate.slice(0, 5) + '12-31';
          let budgetStart = moment(budget.fiscalStartDate, ISOFORMAT);
          let budgetEnd = moment(budget.fiscalEndDate, ISOFORMAT);
          let viewStart = moment(startOfYear, ISOFORMAT);
          let viewEnd = moment(endOfYear, ISOFORMAT);

          return (
            budget.isDateInRange(startOfYear) || // budget includes start of year
            budget.isDateInRange(endOfYear) || // budget includes end of year
            budgetStart.isBetween(viewStart, viewEnd, null, '[]') || // year includes start of budget
            budgetEnd.isBetween(viewStart, viewEnd, null, '[]')
          ); // year includes end of budget
        }
      });

      // map aggregate data to budgets
      budgets = _.map(budgets, (budget) => {
        let expenseType = _.find(allExpenseTypes, ['id', budget.expenseTypeId]);
        return {
          expenseTypeName: expenseType.budgetName,
          description: expenseType.description,
          odFlag: expenseType.odFlag,
          expenseTypeId: expenseType.id,
          budgetObject: budget
        };
      });
      // log success
      logger.log(
        1,
        '_getFiscalDateViewBudgets',
        `Successfully got budgets for employee ${req.params.id} anniversary date ${req.params.fiscalStartDate}`
      );

      // send successful 200 status
      res.status(200).send(budgets);

      // return budgets
      return budgets;
    } catch (err) {
      // log error
      logger.log(
        1,
        '_getFiscalDateViewBudgets',
        `Failed to get budgets for employee ${req.params.id} anniversary date ${req.params.fiscalStartDate}`
      );

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getFiscalDateViewBudgets

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
   * Check if an employee is an intern. Returns true if employee role is 'intern', otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee is intern
   */
  isIntern(employee) {
    // log method
    logger.log(5, 'isIntern', `Checking if employee ${employee.id} is an intern`);

    // compute method
    let result = employee.employeeRole === 'intern';

    // log result
    if (result) {
      logger.log(5, 'isIntern', `Employee ${employee.id} is an intern`);
    } else {
      logger.log(5, 'isIntern', `Employee ${employee.id} is not an intern`);
    }

    // return result
    return result;
  } // isIntern

  /**
   * Check if an employee is an manager. Returns true if employee role is 'manager', otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee is intern
   */
  isManager(employee) {
    // log method
    logger.log(5, 'isManager', `Checking if employee ${employee.id} is a manager`);

    // compute method
    let result = employee.employeeRole === 'manager';

    // log result
    if (result) {
      logger.log(5, 'isManager', `Employee ${employee.id} is a manager`);
    } else {
      logger.log(5, 'isManager', `Employee ${employee.id} is not a manager`);
    }

    // return result
    return result;
  } // isManager

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
} // Utility

module.exports = Utility;
