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
    this.expenseTypes = data.expenseTypes;
    this.email = data.email;
    this.employeeRole = data.employeeRole;
    this.isActive = data.isActive;

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

    // If expense types have not been defined, instantiate them in this model with
    // an empty list.
    if (!this.expenseTypes) {
      this.expenseTypes = [];
    }

    //sets null values to an empty string
    for (var propName in this) { 
      if (this[propName] === null || this[propName] === undefined) {
        this[propName] = ' ';
      }
    }
  }
}

module.exports = Employee;
