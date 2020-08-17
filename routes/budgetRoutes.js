const Budget = require('./../models/budget');
const Logger = require('../js/Logger');
const databaseModify = require('../js/databaseModify');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const _ = require('lodash');

const budgetDynamo = new databaseModify('budgets');
const logger = new Logger('budgetRoutes');

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

class Budgets {

  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.get('/', this._checkJwt, this._getUserInfo, this._getCallerBudgets.bind(this));
    this._router.get('/employee/:id', this._checkJwt, this._getUserInfo, this._getEmployeeBudgets.bind(this));
    this.budgetDynamo = budgetDynamo;
  } // constructor

  /**
   * Read all budgets for employee caller. If successful, sends 200 status request with the budgets read and returns
   * the budgets.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - employee budgets read
   */
  async _getCallerBudgets(req, res) {
    // log method
    logger.log(1, 'getCallerBudgets', `Attempting to read all budgets for employee caller ${req.employee.id}`);

    // compute method
    try {
      let budgetsData = await this.budgetDynamo.querySecondaryIndexInDB(
        'employeeId-expenseTypeId-index',
        'employeeId',
        req.employee.id
      );

      // log success
      logger.log(1, 'getCallerBudgets', `Successfully read all budgets for employee caller ${req.employee.id}`);

      let budgets = _.map(budgetsData, budgetData => {
        return new Budget(budgetData);
      });

      // send successful 200 status
      res.status(200).send(budgets);

      // return employee budgets
      return budgets;
    } catch (err) {
      // log error
      logger.log(1, '_getCallerBudgets', `Failed to read all budgets for employee caller ${req.employee.id}`);

      // send error status
      this._sendError(res, err);

      // return error
      return Promise.reject(err);
    }
  } // getCallerBudgets

  /**
   * Read all budgets for employee. If successful, sends 200 status request with the budgets read and returns the
   * employee's budgets.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - employee budgets read
   */
  async _getEmployeeBudgets(req, res) {
    // log method
    logger.log(1, 'getEmployeeBudgets', `Attempting to read all budgets for employee ${req.params.id}`);

    // compute method
    try {
      let budgetsData = await this.budgetDynamo.querySecondaryIndexInDB(
        'employeeId-expenseTypeId-index',
        'employeeId',
        req.params.id
      );

      // log success
      logger.log(1, 'getEmployeeBudgets', `Successfully read all budgets for employee ${req.params.id}`);

      let budgets = _.map(budgetsData, budgetData => {
        return new Budget(budgetData);
      });

      // send successful 200 status
      res.status(200).send(budgets);

      // return employee budgets
      return budgets;
    } catch (err) {
      // log error
      logger.log(1, '_getCallerBudgets', `Failed to read all budgets for employee caller ${req.params.id}`);

      // send error status
      this._sendError(res, err);

      // return error
      return Promise.reject(err);
    }
  } // getEmployeeBudgets

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
} // Budgets

module.exports = Budgets;
