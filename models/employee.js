/**
 * Employee model
 *
 * Fields:
 * - id
 * - firstName
 * - middleName
 * - lastName
 * - employeeNumber
 * - hireDate
 * - expenseTypes
 * - email
 * - employeeRole
 * - workStatus
 *
 * - birthday
 * - jobRole
 * - prime
 * - contract
 * - github
 * - twitter
 * - city
 * - st
 * - country
 * - deptDate
 */
class Employee {
  constructor(data) {
    this.id = data.id;
    this.firstName = data.firstName;
    this.middleName = data.middleName;
    this.lastName = data.lastName;
    this.employeeNumber = Number(data.employeeNumber);
    this.hireDate = data.hireDate;
    this.email = data.email;
    this.employeeRole = data.employeeRole;
    this.workStatus = data.workStatus;
    this.birthday = data.birthday;
    this.jobRole = data.jobRole;
    this.prime = data.prime;
    this.contract = data.contract;
    this.github = data.github;
    this.twitter = data.twitter;
    this.city = data.city;
    this.st = data.st;
    this.country = data.country;
    this.deptDate = data.deptDate;

    // populate empty fields with a space holder
    for (let propName in this) {
      if (this._isEmpty(this[propName])) {
        this[propName] = ' ';
      }
    }
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
   * Checks if a value is empty. Returns true if the value is null or a single character space String.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  _isEmpty(value) {
    return value == null || value === ' ';
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
}

module.exports = Employee;
