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
  logger.log(1, 'getLeaderboardDataForEmployees', 'Attempting to get leaderboard data for employees');
  let periods = yearToDatePeriods();
  await asyncForEach(employees, async (employee) => {
    try {
      logger.log(1, 'getLeaderboardDataForEmployees', `Attempting to get leaderboard data for employee ${employee.id}`);
      let timesheet = await getTimesheetsDataForEmployee(employee, tags, {
        periods
      });
      setLeaderboardData(employee.id, getBillableHours(timesheet));
    } catch (err) {
      // log error
      logger.log(1, 'getLeaderboardDataForEmployees', `Failed to get leaderboard data for employee ${employee.id}`);
    }
  });
} // getLeaderboardDataForEmployees

async function removeLeaderboardDataForEmployees(employees) {
  logger.log(1, 'removeLeaderboardDataForEmployees', 'Attempting to remove timesheet data for employees');
  await asyncForEach(employees, async (employee) => {
    try {
      logger.log(
        1,
        'removeLeaderboardDataForEmployees',
        `Attempting to remove leaderboard data for employee ${employee.id}`
      );
      leaderboardDynamo.removeFromDB(employee.id, 'employeeId');
    } catch {
      // log error
      logger.log(1, 'removeLeaderboardDataForEmployees', `Failed to remove timesheet data for employee ${employee.id}`);
    }
  });
} // removeLeaderboardDataForEmployees

async function setLeaderboardData(employeeId, billableHours) {
  try {
    // log method
    logger.log(1, 'setLeaderboardData', `Attempting to set leaderboard data for employee ${employeeId}`);
    leaderboardDynamo.addToDB(
      {
        employeeId,
        billableHours
      },
      'employeeId'
    );
  } catch (err) {
    // log error
    logger.log(1, 'setLeaderboardData', `Failed to set leaderboard data for employee ${employeeId}`);
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
