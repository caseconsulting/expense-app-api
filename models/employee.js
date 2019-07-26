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
    if (data.birthday) {
      this.birthday = data.birthday;
    } else {
      this.birthday = ' ';
    }
    if (data.jobRole) {
      this.jobRole = data.jobRole;
    } else {
      this.jobRole = ' ';
    }
    if (data.prime) {
      this.prime = data.prime;
    } else {
      this.prime = ' ';
    }
    if (data.contract) {
      this.contract = data.contract;
    } else {
      this.contract = ' ';
    }
    if (data.github) {
      this.github = data.github;
    } else {
      this.github = ' ';
    }
    if (data.twitter) {
      this.twitter = data.twitter;
    } else {
      this.twitter = ' ';
    }

    // If the person's middle name is not defined
    if (!this.middleName) {
      this.middleName = ' ';
    }

    // If expense types have not been defined, instantiate them in this model with
    // an empty list.
    if (!this.expenseTypes) {
      this.expenseTypes = [];
    }
  }
}

module.exports = Employee;
