const AWS = require('aws-sdk');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const Logger = require('../js/Logger');
const moment = require('moment');
// const _ = require('lodash');

const ISOFORMAT = 'YYYY-MM-DD';
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

class TSheetsRoutes {

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
   * Gets an employee's paid time off (PTO) balances, given an employee number. If the employee number is 0, PTO
   * balances of ALL employees will be returned.
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
      let params = {
        FunctionName: `mysterio-pto-balances-${STAGE}`,
        Payload: JSON.stringify(payload),
        Qualifier: '$LATEST'
      };

      let result = await lambda.invoke(params).promise();

      // invoke mysterio pto balances lambda function
      let resultPayload = JSON.parse(result.Payload);

      if (resultPayload.body) {
        // log success
        logger.log(1, '_getPTOBalances',
          `Successfully got PTO balances for employee number ${req.params.employeeNumber}`
        );

        let ptoBalances = resultPayload.body;
        // send successful 200 status
        res.status(200).send(ptoBalances);

        // return employee pto balances
        return ptoBalances;
      } else {
        throw {
          code: 404,
          message: resultPayload.errorMessage
        };
      }
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
   * Gets an employee's time sheets, given an employee number, a start date, and end date in iso-format. If the
   * employee number is 0, time sheets for ALL employees between the date range will be returned.
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
      if (!this.isIsoFormat(req.params.startDate)) {
        throw {
          code: 400,
          message: 'Invalid start date. Start date must be in iso-format.'
        };
      } else if (!this.isIsoFormat(req.params.endDate)) {
        throw {
          code: 400,
          message: 'Invalid end date. End date must be in iso-format.'
        };
      }

      let startDate = moment(req.params.startDate, ISOFORMAT);
      let endDate = moment(req.params.endDate, ISOFORMAT);
      if (startDate.isAfter(endDate)) {
        throw {
          code: 400,
          message: 'Start date must be before end date.'
        };
      }
      if (!startDate.isValid() || !endDate.isValid()) {
        throw {
          code: 400,
          message: 'Dates must be valid.'
        };
      }

      // mysterio function parameters
      let payload = {
        employeeNumber: req.params.employeeNumber,
        startDate: req.params.startDate,
        endDate: req.params.endDate
      };

      // lambda invoke parameters
      let params = {
        FunctionName: `mysterio-time-sheets-${STAGE}`,
        Payload: JSON.stringify(payload),
        Qualifier: '$LATEST'
      };

      // invoke mysterio time sheets lambda function
      let result = await lambda.invoke(params).promise();

      // invoke mysterio pto balances lambda function
      let resultPayload = JSON.parse(result.Payload);

      if (resultPayload.body) {
        // log success
        logger.log(1, '_getTimeSheets',
          `Successfully got time sheets for employee number ${req.params.employeeNumber} between`,
          `${req.params.startDate} and ${req.params.endDate}`
        );

        let timeSheets = resultPayload.body;

        // send successful 200 status
        res.status(200).send(timeSheets);

        // return employee pto balances
        return timeSheets;
      } else {
        throw {
          code: 404,
          message: resultPayload.errorMessage
        };
      }
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
   * Checks if a value is a valid iso-format date (YYYY-MM-DD). Returns true if it is isoformat, otherwise returns
   * false.
   *
   * @param value - value to check
   * @return boolean - value is in iso-format
   */
  isIsoFormat(value) {
    let dateRegex = RegExp('[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]$');
    return dateRegex.test(value);
  } // isIsoFormat

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
} // TSheetsRoutes

module.exports = TSheetsRoutes;
