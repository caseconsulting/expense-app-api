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
 * - isActive
 * - status
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
    this.isInactive = data.isInactive;
    this.workStatus = data.workStatus;

    // New fields
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

    if (this.workStatus == null) {
      this.workStatus = 100; // Default: Full Time
    }

    //sets null values to an empty string
    for (var propName in this) {
      if (this[propName] === null || this[propName] === undefined || this[propName] === '') {
        this[propName] = ' ';
      }
    }
  }
}

module.exports = Employee;
