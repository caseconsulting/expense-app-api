const { getEmployeesAndTags, asyncForEach } = require(process.env.AWS ? 'utils' : '../js/utils');
const { getTimesheetsDataForEmployee, yearToDatePeriods, getBillableHours } = require(process.env.AWS
  ? 'timesheetUtils'
  : '../js/utils/timesheet');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const logger = new Logger('LeaderboardCron');

async function getLeaderboardData() {
  try {
    // log method
    logger.log(1, 'getLeaderboardData', 'Attempting to get leaderboard data');

    // get employees and tags
    let [tags, employees] = await getEmployeesAndTags();

    // filter employees with non-billable tags
    let nonBillableTags = tags.filter((tag) => ['Overhead', 'LWOP', 'Bench', 'Intern'].includes(tag.tagName));
    let nonBillableEmployeeIds = nonBillableTags.flatMap((tag) => tag.employees);
    let billableEmployees = employees.filter((employee) => !nonBillableEmployeeIds.includes(employee.id));

    // get leaderboard data for billable employees
    await getLeaderboardDataForEmployees(billableEmployees, tags);
  } catch (err) {
    // log error
    logger.log(1, 'getLeaderboardData', 'Failed to get leaderboard data');

    // return error
    return err;
  }
} // getLeaderboardData

async function getLeaderboardDataForEmployees(billableEmployees, tags) {
  logger.log(1, 'getLeaderboardDataForEmployees', 'Attempting to get timesheet data for employees');
  let periods = yearToDatePeriods();
  await asyncForEach(billableEmployees, async (employee) => {
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
  return getLeaderboardDataForEmployees;
} // getTimesheetsDataForEmployees

async function setLeaderboardData(employeeId, billableHours) {
  try {
    // log method
    logger.log(1, 'setLeaderboardData', 'Attempting to set leaderboard data');
    let leaderboardDynamo = new DatabaseModify('leaderboard');
    leaderboardDynamo.addToDB({
      employeeId,
      billableHours
    });
  } catch (err) {
    // log error
    logger.log(1, 'setLeaderboardData', 'Failed to set leaderboard data');

    // return error
    return err;
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
