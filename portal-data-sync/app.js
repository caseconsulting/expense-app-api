// BambooHR API documentation: https://documentation.bamboohr.com/docs
// BambooHR API custom reports: https://documentation.bamboohr.com/reference/request-custom-report-1

const { asyncForEach } = require(process.env.AWS ? 'utils' : '../js/utils');
const { APPLICATIONS, EMPLOYEE_DATA } = require('./fields-shared');
const {
  createPortalEmployee,
  getADPEmployeeData,
  getBambooHREmployeeData,
  getCasePortalEmployeeData,
  updateADPEmployee,
  updateBambooHREmployee
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
  let result1 = await syncPortalAndBamboo();
  let result2 = await syncBambooAndADP();
  return {
    statusCode: 200, // should change this to not default to 200
    body: { caseAndBambooSyncResult: result1, bambooAndADPSyncResult: result2 }
  };
} // handler

/**
 * Loops through employees and checks equality between converted values. Case values always take precedence over any
 * other application's values. An employee will only be updated if they are found in the Portal
 * database AND they are active. NOTE: On dev/test environments, only employee's with employee numbers larger than
 * TEST_EMPLOYEE_NUMBER_LIMIT will be synced to prevent dev/test data syncing with prod data on external applications.
 */
async function syncPortalAndBamboo() {
  let result = {
    fields: _.map(
      _.filter(fieldsArr, (f) => f[APPLICATIONS.BAMBOO] && f[APPLICATIONS.CASE]),
      (f) => f.name
    ),
    fieldsUpdated: [],
    usersCreated: [],
    failures: []
  };
  let bambooEmployees;
  let casePortalEmployees;
  try {
    [bambooEmployees, casePortalEmployees] = await Promise.all([
      getBambooHREmployeeData(),
      getCasePortalEmployeeData()
    ]);
  } catch (err) {
    // early exit, could not fetch employees
    result.failures.push(err);
    return result;
  }
  await asyncForEach(bambooEmployees, async (bambooEmp) => {
    try {
      EMPLOYEE_DATA[APPLICATIONS.CASE] = _.find(
        casePortalEmployees,
        (c) =>
          parseInt(c[Fields.EMPLOYEE_NUMBER[APPLICATIONS.CASE]], 10) ===
          parseInt(bambooEmp[Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]], 10)
      );
      EMPLOYEE_DATA[APPLICATIONS.BAMBOO] = bambooEmp;
      if (!_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.CASE]) && !_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.BAMBOO])) {
        // employee number exists on Case and BambooHR, start syncing process
        logger.log(
          3,
          'syncPortalAndBamboo',
          `Syncing data for employee #: ${
            EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
          }`
        );
        let bambooEmployeeUpdated = false;
        let bambooHRBodyParams = [];
        let bambooHRTabularData = []; // used for tabular data like education/work status
        let tmpFieldsUpdated = [];
        fieldsArr.forEach((f) => {
          if (f[APPLICATIONS.BAMBOO] && f[APPLICATIONS.CASE]) {
            let bambooHRVal = f.getter(f, APPLICATIONS.BAMBOO); // default BambooHR value
            // convert Case value to BambooHR format
            let caseValConverted = f.getter(f, APPLICATIONS.CASE, APPLICATIONS.BAMBOO);
            // Check equality by converting the field to the same value format (do not check equality on values
            // converted to Case format since there could be data loss) If needed, write generic and custom equality
            // methods attached to the field objects
            let apps = { first: APPLICATIONS.BAMBOO, second: APPLICATIONS.CASE };
            let isEqual = f.equalityCheck?.(bambooHRVal, caseValConverted, apps) ?? bambooHRVal == caseValConverted;
            if (f.name === Fields.WORK_STATUS.name) {
              logger.log(3, 'syncPortalAndBamboo', `${bambooHRVal} == ${caseValConverted}: ${isEqual}`);
            }
            if (!isEqual) {
              // Field values do NOT match (update BambooHR field value with Case field value since Case values take
              // precedence over BambooHR values)
              logger.log(3, 'syncPortalAndBamboo', `Fields do NOT match (${f.name}): updating BambooHR value`);
              logger.log(3, 'syncPortalAndBamboo', `New value should be: ${caseValConverted}`);
              let param = f.updateValue(APPLICATIONS.BAMBOO, f, caseValConverted);
              if (f.name === Fields.WORK_STATUS.name && caseValConverted === 'Terminated') {
                // terminating an employee on Bamboo, use Portal departure date for termination date
                let departureDate = EMPLOYEE_DATA[APPLICATIONS.CASE][Fields.WORK_STATUS.extra];
                // BambooHR uses tabular data for employment status, this will add a data row
                bambooHRTabularData.push({
                  table: 'employmentStatus',
                  body: { date: departureDate, employmentStatus: caseValConverted }
                });
              } else {
                bambooHRBodyParams.push(param);
              }
              tmpFieldsUpdated.push({
                [EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]]: f.name
              });
              bambooEmployeeUpdated = true;
            }
          }
        });
        // update bamboo employee
        if (bambooEmployeeUpdated) {
          let body = Object.assign({}, ...bambooHRBodyParams);
          let employee = _.cloneDeep(EMPLOYEE_DATA[APPLICATIONS.BAMBOO]);
          logger.log(3, 'syncPortalAndBamboo', `Updating BambooHR employee id: ${employee.id}`);
          await updateBambooHREmployee(employee.id, body, bambooHRTabularData);
          result.fieldsUpdated.push(...tmpFieldsUpdated);
        }
        logger.log(
          3,
          'syncPortalAndBamboo',
          `Finished syncing data for employee #: ${
            EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
          }`
        );
      } else if (_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.CASE]) && !_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.BAMBOO])) {
        // employee is active on BambooHR AND does not exist on the Portal
        // convert BambooHR Work Status to Case format
        let workStatus = Fields.WORK_STATUS.getter(Fields.WORK_STATUS, APPLICATIONS.BAMBOO, APPLICATIONS.CASE);
        if (workStatus > 0) {
          // create an employee on the Portal if that employee is active and exists on BambooHR but not the Portal
          logger.log(
            3,
            'syncPortalAndBamboo',
            `Attempting to create new CASE Portal employee for employee #: ${
              EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
            }`
          );
          await createPortalEmployee();
          result.usersCreated.push(EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]);
          logger.log(
            3,
            'syncPortalAndBamboo',
            `Successfully created new CASE Portal employee for employee #: ${
              EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
            }`
          );
        }
        // employee number exists on BambooHR but does NOT exist on the portal
      }
    } catch (err) {
      logger.log(3, 'syncPortalAndBamboo', `Error syncing employee: ${err}`);
      if (err.messsage) {
        result.failures.push({
          [EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]]: err.message
        });
      } else {
        result.failures.push({
          [EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]]: err
        });
      }
    }
    // reset data
    EMPLOYEE_DATA[APPLICATIONS.BAMBOO] = null;
    EMPLOYEE_DATA[APPLICATIONS.CASE] = null;
  });
  return result;
} // syncPortalAndBamboo

