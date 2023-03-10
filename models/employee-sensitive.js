const _ = require('lodash');

/**
 * Employee sensitive model
 *
 * Required Fields:
 * - id
 * - employeeRole
 *
 * Optional Fields:
 * - birthday
 * - birthdayFeed
 * - city
 * - country
 * - st
 * - currentCity
 * - currentState
 * - currentStreet
 * - currentZIP
 * - EEO fields
 * - deptDate
 * - lastLogin
 * - privatePhoneNumbers
 */
class EmployeeSensitive {
  constructor(data) {
    // required attributes
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'employeeRole');

    // optional attributes
    this.setOptionalAttribute(data, 'eeoGender');
    this.setOptionalAttribute(data, 'eeoHispanicOrLatino');
    this.setOptionalAttribute(data, 'eeoRaceOrEthnicity');
    this.setOptionalAttribute(data, 'eeoJobCategory');
    this.setOptionalAttribute(data, 'eeoHasDisability');
    this.setOptionalAttribute(data, 'eeoIsProtectedVeteran');
    this.setOptionalAttribute(data, 'eeoDeclineSelfIdentify');
    this.setOptionalAttribute(data, 'eeoAdminHasFilledOutEeoForm');
    this.setOptionalAttribute(data, 'birthday');
    this.setOptionalAttribute(data, 'birthdayFeed');
    this.setOptionalAttribute(data, 'city');
    this.setOptionalAttribute(data, 'country');
    this.setOptionalAttribute(data, 'st');
    this.setOptionalAttribute(data, 'currentCity');
    this.setOptionalAttribute(data, 'currentState');
    this.setOptionalAttribute(data, 'currentStreet');
    this.setOptionalAttribute(data, 'currentZIP');
    this.setOptionalAttribute(data, 'deptDate');
    this.setOptionalAttribute(data, 'lastLogin');
    this.setOptionalAttribute(data, 'privatePhoneNumbers');
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
} // Employee

module.exports = EmployeeSensitive;
