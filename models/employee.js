const _ = require('lodash');

/**
 * Employee model
 *
 * Required Fields:
 * - id
 * - email
 * - employeeNumber
 * - firstName
 * - hireDate
 * - lastName
 * - workStatus
 *
 * Optional Fields:
 * - agencyIdentificationNumber
 * - awards
 * - certifications
 * - clearances
 * - companies
 * - contract
 * - contracts
 * - customerOrgExp
 * - cykAoid
 * - degrees
 * - education
 * - github
 * - icTimeFrames
 * - jobRole
 * - jobs
 * - languages
 * - linkedIn
 * - middleName
 * - nickname
 * - noMiddleName
 * - prime
 * - personalEmail
 * - publicPhoneNumbers
 * - schools
 * - technologies
 * - twitter
 * - mifiStatus
 * - plannedPto
 */
class Employee {
  constructor(data) {
    // required attributes
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'email');
    this.setRequiredNumberAttribute(data, 'employeeNumber');
    this.setRequiredAttribute(data, 'firstName');
    this.setRequiredAttribute(data, 'hireDate');
    this.setRequiredAttribute(data, 'lastName');
    this.setRequiredAttribute(data, 'workStatus');

    // optional attributes
    this.setOptionalAttribute(data, 'agencyIdentificationNumber');
    this.setOptionalAttribute(data, 'awards');
    this.setOptionalAttribute(data, 'birthdayFeed');
    this.setOptionalAttribute(data, 'certifications');
    this.setOptionalAttribute(data, 'clearances');
    this.setOptionalAttribute(data, 'companies');
    this.setOptionalAttribute(data, 'contract');
    this.setOptionalAttribute(data, 'contracts');
    this.setOptionalAttribute(data, 'customerOrgExp');
    this.setOptionalAttribute(data, 'cykAoid');
    this.setOptionalAttribute(data, 'degrees');
    this.setOptionalAttribute(data, 'deptDate');
    this.setOptionalAttribute(data, 'education');
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
    this.setOptionalAttribute(data, 'personalEmail');
    this.setOptionalAttribute(data, 'prime');
    this.setOptionalAttribute(data, 'publicPhoneNumbers');
    this.setOptionalAttribute(data, 'schools');
    this.setOptionalAttribute(data, 'technologies');
    this.setOptionalAttribute(data, 'twitter');
    this.setOptionalAttribute(data, 'mifiStatus');
    this.setOptionalAttribute(data, 'resumeUpdated');
    this.setOptionalAttribute(data, 'plannedPto');
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
   * Check if the employee is part time. Returns true if employee work status is greater than 0 and less than 100,
   * otherwise returns false.
   *
   * @return boolean - employee is part time
   */
  isPartTime() {
    return this.workStatus > 0 && this.workStatus < 100;
  } // isPartTime

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
