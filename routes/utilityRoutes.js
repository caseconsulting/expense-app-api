const databaseModify = require('../js/databaseModify');
const employeeDynamo = new databaseModify('employees');
const expenseDynamo = new databaseModify('expenses');
const expenseTypeDynamo = new databaseModify('expense-types');
const budgetDynamo = new databaseModify('budgets');
const trainingDynamo = new databaseModify('training-urls');
const Logger = require('../js/Logger');
const logger = new Logger('utilityRoutes');
const _ = require('lodash');
const moment = require('moment');
const ISOFORMAT = 'YYYY-MM-DD';
const Employee = require('./../models/employee');
const ExpenseType = require('./../models/expenseType');
const Budget = require('./../models/budget');
// const Expense = require('./../models/expense');

const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
// Authentication middleware. When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
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
    this.expenseDynamo = expenseDynamo;
    this.employeeDynamo = employeeDynamo;
    this.expenseTypeDynamo = expenseTypeDynamo;
    this.budgetDynamo = budgetDynamo;
    this.trainingURLDynamo = trainingDynamo;
    this._router = express.Router();
    //Garbage
    this._router.get('/', checkJwt, getUserInfo, this.showList.bind(this));
    this._router.get('/getAll', checkJwt, getUserInfo, this.showAll.bind(this));
    //Not Garbage
    this._router.get('/getAllExpenses', checkJwt, getUserInfo, this.getAllExpenses.bind(this)); //Admin

    this._router.get('/getAllActiveEmployeeBudgets/:id', checkJwt, this._getAllActiveEmployeeBudgets.bind(this));
    this._router.get('/getEmployeeBudget/:id/:expenseTypeId/:date', checkJwt, this._getEmployeeBudget.bind(this));
    this._router.get('/getEmployeeBudgetsByDate/:id/:startDate/:endDate',
      checkJwt,
      this._getEmployeeBudgetsByDate.bind(this)
    );

    // this._router.get('/getEmployeeBudgets/:id', checkJwt, this.empBudgets.bind(this)); //User
    // this._router.get('/getEmployeeBudgets/:id/:date', checkJwt, this.empBudgets.bind(this)); //User
    // this._router.get('/getEmployeeBudgets/:id/:date/:expenseTypeId', checkJwt, this.empBudgets.bind(this)); //User
    this._router.get('/getAllEmployeeExpenses/:id', checkJwt, this.getAllEmployeeExpenses.bind(this)); //User
    this._router.get('/getAllExpenseTypeExpenses/:id', checkJwt, this.getAllExpenseTypeExpenses.bind(this)); //User
    this._router.get('/getURLInfo/:id/:category', checkJwt, this.getURLInfo.bind(this));
  }

  get router() {
    return this._router;
  }

  /**
   * Handles any errors in crud operations
   */
  _handleError(res, err) {
    logger.error('_handleError', `Error code: ${err.code}. ${err.message}`);

    return res.status(err.code).send(err.message);
  }

  getEmployeeName(expense) {
    logger.log(3, 'getEmployeeName', `Getting employee name of expense ${expense.id}`);

    return this.employeeDynamo.getEntry(expense.employeeId).then(employee => {
      expense.employeeName = this._fullName(employee);
      return expense;
    });
  }

  /**
   * Send api response error status.
   *
   * @param res - api response
   * @param err - status error
   * @return API Status - error status
   */
  _sendError(res, err) {
    // log method
    //logger.log(2, '_sendError', `Sending ${err.code} error status: ${err.message}`);

    // return error status
    return res.status(err.code).send(err);
  } // _sendError

  getExpenseTypeName(expense) {
    logger.log(3, 'getExpenseTypeName', `Getting expense type name of expense ${expense.id}`);

    return this.expenseTypeDynamo.getEntry(expense.expenseTypeId).then(expenseType => {
      expense.budgetName = expenseType.budgetName;
      return expense;
    });
  }

  showList(req, res) {
    logger.log(3, 'showList', 'Getting all entries in database');

    return this.expenseDynamo
      .getAllEntriesInDB()
      .then(values => this._processExpenses(values))
      .then(returnValue => {
        res.status(200).send(returnValue);
      });
  }

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
    // logger.log(2, 'calcAdjustedAmount',
    //   `Calculating adjusted budget amount for employee ${employee.id} and expense type ${expenseType.id}`
    // );

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
    //logger.log(2, 'calcAdjustedAmount', `Adjusted budget amount is $${result}`);

    // return result
    return result;
  } // calcAdjustedAmount

  /**
   * Get the current annual budget start and end dates based on a given hire date.
   *
   * @param hireDate - ISO formatted hire date String
   * @return Object - moment start date and moment end date
   */
  getBudgetDates(date) {
    // log method
    //logger.log(2, 'getBudgetDates', `Getting current annual budget dates for ${date}`);

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
    // logger.log(2, 'getBudgetDates',
    //   `Current annual budget date for ${date} starts on ${startDate.format(ISOFORMAT)} and ends on`,
    //   `${endDate.format(ISOFORMAT)}`
    // );

    // return result
    return result;
  } // getBudgetDates

  /**
   * Check if an employee has access to an expense type. Returns true if employee has access, otherwise returns false.
   *
   * @param employee - Employee to access
   * @param expenseType - ExpenseType to be accessed
   * @return Boolean - employee has access to expense type
   */
  hasAccess(employee, expenseType) {
    // log method
    //logger.log(2, 'hasAccess', `Checking if employee ${employee.id} has access to ${expenseType.id}`);

    // compute method
    let result;

    if (expenseType.accessibleBy == 'ALL' || expenseType.accessibleBy == 'FULL') {
      result = true;
    } else if (expenseType.accessibleBy == 'FULL TIME') {
      result = employee.workStatus == 100;
    } else {
      result = expenseType.accessibleBy.includes(employee.id);
    }

    // log result
    // if (result) {
    //   logger.log(2, 'hasAccess', `Employee ${employee.id} has access to ${expenseType.id}`);
    // } else {
    //   logger.log(2, 'hasAccess', `Employee ${employee.id} does not have access to ${expenseType.id}`);
    // }

    // return result
    return result;
  } // hasAccess

  async _getActiveBudget(employee, expenseType) {
    let today = moment().format(ISOFORMAT);

    // get all budgets for employee and expense type
    let expenseTypeBudgetsData = await this.budgetDynamo.queryWithTwoIndexesInDB(employee.id, expenseType.id);
    let expenseTypeBudgets = _.map(expenseTypeBudgetsData, budgetData => {
      return new Budget(budgetData);
    });

    // find the budget object for today
    let budgetObject = _.find(expenseTypeBudgets, expenseTypeBudget => {
      return expenseTypeBudget.isDateInRange(today);
    });

    if (!budgetObject) {
      // budget does not exist, create a temporary budget
      budgetObject = {
        expenseTypeId: expenseType.id,
        employeeId: employee.id,
        pendingAmount: 0,
        reimbursedAmount: 0,
        amount: 0
      };

      if (expenseType.recurringFlag) {
        // use Anniversary dates for budget if expense type is recurring
        let dates = this.getBudgetDates(employee.hireDate);
        budgetObject.startDate = dates.startDate.format(ISOFORMAT);
        budgetObject.endDate = dates.endDate.format(ISOFORMAT);
      } else {
        // use expense type dates for buet if expense type is not recurring
        budgetObject.startDate = expenseType.startDate;
        budgetObject.endDate = expenseType.endDate;
      }

      // set the budget amount based on the employee and expense type
      budgetObject.amount = this.calcAdjustedAmount(employee, expenseType);
    }

    return {
      expenseTypeName: expenseType.budgetName,
      description: expenseType.description,
      odFlag: expenseType.odFlag,
      expenseTypeId: expenseType.id,
      budgetObject: budgetObject
    };
  }

  async _getEmployeeBudget(req, res) {
    try {
      const employee = new Employee(await this.employeeDynamo.getEntry(req.params.id)); // get employee
      const expenseTypeData = await this.expenseTypeDynamo.getEntry(req.params.expenseTypeId); // get expense type
      const expenseType = new ExpenseType(expenseTypeData);

      // get all budgets for employee and expense type
      let budgetsData = await this.budgetDynamo.queryWithTwoIndexesInDB(employee.id, expenseType.id);

      let budgets = _.map(budgetsData, budgetData => {
        return new Budget(budgetData);
      });

      // find the budget object for the given date
      let budget = _.find(budgets, budget => {
        return budget.isDateInRange(req.params.date);
      });

      res.status(200).send(budget);
    } catch (err) {
      this._sendError(res, err);

      return err;
    }
  }

  /*
   * Async function to loop an array
   */
  async asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

  async _getAllActiveEmployeeBudgets(req, res) {
    // log method
    //logger.log(2, '_getAllActiveEmployeeBudgets', `Getting budgets for user ${req.params.id}`);

    // compute method
    try {
      const employee = new Employee(await this.employeeDynamo.getEntry(req.params.id)); // get employee
      let expenseTypes;
      let expenseTypesData = await this.expenseTypeDynamo.getAllEntriesInDB(); // get all expense types
      expenseTypes = _.map(expenseTypesData, expenseTypeData => {
        return new ExpenseType(expenseTypeData);
      });
      let activeBudgets = []; // store active budgets
      let today = moment().format(ISOFORMAT);

      // loop all expense types
      await this.asyncForEach(expenseTypes, async expenseType => {
        if (expenseType.isDateInRange(today)) {
          // expense type is active today
          // push the current active budget
          activeBudgets.push(await this._getActiveBudget(employee, expenseType));
        }
      });

      res.status(200).send(activeBudgets);
    } catch (err) {
      this._sendError(res, err);
      return err;
    }
  }

  async _getEmployeeBudgetsByDate(req, res) {

    try {
      // get employee
      const employee = new Employee(await this.employeeDynamo.getEntry(req.params.id));
      const allExpenseTypesData = await this.expenseTypeDynamo.getAllEntriesInDB();
      const allExpenseTypes = _.map(allExpenseTypesData, expenseTypeData => {
        return new ExpenseType(expenseTypeData);
      });

      // get all budgets
      let budgetsData = await budgetDynamo
        .querySecondaryIndexInDB('employeeId-expenseTypeId-index', 'employeeId', employee.id);

      let budgets = _.map(budgetsData, budgetData => {
        return new Budget(budgetData);
      });

      // filter budgets within date range
      budgets = _.filter(budgets, budget => {
        let expenseType = _.find(allExpenseTypes, ['id', budget.expenseTypeId]);

        if (expenseType.recurringFlag) {
          return budget.isDateInRange(req.params.startDate) || budget.isDateInRange(req.params.endDate);
        } else {
          let budgetStart = moment(budget.fiscalStartDate, ISOFORMAT);
          let budgetEnd = moment(budget.fiscalEndDate, ISOFORMAT);
          let viewStart = moment(req.params.startDate, ISOFORMAT);
          let viewEnd = moment(req.params.endDate, ISOFORMAT);
          return budgetStart.isBetween(viewStart, viewEnd, null, '[]')
            || budgetEnd.isBetween(viewStart, viewEnd, null, '[]');
        }
      });

      budgets = _.map(budgets, budget => {
        let expenseType = _.find(allExpenseTypes, ['id', budget.expenseTypeId]);
        return {
          expenseTypeName: expenseType.budgetName,
          description: expenseType.description,
          odFlag: expenseType.odFlag,
          expenseTypeId: expenseType.id,
          budgetObject: budget
        };
      });

      res.status(200).send(budgets);
      return budgets;

    } catch (err) {
      // error
      this._sendError(res, err);

      return err;
    }
  }

  async empBudgets(req, res) {
    logger.log(2, 'empBudgets', `Getting budgets for user ${req.params.id}`);

    try {
      let returnObject;
      const employeeId = req.params.id;
      const userBudgets =
        await this.budgetDynamo.querySecondaryIndexInDB('employeeId-expenseTypeId-index', 'employeeId', employeeId);
      const openBudgets = _.filter(userBudgets, budget => {
        let date = moment();
        let expenseTypeCheck = true;
        if (req.params.date) {
          date = moment(req.params.date);
        }
        let dateCheck = date.isBetween(moment(budget.fiscalStartDate), moment(budget.fiscalEndDate), 'day', '[]');
        if (req.params.expenseTypeId) {
          expenseTypeCheck = req.params.expenseTypeId == budget.expenseTypeId;
        }
        return dateCheck && expenseTypeCheck;
      });
      const openExpenseTypeIds = _.map(openBudgets, fb => fb.expenseTypeId);
      const allExpenseTypes = await this.expenseTypeDynamo.getAllEntriesInDB();
      const openExpenseTypes = _.filter(allExpenseTypes, et => _.includes(openExpenseTypeIds, et.id));
      returnObject = _.map(openExpenseTypes, expenseType => {
        return {
          expenseTypeName: expenseType.budgetName,
          description: expenseType.description,
          odFlag: expenseType.odFlag,
          expenseTypeId: expenseType.id,
          budgetObject: _.find(openBudgets, budget => expenseType.id === budget.expenseTypeId)
        };
      });
      res.status(200).send(returnObject);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  getAllEmployeeExpenses(req, res) {
    logger.log(2, 'getAllEmployeeExpenses', 'Getting all employee expenses');

    const employeeId = req.params.id;
    this.expenseDynamo
      .querySecondaryIndexInDB('employeeId-index', 'employeeId', employeeId)
      .then(data => {
        res.status(200).send(data);
      })
      .catch(err => {
        this._handleError(res, err);
      });
  }

  getAllExpenseTypeExpenses(req, res) {
    logger.log(2, 'getAllExpenseTypeExpenses', 'Getting all expense types');

    const expenseTypeId = req.params.id;
    this.expenseDynamo
      .querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', expenseTypeId)
      .then(data => {
        res.status(200).send(data);
      })
      .catch(err => {
        this._handleError(res, err);
      });
  }

  //function created to see if employee has any expenses
  // async empExpenseHistory(req, res) {
  //   logger.log(2, 'empExpenseHistory', `Checking if employee ${req.params.id} has any expenses`);
  //
  //   try {
  //     const employeeId = req.params.id;
  //     const userBudgets =
  //       await this.budgetDynamo.querySecondaryIndexInDB('employeeId-expenseTypeId-index', 'employeeId', employeeId);
  //     const returnObject = null;
  //     res.status(200).send(returnObject);
  //   } catch (error) {
  //     this._handleError(res, error);
  //   }
  // }

  async showAll(req, res) {
    logger.log(3, 'showAll', 'Showing all expenses, users, and expense types');

    try {
      let expenses = await this.expenseDynamo.getAllEntriesInDB();
      let users = await this.employeeDynamo.getAllEntriesInDB();
      let expensesTypes = await this.expenseTypeDynamo.getAllEntriesInDB();
      res.status(200).send(this._findExpenseTypes(expenses, users, expensesTypes));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  _findEmployee(expenses, user, expensesTypes) {
    logger.log(3, '_findEmployee', `Finding user ${user.id}`);

    let filteredExpenses = _.filter(expenses, expense => expense.employeeId === user.id);
    let temp = null;
    let returnObject = {
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName
    };
    temp = _.forEach(expensesTypes, type => {
      type.expenses = [];
      _.forEach(filteredExpenses, expense => {
        if (type.id === expense.expenseTypeId) {
          type.expenses.push(expense);
        }
      });
      return type;
    });
    returnObject.expenseTypeData = temp;
    return returnObject;
  }

  _findExpenseTypes(expenses, employees, expenseTypes) {
    logger.log(3, '_findExpenseTypes', 'Finding expense types');

    return _.forEach(employees, employee => this._expenseTypeMapping(expenses, employee, expenseTypes));
  }

  _expenseTypeMapping(expenses, employee, expenseTypes) {
    logger.log(3, '_expenseTypeMapping', `Mapping expense types for user ${employee.id}`);

    return _.map(employee.expenseTypes, employeeExpenseType => {
      let returnedExpenseType = _.find(expenseTypes, et => et.id === employeeExpenseType.id);
      let toBeMerged = this._expenseMapping(expenses, employee, employeeExpenseType);
      let expensesToMerge = {
        expenses: toBeMerged
      };
      return _.merge(employeeExpenseType, returnedExpenseType, expensesToMerge);
    });
  }

  async getAllExpenses(req, res) {
    logger.log(2, 'getAllExpenses', 'Getting all expenses');

    try {
      if (this._isAdmin(req)) {
        let expenses = await this.expenseDynamo.getAllEntriesInDB();
        let users = await this.employeeDynamo.getAllEntriesInDB();
        let expensesTypes = await this.expenseTypeDynamo.getAllEntriesInDB();
        res.status(200).send(this._getEmployeeName(expenses, users, expensesTypes));
      } else if (this._isUser(req)) {
        let employeeId = req.employee.id;
        let user = await this.employeeDynamo.getEntry(employeeId);
        let users = [user];
        let expensesTypes = await this.expenseTypeDynamo.getAllEntriesInDB();
        let expenses =
          await this.expenseDynamo.querySecondaryIndexInDB('employeeId-index', 'employeeId', req.employee.id);
        res.status(200).send(this._getEmployeeName(expenses, users, expensesTypes));
      } else {
        res.status(403).send('Permission denied. Insufficient user permissions');
      }
    } catch (error) {
      this._handleError(res, error);
    }
  }

  _fullName(employee) {
    logger.log(4, '_fullName', `Getting full name for employee ${employee.id}`);

    const middleName = employee.middleName ? employee.middleName.trim() : '';
    return `${employee.firstName} ${middleName ? middleName + ' ' : ''}${employee.lastName}`;
  }

  _getEmployeeName(expenses, users, expenseTypes) {
    logger.log(3, '_getEmployeeName', 'Setting employee name for all expenses');

    _.forEach(expenses, expense => {
      let expenseType = _.find(expenseTypes, expenseType => expenseType.id === expense.expenseTypeId);
      let employee = _.find(users, emp => emp.id === expense.employeeId);
      if (expenseType !== undefined && employee !== undefined) {
        expense.budgetName = expenseType.budgetName;
        expense.employeeName = this._fullName(employee);
        expense.firstName = employee.firstName;
        expense.middleName = employee.middleName;
        expense.lastName = employee.lastName;
      }
    });
    return expenses;
  }

  //created to get the url information from the dynamo table
  async getURLInfo(req, res) {
    var atob = require('atob');
    let encoded = req.params.id.replace(/%2F/g, '/');
    var decoded = atob(encoded);
    logger.log(2, 'getURLInfo', `Getting information for URL ${decoded}`);

    const NOT_FOUND = {
      code: 404,
      message: 'entry not found in database'
    };

    return (
      this.trainingURLDynamo.getEntryUrl(decoded, req.params.category)
        .then(output => {
          if (output) {
            res.status(200).send(output);
          } else if (output === null) {
            res.status(200).send(null);
          } else {
            let err = NOT_FOUND;
            throw err;
          }
        })
        // .then(output => {
        //   if (_.first(output)) {
        //     res.status(200).send(_.first(output));
        //   } else if (output === null) {
        //     res.status(200).send(null);
        //   } else {
        //     let err = NOT_FOUND;
        //     throw err;
        //   }
        // })
        .catch(err => this._handleError(res, err))
    );
  }

  _expenseMapping(expenses, employee, expenseType) {
    logger.log(3, '_expenseMapping',
      `Filtering expenses with expense type ${expenseType.id} for user ${employee.id}`
    );

    return _.filter(expenses, expense => {
      return expense.employeeId === employee.id && expense.expenseTypeId === expenseType.id;
    });
  }

  _processExpenses(expenseData) {
    logger.log(2, '_processExpenses', 'Processing expenses');

    let processedExpenses = [];
    return new Promise(resolve => {
      processedExpenses = _.map(expenseData, expense => {
        return this.getEmployeeName(expense);
      });
      processedExpenses = _.map(expenseData, expense => {
        return this.getExpenseTypeName(expense);
      });
      resolve(
        Promise.all(processedExpenses).then(values => {
          return values;
        })
      );
    });
  }

  _isAdmin(req) {
    logger.log(3, '_isAdmin', 'Checking if user role is admin');

    return req.employee.employeeRole === 'admin';
  }
  _isUser(req) {
    logger.log(3, '_isAdmin', 'Checking if user role is user');

    return req.employee.employeeRole === 'user';
  }
}

module.exports = Utility;
