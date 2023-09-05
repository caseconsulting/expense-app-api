const { APPLICATIONS, EMPLOYEE_DATA } = require('./fields-shared.js');
const { getPhoneType, convertPhoneNumberToDashed } = require('./helpers.js');
const _ = require('lodash');

/**
 * Generic method that gets a field from an employee based on the application. This is usually used if the application's
 * field values directly correlate and do not need to be converted to another application's format.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @returns The value of the application's field from the employee
 */
function getFieldValue(field, applicationFormat) {
  return EMPLOYEE_DATA[applicationFormat][field[applicationFormat]];
} // getFieldValue

/**
 * Custom method that gets a phone number from an employee based on the phone type.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's phone number based on the application format needed
 */
function getPhone(field, applicationFormat, toApplicationFormat) {
  let phoneType = getPhoneType(field);
  if (applicationFormat === APPLICATIONS.CASE && toApplicationFormat === APPLICATIONS.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    let publicPhone = _.find(EMPLOYEE_DATA[applicationFormat].publicPhoneNumbers, (p) => p.type === phoneType);
    let privatePhone = _.find(EMPLOYEE_DATA[applicationFormat][field[applicationFormat]], (p) => p.type === phoneType);
    return publicPhone ? publicPhone.number : privatePhone ? privatePhone.number : null;
  } else if (applicationFormat === APPLICATIONS.BAMBOO && toApplicationFormat === APPLICATIONS.CASE) {
    // convert BambooHR value to Case format -> return the converted value or null if it cannot be converted
    let number = EMPLOYEE_DATA[applicationFormat][field[applicationFormat]];
    number = convertPhoneNumberToDashed(number);
    // return converted value or null if the value cannot be converted
    return number && number.length === 12 ? [{ number: number, private: true, type: phoneType }] : null;
  } else {
    // only applicationFormat parameter was passed or applicationFormat is equal to toApplicationFormat
    return getFieldValue(field, applicationFormat, toApplicationFormat);
  }
} // getPhone

/**
 * Custom method that gets a phone number extension from an employee based on the phone type.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's phone number extension based on the application format needed
 */
function getPhoneExt(field, applicationFormat, toApplicationFormat) {
  let phoneType = getPhoneType(field);
  if (applicationFormat === APPLICATIONS.CASE && toApplicationFormat === APPLICATIONS.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    let publicPhone = _.find(EMPLOYEE_DATA[applicationFormat].publicPhoneNumbers, (p) => p.type === phoneType);
    let privatePhone = _.find(EMPLOYEE_DATA[applicationFormat][field[applicationFormat]], (p) => p.type === phoneType);
    return publicPhone ? publicPhone.ext : privatePhone ? privatePhone.ext : null;
  } else if (applicationFormat === APPLICATIONS.BAMBOO && toApplicationFormat === APPLICATIONS.CASE) {
    // convert BambooHR value to Case format -> return the converted value or null if it cannot be converted
    let bambooWorkPhone = field.extra.getter(field.extra, APPLICATIONS.BAMBOO);
    let ext = EMPLOYEE_DATA[applicationFormat][field[applicationFormat]];
    bambooWorkPhone = convertPhoneNumberToDashed(bambooWorkPhone);
    return bambooWorkPhone && bambooWorkPhone.length === 12
      ? [{ number: bambooWorkPhone, private: true, type: phoneType, ext: ext }]
      : null;
  } else {
    // only applicationFormat parameter was passed or applicationFormat is equal to toApplicationFormat
    return getFieldValue(field, applicationFormat, toApplicationFormat);
  }
} // getPhoneExt

/**
 * Custom method that gets an employee's current state.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's current state based on the application format needed
 */
function getState(field, applicationFormat, toApplicationFormat) {
  let state = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat === APPLICATIONS.CASE && toApplicationFormat === APPLICATIONS.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    if (state === null || state === undefined) {
      // return empty string because that is how BambooHR stores an empty state field
      return '';
    } else if (state === 'District Of Columbia') {
      return 'District of Columbia';
    } else {
      return state;
    }
  } else if (applicationFormat === APPLICATIONS.BAMBOO && toApplicationFormat === APPLICATIONS.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (state === '' || state === null || state === undefined) {
      return undefined;
    } else if (state === 'District of Columbia') {
      return 'District Of Columbia';
    } else {
      return state;
    }
  } else {
    // only applicationFormat parameter was passed or applicationFormat is
    // equal to toApplicationFormat -> return regular value
    return state;
  }
} // getState

/**
 * Custom method that gets an employee's work status.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's work status based on the application format needed
 */
