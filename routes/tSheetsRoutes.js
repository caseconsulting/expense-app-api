const AWS = require('aws-sdk');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const Logger = require('../js/Logger');
// const moment = require('moment');
// const _ = require('lodash');

// const ISOFORMAT = 'YYYY-MM-DD';
const lambda = new AWS.Lambda();
const logger = new Logger('tSheetsRoutes');
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

class Utility {

  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;

    this._router.get(
      '/getPTOBalances/:employeeNumber',
      this._checkJwt,
      this._getUserInfo,
      this._getPTOBalances.bind(this)
    );
    this._router.get(
      '/getTimeSheets/:employeeNumber/:startDate/:endDate',
      this._checkJwt,
      this._getUserInfo,
      this._getTimeSheets.bind(this)
    );
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
   * Gets an employee's paid time off (PTO) balances, given an employee number.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - pto balances
   */
  async _getPTOBalances(req, res) {
    // log method
    logger.log(1, '_getPTOBalances',
      `Attempting to get PTO balances for employee number ${req.params.employeeNumber}`
    );

    try {
      // mysterio function parameters
      let payload = {
        employeeNumber: req.params.employeeNumber
      };

      // lambda invoke parameters
      var params = {
        FunctionName: `mysterio-pto-balances-${STAGE}`,
        Payload: JSON.stringify(payload),
        Qualifier: '$LATEST'
      };

      let result = await lambda.invoke(params).promise();

      // log success
      logger.log(1, '_getPTOBalances',
        `Successfully got PTO balances for employee number ${req.params.employeeNumber}`
      );

      // invoke mysterio pto balances lambda function
      let ptoBalances = JSON.parse(result.Payload).body;

      // send successful 200 status
      res.status(200).send(ptoBalances);

      // return employee pto balances
      return ptoBalances;
    } catch (err) {
      // log error
      logger.log(1, '_getPTOBalances', `Failed to get PTO balances for employee number ${req.params.employeeNumber}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getPTOBalances

  /**
   * Gets an employee's time sheets, given an employee number, a start date, and end date in iso-format.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - time sheets
   */
  async _getTimeSheets(req, res) {
    // log method
    logger.log(1, '_getTimeSheets',
      `Attempting to get time sheets for employee number ${req.params.employeeNumber} between`,
      `${req.params.startDate} and ${req.params.endDate}`
    );

    try {
      // mysterio function parameters
      let payload = {
        employeeNumber: req.params.employeeNumber,
        startDate: req.params.startDate,
        endDate: req.params.endDate
      };

      // lambda invoke parameters
      var params = {
        FunctionName: `mysterio-time-sheets-${STAGE}`,
        Payload: JSON.stringify(payload),
        Qualifier: '$LATEST'
      };

      // invoke mysterio time sheets lambda function
      let result = await lambda.invoke(params).promise();

      // log success
      logger.log(1, '_getTimeSheets',
        `Successfully got time sheets for employee number ${req.params.employeeNumber} between`,
        `${req.params.startDate} and ${req.params.endDate}`
      );

      let timeSheets = JSON.parse(result.Payload).body;

      // send successful 200 status
      res.status(200).send(timeSheets);

      // return employee time sheets
      return timeSheets;
    } catch (err) {
      // log error
      logger.log(1, '_getTimeSheets',
        `Failed to get time sheets for employee number ${req.params.employeeNumber} between ${req.params.startDate}`,
        `and ${req.params.endDate}`
      );

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getTimeSheets

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
