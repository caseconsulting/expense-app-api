const _ = require('lodash');
const express = require('express');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt, isAdmin, isManager, getEmployeeAndTags } = require(process.env.AWS ? 'utils' : '../js/utils');

const { getTimesheetsDataForEmployee } = require(process.env.AWS ? 'timesheetUtils' : '../js/utils/timesheet');

const logger = new Logger('tSheetsRoutes');

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
    this.leaderboardDynamo = new DatabaseModify('leaderboard');

    this._router.get('/leaderboard', this._checkJwt, this._getUserInfo, this._getLeaderboardData.bind(this));
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
      // log method
      logger.log(
        1,
        '_getTimesheetsData',
        `Attempting to get timesheet data for employee number ${req.params.employeeNumber}`
      );
      let employeeNumber = req.params.employeeNumber;
      let employeeId = req.query.employeeId;
      let periods = req.query.periods;
      let code = Number(req.query.code);
      let [tags, employee] = await getEmployeeAndTags(employeeId);

      // validate user
      this._validateUser(req.employee, employeeNumber);

      let timeSheets = await this._getTimesheetsDataForEmployee(employee, tags, { code, periods });

      // send successful 200 status
      res.status(200).send(timeSheets);

      return timeSheets;
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

  async _getLeaderboardData(req, res) {
    try {
      // log method
      logger.log(1, '_getLeaderboardData', 'Attempting to get leaderboard data');
      let allLeaderboardData = await this.leaderboardDynamo.getAllEntriesInDB();

      allLeaderboardData = _.reverse(_.sortBy(allLeaderboardData, 'billableHours'));

      allLeaderboardData.forEach((leader, index) => {
        leader.rank = index + 1;
      });

      let leaderboardData = allLeaderboardData.slice(0, 23);

      let currentUserIsLeader = leaderboardData.map((leader) => leader.employeeId).includes(req.employee.id);
      if (!currentUserIsLeader) {
        let currentUserLeaderData = allLeaderboardData.find((leader) => leader.employeeId == req.employee.id);
        if (currentUserLeaderData) {
          leaderboardData.pop();
          leaderboardData.push(currentUserLeaderData);
        }
      }

      logger.log(1, '_getLeaderboardData', 'Successfully retrieved leaderboard data');

      res.status(200).send(leaderboardData);
    } catch (err) {
      // log error
      logger.log(1, '_getLeaderboardData', 'Failed to get leaderboard data');

      // send error status
      this._sendError(res, err);

      // return error
      return err;
    }
  } // _getLeaderboardData

  async _getTimesheetsDataForEmployee(employee, tags, options = {}) {
    // log method
    logger.log(
      1,
      '_getTimesheetsDataForEmployee',
      `Attempting to get timesheet data for employee number ${employee.employeeNumber}`
    );

    let timeSheets = getTimesheetsDataForEmployee(employee, tags, options);
    // log success
    logger.log(
      1,
      '_getTimesheetsDataForEmployee',
      `Successfully got timesheet data for employee number ${employee.employeeNumber}`
    );

    return timeSheets;
  } // _getTimesheetsDataForEmployee

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
} // TSheetsRoutes

module.exports = TimesheetsRoutes;
