let lib;

const Logger = require('./js/Logger');
const DatabaseModify = require('./js/databaseModify');
const _ = require('lodash');
const logger = new Logger('TrainingSync');
/**
 * Returns a new DatabaseModify for employees
 *
 * @return - the databasemodify for employees
 */
function _employeeDynamo() {
  return new DatabaseModify('employees');
} //_employeeDynamo

/**
 * Async function to loop an array.
 *
 * @param array - Array of elements to iterate over
 * @param callback - callback function
 */
async function _asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
} // _asyncForEach

/**
 * Used to update technology an employee has listed as current
 *
 * @param techs employee's technology data
 * @return - technology object that would have updated years field if it contains current tech
 */
async function _updateCurrentTechnologies(techs) {
  await _asyncForEach(techs, async (tech) => {
    if (tech.current && tech.years >= 0) {
      // 1 / 12 represents 1 month
      tech.years = Number(tech.years) + 1 / 12;
      tech.years = tech.years.toFixed(2);
    }
  });
  return techs;
} //_updateCurrentTechnologies

/**
 * Used to update customer org experience an employee has listed as current
 *
 * @param customerOrgExps employee's customer org experience data
 * @return - customer org experience object that would have updated
 *  years field if it contains current customer org experience
 */
async function _updateCurrentCustomerOrgExp(customerOrgExps) {
  await _asyncForEach(customerOrgExps, async (customerOrgExp) => {
    if (customerOrgExp.current && customerOrgExp.years >= 0) {
      // 1 / 12 represents 1 month
      customerOrgExp.years = Number(customerOrgExp.years) + 1 / 12;
      customerOrgExp.years = customerOrgExp.years.toFixed(2);
    }
  });
  return customerOrgExps;
} // _updateCurrentCustomerOrgExp

/**
 * Used to update a variety of fields that involve time fields w/ current-listed dates
 */
async function start() {
  logger.log(2, 'start', 'Finished thanos');
  let employees = await lib._employeeDynamo().getAllEntriesInDB();
  await _asyncForEach(employees, async (employee) => {
    let employeeEdited = _.cloneDeep(employee);

    // Update the technology experience
    if (employee.technologies) {
      employeeEdited.technologies = await lib._updateCurrentTechnologies(employeeEdited.technologies);
    }

    // Update the customer org experience experience
    if (employee.customerOrgExp) {
      employeeEdited.customerOrgExp = await lib._updateCurrentCustomerOrgExp(employeeEdited.customerOrgExp);
    }

    if (!_.isEqual(employeeEdited, employee)) {
      await _employeeDynamo().updateEntryInDB(employeeEdited);
    }
  });
  logger.log(2, 'start', 'Finished thanos');
} //start

/**
 * Handler to execute Lambda function.
 * @param event - request
 * @return Object - response
 */
async function handler(event) {
  console.info(JSON.stringify(event)); // eslint-disable-line no-console

  return lib.start();
} // handler

lib = {
  _employeeDynamo,
  _asyncForEach,
  _updateCurrentCustomerOrgExp,
  _updateCurrentTechnologies,
  start,
  handler
};
module.exports = lib;