function getWorkStatus(field, applicationFormat, toApplicationFormat) {
  let workStatus = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat === APPLICATIONS.CASE && toApplicationFormat === APPLICATIONS.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    if (workStatus === 0) {
      return 'Terminated';
    } else if (workStatus < 100 && workStatus > 0) {
      return 'Part-Time';
    } else {
      return 'Full-Time';
    }
  } else if (applicationFormat === APPLICATIONS.BAMBOO && toApplicationFormat === APPLICATIONS.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (workStatus === 'Terminated') {
      return 0;
    } else if (workStatus === 'Part-Time') {
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
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's disability status based on the application format needed
 */
function getDisability(field, applicationFormat, toApplicationFormat) {
  let disability = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat === APPLICATIONS.CASE && toApplicationFormat === APPLICATIONS.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    if (_.isNil(disability)) {
      return null;
    } else {
      return disability ? 'Yes' : 'No';
    }
  } else if (applicationFormat === APPLICATIONS.BAMBOO && toApplicationFormat === APPLICATIONS.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (EMPLOYEE_DATA[toApplicationFormat] && EMPLOYEE_DATA[toApplicationFormat].eeoDeclineSelfIdentify) {
      return null;
    } else {
      if (disability === 'Yes') return true;
      else if (disability === 'No') return false;
      else return null;
    }
  } else {
    // only applicationFormat parameter was passed or applicationFormat is
    // equal to toApplicationFormat -> return regular value
    return disability;
  }
} // getDisability

/**
 * Custom method that gets an employee's veteran status.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's veteran status based on the application format needed
 */
function getVeteranStatus(field, applicationFormat, toApplicationFormat) {
  let veteranStatus = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat === APPLICATIONS.CASE && toApplicationFormat === APPLICATIONS.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    if (_.isNil(veteranStatus)) {
      return null;
    } else {
      return veteranStatus ? 'Active Duty Wartime or Campaign Badge Veteran' : null;
    }
  } else if (applicationFormat === APPLICATIONS.BAMBOO && toApplicationFormat === APPLICATIONS.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (EMPLOYEE_DATA[toApplicationFormat] && EMPLOYEE_DATA[toApplicationFormat].eeoDeclineSelfIdentify) {
      return null;
    } else {
      return !!veteranStatus;
    }
  } else {
    // only applicationFormat parameter was passed or applicationFormat is
    // equal to toApplicationFormat -> return regular value
    return veteranStatus;
  }
} // getVeteranStatus

/**
 * Custom method that gets an employee's gender.
 *
 * @param field Object - The field to get (see global variable list of fields)
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's disability status based on the application format needed
 */
function getGender(field, applicationFormat, toApplicationFormat) {
  let gender = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat === APPLICATIONS.CASE && toApplicationFormat === APPLICATIONS.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    return gender ? gender.text : null;
  } else if (applicationFormat === APPLICATIONS.BAMBOO && toApplicationFormat === APPLICATIONS.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (EMPLOYEE_DATA[toApplicationFormat] && EMPLOYEE_DATA[toApplicationFormat].eeoDeclineSelfIdentify) return null;
    else if (gender === 'Male') return { text: 'Male', value: true };
    else if (gender === 'Female') return { text: 'Female', value: false };
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
 * @param applicationFormat String - The application (see APPLICATIONS global variable)
 * @param toApplicationFormat String - The application to convert the value's format to
 * @returns The value of the employee's ethnicity based on the application format needed
 */
function getEthnicity(field, applicationFormat, toApplicationFormat) {
  let ethnicity = getFieldValue(field, applicationFormat, toApplicationFormat);
  if (applicationFormat === APPLICATIONS.CASE && toApplicationFormat === APPLICATIONS.BAMBOO) {
    // convert Case value to BambooHR format -> return the converted value
    if (EMPLOYEE_DATA[applicationFormat].eeoDeclineSelfIdentify) return 'Decline to answer';
    else if (
      ethnicity &&
      ethnicity.text === 'Not Applicable' &&
      EMPLOYEE_DATA[applicationFormat].eeoHispanicOrLatino &&
      EMPLOYEE_DATA[applicationFormat].eeoHispanicOrLatino.value
    )
      return 'Hispanic or Latino';
    else if (ethnicity && ethnicity.text === 'Not Applicable') return 'Decline to answer';
    else return ethnicity ? ethnicity.text : null;
  } else if (applicationFormat === APPLICATIONS.BAMBOO && toApplicationFormat === APPLICATIONS.CASE) {
    // convert BambooHR value to Case format -> return the converted value
    if (
      (EMPLOYEE_DATA[toApplicationFormat] && EMPLOYEE_DATA[toApplicationFormat].eeoDeclineSelfIdentify) ||
      ethnicity === 'Decline to answer'
    )
      return null;
    else if (ethnicity === 'White') return { text: ethnicity, value: 0 };
    else if (ethnicity === 'Black or African American') return { text: ethnicity, value: 1 };
    else if (ethnicity === 'Native Hawaiian or Other Pacific Islander') return { text: ethnicity, value: 2 };
    else if (ethnicity === 'Asian') return { text: ethnicity, value: 3 };
    else if (ethnicity === 'American Indian or Alaska Native') return { text: ethnicity, value: 4 };
    else if (ethnicity === 'Two or More Races') return { text: ethnicity, value: 5 };
    else return { text: 'Not Applicable', value: 6 };
  } else {
    // only applicationFormat parameter was passed or applicationFormat is
    // equal to toApplicationFormat -> return regular value
    return ethnicity;
  }
} // getEthnicity

module.exports = {
  getFieldValue,
  getPhone,
  getPhoneExt,
  getState,
  getWorkStatus,
  getDisability,
  getVeteranStatus,
  getGender,
  getEthnicity
};
