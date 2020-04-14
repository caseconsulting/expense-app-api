const databaseModify = require('../js/databaseModify');
const employeeDynamo = new databaseModify('employees');
const expenseDynamo = new databaseModify('expenses');
const expenseTypeDynamo = new databaseModify('expense-types');
const budgetDynamo = new databaseModify('budgets');
const trainingDynamo = new databaseModify('training-urls');
const Logger = require('../js/Logger');
const logger = new Logger('utilityRoutes');

const express = require('express');
const _ = require('lodash');
//const IsoFormat = 'YYYY-MM-DD';
const moment = require('moment');
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
    this.expenseData = expenseDynamo;
    this.employeeData = employeeDynamo;
    this.expenseTypeData = expenseTypeDynamo;
    this.budgetData = budgetDynamo;
    this.trainingURLData = trainingDynamo;
    this._router = express.Router();
    //Garbage
    this._router.get('/', checkJwt, getUserInfo, this.showList.bind(this));
    this._router.get('/getAll', checkJwt, getUserInfo, this.showAll.bind(this));
    //Not Garbage
    this._router.get('/getAllExpenses', checkJwt, getUserInfo, this.getAllExpenses.bind(this)); //Admin

    this._router.get('/getEmployeeBudgets/:id', checkJwt, this.empBudgets.bind(this)); //User
    this._router.get('/getEmployeeBudgets/:id/:date', checkJwt, this.empBudgets.bind(this)); //User
    this._router.get('/getEmployeeBudgets/:id/:date/:expenseTypeId', checkJwt, this.empBudgets.bind(this)); //User
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

    return this.employeeData.readFromDB(expense.employeeId).then(employee => {
      let emp = employee[0];
      expense.employeeName = this._fullName(emp);
      return expense;
    });
  }

  getExpenseTypeName(expense) {
    logger.log(3, 'getExpenseTypeName', `Getting expense type name of expense ${expense.id}`);

    return this.expenseTypeData.readFromDB(expense.expenseTypeId).then(expenseType => {
      let type = expenseType[0];
      expense.budgetName = type.budgetName;
      return expense;
    });
  }

  showList(req, res) {
    logger.log(3, 'showList', 'Getting all entries in database');

    return this.expenseData
      .getAllEntriesInDB()
      .then(values => this._processExpenses(values))
      .then(returnValue => {
        res.status(200).send(returnValue);
      });
  }

  async empBudgets(req, res) {
    logger.log(2, 'empBudgets', `Getting budgets for user ${req.params.id}`);

    try {
      let returnObject;
      const employeeId = req.params.id;
      const userBudgets =
        await this.budgetData.querySecondaryIndexInDB('employeeId-expenseTypeId-index', 'employeeId', employeeId);
      let dateExists = req.params.date != 'undefined' && req.params.date != null;
      let expenseTypeIdExists = req.params.expenseTypeId != 'undefined' && req.params.expenseTypeId != null;
      if (expenseTypeIdExists) {
        let date = moment();
        if (dateExists) {
          date = moment(req.params.date);
        }
        returnObject = _.find(userBudgets, budget => {
          let between = date.isBetween(moment(budget.fiscalStartDate), moment(budget.fiscalEndDate), 'day', '[]');
          return between && req.params.expenseTypeId == budget.expenseTypeId;
        });
      } else {
        const openBudgets = _.filter(userBudgets, budget => {
          let date = moment();
          if (dateExists) {
            date = moment(req.params.date);
          }
          return date.isBetween(moment(budget.fiscalStartDate), moment(budget.fiscalEndDate), 'day', '[]');
        });
        const openExpenseTypeIds = _.map(openBudgets, fb => fb.expenseTypeId);
        const allExpenseTypes = await this.expenseTypeData.getAllEntriesInDB();
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
      }
      res.status(200).send(returnObject);
    } catch (error) {
      this._handleError(res, error);
    }
  }

  getAllEmployeeExpenses(req, res) {
    logger.log(2, 'getAllEmployeeExpenses', 'Getting all employee expenses');

    const employeeId = req.params.id;
    this.expenseData
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

    const employeeId = req.params.id;
    this.expenseData
      .querySecondaryIndexInDB('expenseTypeId-index', 'expenseTypeId', employeeId)
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
  //       await this.budgetData.querySecondaryIndexInDB('employeeId-expenseTypeId-index', 'employeeId', employeeId);
  //     const returnObject = null;
  //     res.status(200).send(returnObject);
  //   } catch (error) {
  //     this._handleError(res, error);
  //   }
  // }

  async showAll(req, res) {
    logger.log(3, 'showAll', 'Showing all expenses, users, and expense types');

    try {
      let expenses = await this.expenseData.getAllEntriesInDB();
      let users = await this.employeeData.getAllEntriesInDB();
      let expensesTypes = await this.expenseTypeData.getAllEntriesInDB();
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
        let expenses = await this.expenseData.getAllEntriesInDB();
        let users = await this.employeeData.getAllEntriesInDB();
        let expensesTypes = await this.expenseTypeData.getAllEntriesInDB();
        res.status(200).send(this._getEmployeeName(expenses, users, expensesTypes));
      } else if (this._isUser(req)) {
        let employeeId = req.employee.id;
        let user = _.first(await this.employeeData.readFromDB(employeeId));
        let users = [user];
        let expensesTypes = await this.expenseTypeData.getAllEntriesInDB();
        let expenses =
          await this.expenseData.querySecondaryIndexInDB('employeeId-index', 'employeeId', req.employee.id);
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
      let expenseType = _.find(expenseTypes, et => et.id === expense.expenseTypeId);
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
      this.trainingURLData
        .readFromDBURL(decoded, req.params.category)
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
