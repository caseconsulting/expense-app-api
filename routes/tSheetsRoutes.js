const AWS = require('aws-sdk');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const Logger = require('../js/Logger');

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
      '/getMonthlyHours/:employeeNumber',
      this._checkJwt,
      this._getUserInfo,
      this._getMonthlyHours.bind(this)
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
   * Gets an employee's monthly hours charged, given an employee number.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - monthly hours
   */
  async _getMonthlyHours(req, res) {
    // log method
    logger.log(1, '_getMonthlyHours',
      `Attempting to get monthly hours for employee number ${req.params.employeeNumber}`
    );

    try {

      // mysterio function parameters
      let payload = {
        employeeNumber: req.params.employeeNumber
      };

      // lambda invoke parameters
      let params = {
        FunctionName: `mysterio-monthly-hours-${STAGE}`,
        Payload: JSON.stringify(payload),
        Qualifier: '$LATEST'
      };

      // invoke mysterio monthly hours lambda function
      let result = await this.invokeLambda(params);

      // invoke mysterio pto balances lambda function
      let resultPayload = JSON.parse(result.Payload);

      if (resultPayload.body) {
        // log success
        logger.log(1, '_getMonthlyHours',
          `Successfully got monthly hours for employee number ${req.params.employeeNumber}`
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
      logger.log(1, '_getMonthlyHours',
        `Failed to get monthly hours for employee number ${req.params.employeeNumber}`
      );

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getMonthlyHours

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

  /**
   * Invokes lambda function with given params
   * @param params - params to invoke lambda function with 
   * @return object if successful, error otherwise
   */
  async invokeLambda(params) {
    let result = await lambda.invoke(params).promise();
    return result;
  } // invokeLambda
} // TSheetsRoutes

module.exports = TSheetsRoutes;
