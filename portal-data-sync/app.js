// BambooHR API documentation: https://documentation.bamboohr.com/docs
// BambooHR API custom reports: https://documentation.bamboohr.com/reference/request-custom-report-1

const { asyncForEach } = require(process.env.AWS ? 'utils' : '../js/utils');
const { APPLICATIONS, EMPLOYEE_DATA } = require('./fields-shared');
const {
  createPortalEmployee,
  getBambooHREmployeeData,
  getCasePortalEmployeeData,
  updateBambooHREmployee,
  updateCaseEmployee
} = require('./async');
const _ = require('lodash');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger'); // from shared layer
const Fields = require('./fields-synced');

const fieldsArr = Object.values(Fields);
const logger = new Logger('app-data-sync');

/**
 * Handler to execute lamba function.
 *
 * @param event - request
 */
async function handler() {
  let result = await syncApplicationData();
  return {
    statusCode: 200, // should change this to not default to 200
    body: result
  };
} // handler

/**
 * Loops through employees and checks equality between converted values. Case values always take precedence over any
 * other application's values. A Case employee will only be updated if they have an empty field AND another
 * application's correlated field is not empty. An employee will only be updated if they are found in the Case
 * database AND they are active. NOTE: On dev/test environments, only employee's with employee numbers larger than
 * TEST_EMPLOYEE_NUMBER_LIMIT will be synced to prevent dev/test data syncing with prod data on external applications.
 */
async function syncApplicationData() {
  let result = { usersUpdated: 0, usersCreated: 0, failures: 0 };
  const [employeeBambooHRData, employeeCasePortalData] = await Promise.all([
    getBambooHREmployeeData(),
    getCasePortalEmployeeData()
  ]);
  await asyncForEach(employeeBambooHRData, async (bambooEmp) => {
    try {
      EMPLOYEE_DATA[APPLICATIONS.CASE] = _.find(
        employeeCasePortalData,
        (c) =>
          parseInt(c[Fields.EMPLOYEE_NUMBER[APPLICATIONS.CASE]], 10) ===
          parseInt(bambooEmp[Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]], 10)
      );
      EMPLOYEE_DATA[APPLICATIONS.BAMBOO] = bambooEmp;
      if (!_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.CASE]) && !_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.BAMBOO])) {
        // employee number exists on Case and BambooHR, start syncing process
        logger.log(
          3,
          'syncApplicationData',
          `Syncing data for employee #: ${
            EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
          }`
        );
        let caseEmployeeUpdated = false;
        let bambooEmployeeUpdated = false;
        let bambooHRBodyParams = [];
        fieldsArr.forEach((f) => {
          //let caseVal = f.getter(f, APPLICATIONS.CASE); // default Case value
          let bambooHRVal = f.getter(f, APPLICATIONS.BAMBOO); // default BambooHR value
          // convert Case value to BambooHR format
          let caseValConverted = f.getter(f, APPLICATIONS.CASE, APPLICATIONS.BAMBOO);
          // convert BambooHR value to Case format
          let bambooValConverted = f.getter(f, APPLICATIONS.BAMBOO, APPLICATIONS.CASE);
          // Check equality by converting the field to the same value format (do not check equality on values converted
          // to Case format since there could be data loss) If needed, write generic and custom equality methods
          // attached to the field objects
          if (bambooHRVal != caseValConverted) {
            // Field values do NOT match
            if (f.isEmpty(APPLICATIONS.CASE, f) && !f.isEmpty(APPLICATIONS.BAMBOO, f)) {
              // Case field is empty AND BambooHR field is NOT empty (update Case field value with BambooHR field value)
              logger.log(3, 'syncApplicationData', `Fields do NOT match (${f.name}): updating Case value`);
              f.updateValue(APPLICATIONS.CASE, f, bambooValConverted);
              caseEmployeeUpdated = true;
            } else {
              // Either Bamboo HR field is empty OR both Case and BambooHR field values are NOT empty AND they are
              // conflicting (update BambooHR field value with Case field value since Case values take precedence over
              // BambooHR values)
              logger.log(3, 'syncApplicationData', `Fields do NOT match (${f.name}): updating BambooHR value`);
              let param = f.updateValue(APPLICATIONS.BAMBOO, f, caseValConverted);
              bambooHRBodyParams.push(param);
              bambooEmployeeUpdated = true;
            }
          }
        });
        // update case employee
        if (caseEmployeeUpdated) {
          let employee = _.cloneDeep(EMPLOYEE_DATA[APPLICATIONS.CASE]);
          logger.log(3, 'syncApplicationData', `Updating Case employee id: ${employee.id}`);
          await updateCaseEmployee(employee);
          result.usersUpdated += 1;
        }
        // update bamboo employee
        if (bambooEmployeeUpdated) {
          let body = Object.assign({}, ...bambooHRBodyParams);
          let employee = _.cloneDeep(EMPLOYEE_DATA[APPLICATIONS.BAMBOO]);
          logger.log(3, 'syncApplicationData', `Updating BambooHR employee id: ${employee.id}`);
          await updateBambooHREmployee(employee.id, body);
          !caseEmployeeUpdated ? (result.usersUpdated += 1) : null;
        }
        logger.log(
          3,
          'syncApplicationData',
          `Finished syncing data for employee #: ${
            EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
          }`
        );
      } else if (_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.CASE]) && !_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.BAMBOO])) {
        // convert BambooHR Work Status to Case format
        let workStatus = Fields.WORK_STATUS.getter(Fields.WORK_STATUS, APPLICATIONS.BAMBOO, APPLICATIONS.CASE);
        if (workStatus > 0) {
          // create an employee on the Portal if that employee is active and exists on BambooHR but not the Portal
          logger.log(
            3,
            'createPortalEmployee',
            `Attempting to create new CASE Portal employee for employee #: ${
              EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
            }`
          );
          await createPortalEmployee();
          logger.log(
            3,
            'createPortalEmployee',
            `Successfully created new CASE Portal employee for employee #: ${
              EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
            }`
          );
          result.usersCreated += 1;
        }
        // employee number exists on BambooHR but does NOT exist on the portal
      }
    } catch (err) {
      logger.log(3, 'syncApplicationData', `Error syncing employee: ${err}`);
      result.failures += 1;
    }
    // reset data
    EMPLOYEE_DATA[APPLICATIONS.BAMBOO] = null;
    EMPLOYEE_DATA[APPLICATIONS.CASE] = null;
  });
  return result;
} // syncApplicationData

module.exports = { handler };
