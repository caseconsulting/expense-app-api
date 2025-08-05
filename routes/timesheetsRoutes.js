/**
 * @import Logger from '../js/Logger'
 * @typedef {keyof typeof fieldToName} CsvField
 * @typedef {'PTO' | 'CASE_CARES' | 'CASE_CONNECTIONS' | 'HOLIDAY' | 'TRAINING_TUITION'} PtoCode
 * @typedef {Record<PtoCode, { actuals: number, balance: number }} PtoData Maps a pto code to categorized hours
 * @typedef {Record<number, PtoData>} PtoMap Maps employee number to PtoData
 */

const _ = require('lodash');
const express = require('express');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt, isAdmin, isManager, getEmployeeAndTags } = require(process.env.AWS ? 'utils' : '../js/utils');
const Papa = require('papaparse');

// S3
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const s3Client = new S3Client({ apiVersion: '2006-03-01' });
const BUCKET = `case-expense-app-unanet-data-${process.env.STAGE}`;

/** @type {import('../js/utils/timesheet')} */
const { getTimesheetsDataForEmployee } = require(process.env.AWS ? 'timesheetUtils' : '../js/utils/timesheet');

/** @type {Logger} */
const logger = new Logger('tSheetsRoutes');

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

/**
 * Multer middleware. Gets the file in the 'accruals' form field and stores it in memory. We need to do this to
 * validate file contents, so we don't upload bad csv files
 */
const storeFile = multer({ storage: multer.memoryStorage() }).single('accruals');

/**
 * Maps csv fields to a logical name to store as json
 */
const fieldToName = /** @type {const} */ ({
  'Person Code': 'employeeNumber', // employee number,
  Project: 'code', // job code (type of pto)
  Actuals: 'actuals',
  Balance: 'balance'
});

/**
 * Parses the csv file into a json object
 *
 * @param {Express.Multer.File} file
 * @returns {{ data: PtoMap, fields: CsvField[] }}
 */
function parseCsv(file) {
  // parse without headers (fields) so we can account for different scenarios and weird formatting (i.e. when the
  // header isn't the first line)
  const parsed = Papa.parse(file.buffer.toString(), { dynamicTyping: true });

  /** @type {any[][]} */
  const rows = parsed.data;

  /**
   * Maps csv fields to index within row
   * @type {Record<CsvField, number>}
   */
  const fieldToIndex = {};

  /**
   * Consolidate separate records into a single object per employee that contains all pto data. Maps employee numbers
   * to pto data. Pto data maps pay codes to an object containing actuals and balance (measured in hours).
   * @type {PtoMap}
   */
  const consolidated = {};

  const states = /** @type {const} */ ({
    start: 0,
    rows: 1
  });
  let state = states.start;

  for (const row of rows) {
    let employeeNumber, ptoCode, balance;

    switch (state) {
      case states.start:
        // skip until we find the header line
        if (!row.includes('Person')) break;

        // map headers to indices
        for (const field in fieldToName) {
          for (const i in row) {
            if (row[i] == field) fieldToIndex[field] = i;
          }
        }
        logger.log(3, 'parseCsv', `Found csv headers: [${Object.keys(fieldToIndex).join(', ')}]`);

        // enter row-parsing state
        state = states.rows;
        break;

      case states.rows:
        employeeNumber = row[fieldToIndex['Person Code']];
        ptoCode = row[fieldToIndex.Project];
        balance = row[fieldToIndex.Balance] * 60 * 60; // hours -> seconds

        if (!consolidated[employeeNumber]) consolidated[employeeNumber] = {};
        consolidated[employeeNumber][ptoCode] = balance;
        break;
    }
  }

  return { data: consolidated, fields: Object.keys(fieldToIndex) };
}

/**
 * Middleware to validate:
 * 1. User role is admin or manager
 * 2. Mime type is csv
 * 3. Correct rows/cols exist in the file
 *
 * @param {express.Request & { employee: { employeeRole: string } }} req
 * @param {express.Response} res
 * @param {express.NextFunction} next
 */
