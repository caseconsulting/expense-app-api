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
 * - state
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
    if (data.birthday) {
      this.birthday = data.birthday;
    } 
    if (data.jobRole) {
      this.jobRole = data.jobRole;
    } 
    if (data.prime) {
      this.prime = data.prime;
    } 
    if (data.contract) {
      this.contract = data.contract;
    } 
    if (data.github) {
      this.github = data.github;
    } 
    if (data.twitter) {
      this.twitter = data.twitter;
    } 
    if (data.city) {
      this.city = data.city;
    } 
    if (data.state) {
      this.state = data.state;
    } 
    if (data.country) {
      this.country = data.country;
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
