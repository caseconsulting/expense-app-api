const { APPLICATIONS, EMPLOYEE_DATA } = require('./fields-shared.js');
const { isEmpty } = require('./empty.js');
const { getPhoneType, invokeLambda } = require('./helpers.js');
const _ = require('lodash');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Employee = require(process.env.AWS ? 'employee' : '../models/employee');
const EmployeeSensitive = require(process.env.AWS ? 'employee-sensitive' : '../models/employee-sensitive');
const EmployeeRoutes = require(process.env.AWS ? 'employeeRoutes' : '../routes/employeeRoutes');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger'); // from shared layer

const logger = new Logger('modifiers-data-sync');
const STAGE = process.env.STAGE;
const employeeRoutes = new EmployeeRoutes();

/**
 * Generic update method that sets an employee's field.
 *
 * @param application String - The application to update (see APPLICATIONS global variable)
 * @param field Object - The employee field to update that correlates to the application
 * @param value - The value to update the application's employee field with
 * @returns Object - The entire employee object OR the field - value object depending on the application
 */
function updateValue(application, field, value) {
  if (application === APPLICATIONS.CASE) {
    EMPLOYEE_DATA[application][field[application]] = value;
    return EMPLOYEE_DATA[application];
  } else if (application === APPLICATIONS.BAMBOO) {
    EMPLOYEE_DATA[application][field[application]] = value;
    return { [field[application]]: value };
  } else {
    return null;
  }
} // updateValue

/**
 * Custom update method that sets an employee's phone number.
 *
 * @param application String - The application to update (see APPLICATIONS global variable)
 * @param field Object - The phone number field to update that correlates to the application
 * @param value - The value to update the application's employee phone number field with
 * @returns Object - The entire employee object OR the field - value object depending on the application
 */
function updatePhone(application, field, value) {
  if (application === APPLICATIONS.CASE) {
    if (isEmpty(application, field)) {
      EMPLOYEE_DATA[application][field[application]] = value;
    } else {
      let phoneType = getPhoneType(field);
      let publicPhoneIndex = _.findIndex(EMPLOYEE_DATA[application].publicPhoneNumbers, (p) => p.type === phoneType);
      let privatePhoneIndex = _.findIndex(EMPLOYEE_DATA[application][field[application]], (p) => p.type === phoneType);
      if (publicPhoneIndex != -1)
        value ? EMPLOYEE_DATA[application].publicPhoneNumbers.splice(publicPhoneIndex, 1, ...value) : null;
      else if (privatePhoneIndex != -1)
        value ? EMPLOYEE_DATA[application][field[application]].splice(privatePhoneIndex, 1, ...value) : null;
      else value ? EMPLOYEE_DATA[application][field[application]].push(...value) : null;
    }
    return EMPLOYEE_DATA[application];
  } else {
    return updateValue(application, field, value);
  }
} // updatePhone

/**
 * Custom update method that sets an employee's ethnicity.
 *
 * @param application String - The application to update (see APPLICATIONS global variable)
 * @param field Object - The ethnicity field to update that correlates to the application
 * @param value - The value to update the application's employee ethnicity field with
 * @returns Object - The entire employee object OR the field - value object depending on the application
 */
function updateEthnicity(application, field, value) {
  if (application === APPLICATIONS.CASE) {
    // Case separates the ethnicity field into two different fields (eeoHispanicOrLatino and eeoRaceOrEthnicity)
    EMPLOYEE_DATA[application][field[application]] = value;
    if (value && EMPLOYEE_DATA[APPLICATIONS.BAMBOO][field[APPLICATIONS.BAMBOO]] === 'Hispanic or Latino') {
      EMPLOYEE_DATA[application]['eeoHispanicOrLatino'] = { text: 'Hispanic or Latino', value: true };
    } else if (!value && EMPLOYEE_DATA[APPLICATIONS.BAMBOO][field[APPLICATIONS.BAMBOO]] === 'Decline to answer') {
      EMPLOYEE_DATA[application]['eeoHispanicOrLatino'] = null;
    } else {
      EMPLOYEE_DATA[application]['eeoHispanicOrLatino'] = { text: 'Not Hispanic or Latino', value: false };
    }
  } else {
    return updateValue(application, field, value);
  }
} // updateEthnicity

/**
 * Updates an employee through BambooHR's API.
 *
 * @param id String - The employee ID
 * @param body Array - The list of (field: value) object pairs to update
 */
async function updateBambooHREmployee(id, body) {
  let payload = { id, body };
  let params = {
    FunctionName: `mysterio-update-bamboohr-employee-${STAGE}`,
    Payload: JSON.stringify(payload),
    Qualifier: '$LATEST'
  };
  await invokeLambda(params);
} // updateBambooHREmployee

/**
 * Updates an employee in the Case employee/employee-sensitive databases.
 *
 * @param employee Object - The validated employee object
 */
async function updateCaseEmployee(employee) {
  let employeeBasic = new Employee(employee);
  let employeeSensitive = new EmployeeSensitive(employee);
  try {
    await employeeRoutes._validateEmployee(employeeBasic, employeeSensitive);
    let items = [
      {
        Put: {
          TableName: `${STAGE}-employees`,
          Item: employeeBasic
        }
      },
      {
        Put: {
          TableName: `${STAGE}-employees-sensitive`,
          Item: employeeSensitive
        }
      }
    ];
    // all or nothing call
    await DatabaseModify.TransactItems(items);
    // log success
    logger.log(3, 'updateCaseEmployee', `Successfully updated Case employee ${employee.id}`);
    return Promise.resolve(employee);
  } catch (err) {
    // log error
    logger.log(3, 'updateCaseEmployee', `Failed to update Case employee ${employee.id}`);
    return Promise.reject(err);
  }
} // updateCaseEmployee

module.exports = {
  updateValue,
  updatePhone,
  updateEthnicity,
  updateBambooHREmployee,
  updateCaseEmployee
};
