const _ = require('lodash');

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
 * - customerOrgExp
 * - degrees
 * - deptDate
 * - github
 * - icTimeFrames
 * - jobRole
 * - jobs
 * - languages
<<<<<<< HEAD
 * - linkedIn
=======
>>>>>>> 1316-multiple-job-positions-entry: added optional field companies used for job experiences tab
 * - middleName
 * - nickname
 * - prime
 * - st
 * - technologies
 * - twitter
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

    // optional attributes
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
    this.setOptionalAttribute(data, 'customerOrgExp');
    this.setOptionalAttribute(data, 'degrees');
    this.setOptionalAttribute(data, 'deptDate');
    this.setOptionalAttribute(data, 'github');
    this.setOptionalAttribute(data, 'icTimeFrames');
    this.setOptionalAttribute(data, 'jobRole');
    this.setOptionalAttribute(data, 'jobs');
    this.setOptionalAttribute(data, 'languages');
    this.setOptionalAttribute(data, 'linkedIn');
    this.setOptionalAttribute(data, 'middleName');
    this.setOptionalAttribute(data, 'nickname');
    this.setOptionalAttribute(data, 'prime');
    this.setOptionalAttribute(data, 'st');
    this.setOptionalAttribute(data, 'technologies');
    this.setOptionalAttribute(data, 'twitter');
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
  } // isEmpty

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
  isIntern(){
    return this.employeeRole == 'intern';
  } // isIntern

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
}

module.exports = Employee;
