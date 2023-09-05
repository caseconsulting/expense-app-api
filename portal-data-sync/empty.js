const { Applications, employee_data } = require('./fields-shared.js');
const { getPhoneType } = require('./helpers.js');
const _ = require('lodash');

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
  if (application === Applications.CASE) {
    // should only be disability and veteran status that have type Boolean for EEO
    if (field.type === Boolean) {
      return (
        !employee_data[application].eeoDeclineSelfIdentify && _.isNil(employee_data[application][field[application]])
      );
    } else {
      return !employee_data[application].eeoDeclineSelfIdentify && isEmpty(application, field);
    }
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
  if (application === Applications.CASE) {
    let publicPhone = _.find(employee_data[application].publicPhoneNumbers, (p) => p.type === phoneType);
    let privatePhone = _.find(employee_data[application][field[application]], (p) => p.type === phoneType);
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
  if (application === Applications.CASE) {
    let publicPhone = _.find(employee_data[application].publicPhoneNumbers, (p) => p.type === phoneType);
    let privatePhone = _.find(employee_data[application][field[application]], (p) => p.type === phoneType);
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
  if (application === Applications.CASE) {
    return _.isNil(employee_data[application][field[application]]);
  } else {
    return isEmpty(application, field);
  }
} // isWorkStatusEmpty

module.exports = {
  isEmpty,
  isEEOEmpty,
  isPhoneEmpty,
  isPhoneExtEmpty,
  isWorkStatusEmpty
};
