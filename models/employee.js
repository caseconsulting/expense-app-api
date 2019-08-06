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

    // New fields
    this.birthday = data.birthday;
    this.jobRole = data.jobRole;
    this.prime = data.prime;
    this.contract = data.contract;
    this.github = data.github;
    this.twitter = data.twitter;
    this.city = data.city;
    this.st = data.state;
    this.country = data.country;

    if (!this.middleName) {
      this.middleName = ' ';
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
