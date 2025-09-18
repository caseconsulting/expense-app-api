const { getHoursRequired } = require('./shared.js');
const { invokeLambda } = require(process.env.AWS ? 'utils' : '../../js/utils');
const {
  getTodaysDate,
  startOf,
  endOf,
  getIsoWeekday,
  add,
  subtract,
  isSame,
  DEFAULT_ISOFORMAT
} = require('dateUtils');

const STAGE = process.env.STAGE;

/**
 * Checks to see if today is the last work day of the month or 1 day after the last work day.
 *
 * @param {Number} day - 1 or 2, 1 being first reminder day 2 being second reminder day
 * @returns Boolean - True if employees should be notified today
 */
function _isCaseReminderDay(day) {
  // return true for testing
  if (STAGE === 'dev') return { monthly: true, weekly: false, any: true };

  // check for monthly reminder day
  let todaySubtracted = false;
  let today = getTodaysDate(DEFAULT_ISOFORMAT);
  if (isSame(today, startOf(today, 'month'), 'day')) {
    today = subtract(today, 1, 'day', DEFAULT_ISOFORMAT);
    todaySubtracted = true;
  }
  let lastDay = endOf(today, 'month');
  let isoWeekDay = getIsoWeekday(lastDay);
  let daysToSubtract = Math.max(isoWeekDay - 5, 0);
  let lastWorkDay = subtract(lastDay, daysToSubtract, 'day', DEFAULT_ISOFORMAT);
  let lastWorkDayPlusOne = add(lastWorkDay, 1, 'day', DEFAULT_ISOFORMAT);
  let isMonthlyReminderDay =
    (isSame(today, lastWorkDay, 'day') && !todaySubtracted && day === 1) ||
    (isSame(today, lastWorkDayPlusOne, 'day') && !todaySubtracted && day === 2) ||
    (isSame(today, lastWorkDay, 'day') && todaySubtracted && day === 2);
  if (isMonthlyReminderDay) console.log('Today is a monthly CASE reminder day');

  // check for weekly reminder day
  let weekday = getTodaysDate('dddd').toLowerCase();
  let isWeeklyReminderDay = false;
  if ((weekday === 'friday' && day === 1) || (weekday === 'saturday' && day === 2)) {
    isWeeklyReminderDay = true;
    console.log('Today is a weekly CASE reminder day');
  }

  // log result if it's neither monthly nor weekly reminder day
  if (!isMonthlyReminderDay && !isWeeklyReminderDay) console.log('Today is not a CASE reminder day');

  // return object
  return {
    monthly: isMonthlyReminderDay,
    weekly: isWeeklyReminderDay,
    any: isMonthlyReminderDay || isWeeklyReminderDay
  };
} // _isCaseReminderDay

/**
 * Checks if an employee has not submitted the correct amount of timesheet hours for the
 * pay period.
 *
 * @param {Object} employee - The employee to check
 * @param {Object} isCaseReminderDay - Result object of _isCaseReminderDay to check monthly vs weekly
 * @param {Object} contracts - Contracts from the Portal
 * @returns Boolean - True if the employee has not met their pay period hours
 */
async function _shouldSendCaseEmployeeReminder(employee, isCaseReminderDay, portalContracts) {
  // get monthly vs weekly
  let checkType;
  if (isCaseReminderDay.monthly) checkType = 'month';
  else if (isCaseReminderDay.weekly) checkType = 'week';
  let checkTypeIsWeek = checkType === 'week';

  // return false if this is a weekly check and the user doesn't have a weekly-reminded project
  let today = getTodaysDate();
  if (checkTypeIsWeek) {
    let hasWeeklyReminderProject = false;
    for (let c of employee.contracts) {
      if (portalContracts[c.contractId].settings?.timesheetsReminderOption == '0') {
        hasWeeklyReminderProject = true;
      }
    }
    if (!hasWeeklyReminderProject) return false;
  }

  // get start and end date based on week/month check type
  // let today = getTodaysDate();
  if (isSame(today, startOf(today, checkType), 'day')) {
    today = subtract(today, 1, 'day', DEFAULT_ISOFORMAT);
  }
  let startDate = startOf(today, checkType);
  let endDate = endOf(today, checkType);

  // return whether or not the employee needs to be notified
  if (checkTypeIsWeek) {
    let options = { allowSaved: true, returnSheets: true };
    let timesheets = await _getHoursSubmitted(employee, startDate, endDate, options);
    return Object.keys(timesheets).length < 5; // 5 days in a working week
  } else {
    let hoursSubmitted = await _getHoursSubmitted(employee, startDate, endDate);
    let hoursRequired = getHoursRequired(employee, startDate, endDate);
    return hoursRequired > hoursSubmitted;
  }
} // _shouldSendCaseEmployeeReminder

/**
 * Gets the user's timesheets within a given time period.
 *
 * @param {number} employee employee to get hours for
 * @param {string} startDate The period start date
 * @param {string} endDate The period end date
 * @param {Object} options optional vars, default to false:
 *   - allowSaved: Include timesheets that are in state "INUSE", as opposed to requiring state "SUBMITTED"
 *   - returnSheets: Return the timesheets themselves, as opposed to the sum of the timesheets
 * @returns {any[]} All user timesheets within the given time period
 */
async function _getHoursSubmitted(employee, startDate, endDate, options = {}) {
  // get options or set to defaults
  const { allowSaved = false, returnSheets = false } = options;

  // utility vars
  const statusSubmitted = ['SUBMITTED', 'LOCKED'];
  const statusSaved = [...statusSubmitted, 'INUSE'];
  const { employeeNumber, unanetPersonKey } = employee;

  try {
    // Call lambda
    let payload = {
      employeeNumber,
      unanetPersonKey,
      periods: [{ startDate, endDate, title: 'timesheets' }],
      options: { status: allowSaved ? statusSaved : statusSubmitted }
    };
    let params = {
      FunctionName: `mysterio-get-timesheet-data-${STAGE}`,
      Payload: JSON.stringify(payload),
      Qualifier: STAGE
    };
    let resultPayload = await invokeLambda(params);

    // extract results, error if needed
    let { status, code, body, message = 'Failed to load timesheet data' } = resultPayload;
    if (resultPayload.status !== 200) throw { status, code, message };
    let timesheets = body.timesheets[0].timesheets; // extract actual timesheets

    // return timesheets or duration based on option
    let returnValue;
    if (returnSheets) returnValue = timesheets;
    else returnValue = Object.values(timesheets).reduce((sum, t) => sum + t, 0) / 60 / 60; // sum and convert to hours
    return Promise.resolve(returnValue);
  } catch (err) {
    console.error(`Error getting timesheets for employee number ${employeeNumber}:`, err);
    return Promise.reject(err);
  }
} // _getHoursSubmitted

module.exports = {
  _isCaseReminderDay,
  _shouldSendCaseEmployeeReminder
};
