/*jshint esversion: 6 */
const databaseModify = require('../js/databaseModify');
//const budgetDynamo = new databaseModify('Budgets');
const employeeDynamo = new databaseModify('employees');
const expenseDynamo = new databaseModify('expenses');
const expenseTypeDynamo = new databaseModify('expense-types');
const budgetDynamo = new databaseModify('budgets');

const express = require('express');
const _ = require('lodash');
const Moment = require('moment');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
// const jwtAuthz = require('express-jwt-authz');
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

class Special {
  constructor() {
    this.expenseData = expenseDynamo;
    this.employeeData = employeeDynamo;
    this.expenseTypeData = expenseTypeDynamo;
    this.budgetData = budgetDynamo;
    this._router = express.Router();
    //Garbage
    this._router.get('/', checkJwt, getUserInfo, this.showList.bind(this));
    this._router.get('/getAll', checkJwt, getUserInfo, this.showAll.bind(this));
    //Not Garbage
    this._router.get('/getAllExpenses', checkJwt, getUserInfo, this.getAllExpenses.bind(this)); //Admin

    this._router.get('/:id', checkJwt, this.empExpenses.bind(this)); //User
  }

  get router() {
    return this._router;
  }

  /**
   * Handles any errors in crud operations
   */
  _handleError(res, err) {
    const logColor = '\x1b[31m';
    const resetColor = '\x1b[0m';
    console.error(logColor, 'Error Code: ' + err.code);
    console.error(logColor, 'Error Message: ' + err.message);
    console.error(resetColor);
    return res.status(err.code).send(err.message);
  }

  getEmployeeName(expense) {
    return this.employeeData.readFromDB(expense.userId).then(employee => {
      let emp = employee[0];
      expense.employeeName = this._fullName(emp);
      return expense;
    });
  }

  getExpenseTypeName(expense) {
    return this.expenseTypeData.readFromDB(expense.expenseTypeId).then(expenseType => {
      let type = expenseType[0];
      expense.budgetName = type.budgetName;
      return expense;
    });
  }

  showList(req, res) {
    return this.expenseData
      .getAllEntriesInDB()
      .then(values => this._processExpenses(values))
      .then(returnValue => {
        res.status(200).send(returnValue);
      });
  }

  async empExpenses(req, res) {
    try {
      const userID = req.params.id;
      const userBudgets = await this.budgetData.querySecondaryIndexInDB('userId-expenseTypeId-index', 'userId', userID);
      const openBudgets = _.filter(userBudgets, budget => {
        return Moment().isBetween(budget.fiscalStartDate, budget.fiscalEndDate, 'day', '[]');
      });
      const openExpenseTypeIds = _.map(openBudgets, fb => fb.expenseTypeId);
      const allExpenseTypes = await this.expenseTypeData.getAllEntriesInDB();
      const openExpenseTypes = _.filter(allExpenseTypes, et => _.includes(openExpenseTypeIds, et.id));
      const returnObject = _.map(openExpenseTypes, expenseType => {
        return {
          budget: expenseType.budget,
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

  async showAll(req, res) {
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
    let filteredExpenses = _.filter(expenses, expense => expense.userId === user.id);
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
    return _.forEach(employees, employee => this._expenseTypeMapping(expenses, employee, expenseTypes));
  }
  _expenseTypeMapping(expenses, employee, expenseTypes) {
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
    try {
      if (this._isAdmin(req)) {
        let expenses = await this.expenseData.getAllEntriesInDB();
        let users = await this.employeeData.getAllEntriesInDB();
        let expensesTypes = await this.expenseTypeData.getAllEntriesInDB();
        res.status(200).send(this._getEmployeeName(expenses, users, expensesTypes));
      } else if (this._isUser(req)) {
        let userID = req.employee.id;
        let user = _.first(await this.employeeData.readFromDB(userID));
        let users = [user];
        let expensesTypes = await this.expenseTypeData.getAllEntriesInDB();
        let expenses = await this.expenseData.querySecondaryIndexInDB('userId-index', 'userId', req.employee.id);
        res.status(200).send(this._getEmployeeName(expenses, users, expensesTypes));
      } else {
        res.status(403).send('Permission denied. Insuffient user permissions');
      }
    } catch (error) {
      this._handleError(res, error);
    }
  }

  _fullName(employee) {
    const middleName = employee.middleName ? employee.middleName.trim() : '';
    return `${employee.firstName} ${middleName ? middleName + ' ' : ''}${employee.lastName}`;
  }

  _getEmployeeName(expenses, users, expenseTypes) {
    _.forEach(expenses, expense => {
      let expenseType = _.find(expenseTypes, et => et.id === expense.expenseTypeId);
      let employee = _.find(users, emp => emp.id === expense.userId);
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

  _expenseMapping(expenses, employee, expenseType) {
    return _.filter(expenses, expense => expense.userId === employee.id && expense.expenseTypeId === expenseType.id);
  }

  _processExpenses(expenseData) {
    let processedExpenses = [];
    return new Promise(resolve => {
      processedExpenses = _.map(expenseData, expense => {
        return this.getEmployeeName(expense);
      });
      //console.log(typeof processedExpenses);
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
    return req.employee.employeeRole === 'admin' || req.employee.employeeRole === 'super-admin';
  }
  _isUser(req) {
    return req.employee.employeeRole === 'user';
  }
}

module.exports = Special;
