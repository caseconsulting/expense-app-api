const _ = require('lodash');
const express = require('express');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt, invokeLambda, isAdmin, isManager } = require(process.env.AWS ? 'utils' : '../js/utils');
const {
  add,
  getTodaysDate,
  format,
  isAfter,
  isValid,
  isBetween,
  startOf,
  endOf,
  subtract,
  DEFAULT_ISOFORMAT
} = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');

const logger = new Logger('tSheetsRoutes');
const STAGE = process.env.STAGE;

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class TimesheetsRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._ACCOUNTS = { CASE: 'CASE', CYK: 'CYK' };
    this._employeeDynamo = new DatabaseModify('employees');
    this.tagDynamo = new DatabaseModify('tags');

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
      let employeeId = req.query.employeeId;
      let periods = req.query.periods;
      let code = Number(req.query.code);
      let [tags, employee] = await Promise.all([
        this.tagDynamo.getAllEntriesInDB(),
        this._employeeDynamo.getEntry(employeeId)
      ]);
      let cykTag = _.find(tags, (t) => t.tagName === 'Legacy CYK');
      let isCyk = _.some(cykTag?.employees, (e) => e === employeeId);
      let cykAoidKey = 'cykAoid';

      // log method
      logger.log(1, '_getTimesheetsData', `Attempting to get timesheet data for employee number ${employeeNumber}`);

      // validations
      this._validateUser(req.employee, employeeNumber);
      code || this._validateDates(periods);

      // mysterio function parameters
      let payload = { employeeNumber, ...(isCyk && { legacyADP: true, aoid: employee[cykAoidKey] }) };

      switch (code) {
        case 1:
          // only PTO data requested
          payload.onlyPto = true;
          break;
        case 2:
          // current and previous pay period timesheets
          payload.periods = this._getMonthlyPayPeriods(2);
          break;
        default:
          // timesheets that fall within the requested start and end dates
          payload.periods = periods;
      }

      // lambda invoke parameters
      let params = {
        FunctionName: `mysterio-get-timesheet-data-${STAGE}`,
        Payload: JSON.stringify(payload),
        Qualifier: STAGE
      };

      // invoke mysterio monthly hours lambda function
      let resultPayload = await invokeLambda(params);
      if (resultPayload.body) {
        // log success
        logger.log(1, '_getTimesheetsData', `Successfully got timesheet data for employee number ${employeeNumber}`);

        let timeSheets = resultPayload.body;

        // LEGACY: keeping as record of how to set ADP AOID
        // if (account === this._ACCOUNTS.CYK) {
        //   if (!(cykAoidKey in employee)) {
        //     // add CYK aoid to employee record for optimization
        //     employee[cykAoidKey] = timeSheets.aoid;
        //     await this._employeeDynamo.updateAttributeInDB(employee, cykAoidKey);
        //   }
        // }
            
        // send successful 200 status
        logger.log(1, '_getTimesheetsData', JSON.stringify(payload));
        logger.log(1, '_getTimesheetsData', JSON.stringify(resultPayload));
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
      logger.log(
        1,
        '_getTimesheetsData',
        `Failed to get timesheet data for employee number ${req.params.employeeNumber}`
      );

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getTimesheetsData

  /**
   * Gets the current bi-weekly pay period for CYK employees.
   *
   * @param {String} originalStartDate - A pay period start date in the past
   * @param {String} originalEndDate - A pay period end date in the past
   * @returns Object - The start and end date of the current bi-weekly period
   */
  _getCykCurrentPeriod(originalStartDate, originalEndDate) {
    let today = getTodaysDate();
    let startDate = _.cloneDeep(originalStartDate);
    let endDate = _.cloneDeep(originalEndDate);
    while (!isBetween(today, startDate, endDate, 'day', '[]')) {
      startDate = add(startDate, 14, 'day', DEFAULT_ISOFORMAT);
      endDate = add(endDate, 14, 'day', DEFAULT_ISOFORMAT);
    }
    return { startDate, endDate };
  } // _getCykCurrentPeriod

  /**
   * Gets the array of bi-weekly pay period dates.
   *
   * @param {Object} currentPeriod - The start and end date of the current pay period
   * @param {Number} amount - the sum of current and previous pay periods to get
   * @returns Array - The array of pay period objects
   */
  _getBiWeeklyPayPeriods(currentPeriod, amount) {
    let periods = [];
    let period = _.cloneDeep(currentPeriod);
    for (let i = 0; i < amount; i++) {
      let startDateTitle = format(period.startDate, null, 'MMM D, YYYY');
      let endDateTitle = format(period.endDate, null, 'MMM D, YYYY');
      period.title = `${startDateTitle} - ${endDateTitle}`;
      periods.unshift(period);
      period = _.cloneDeep(period);
      period.startDate = subtract(period.startDate, 14, 'day', DEFAULT_ISOFORMAT);
      period.endDate = subtract(period.endDate, 14, 'day', DEFAULT_ISOFORMAT);
    }
    return periods;
  } // _getBiWeeklyPayPeriods

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
   * @param {String} periods array of period objects to check, each must have a `startDate` and `endDate`
   */
  _validateDates(periods) {
    for (let period of periods) {
      if (!isValid(period.startDate, 'YYYY-MM-DD') || !isValid(period.endDate, 'YYYY-MM-DD')) {
        throw {
          code: 400,
          message: 'Invalid start or end date, must use YYYY-MM-DD format'
        };
      } else if (isAfter(period.startDate, period.endDate, 'day', 'YYYY-MM-DD')) {
        throw {
          code: 400,
          message: 'Invalid start or end date, start date must be before end date'
        };
      }
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
