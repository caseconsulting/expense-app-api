const express = require('express');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');

const lambdaClient = new LambdaClient();
const logger = new Logger('tSheetsRoutes');
const STAGE = process.env.STAGE;

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class TimesheetsRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;

    this._router.get(
      '/:employeeNumber/:startDate/:endDate',
      this._checkJwt,
      this._getUserInfo,
      this._getTimesheetsData.bind(this)
    );
  } // constructor

  /**
   * Gets an employee's monthly hours charged, given an employee number.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - monthly hours
   */
  async _getTimesheetsData(req, res) {
    try {
      let employeeNumber = req.params.employeeNumber;
      let startDate = req.params.startDate;
      let endDate = req.params.endDate;

      // log method
      logger.log(1, '_getMonthlyHours', `Attempting to get timesheet data for employee number ${employeeNumber}`);

      // validations
      this._validateUser(req.employee, employeeNumber);
      this._validateDates(startDate, endDate);

      // mysterio function parameters
      let payload = {
        employeeNumber: employeeNumber,
        startDate: startDate,
        endDate: endDate
      };

      // lambda invoke parameters
      let params = {
        FunctionName: `mysterio-get-timesheet-data-${STAGE}`,
        Payload: JSON.stringify(payload),
        Qualifier: '$LATEST'
      };

      // invoke mysterio monthly hours lambda function
      let resultPayload = await this.invokeLambda(params);

      if (resultPayload.body) {
        // log success
        logger.log(1, '_getMonthlyHours', `Successfully got timesheet data for employee number ${employeeNumber}`);

        let timeSheets = resultPayload.body;

        // send successful 200 status
        res.status(200).send(timeSheets);

        // return employee pto balances
        return timeSheets;
      } else {
        throw {
          code: 400,
          message: resultPayload.errorMessage
        };
      }
    } catch (err) {
      // log error
      logger.log(1, '_getMonthlyHours', `Failed to get monthly hours for employee number ${req.params.employeeNumber}`);

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getTimesheetsData

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
   * Check if an employee is a manager. Returns true if employee role is 'manager', otherwise returns false.
   *
   * @param employee - Employee to check
   * @return boolean - employee is manager
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

  _validateDates(startDate, endDate) {
    if (!dateUtils.isValid(startDate, 'YYYY-MM') || !dateUtils.isValid(endDate, 'YYYY-MM')) {
      throw {
        code: 400,
        message: 'Invalid start or end date, must use YYYY-MM format'
      };
    } else if (dateUtils.isAfter(startDate, endDate, 'month', 'YYYY-MM')) {
      throw {
        code: 400,
        message: 'Invalid start or end date, start date must be before end date'
      };
    }
  }

  _validateUser(authUser, empNum) {
    if (!this.isAdmin(authUser) && !this.isManager(authUser) && Number(authUser.employeeNumber) !== Number(empNum)) {
      throw {
        code: 401,
        message: `User does not have permission to access timesheet data for employeeNumber ${empNum}`
      };
    }
  }

  /**
   * Invokes lambda function with given params
   *
   * @param params - params to invoke lambda function with
   * @return object if successful, error otherwise
   */
  async invokeLambda(params) {
    const command = new InvokeCommand(params);
    const resp = await lambdaClient.send(command);
    return JSON.parse(Buffer.from(resp.Payload));
  } // invokeLambda
} // TSheetsRoutes

module.exports = TimesheetsRoutes;
