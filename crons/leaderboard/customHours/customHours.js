const Logger = require(process.env.AWS ? 'Logger' : '../../js/Logger');
const { getEmployees, asyncForEach } = require(process.env.AWS ? 'utils' : '../../js/utils');
const logger = new Logger('LeaderboardCron');
const STAGE = process.env.STAGE;
const EmployeeRoutes = require(process.env.AWS ? 'employeeRoutes' : '../../routes/employeeRoutes');

const employeeRoutes = new EmployeeRoutes();

async function resetCustomHours() {
  try {
    logger.log(1, 'resetCustomHours', 'Attempting to reset custom hours');

    let employees = await getEmployees();

    await asyncForEach(employees, async (employee) => {
      try {
        logger.log(1, 'resetCustomHours', `Resetting custom hours for employee ${employee.id}`);
        if (employee.preferences?.timesheetPreferences?.customNeeded) {
          delete employee.preferences.timesheetPreferences.customNeeded;
          await employeeRoutes._update({ body: employee, employee: employee });
        }
        logger.log(1, 'resetCustomHours', `Successfully reset custom hours for employee ${employee.id}`);
      } catch (err) {
        logger.log(1, 'resetCustomHours', `Failed to reset custom hours for employee ${employee.id}`);
      }
    });
  } catch (err) {
    logger.log(1, 'resetCustomHours', 'Error resetting custom hours', err);
  }
}

/**
 * Handler to execute lamba function.
 *
 * @param event - request
 */
async function handler(event) {
  console.info(JSON.stringify(event));
  if (['prod', 'test'].includes(STAGE)) {
    await resetCustomHours();
  } else {
    logger.log(1, 'handler', 'Environment skipped.');
  }
} // handler

module.exports = { handler };
