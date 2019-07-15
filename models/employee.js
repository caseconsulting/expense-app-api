/**
 * Employee model
 *
 * Fields:
 * - id
 * - firstName
 * - middleName
 * - lastName
 * - empId
 * - hireDate
 * - expenseTypes
 * - email
 * - employeeRole
 * - isActive
 */
class Employee {
  constructor(data) {
    this.id = data.id;
    this.firstName = data.firstName;
    this.middleName = data.middleName;
    this.lastName = data.lastName;
    this.empId = Number(data.empId);
    this.hireDate = data.hireDate;
    this.expenseTypes = data.expenseTypes;
    this.email = data.email;
    this.employeeRole = data.employeeRole;
    this.isActive = data.isActive;

    // If the person's middle name is not defined, we want it to be stored as N/A
    if (!this.middleName) {
      this.middleName = 'N/A';
    }

    // If expense types have not been defined, instantiate them in this model with
    // an empty list.
    if (!this.expenseTypes) {
      this.expenseTypes = [];
    }
  }
}

module.exports = Employee;
