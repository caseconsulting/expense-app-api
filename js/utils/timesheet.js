const _ = require('lodash');
const { getTodaysDate, format, isAfter, isValid, startOf, endOf, subtract } = require(process.env.AWS
  ? 'dateUtils'
  : '../../js/dateUtils');

const { invokeLambda } = require(process.env.AWS ? 'utils' : '../../js/utils');
const Logger = require(process.env.AWS ? 'Logger' : '../../js/Logger'); // from shared layer
const logger = new Logger('timesheet');

const STAGE = process.env.STAGE;

async function getTimesheetsDataForEmployee(employee, tags, options = {}) {
  logger.log(2, 'getTimesheetsDataForEmployee', 'Running util function to get timesheet data');
  let code = options.code;
  let periods = options.periods;
  if (!Array.isArray(periods)) periods = [periods];
  let employeeNumber = employee.employeeNumber;
  let cykTag = _.find(tags, (t) => t.tagName === 'Legacy CYK');
  let isCyk = _.some(cykTag?.employees, (e) => e === employee.id);
  let cykAoidKey = 'cykAoid';

  // validate dates
  code || _validateDates(periods);
  let payload = { employeeNumber, ...(isCyk && { legacyADP: true, aoid: employee[cykAoidKey] }) };

  let currentDate = new Date();
  let numMonths = currentDate.getMonth();

  switch (code) {
    case 1:
      // only PTO data requested
      payload.onlyPto = true;
      break;
    case 2:
      // current and previous pay period timesheets
      if (numMonths < 1) {
        numMonths += 2;
      } else {
        numMonths++;
      }
      payload.periods = _getMonthlyPayPeriods(numMonths);
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
  
  // retry up to three times before returning any error codes
  // 200s and 300s allowed
  if (resultPayload.status >= 400 && (options.retries ?? 0) < 3) {
    options.retries ??= 0;
    logger.log(2, 'getTimesheetsDataForEmployee', `Attempt ${options.retries} failed, trying again.`);
    options.retries++;
    return await getTimesheetsDataForEmployee(employee, tags, options);
  }

  switch (resultPayload.status) {
    case 200:
      return resultPayload.body;
    case 500:
      if (resultPayload.code == 'ERR_S3_NOT_FOUND')
        throw {
          status: resultPayload.status,
          code: resultPayload.code,
          message: 'Failed to load timesheet data'
        };

    // else fall through
    default:
      throw {
        code: 400,
        message: resultPayload?.message ?? resultPayload
      };
  }
} // getTimesheetsDataForEmployee

function yearToDatePeriods() {
  let today = getTodaysDate();
  let startDate = startOf(today, 'year');

  return [{ startDate, endDate: today }];
} // yearToDatePeriods

/**
 * Gets the array of monthly pay period dates.
 *
 * @param {Number} amount - The sum of current and previous pay periods to get
 * @returns Array - The array of pay period objects
 */
function _getMonthlyPayPeriods(amount) {
  let periods = [];
  let today = getTodaysDate();
  for (let i = 0; i < amount; i++) {
    let date = subtract(today, i, 'month');
    let startDate = startOf(date, 'month');
    let endDate = endOf(date, 'month');
    let title = format(startDate, null, 'MMMM');
    periods.unshift({ startDate, endDate, title });
  }
  return periods;
} // _getMonthlyPayPeriods

/**
 * Validates the start and end date.
 *
 * @param {String} periods array of period objects to check, each must have a `startDate` and `endDate`
 */
function _validateDates(periods) {
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

function getBillableHours(timesheet) {
  let nonBillables = timesheet.supplementalData.nonBillables;
  let total = 0;
  let timesheets = timesheet.timesheets?.[0]?.timesheets;
  for (let jobcode in timesheets) {
    if (!nonBillables.includes(jobcode)) {
      total += timesheets[jobcode] / 3600; // seconds to hours
    }
  }
  return total;
} // getBillableHours

module.exports = {
  getTimesheetsDataForEmployee,
  yearToDatePeriods,
  getBillableHours
};
