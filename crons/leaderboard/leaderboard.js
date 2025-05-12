const _ = require('lodash');
const { getEmployeesAndTags, asyncForEach } = require(process.env.AWS ? 'utils' : '../js/utils');
const { getTimesheetsDataForEmployee, yearToDatePeriods, getBillableHours } = require(process.env.AWS
  ? 'timesheetUtils'
  : '../js/utils/timesheet');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const logger = new Logger('LeaderboardCron');

const leaderboardDynamo = new DatabaseModify('leaderboard');

async function getLeaderboardData() {
  try {
    // log method
    logger.log(1, 'getLeaderboardData', 'Attempting to get leaderboard data');

    // get employees and tags
    let [tags, employees] = await getEmployeesAndTags();

    // filter employees with non-billable tags
    let nonBillableTags = tags.filter((tag) => ['Overhead', 'LWOP', 'Bench', 'Intern'].includes(tag.tagName));
    let nonBillableEmployeeIds = nonBillableTags.flatMap((tag) => tag.employees);
    let [activeBillableEmployees, otherEmployees] = _.partition(
      employees,
      (employee) => employee.workStatus > 0 && !nonBillableEmployeeIds.includes(employee.id)
    );

    // get leaderboard data for billable employees
    await getLeaderboardDataForEmployees(activeBillableEmployees, tags);
    await removeLeaderboardDataForEmployees(otherEmployees);
  } catch (err) {
    // log error
    logger.log(1, 'getLeaderboardData', 'Failed to get leaderboard data');
  }
} // getLeaderboardData

async function getLeaderboardDataForEmployees(employees, tags) {
  logger.log(1, 'getLeaderboardDataForEmployees', 'Attempting to get timesheet data for employees');
  let periods = yearToDatePeriods();
  await asyncForEach(employees, async (employee) => {
    try {
      let timesheet = await getTimesheetsDataForEmployee(employee, tags, {
        periods
      });
      setLeaderboardData(employee.id, getBillableHours(timesheet));
    } catch (err) {
      // log error
      logger.log(
        1,
        'getLeaderboardDataForEmployees',
        `Failed to get timesheet data for employee number ${employee.employeeNumber}`
      );
    }
  });
} // getTimesheetsDataForEmployees

async function removeLeaderboardDataForEmployees(employees) {
  logger.log(1, 'removeLeaderboardDataForEmployees', 'Attempting to remove timesheet data for employees');
  await asyncForEach(employees, async (employee) => {
    try {
      leaderboardDynamo.removeFromDB(employee.employeeNumber, 'employeeId');
    } catch {
      // log error
      logger.log(
        1,
        'removeLeaderboardDataForEmployees',
        `Failed to remove timesheet data for employee number ${employee.employeeNumber}`
      );
    }
  });
} // removeLeaderboardDataForEmployees

async function setLeaderboardData(employeeId, billableHours) {
  try {
    // log method
    logger.log(1, 'setLeaderboardData', 'Attempting to set leaderboard data');
    leaderboardDynamo.addToDB(
      {
        employeeId,
        billableHours
      },
      'employeeId'
    );
  } catch (err) {
    // log error
    logger.log(1, 'setLeaderboardData', 'Failed to set leaderboard data');
  }
} // setLeaderboardData

/**
 * Handler to execute lamba function.
 *
 * @param event - request
 */
async function handler(event) {
  console.info(JSON.stringify(event)); // eslint-disable-line no-console

  await getLeaderboardData();
} // handler

module.exports = { handler };