/**
 * Behaves similarly to the syncPortalAndBamboo function except now BambooHR is the central source
 * of data over ADP. Only ADP will ever be updated if there is a missing field or a field conflict.
 */
async function syncBambooAndADP() {
  let result = {
    fields: _.map(
      _.filter(fieldsArr, (f) => f[APPLICATIONS.BAMBOO] && f[APPLICATIONS.ADP]),
      (f) => f.name
    ),
    fieldsUpdated: [],
    usersCreated: [],
    failures: []
  };
  let bambooEmployees;
  let adpEmployees;
  try {
    [bambooEmployees, adpEmployees] = await Promise.all([getBambooHREmployeeData(), getADPEmployeeData()]);
  } catch (err) {
    // early exit, could not fetch employees
    result.failures.push(err);
    return result;
  }
  await asyncForEach(bambooEmployees, async (bambooEmp) => {
    try {
      EMPLOYEE_DATA[APPLICATIONS.ADP] = _.find(
        adpEmployees,
        (a) =>
          parseInt(_.get(a, Fields.EMPLOYEE_NUMBER[APPLICATIONS.ADP]), 10) ===
          parseInt(bambooEmp[Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]], 10)
      );
      EMPLOYEE_DATA[APPLICATIONS.BAMBOO] = bambooEmp;
      if (!_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.ADP]) && !_.isEmpty(EMPLOYEE_DATA[APPLICATIONS.BAMBOO])) {
        if (EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.WORK_STATUS[APPLICATIONS.BAMBOO]] !== 'Terminated') {
          // employee number exists on ADP and BambooHR and they are active, start syncing process
          logger.log(
            3,
            'syncBambooAndADP',
            `Syncing data for employee #: ${
              EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
            }`
          );
          let adpEmployeeUpdated = false;
          let fieldsToUpdate = [];
          fieldsArr.forEach((f) => {
            if (f[APPLICATIONS.BAMBOO] && f[APPLICATIONS.ADP]) {
              let bambooHRVal = f.getter(f, APPLICATIONS.BAMBOO); // default BambooHR value
              // convert ADP value to BambooHR format
              let adpValConverted = f.getter(f, APPLICATIONS.ADP, APPLICATIONS.BAMBOO);
              // convert BambooHR value to ADP format
              let bambooValConverted = f.getter(f, APPLICATIONS.BAMBOO, APPLICATIONS.ADP);
              // Check equality by converting the field to the same value format (do not check equality on values
              // converted to ADP format since there could be data loss) If needed, write generic and custom equality
              // methods attached to the field objects
              if (bambooHRVal != adpValConverted) {
                // Field values do NOT match (update ADP field value with BambooHR field value since BambooHR values
                // take precedence over ADP values)
                logger.log(3, 'syncBambooAndADP', `Fields do NOT match (${f.name}): updating ADP value`);
                f.updateValue(APPLICATIONS.ADP, f, bambooValConverted);
                fieldsToUpdate.push(f); // used for ADP update API calls after locally updating all fields
                adpEmployeeUpdated = true;
              }
            }
          });
          // update ADP employee
          if (adpEmployeeUpdated) {
            let employee = _.cloneDeep(EMPLOYEE_DATA[APPLICATIONS.ADP]);
            let legalAddressUpdated = false;
            let updatesToMake = [];
            let userFieldsUpdated = [];
            _.forEach(fieldsToUpdate, (field) => {
              if (field.fieldType === 'Address') {
                if (!legalAddressUpdated) {
                  // address with all of its fields only needs to be updated once
                  let data = field.adpUpdateDataTemplate(employee.associateOID, employee.person.legalAddress);
                  updatesToMake.push({ path: field.adpUpdatePath, data: data });
                  legalAddressUpdated = true;
                  logger.log(
                    3,
                    'syncBambooAndADP',
                    `Updating ADP address field for employee id: ${employee.associateOID}`
                  );
                }
              } else {
                let data = field.adpUpdateDataTemplate(employee.associateOID, field.getter(field, APPLICATIONS.ADP));
                updatesToMake.push({ path: field.adpUpdatePath, data: data });
                logger.log(
                  3,
                  'syncBambooAndADP',
                  `Updating ADP ${field.name} field for employee id: ${employee.associateOID}`
                );
              }
              userFieldsUpdated.push({
                [EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]]: field.name
              });
            });
            await updateADPEmployee(updatesToMake);
            result.fieldsUpdated.push(...userFieldsUpdated);
          }
          logger.log(
            3,
            'syncBambooAndADP',
            `Finished syncing data for employee #: ${
              EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]
            }`
          );
        }
      }
    } catch (err) {
      logger.log(3, 'syncBambooAndADP', `Error syncing employee: ${err}`);
      result.failures.push({ [EMPLOYEE_DATA[APPLICATIONS.BAMBOO][Fields.EMPLOYEE_NUMBER[APPLICATIONS.BAMBOO]]]: err });
    }
    // reset data
    EMPLOYEE_DATA[APPLICATIONS.BAMBOO] = null;
    EMPLOYEE_DATA[APPLICATIONS.ADP] = null;
  });
  return result;
} // syncApplicationData

module.exports = { handler };
