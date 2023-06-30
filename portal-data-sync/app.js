// BambooHR API documentation: https://documentation.bamboohr.com/docs
// BambooHR API custom reports: https://documentation.bamboohr.com/reference/request-custom-report-1

const _ = require('lodash');
const axios = require('axios');
const AWS = require('aws-sdk');
const DatabaseModify = require('./js/databaseModify');
const Employee = require('./models/employee');
const EmployeeSensitive = require('./models/employee-sensitive');
const Logger = require('./js/Logger');
const logger = new Logger('data-sync');
const STAGE = process.env.STAGE;

const paramName = '/BambooHR/APIKey';
const baseURL = 'https://api.bamboohr.com/api/gateway.php/consultwithcase/v1';

// APPLICATIONS
const Applications = {
  CASE: 'Case',
  BAMBOO: 'BambooHR'
};

// FIELD CONSTANTS
const EMPLOYEE_NUMBER = {
  name: 'Employee Number',
  [Applications.CASE]: 'employeeNumber',
  [Applications.BAMBOO]: 'employeeNumber',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const FIRST_NAME = {
  name: 'First Name',
  [Applications.CASE]: 'firstName',
  [Applications.BAMBOO]: 'firstName',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const MIDDLE_NAME = {
  name: 'Middle Name',
  [Applications.CASE]: 'middleName',
  [Applications.BAMBOO]: 'middleName',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const LAST_NAME = {
  name: 'Last Name',
  [Applications.CASE]: 'lastName',
  [Applications.BAMBOO]: 'lastName',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const NICKNAME = {
  name: 'Nickname',
  [Applications.CASE]: 'nickname',
  [Applications.BAMBOO]: 'preferredName',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const CURRENT_STREET = {
  name: 'Current Street',
  [Applications.CASE]: 'currentStreet',
  [Applications.BAMBOO]: 'address1',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const CURRENT_CITY = {
  name: 'Current City',
  [Applications.CASE]: 'currentCity',
  [Applications.BAMBOO]: 'city',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const CURRENT_STATE = {
  name: 'Current State',
  [Applications.CASE]: 'currentState',
  [Applications.BAMBOO]: 'state',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const CURRENT_ZIP = {
  name: 'Current ZIP',
  [Applications.CASE]: 'currentZIP',
  [Applications.BAMBOO]: 'zipcode',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const HOME_PHONE = {
  name: 'Home Phone',
  [Applications.CASE]: 'privatePhoneNumbers',
  [Applications.BAMBOO]: 'homePhone',
  getter: getPhone,
  isEmpty: isPhoneEmpty,
  updateValue: updatePhone
};
const WORK_PHONE = {
  name: 'Work Phone',
  [Applications.CASE]: 'privatePhoneNumbers',
  [Applications.BAMBOO]: 'workPhone',
  getter: getPhone,
  isEmpty: isPhoneEmpty,
  updateValue: updatePhone
};
const MOBILE_PHONE = {
  name: 'Mobile Phone',
  [Applications.CASE]: 'privatePhoneNumbers',
  [Applications.BAMBOO]: 'mobilePhone',
  getter: getPhone,
  isEmpty: isPhoneEmpty,
  updateValue: updatePhone
};
const WORK_PHONE_EXT = {
  name: 'Work Phone Ext',
  [Applications.CASE]: 'privatePhoneNumbers',
  [Applications.BAMBOO]: 'workPhoneExtension',
  getter: getPhoneExt,
  isEmpty: isPhoneExtEmpty,
  updateValue: updatePhone
};
const DATE_OF_BIRTH = {
  name: 'Date Of Birth',
  [Applications.CASE]: 'birthday',
  [Applications.BAMBOO]: 'dateOfBirth',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const GENDER = {
  name: 'Gender',
  [Applications.CASE]: 'eeoGender',
  [Applications.BAMBOO]: 'gender',
  getter: getGender,
  isEmpty: isEEOEmpty,
  updateValue: updateValue
};
const ETHNICITY = {
  name: 'Ethnicity',
  [Applications.CASE]: 'eeoRaceOrEthnicity',
  [Applications.BAMBOO]: 'ethnicity',
  getter: getEthnicity,
  isEmpty: isEEOEmpty,
  updateValue: updateEthnicity
};
const DISABILITY = {
  name: 'Disability',
  [Applications.CASE]: 'eeoHasDisability',
  [Applications.BAMBOO]: 'customDisability',
  getter: getDisability,
  isEmpty: isEEOEmpty,
  updateValue: updateValue
};
const HIRE_DATE = {
  name: 'Hire Date',
  [Applications.CASE]: 'hireDate',
  [Applications.BAMBOO]: 'hireDate',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const WORK_STATUS = {
  name: 'Work Status',
  [Applications.CASE]: 'workStatus',
  [Applications.BAMBOO]: 'employmentHistoryStatus',
  getter: getWorkStatus,
  isEmpty: isWorkStatusEmpty,
  updateValue: updateValue
};
const TWITTER = {
  name: 'Twitter',
  [Applications.CASE]: 'twitter',
  [Applications.BAMBOO]: 'twitterFeed',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
const LINKEDIN = {
  name: 'LinkedIn',
  [Applications.CASE]: 'linkedIn',
  [Applications.BAMBOO]: 'linkedIn',
  getter: getFieldValue,
  isEmpty: isEmpty,
  updateValue: updateValue
};
// const JOB_TITLE = "Job Title";
// const PLACE_OF_BIRTH = "Place Of Birth";

const fields = [
  EMPLOYEE_NUMBER,
  FIRST_NAME,
  MIDDLE_NAME,
  LAST_NAME,
  NICKNAME,
  CURRENT_STREET,
  CURRENT_CITY,
  CURRENT_STATE,
  CURRENT_ZIP,
  TWITTER,
  LINKEDIN,
  HIRE_DATE,
  HOME_PHONE,
  WORK_PHONE,
  MOBILE_PHONE,
  WORK_PHONE_EXT,
  DISABILITY,
  GENDER,
  ETHNICITY,
  DATE_OF_BIRTH,
  WORK_STATUS
];

let employee_data = { [Applications.CASE]: null, [Applications.BAMBOO]: null }; // global getter for an employee's data

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////   ENTRY POINT   ////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Handler to execute lamba function.
 *
 * @param event - request
 */
async function handler() {
  await syncApplicationData();
} // handler

/**
 * Loops through employees and checks equality between converted values. Case values always take precedence over any
 * other application's values. A Case employee will only be updated if they have an empty field AND another
 * application's correlated field is not empty. An employee will only be updated if they are found in the Case
 * database AND they are active. This method will only run on the production environment to prevent employees getting
 * test data from dev/test environments. To test in the dev environment, 1. Remove the STAGE equality check with prod
 * 2. Remove the for-loop going through all employees to prevent the syncing of dev data. 3. Test only your own
 * individual employee object (Or others that don't mind their data getting messed up) 4. (Important) When finished
 * testing, add Prod STAGE equality check AND the for-loop back before deploying.
 */
async function syncApplicationData() {
  const [employeeBambooHRData, employeeCasePortalData] = await Promise.all([
    getBambooHREmployeeData(),
    getCasePortalEmployeeData()
  ]);

  // TODO add employees for-loop here and Prod STAGE equality check here. Only go on if Case employee is actuve AND
  // bamboo employee was found
  employee_data[Applications.BAMBOO] = employeeBambooHRData.find((b) => b['employeeNumber'] == 10066);
  employee_data[Applications.CASE] = employeeCasePortalData.find((c) => c['employeeNumber'] == 10066);
  let caseEmployeeUpdated = false;
  let bambooEmployeeUpdated = false;
  let bambooHRBodyParams = [];
  fields.forEach((f) => {
    let caseVal = f.getter(f, Applications.CASE); // default Case value
    let bambooHRVal = f.getter(f, Applications.BAMBOO); // default BambooHR value
    // convert Case value to BambooHR format
    let caseValConverted = f.getter(f, Applications.CASE, Applications.BAMBOO);
    // convert BambooHR value to Case format
    let bambooValConverted = f.getter(f, Applications.BAMBOO, Applications.CASE);
    // Check equality by converting the field to the same value format (do not check equality on values converted to
    // Case format since there could be data loss) If needed, write generic and custom equality methods attached
    // to the field objects
    if (bambooHRVal != caseValConverted) {
      // Field values do NOT match
      logger.log(
        3,
        'syncApplicationData',
        `FIELDS DO NOT MATCH (CASE: ${f.name} - ${JSON.stringify(caseVal)} ||| BAMBOO: ${f.name} - ${JSON.stringify(
          bambooHRVal
        )})`
      );
      if (f.isEmpty(Applications.CASE, f) && !f.isEmpty(Applications.BAMBOO, f)) {
        // Case field is empty AND BambooHR field is NOT empty (update Case field value with BambooHR field value)
        logger.log(3, 'syncApplicationData', `UPDATING CASE WITH VALUE: ${JSON.stringify(bambooValConverted)}`);
        f.updateValue(Applications.CASE, f, bambooValConverted);
        caseEmployeeUpdated = true;
      } else {
        // Either Bamboo HR field is empty OR both Case and BambooHR field values are NOT empty AND they are conflicting
        // (update BambooHR field value with Case field value since Case values take precedence over BambooHR values)
        logger.log(3, 'syncApplicationData', `UPDATING BAMBOOHR WITH VALUE: ${JSON.stringify(caseValConverted)}`);
        let param = f.updateValue(Applications.BAMBOO, f, caseValConverted);
        bambooHRBodyParams.push(param);
        bambooEmployeeUpdated = true;
      }
    } else {
      logger.log(
        3,
        'syncApplicationData',
        `FIELDS MATCH (CASE: ${f.name} - ${JSON.stringify(caseValConverted)} ||| BAMBOO: ${f.name} - ${JSON.stringify(
          bambooHRVal
        )})`
      );
    }
  });
  if (caseEmployeeUpdated) {
    let employee = _.cloneDeep(employee_data[Applications.CASE]);
    logger.log(3, 'syncApplicationData', `\nUPDATING CASE EMPLOYEE ${employee.id}`);
    await updateCaseEmployee(employee);
  }
  if (bambooEmployeeUpdated) {
    let body = Object.assign({}, ...bambooHRBodyParams);
    let employee = _.cloneDeep(employee_data[Applications.BAMBOO]);
    logger.log(3, 'syncApplicationData', `\nUPDATING BAMBOOHR EMPLOYEE ${employee.id} PARAMS ${JSON.stringify(body)}`);
    await updateBambooHREmployee(employee.id, body);
  }

  // reset data
  employee_data[Applications.BAMBOO] = null;
  employee_data[Applications.CASE] = null;
} // syncApplicationData

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////   UPDATE METHODS   ///////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generic update method that sets an employee's field.
 *
 * @param application String - The application to update (see Applications global variable)
 * @param field Object - The employee field to update that correlates to the application
 * @param value - The value to update the application's employee field with
 * @returns Object - The entire employee object OR the field - value object depending on the application
 */
function updateValue(application, field, value) {
  if (application == Applications.CASE) {
    employee_data[application][field[application]] = value;
    return employee_data[application];
  } else if (application == Applications.BAMBOO) {
    employee_data[application][field[application]] = value;
    return { [field[application]]: value };
  } else {
    return null;
  }
} // updateValue

/**
 * Custom update method that sets an employee's phone number.
 *
 * @param application String - The application to update (see Applications global variable)
 * @param field Object - The phone number field to update that correlates to the application
 * @param value - The value to update the application's employee phone number field with
 * @returns Object - The entire employee object OR the field - value object depending on the application
 */
function updatePhone(application, field, value) {
  if (application == Applications.CASE) {
    if (isEmpty(application, field)) {
      employee_data[application][field[application]] = value;
    } else {
      let phoneType = getPhoneType(field);
      let publicPhoneIndex = _.findIndex(employee_data[application].publicPhoneNumbers, (p) => p.type == phoneType);
      let privatePhoneIndex = _.findIndex(employee_data[application][field[application]], (p) => p.type == phoneType);
      if (publicPhoneIndex != -1) employee_data[application].publicPhoneNumbers.splice(publicPhoneIndex, 1, ...value);
      else if (privatePhoneIndex != -1)
        employee_data[application][field[application]].splice(privatePhoneIndex, 1, ...value);
      else employee_data[application][field[application]].push(...value);
    }
    return employee_data[application];
  } else {
    return updateValue(application, field, value);
  }
} // updatePhone

/**
 * Custom update method that sets an employee's ethnicity.
 *
 * @param application String - The application to update (see Applications global variable)
 * @param field Object - The ethnicity field to update that correlates to the application
 * @param value - The value to update the application's employee ethnicity field with
 * @returns Object - The entire employee object OR the field - value object depending on the application
 */
function updateEthnicity(application, field, value) {
  if (application == Applications.CASE) {
    // Case separates the ethnicity field into two different fields (eeoHispanicOrLatino and eeoRaceOrEthnicity)
    employee_data[application][field[application]] = value;
    if (value && employee_data[Applications.BAMBOO][ETHNICITY[Applications.BAMBOO]] == 'Hispanic or Latino') {
      employee_data[application]['eeoHispanicOrLatino'] = { text: 'Hispanic or Latino', value: true };
    } else {
      employee_data[application]['eeoHispanicOrLatino'] = { text: 'Not Hispanic or Latino', value: false };
    }
  } else {
    return updateValue(application, field, value);
  }
} // updateEthnicity

/**
 * Updates an employee through BambooHR's API.
 *
 * @param id String - The employee ID
 * @param body Object - The fields to update
 */
async function updateBambooHREmployee(id, body) {
  const key = await getKey();
  const options = {
    method: 'POST',
    url: baseURL + `/employees/${id}/`,
    auth: {
      username: key,
      password: ''
    },
    data: body
  };
  await axios(options);
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
    await _validateEmployee(employeeBasic, employeeSensitive);
    let items = [
      {
        Put: {
          TableName: `${STAGE}-employees`,
          Item: employee
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
  } catch (err) {
    // log error
    logger.log(3, 'updateCaseEmployee', `Failed to update Case employee ${employee.id}`);
  }
} // updateCaseEmployee

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////   GETTERS   //////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generic method that gets a field from an employee based on the application. This is usually used if the application's
 * field values directly correlate and do not need to be converted to another application's format.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see Applications global variable)
 * @returns The value of the application's field from the employee
 */
function getFieldValue(field, applicationFormat) {
  return employee_data[applicationFormat][field[applicationFormat]];
} // getFieldValue

/**
 * Custom method that gets a phone number from an employee based on the phone type.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see Applications global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's phone number based on the application format needed
 */
function getPhone(field, applicationFormat, toApplicationFormat) {
  let phoneType = getPhoneType(field);
  if (applicationFormat == Applications.CASE && toApplicationFormat == Applications.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    let publicPhone = _.find(employee_data[applicationFormat].publicPhoneNumbers, (p) => p.type == phoneType);
    let privatePhone = _.find(employee_data[applicationFormat][field[applicationFormat]], (p) => p.type == phoneType);
    return publicPhone ? publicPhone.number : privatePhone ? privatePhone.number : null;
  } else if (applicationFormat == Applications.BAMBOO && toApplicationFormat == Applications.CASE) {
    // convert BambooHR value to Case format -> return the converted value or null if it cannot be converted
    let number = employee_data[applicationFormat][field[applicationFormat]];
    number = convertPhoneNumberToDashed(number);
    // return converted value or null if the value cannot be converted
    return number && number.length == 12 ? [{ number: number, private: true, type: phoneType }] : null;
  } else {
    // only applicationFormat parameter was passed or applicationFormat is equal to toApplicationFormat
    return getFieldValue(field, applicationFormat, toApplicationFormat);
  }
} // getPhone

/**
 * Custom method that gets a phone number extension from an employee based on the phone type.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see Applications global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's phone number extension based on the application format needed
 */
function getPhoneExt(field, applicationFormat, toApplicationFormat) {
  let phoneType = getPhoneType(field);
  if (applicationFormat == Applications.CASE && toApplicationFormat == Applications.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    let publicPhone = _.find(employee_data[applicationFormat].publicPhoneNumbers, (p) => p.type == phoneType);
    let privatePhone = _.find(employee_data[applicationFormat][field[applicationFormat]], (p) => p.type == phoneType);
    return publicPhone ? publicPhone.ext : privatePhone ? privatePhone.ext : null;
  } else if (applicationFormat == Applications.BAMBOO && toApplicationFormat == Applications.CASE) {
    // convert BambooHR value to Case format -> return the converted value or null if it cannot be converted
    let bambooWorkPhone = WORK_PHONE.getter(WORK_PHONE, Applications.BAMBOO);
    let ext = employee_data[applicationFormat][field[applicationFormat]];
    bambooWorkPhone = convertPhoneNumberToDashed(bambooWorkPhone);
    return bambooWorkPhone && bambooWorkPhone.length == 12
      ? [{ number: bambooWorkPhone, private: true, type: phoneType, ext: ext }]
      : null;
  } else {
    // only applicationFormat parameter was passed or applicationFormat is equal to toApplicationFormat
    return getFieldValue(field, applicationFormat, toApplicationFormat);
  }
} // getPhoneExt

/**
 * Custom method that gets an employee's work status.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see Applications global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's work status based on the application format needed
 */
function getWorkStatus(field, applicationFormat, toApplicationFormat) {
  let workStatus = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat == Applications.CASE && toApplicationFormat == Applications.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    if (workStatus == 0) {
      return 'Terminated';
    } else if (workStatus < 100 && workStatus > 0) {
      return 'Part-Time';
    } else {
      return 'Full-Time';
    }
  } else if (applicationFormat == Applications.BAMBOO && toApplicationFormat == Applications.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (workStatus == 'Terminated') {
      return 0;
    } else if (workStatus == 'Part-Time') {
      return 50;
    } else {
      return 100;
    }
  } else {
    // only applicationFormat parameter was passed or applicationFormat is
    // equal to toApplicationFormat -> return regular value
    return workStatus;
  }
} // getWorkStatus

/**
 * Custom method that gets an employee's disability status.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see Applications global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's disability status based on the application format needed
 */
function getDisability(field, applicationFormat, toApplicationFormat) {
  let disability = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat == Applications.CASE && toApplicationFormat == Applications.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    if (_.isNil(disability)) {
      return null;
    } else {
      return disability ? 'Yes' : 'No';
    }
  } else if (applicationFormat == Applications.BAMBOO && toApplicationFormat == Applications.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (employee_data[toApplicationFormat].eeoDeclineSelfIdentify) {
      return null;
    } else {
      if (disability == 'Yes') return true;
      else if (disability == 'No') return false;
      else return null;
    }
  } else {
    // only applicationFormat parameter was passed or applicationFormat is
    // equal to toApplicationFormat -> return regular value
    return disability;
  }
} // getDisability

/**
 * Custom method that gets an employee's gender.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see Applications global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's disability status based on the application format needed
 */
function getGender(field, applicationFormat, toApplicationFormat) {
  let gender = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat == Applications.CASE && toApplicationFormat == Applications.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    return gender ? gender.text : null;
  } else if (applicationFormat == Applications.BAMBOO && toApplicationFormat == Applications.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (employee_data[toApplicationFormat].eeoDeclineSelfIdentify) return null;
    else if (gender == 'Male') return { text: 'Male', value: true };
    else if (gender == 'Female') return { text: 'Female', value: false };
    else return null;
  } else {
    // only applicationFormat parameter was passed or applicationFormat is
    // equal to toApplicationFormat -> return regular value
    return gender;
  }
} // getGender

/**
 * Custom method that gets an employee's ethnicity.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see Applications global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's ethnicity based on the application format needed
 */
function getEthnicity(field, applicationFormat, toApplicationFormat) {
  let ethnicity = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat == Applications.CASE && toApplicationFormat == Applications.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    if (employee_data[applicationFormat].eeoDeclineSelfIdentify) return 'Decline to answer';
    else if (
      ethnicity &&
      ethnicity.text == 'Not Applicable' &&
      employee_data[applicationFormat].eeoHispanicOrLatino &&
      employee_data[applicationFormat].eeoHispanicOrLatino.value
    )
      return 'Hispanic or Latino';
    else if (ethnicity && ethnicity.text == 'Not Applicable') return 'Decline to answer';
    else return ethnicity ? ethnicity.text : null;
  } else if (applicationFormat == Applications.BAMBOO && toApplicationFormat == Applications.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (employee_data[toApplicationFormat].eeoDeclineSelfIdentify) return null;
    else if (ethnicity == 'White') return { text: ethnicity, value: 0 };
    else if (ethnicity == 'Black or African American') return { text: ethnicity, value: 1 };
    else if (ethnicity == 'Native Hawaiian or Other Pacific Islander') return { text: ethnicity, value: 2 };
    else if (ethnicity == 'Asian') return { text: ethnicity, value: 3 };
    else if (ethnicity == 'American Indian or Alaska Native') return { text: ethnicity, value: 4 };
    else if (ethnicity == 'Two or More Races') return { text: ethnicity, value: 5 };
    else return { text: 'Not Applicable', value: 6 };
  } else {
    // only applicationFormat parameter was passed or applicationFormat is
    // equal to toApplicationFormat -> return regular value
    return ethnicity;
  }
} // getEthnicity

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////   IS EMPTY FUNCTIONS   /////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generic method that checks if a field from an employee is empty based on the application. This is generally used
 * if the field's value is a primitive type or an array.
 *
 * @param application String - The application (see Applications global variable)
 * @param field Object - The field to check (see global variable list of fields)
 * @returns Boolean - Whether the application's field is empty or not
 */
function isEmpty(application, field) {
  return _.isEmpty(employee_data[application][field[application]]);
} // isEmpty

/**
 * Custom method that checks if an EEO field from an employee is empty based on the application. An employee declining
 * to self identify will render the field NOT empty.
 *
 * @param application String - The application (see Applications global variable)
 * @param field Object - The field to check (see global variable list of fields)
 * @returns Boolean - Whether the application's field is empty or not
 */
function isEEOEmpty(application, field) {
  if (application == Applications.CASE) {
    return !employee_data[application].eeoDeclineSelfIdentify && isEmpty(application, field);
  } else {
    return isEmpty(application, field);
  }
} // isEEOEmpty

/**
 * Custom method that checks if a phone number field from an employee is empty based on the application.
 *
 * @param application String - The application (see Applications global variable)
 * @param field Object - The field to check (see global variable list of fields)
 * @returns Boolean - Whether the application's field is empty or not
 */
function isPhoneEmpty(application, field) {
  let phoneType = getPhoneType(field);
  if (application == Applications.CASE) {
    let publicPhone = _.find(employee_data[application].publicPhoneNumbers, (p) => p.type == phoneType);
    let privatePhone = _.find(employee_data[application][field[application]], (p) => p.type == phoneType);
    return !publicPhone && !privatePhone;
  } else {
    return isEmpty(application, field);
  }
} // isPhoneEmpty

/**
 * Custom method that checks if a phone number extension field from an employee is empty based on the application.
 *
 * @param application String - The application (see Applications global variable)
 * @param field Object - The field to check (see global variable list of fields)
 * @returns Boolean - Whether the application's field is empty or not
 */
function isPhoneExtEmpty(application, field) {
  let phoneType = getPhoneType(field);
  if (application == Applications.CASE) {
    let publicPhone = _.find(employee_data[application].publicPhoneNumbers, (p) => p.type == phoneType);
    let privatePhone = _.find(employee_data[application][field[application]], (p) => p.type == phoneType);
    return (
      (!publicPhone || (publicPhone && !publicPhone.ext)) && (!privatePhone || (privatePhone && !privatePhone.ext))
    );
  } else {
    return isEmpty(application, field);
  }
} // isPhoneExtEmpty

/**
 * Custom method that checks if an employee's work status field is empty based on the application.
 *
 * @param application String - The application (see Applications global variable)
 * @param field Object - The field to check (see global variable list of fields)
 * @returns Boolean - Whether the application's field is empty or not
 */
function isWorkStatusEmpty(application, field) {
  if (application == Applications.CASE) {
    return _.isNil(employee_data[application][field[application]]);
  } else {
    return isEmpty(application, field);
  }
} // isWorkStatusEmpty

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////   HELPERS   //////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Get the AWS Systems Manager object
 *
 * @returns Object - The AW Systems Manager Object
 */
function getSSM() {
  AWS.config.update({ region: 'us-east-1' });
  const ssm = new AWS.SSM();
  return ssm;
} // getSSM

/**
 * Gets the BambooHR SSM key value
 *
 * @returns String - The BambooHR SSM key value
 */
async function getKey() {
  const ssm = getSSM();
  const params = {
    Name: paramName,
    WithDecryption: true
  };
  const result = await ssm.getParameter(params).promise();
  return result.Parameter.Value;
} // getKey

/**
 * Gets the BambooHR employees data from all of the given fields
 *
 * @returns Array - The list of BambooHR employees
 */
async function getBambooHREmployeeData() {
  const key = await getKey();
  const options = {
    method: 'POST',
    url: baseURL + '/reports/custom',
    params: { format: 'JSON', onlyCurrent: 'true' },
    auth: {
      username: key,
      password: ''
    },
    data: { fields: fields.map((f) => f[Applications.BAMBOO]) }
  };
  const employeeData = await axios(options);
  return employeeData.data.employees;
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
    let employeeSensitiveData = employeesSensitive.find((es) => es.id == e.id);
    return { ...employeeSensitiveData, ...e };
  });
  return employeeData;
} // getCasePortalEmployeeData

/**
 * Gets the Case phone type from a given field
 *
 * @param field Object - The field
 * @returns String - The phone type
 */
function getPhoneType(field) {
  if (field.name == MOBILE_PHONE.name) {
    return 'Cell';
  } else if (field.name == HOME_PHONE.name) {
    return 'Home';
  } else if (field.name == WORK_PHONE.name || field.name == WORK_PHONE_EXT.name) {
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

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////   VALIDATORS   /////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Validate that an employee is valid. Returns the employee if successfully validated, otherwise returns an error.
 *
 * @param employee - Employee object to be validated
 * @param employeeSensitive - Employee sensitive data object to be validated
 * @return Employee - validated employee
 */
async function _validateEmployee(employee, employeeSensitive) {
  // log method
  logger.log(3, '_validateEmployee', `Validating employee ${employee.id}`);

  // compute method
  try {
    let err = {
      code: 403,
      message: 'Error validating employee.'
    };

    // validate id
    if (_.isNil(employee.id)) {
      // log error
      logger.log(3, '_validateEmployee', 'Employee id is empty');

      // throw error
      err.message = 'Invalid employee id.';
      throw err;
    }

    // validate first name
    if (_.isNil(employee.firstName)) {
      // log error
      logger.log(3, '_validateEmployee', 'Employee first name is empty');

      // throw error
      err.message = 'Invalid employee first name.';
      throw err;
    }

    // validate last name
    if (_.isNil(employee.lastName)) {
      // log error
      logger.log(3, '_validateEmployee', 'Employee last name is empty');

      // throw error
      err.message = 'Invalid employee last name.';
      throw err;
    }

    // validate employee number
    if (_.isNil(employee.employeeNumber)) {
      // log error
      logger.log(3, '_validateEmployee', 'Employee number is empty');

      // throw error
      err.message = 'Invalid employee number.';
      throw err;
    }

    // validate hire date
    if (_.isNil(employee.hireDate)) {
      // log error
      logger.log(3, '_validateEmployee', 'Employee hire date is empty');

      // throw error
      err.message = 'Invalid employee hire date.';
      throw err;
    }

    // validate email
    if (_.isNil(employee.email)) {
      // log error
      logger.log(3, '_validateEmployee', 'Employee email is empty');

      // throw error
      err.message = 'Invalid employee email.';
      throw err;
    }

    // validate employee role
    if (_.isNil(employeeSensitive.employeeRole)) {
      // log error
      logger.log(3, '_validateEmployee', 'Employee role is empty');

      // throw error
      err.message = 'Invalid employee role.';
      throw err;
    }

    // validate work status
    if (_.isNil(employee.workStatus)) {
      // log error
      logger.log(3, '_validateEmployee', 'Employee work status is empty');

      // throw error
      err.message = 'Invalid employee work status.';
      throw err;
    }

    // log success
    logger.log(3, '_validateEmployee', `Successfully validated employee ${employee.id}`);

    // return employee on success
    return Promise.resolve(employee);
  } catch (err) {
    // log error
    logger.log(3, '_validateEmployee', `Failed to validate employee ${employee.id}`);

    // return rejected promise
    return Promise.reject(err);
  }
} // _validateEmployee

module.exports = { handler };