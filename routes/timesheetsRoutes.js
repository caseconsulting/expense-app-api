const express = require('express');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt, invokeLambda, isAdmin, isManager } = require(process.env.AWS ? 'utils' : '../js/utils');
const { getTodaysDate, format, isAfter, isValid, startOf, endOf, subtract, DEFAULT_ISOFORMAT } = require(process.env.AWS
  ? 'dateUtils'
  : '../js/dateUtils');

const logger = new Logger('tSheetsRoutes');
const STAGE = process.env.STAGE;

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class TimesheetsRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;

    this._router.get('/:employeeNumber', this._checkJwt, this._getUserInfo, this._getTimesheetsData.bind(this));
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
      let startDate = req.query.startDate;
      let endDate = req.query.endDate;
      let code = Number(req.query.code);

      // log method
      logger.log(1, '_getMonthlyHours', `Attempting to get timesheet data for employee number ${employeeNumber}`);

      // validations
      this._validateUser(req.employee, employeeNumber);
      code || this._validateDates(startDate, endDate);

      // mysterio function parameters
      let payload = { employeeNumber };

      switch (code) {
        case 1:
          // only PTO data requested
          payload.onlyPto = true;
          break;
        case 2:
          // current and previous pay period timesheets
          payload.periods = this._getPayPeriods(employeeNumber, 2);
          break;
        case 3:
          // yearly timesheets (start and end date of current year)
          payload.periods = [this._getYearlyPeriod()];
          break;
        default:
          // timesheets that fall within the requested start and end dates
          payload.periods = [{ startDate, endDate }];
      }

      // lambda invoke parameters
      let params = {
        FunctionName: `mysterio-get-timesheet-data-${STAGE}`,
        Payload: JSON.stringify(payload),
        Qualifier: '$LATEST'
      };

      // invoke mysterio monthly hours lambda function
      let resultPayload = await invokeLambda(params);
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
          message: resultPayload?.message || resultPayload
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

  _getPayPeriods(employeeNumber, amount) {
    if (Number(employeeNumber) > 0) {
      // CASE pay period
      return this._getMonthlyPayPeriods(amount);
    } else {
      // TODO: CYK bi-weekly integration
    }
  }

  /**
   * Gets the array of monthly pay period dates.
   *
   * @param {Number} amount - The sum of current and previous pay periods to get
   * @returns Array - The array of pay period objects
   */
  _getMonthlyPayPeriods(amount) {
    let periods = [];
    let today = getTodaysDate();
    for (let i = 0; i < amount; i++) {
      let date = subtract(today, i, 'month');
      let startDate = format(startOf(date, 'month'), null, DEFAULT_ISOFORMAT);
      let endDate = format(endOf(date, 'month'), null, DEFAULT_ISOFORMAT);
      let title = format(startDate, null, 'MMMM');
      periods.unshift({ startDate, endDate, title });
    }
    return periods;
  } // _getMonthlyPayPeriods

  /**
   * Gets the yearly time period.
   *
   * @returns Object - The start and end date of the year and a formatted title
   */
  _getYearlyPeriod() {
    let today = getTodaysDate();
    let startDate = format(startOf(today, 'year'), null, DEFAULT_ISOFORMAT);
    let endDate = format(endOf(today, 'year'), null, DEFAULT_ISOFORMAT);
    let title = format(startDate, null, 'YYYY');
    return { startDate, endDate, title };
  } // _getYearlyPeriod

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
    return res.status(err?.code || 500).send(err);
  } // _sendError

  /**
   * Validates the start and end date.
   *
   * @param {String} startDate - The start date
   * @param {String} endDate - The end date
   */
  _validateDates(startDate, endDate) {
    if (!isValid(startDate, 'YYYY-MM-DD') || !isValid(endDate, 'YYYY-MM-DD')) {
      throw {
        code: 400,
        message: 'Invalid start or end date, must use YYYY-MM-DD format'
      };
    } else if (isAfter(startDate, endDate, 'day', 'YYYY-MM-DD')) {
      throw {
        code: 400,
        message: 'Invalid start or end date, start date must be before end date'
      };
    }
  } // _validateDates

  /**
   *
   * @param {Objeect} authUser - The user requesting data
   * @param {*} empNum - The employee number of the user's data to be received
   */
  _validateUser(authUser, empNum) {
    if (!isAdmin(authUser) && !isManager(authUser) && Number(authUser.employeeNumber) !== Number(empNum)) {
      throw {
        code: 401,
        message: `User does not have permission to access timesheet data for employeeNumber ${empNum}`
      };
    }
  } // _validateUser
} // TSheetsRoutes

module.exports = TimesheetsRoutes;
