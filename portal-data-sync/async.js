const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { APPLICATIONS, EMPLOYEE_DATA } = require('./fields-shared');
const { generateUUID } = require(process.env.AWS ? 'utils' : '../js/utils');
const _ = require('lodash');
const Fields = require('./fields-synced');
const Employee = require(process.env.AWS ? 'employee' : '../models/employee');
const EmployeeSensitive = require(process.env.AWS ? 'employee-sensitive' : '../models/employee-sensitive');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const EmployeeRoutes = require(process.env.AWS ? 'employeeRoutes' : '../routes/employeeRoutes');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger'); // from shared layer

const fieldsArr = Object.values(Fields);
const logger = new Logger('async-data-sync');
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
    EMPLOYEE_DATA[APPLICATIONS.CASE] = {};
    let caseEmployee = {};
    _.forEach(fieldsArr, (f) => {
      if (!f.isEmpty(APPLICATIONS.BAMBOO, f)) {
        let bambooValConverted = f.getter(f, APPLICATIONS.BAMBOO, APPLICATIONS.CASE);
        caseEmployee = f.updateValue(APPLICATIONS.CASE, f, bambooValConverted);
      }
    });
    caseEmployee['id'] = generateUUID();
    caseEmployee['employeeRole'] = 'user';
    let validatedEmployee = await employeeRoutes._validateInputs(caseEmployee);
    let newEmployee = await updateCaseEmployee(validatedEmployee);
    return Promise.resolve(newEmployee);
  } catch (err) {
    return Promise.reject(err);
  }
} // createPortalEmployee

/**
 * Updates all fields for an employee through ADP's API.
 *
 * @param {Array} updatesToMake - Array of fields to update with thier udpate path/data
 * @returns The response from ADP
 */
async function updateADPEmployee(updatesToMake) {
  try {
    let payload = { updates: updatesToMake };
    let params = {
      FunctionName: `mysterio-adp-update-employee-${STAGE}`,
      Payload: JSON.stringify(payload),
      Qualifier: '$LATEST'
    };
    let resp = await invokeLambda(params);
    return Promise.resolve(resp);
  } catch (err) {
    return Promise.reject(err);
  }
} // updateADPEmployee

/**
 * Updates an employee through BambooHR's API.
 *
 * @param id String - The employee ID
 * @param body Array - The list of (field: value) object pairs to update
 */
async function updateBambooHREmployee(id, body, bambooHRTabularData) {
  try {
    let payload = { id: id, body: body, tabularData: bambooHRTabularData };
    let params = {
      FunctionName: `mysterio-update-bamboohr-employee-${STAGE}`,
      Payload: JSON.stringify(payload),
      Qualifier: '$LATEST'
    };
    let resp = await invokeLambda(params);
    return Promise.resolve(resp);
  } catch (err) {
    return Promise.reject(err);
  }
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

/**
 * Gets the ADP employees data from all of the given fields
 *
 * @returns Array - The list of BambooHR employees
 */
async function getADPEmployeeData() {
  try {
    let params = {
      FunctionName: `mysterio-adp-employees-${STAGE}`,
      Qualifier: '$LATEST'
    };
    let result = await invokeLambda(params);
    let employees = result.body;
    let retData;
    if (STAGE === 'prod') {
      // return employee #'s less than 90000 on prod
      retData = _.filter(
        employees,
        (e) => parseInt(_.get(e, Fields.EMPLOYEE_NUMBER[APPLICATIONS.ADP]), 10) < TEST_EMPLOYEE_NUMBER_LIMIT
      );
    } else {
      // return employee #'s greater than 90000 on dev/test
      retData = _.filter(
        employees,
        (e) => parseInt(_.get(e, Fields.EMPLOYEE_NUMBER[APPLICATIONS.ADP]), 10) >= TEST_EMPLOYEE_NUMBER_LIMIT
      );
    }
    return Promise.resolve(retData);
  } catch (err) {
    return Promise.reject(err);
  }
} // getADPEmployeeData

/**
 * Gets the BambooHR employees data from all of the given fields
 *
 * @returns Array - The list of BambooHR employees
 */
async function getBambooHREmployeeData() {
  try {
    let payload = { fields: fieldsArr.map((f) => f[APPLICATIONS.BAMBOO]) };
    let params = {
      FunctionName: `mysterio-bamboohr-employees-${STAGE}`,
      Payload: JSON.stringify(payload),
      Qualifier: '$LATEST'
    };
    let result = await invokeLambda(params);
    let employees = result.body;
    let retData;
    if (STAGE === 'prod') {
      // return employee #'s less than 90000 on prod
      retData = _.filter(
        employees,
        (e) => parseInt(e[Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]], 10) < TEST_EMPLOYEE_NUMBER_LIMIT
      );
    } else {
      // return employee #'s greater than 90000 on dev/test
      retData = _.filter(
        employees,
        (e) => parseInt(e[Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]], 10) >= TEST_EMPLOYEE_NUMBER_LIMIT
      );
    }
    return Promise.resolve(retData);
  } catch (err) {
    return Promise.reject(err);
  }
} // getBambooHREmployeeData

/**
 * Gets the Case employees data
 *
 * @returns Array - The list of Case employees
 */
async function getCasePortalEmployeeData() {
  try {
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
    let retData;
    if (STAGE === 'prod') {
      // return employee #'s less than 90000 on prod
      retData = _.filter(
        employeeData,
        (e) => parseInt(e[Fields.EMPLOYEE_NUMBER[APPLICATIONS.CASE]], 10) < TEST_EMPLOYEE_NUMBER_LIMIT
      );
    } else {
      retData = _.filter(
        employeeData,
        (e) => parseInt(e[Fields.EMPLOYEE_NUMBER[APPLICATIONS.CASE]], 10) >= TEST_EMPLOYEE_NUMBER_LIMIT
      );
    }
    return Promise.resolve(retData);
  } catch (err) {
    return Promise.reject(err);
  }
} // getCasePortalEmployeeData

/**
 * Invokes lambda function with given params
 *
 * @param params - params to invoke lambda function with
 * @return object if successful, error otherwise
 */
async function invokeLambda(params) {
  try {
    const client = new LambdaClient();
    const command = new InvokeCommand(params);
    const resp = await client.send(command);
    const parsedResp = JSON.parse(Buffer.from(resp.Payload));
    if (!_.has(parsedResp, 'errorType')) {
      return Promise.resolve(parsedResp);
    } else {
      return Promise.reject(parsedResp.errorMessage);
    }
  } catch (err) {
    return Promise.reject(err);
  }
} // invokeLambda

module.exports = {
  createPortalEmployee,
  updateADPEmployee,
  updateCaseEmployee,
  updateBambooHREmployee,
  getADPEmployeeData,
  getBambooHREmployeeData,
  getCasePortalEmployeeData,
  invokeLambda
};