async function validateFile(req, res, next) {
  const STATUS_CODES = {
    forbidden: 403, // not admin or manager
    unsupportedMediaType: 415, // not text/csv
    unprocessableEntity: 422 // valid csv, but couldn't be parsed or is missing expected data
  };

  const role = req.employee.employeeRole; // from getUserInfo middleware
  if (!['admin', 'manager'].includes(role)) {
    logger.log(4, 'validateFile', 'User is not admin or manager');
    res.status(STATUS_CODES.forbidden).json({ error: 'forbidden', message: 'Insufficient permissions' });
    return;
  }

  const file = req.file; // from `memoryStore` middleware

  if (!file) res.status(400).json({ error: 'missing file', message: 'File is required' });
  // add more mimetypes here if needed
  if (!['text/csv'].includes(file.mimetype)) {
    logger.log(4, 'validateFile', `Invalid mime type: ${file.mimetype}`);
    res
      .status(STATUS_CODES.unsupportedMediaType)
      .json({ error: 'invalid type', message: 'Only CSV files are supported' });
    return;
  }

  // parse csv to check that it has the right columns
  try {
    const { data, fields } = parseCsv(req.file);

    if (!fields) {
      logger.log(4, 'validateFile', 'Error getting CSV fields.', 'Parsed fields:', fields);
      res.status(STATUS_CODES.unprocessableEntity).json({ error: 'parse failed', message: 'Could not parse CSV file' });
      return;
    }

    /** @type {CsvField[]} */
    const missingFields = Object.keys(fieldToName).filter((value) => !fields.includes(value));
    if (missingFields.length !== 0) {
      logger.log(4, 'validateFile', `CSV file is missing required headers: ${missingFields}`);
      res.status(STATUS_CODES.unprocessableEntity).json({
        error: 'missing columns',
        message: 'CSV file is missing required headers',
        meta: missingFields
      });
      return;
    }

    // file is valid
    logger.log(4, 'validateFile', 'Successfully validated CSV file');
    req['csvAsJson'] = data; // put data in req for later use
    next();
  } catch (err) {
    logger.log(4, 'validateFile', 'Error while parsing CSV:', err);
    res.status(STATUS_CODES.unprocessableEntity).json({ error: 'parse failed', message: 'Error parsing CSV' });
  }
}

/**
 * Middleware to upload the file to S3. We don't use multer directly because we had to validate the file contents, and
 * at this point the file was parsed out of the request body so multer won't work.
 *
 * @param {express.Request & { csvAsJson: PtoMap }} req
 * @param {express.Response} res
 */
async function uploadAccruals(req, res) {
  const file = Buffer.from(JSON.stringify(req.csvAsJson));
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: 'accruals.json',
    Body: file,
    ContentType: 'application/json',
    ACL: 'bucket-owner-full-control',
    ServerSideEncryption: 'AES256'
  });

  try {
    logger.log(4, 'upload', 'Attempting to upload Unanet accruals to S3...');
    await s3Client.send(command);
    logger.log(
      1,
      'upload',
      'Successfully uploaded Unanet accruals',
      `(from file ${req.file.originalname}) to S3 bucket ${BUCKET}`
    );
    res.status(200).send();
  } catch (err) {
    logger.log(4, 'upload', err.message ?? err);
    res.status(500).json({ error: 'upload', message: 'Error uploading file' });
  }
}

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
    this._router.post('/uploadAccruals', this._checkJwt, this._getUserInfo, storeFile, validateFile, uploadAccruals);
  } // constructor

  /**
   * Gets an employee's monthly hours charged, given an employee number.
   *
   * @param {express.Request} req - api request
   * @param {express.Response} res - api response
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
        `Failed to get timesheet data for employee number ${req.params.employeeNumber}. Error: ${JSON.stringify(err)}`
      );

      // mysterio tried to pull an object from s3 that doesn't exist
      if (err.status == 500 && err.code == 'ERR_S3_NOT_FOUND') {
        res.status(err.status).send(err.message ?? 'Failed to load timesheet data');
        return err;
      }

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

      let leaderboard = allLeaderboardData.slice(0, 23);

      let currentUserData = allLeaderboardData.find((leader) => leader.employeeId == req.employee.id);

      logger.log(1, '_getLeaderboardData', 'Successfully retrieved leaderboard data');

      res.status(200).send({ leaderboard, currentUserData });
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

    let timeSheets = await getTimesheetsDataForEmployee(employee, tags, options);

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
} // TimesheetsRoutes

module.exports = TimesheetsRoutes;
