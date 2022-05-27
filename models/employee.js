const _ = require('lodash');

// Fields that should be hidden from other users when
// accessing profile page (only visisble to signed-in
// user, admin and manager)
const PRIVATE_DATA = [
  'employeeRole',
  'deptDate',
  'birthday',
  'birthdayFeed',
  'city',
  'st',
  'country',
  'currentCity',
  'currentState',
  'currentStreet',
  'currentZIP',
  'privatePhoneNumbers',
  'eeoDeclineSelfIdentify',
  'eeoAdminHasFilledOutEeoForm'
];

const CONDITIONAL_PRIVATE_DATA = ['eeoGender', 'eeoHispanicOrLatino', 'eeoJobCategory', 'eeoRaceOrEthnicity'];

// Fields hidden from all users (only visible to admin and manager)
const HIDDEN_DATA = ['lastLogin'];

/**
 * Employee model
 *
 * Required Fields:
 * - email
 * - employeeNumber
 * - employeeRole
 * - firstName
 * - hireDate
 * - id
 * - lastName
 * - workStatus
 *
 * Optional Fields:
 * - agencyIdentificationNumber
 * - awards
 * - birthday
 * - birthdayFeed
 * - certifications
 * - city
 * - clearances
 * - companies
 * - contract
 * - contracts
 * - country
 * - currentCity
 * - currentState
 * - currentStreet
 * - currentZIP
 * - customerOrgExp
 * - degrees
 * - deptDate
 * - github
 * - icTimeFrames
 * - jobRole
 * - jobs
 * - languages
 * - lastLogin
 * - linkedIn
 * - middleName
 * - nickname
 * - noMiddleName
 * - privatePhoneNumbers
 * - prime
 * - publicPhoneNumbers
 * - schools
 * - st
 * - technologies
 * - twitter
 * - mifiStatus
 */
class Employee {
  constructor(data) {
    // required attributes
    this.setRequiredAttribute(data, 'email');
    this.setRequiredNumberAttribute(data, 'employeeNumber');
    this.setRequiredAttribute(data, 'employeeRole');
    this.setRequiredAttribute(data, 'firstName');
    this.setRequiredAttribute(data, 'hireDate');
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'lastName');
    this.setRequiredAttribute(data, 'workStatus');
    this.setRequiredAttribute(data, 'hireDate');

    // optional attributes
    this.setOptionalAttribute(data, 'eeoGender');
    this.setOptionalAttribute(data, 'eeoHispanicOrLatino');
    this.setOptionalAttribute(data, 'eeoRaceOrEthnicity');
    this.setOptionalAttribute(data, 'eeoJobCategory');
    this.setOptionalAttribute(data, 'eeoDeclineSelfIdentify');
    this.setOptionalAttribute(data, 'eeoAdminHasFilledOutEeoForm');
<<<<<<< HEAD
    this.setOptionalAttribute(data, 'agencyIdentificationNumber');
=======
>>>>>>> 7356fbe7 (3624-eeo-admin-only-fields: filter out some eeo data if an admin filled it out for a user)
    this.setOptionalAttribute(data, 'awards');
    this.setOptionalAttribute(data, 'birthday');
    this.setOptionalAttribute(data, 'birthdayFeed');
    this.setOptionalAttribute(data, 'certifications');
    this.setOptionalAttribute(data, 'city');
    this.setOptionalAttribute(data, 'clearances');
    this.setOptionalAttribute(data, 'companies');
    this.setOptionalAttribute(data, 'contract');
    this.setOptionalAttribute(data, 'contracts');
    this.setOptionalAttribute(data, 'country');
    this.setOptionalAttribute(data, 'currentCity');
    this.setOptionalAttribute(data, 'currentState');
    this.setOptionalAttribute(data, 'currentStreet');
    this.setOptionalAttribute(data, 'currentZIP');
    this.setOptionalAttribute(data, 'customerOrgExp');
    this.setOptionalAttribute(data, 'degrees');
    this.setOptionalAttribute(data, 'deptDate');
    this.setOptionalAttribute(data, 'github');
    this.setOptionalAttribute(data, 'icTimeFrames');
    this.setOptionalAttribute(data, 'jobRole');
    this.setOptionalAttribute(data, 'jobs');
    this.setOptionalAttribute(data, 'languages');
    this.setOptionalAttribute(data, 'lastLogin');
    this.setOptionalAttribute(data, 'linkedIn');
    this.setOptionalAttribute(data, 'middleName');
    this.setOptionalAttribute(data, 'nickname');
    this.setOptionalAttribute(data, 'noMiddleName');
    this.setOptionalAttribute(data, 'privatePhoneNumbers');
    this.setOptionalAttribute(data, 'prime');
    this.setOptionalAttribute(data, 'publicPhoneNumbers');
    this.setOptionalAttribute(data, 'schools');
    this.setOptionalAttribute(data, 'st');
    this.setOptionalAttribute(data, 'technologies');
    this.setOptionalAttribute(data, 'twitter');
    this.setOptionalAttribute(data, 'mifiStatus');
  } // constructor

  /**
   * Returns the employee's full name (first name and last name).
   *
   * @return String - employee's full name
   */
  fullName() {
    return `${this.firstName} ${this.lastName}`;
  } // fullName

  /**
   * Returns a new Employee object with private fields hidden based
   * on user signed in
   *
   * @param employee - signed-in employee user
   * @returns Employee - employee object with sensitive fields hidden.
   */
  hideFields(employee) {
    let e = Object.fromEntries(
      Object.entries(this).filter(([key]) => {
        if (employee.employeeRole == 'user' || employee.employeeRole == 'intern') {
          if (employee.id != this.id) {
            // A User or Intern viewing a users profile
            // Don't include private or hidden data
            return !PRIVATE_DATA.includes(key) && !HIDDEN_DATA.includes(key) && !CONDITIONAL_PRIVATE_DATA.includes(key);
          } else if (employee.eeoDeclineSelfIdentify) {
            return !HIDDEN_DATA.includes(key) && !CONDITIONAL_PRIVATE_DATA.includes(key);
          } else {
            // A User or Intern viewing their own profile
            // Don't include hidden data
            return !HIDDEN_DATA.includes(key);
          }
        } else if (employee.employeeRole == 'admin') {
          // retrun everything
          return true;
        } else if (employee.employeeRole == 'manager') {
          // return everything
          return true;
        }
        return false;
      })
    );
    return new Employee(e);
  }

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
   * Check if the employee is full time. Returns true if employee work status is 100, otherwise returns false.
   *
   * @return boolean - employee is full time
   */
  isFullTime() {
    return this.workStatus == 100;
  } // isFullTime

  /**
   * Check if the employee is inactive. Returns true if employee work status is 0, otherwise returns false.
   *
   * @return boolean - employee is inactive
   */
  isInactive() {
    return this.workStatus == 0;
  } // isInactive

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
   * Check if the employee is part time. Returns true if employee work status is greater than 0 and less than 100,
   * otherwise returns false.
   *
   * @return boolean - employee is part time
   */
  isPartTime() {
    return this.workStatus > 0 && this.workStatus < 100;
  } // isPartTime

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

module.exports = Employee;
