const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { APPLICATIONS, EMPLOYEE_DATA } = require('./fields-shared');
const { FIELDS, EMPLOYEE_NUMBER, HOME_PHONE, MOBILE_PHONE, WORK_PHONE, WORK_PHONE_EXT } = require('./fields-synced');
const { updateCaseEmployee } = require('./modifiers.js');
const { generateUUID } = require(process.env.AWS ? 'utils' : '../js/utils');
const _ = require('lodash');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const EmployeeRoutes = require(process.env.AWS ? 'employeeRoutes' : '../routes/employeeRoutes');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger'); // from shared layer

const logger = new Logger('helpers-data-sync');
const employeeRoutes = new EmployeeRoutes();
const STAGE = process.env.STAGE;

// any employee number greater than this number can be synced on dev/test environments
// to prevent syncing dev/test data with prod data, never change this number (unless you know what you're doing)
const TEST_EMPLOYEE_NUMBER_LIMIT = 90000;

/**
 * Creates a new Portal employee with basic and sensitive data.
 *
 * @returns Employee - The employee created
 */
async function createPortalEmployee() {
  try {
    logger.log(
      3,
      'createPortalEmployee',
      `Attempting to create new CASE Portal employee for employee #: ${
        EMPLOYEE_DATA[APPLICATIONS.BAMBOO][EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
      }`
    );
    let caseEmployee = {};
    caseEmployee['id'] = generateUUID();
    caseEmployee['employeeRole'] = 'user';
    _.forEach(FIELDS, (f) => {
      if (!f.isEmpty(APPLICATIONS.BAMBOO, f)) {
        caseEmployee[f[APPLICATIONS.CASE]] = f.getter(f, APPLICATIONS.BAMBOO, APPLICATIONS.CASE);
      }
    });
    let validatedEmployee = await employeeRoutes._validateInputs(caseEmployee);
    let newEmployee = await updateCaseEmployee(validatedEmployee);
    return Promise.resolve(newEmployee);
  } catch (err) {
    return Promise.reject(err);
  }
} // createPortalEmployee

/**
 * Invokes lambda function with given params
 *
 * @param params - params to invoke lambda function with
 * @return object if successful, error otherwise
 */
async function invokeLambda(params) {
  const client = new LambdaClient();
  const command = new InvokeCommand(params);
  const resp = await client.send(command);
  return JSON.parse(Buffer.from(resp.Payload));
} // invokeLambda

/**
 * Gets the BambooHR employees data from all of the given fields
 *
 * @returns Array - The list of BambooHR employees
 */
async function getBambooHREmployeeData() {
  let payload = { fields: FIELDS.map((f) => f[APPLICATIONS.BAMBOO]) };
  let params = {
    FunctionName: `mysterio-bamboohr-employees-${STAGE}`,
    Payload: JSON.stringify(payload),
    Qualifier: '$LATEST'
  };
  let result = await invokeLambda(params);
  let employees = result.body;
  if (STAGE === 'prod') {
    // return employee #'s less than 90000 on prod
    return _.filter(
      employees,
      (e) => parseInt(e[EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]], 10) < TEST_EMPLOYEE_NUMBER_LIMIT
    );
  } else {
    // return employee #'s greater than 90000 on dev/test
    return _.filter(
      employees,
      (e) => parseInt(e[EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]], 10) >= TEST_EMPLOYEE_NUMBER_LIMIT
    );
  }
} // getBambooHREmployeeData

/**
 * Gets the Case employees data
 *
 * @returns Array - The list of Case employees
 */
async function getCasePortalEmployeeData() {
  let employeeDynamo = new DatabaseModify('employees');
  let employeeSensitiveDynamo = new DatabaseModify('employees-sensitive');
  let [employees, employeesSensitive] = await Promise.all([
    employeeDynamo.getAllEntriesInDB(),
    employeeSensitiveDynamo.getAllEntriesInDB()
  ]);

  // merges employee non-sensitive data with sensitive data into one object
  let employeeData = employees.map((e) => {
    let employeeSensitiveData = employeesSensitive.find((es) => es.id === e.id);
    return { ...employeeSensitiveData, ...e };
  });
  if (STAGE === 'prod') {
    return employeeData;
  } else {
    return _.filter(
      employeeData,
      (e) => parseInt(e[EMPLOYEE_NUMBER[APPLICATIONS.CASE]], 10) > TEST_EMPLOYEE_NUMBER_LIMIT
    );
  }
} // getCasePortalEmployeeData

/**
 * Gets the Case phone type from a given field
 *
 * @param field Object - The field
 * @returns String - The phone type
 */
function getPhoneType(field) {
  if (field.name === MOBILE_PHONE.name) {
    return 'Cell';
  } else if (field.name === HOME_PHONE.name) {
    return 'Home';
  } else if (field.name === WORK_PHONE.name || field.name === WORK_PHONE_EXT.name) {
    return 'Work';
  }
} // getPhoneType

/**
 * Converts a number of any format (1234567890 / 123-456-7890 / 123.456.7890) and converts it to a
 * dashed format (123-456-7890).
 *
 * @param number String - The passed phone number
 * @returns String - The phone number in dashed format
 */
function convertPhoneNumberToDashed(number) {
  if (number) {
    let n = number.replace(/\D/g, '');
    n = n.slice(0, 3) + '-' + n.slice(3, 6) + '-' + n.slice(6, 15);
    return n;
  } else {
    return null;
  }
} // convertPhoneNumberToDashed

module.exports = {
  createPortalEmployee,
  invokeLambda,
  getBambooHREmployeeData,
  getCasePortalEmployeeData,
  getPhoneType,
  convertPhoneNumberToDashed
};
