const _ = require('lodash');
const REQUIRED_FIELDS = ['id', 'employeeRole'];
const OPTIONAL_FIELDS = [
  'eeoGender',
  'eeoHispanicOrLatino',
  'eeoRaceOrEthnicity',
  'eeoJobCategory',
  'eeoHasDisability',
  'eeoIsProtectedVeteran',
  'eeoDeclineSelfIdentify',
  'eeoAdminHasFilledOutEeoForm',
  'emergencyContacts',
  'birthday',
  'city',
  'country',
  'st',
  'currentCity',
  'currentState',
  'currentStreet',
  'currentStreet2',
  'currentZIP',
  'notes',
  'personalEmail',
  'privatePhoneNumbers'
];

class EmployeeSensitive {
  constructor(data) {
    // required attributes
    _.forEach(REQUIRED_FIELDS, (f) => this.setRequiredAttribute(data, f));
    // optional attributes
    _.forEach(OPTIONAL_FIELDS, (f) => this.setOptionalAttribute(data, f));
  } // constructor

  /**
   * Prevents employee user from overriding admin filled out fields
   * on the EEO form, when editing profile data unrelated to EEO form
   *
   * @param oldEmployee - old employee object data
   * @param user - signed-in user
   */
  handleEEOData(oldEmployee, user) {
    if (this.eeoDeclineSelfIdentify && oldEmployee.eeoDeclineSelfIdentify && user.id == this.id) {
      this.setOptionalAttribute(oldEmployee, 'eeoGender');
      this.setOptionalAttribute(oldEmployee, 'eeoHispanicOrLatino');
      this.setOptionalAttribute(oldEmployee, 'eeoRaceOrEthnicity');
      this.setOptionalAttribute(oldEmployee, 'eeoJobCategory');
    }
  } // handleEEOData

  /**
   * Check if the employee is an admin. Returns true if employee role is 'admin', otherwise returns false.
   *
   * @return boolean - employee is admin
   */
  isAdmin() {
    return this.employeeRole == 'admin';
  } // isAdmin

  /**
   * Checks if a value is empty. Returns true if the value is null or an empty/blank string.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  _isEmpty(value) {
    return _.isNil(value) || (_.isString(value) && value.trim().length === 0);
  } // _isEmpty

  /**
   * Check if the employee is an intern. Returns true if employee role is 'intern', otherwise returns false.
   *
   * @return boolean - employee is an intern
   */
  isIntern() {
    return this.employeeRole == 'intern';
  } // isIntern

  /**
   * Check if the employee is an manager. Returns true if employee role is 'manager', otherwise returns false.
   *
   * @return boolean - employee is an manager
   */
  isManager() {
    return this.employeeRole == 'manager';
  } //isManager

  /**
   * Check if the employee is a user. Returns true if employee role is 'user', otherwise returns false.
   *
   * @return boolean - employee is user
   */
  isUser() {
    return this.employeeRole == 'user';
  } // isUser

  /**
   * Gets all field keys.
   *
   * @returns Array - The array of fields
   */
  static getFields() {
    return [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
  } // getFields

  /**
   * Sets an employee attribute if it is not null or an empty/blank string.
   *
   * @param data - employee data
   * @param attribute - employee attribute
   */
  setOptionalAttribute(data, attribute) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = data[attribute];
    }
  } // setOptionalAttribute

  /**
   * Sets an employee attribute number if it is not null or an empty/blank string.
   *
   * @param data - employee data
   * @param attribute - employee attribute
   * @param fixed - decimal places to fix value
   */
  setOptionalNumberAttribute(data, attribute, fixed) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = fixed ? Number(Number(data[attribute]).toFixed(fixed)) : Number(data[attribute]);
    }
  } // setNumberAttribute

  /**
   * Sets an employee attribute. If the data attribute is empty, sets the attribute to the default value.
   *
   * @param data - employee data
   * @param attribute - employee attribute
   * @param defaultValue - default value
   */
  setRequiredAttribute(data, attribute, defaultValue) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = data[attribute];
    } else {
      this[attribute] = defaultValue;
    }
  } // setRequiredAttribute

  /**
   * Sets an employee attribute number. If the data attribute is empty, sets the attribute to the default value.
   *
   * @param data - employee data
   * @param attribute - employee attribute
   * @param defaultValue - default value
   * @param fixed - decimal places to fix value
   */
  setRequiredNumberAttribute(data, attribute, defaultValue, fixed) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = fixed ? Number(Number(data[attribute]).toFixed(fixed)) : Number(data[attribute]);
    } else {
      this[attribute] = defaultValue;
    }
  } // setRequiredNumberAttribute

  getCustomKudos(startDate = null, endDate = null) {
    let customKudos = this.notes?.pages?.kudos?.custom || [];
    if (startDate || endDate) {
      customKudos = customKudos.filter((kudo) => {
        let kudoInRange = true;
        if (startDate) {
          kudoInRange = kudoInRange && kudo.date >= startDate;
        }

        if (endDate) {
          kudoInRange = kudoInRange && kudo.date <= endDate;
        }

        return kudoInRange;
      });
    }

    return customKudos;
  }
} // Employee

module.exports = EmployeeSensitive;
