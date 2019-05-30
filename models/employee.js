class Employee {
  constructor(data) {
    this.id = data.id;
    this.firstName = data.firstName;
    this.middleName = data.middleName;
    this.lastName = data.lastName;
    this.empId = data.empId;
    this.hireDate = data.hireDate;
    this.expenseTypes = data.expenseTypes;
    this.email = data.email;
    this.employeeRole = data.employeeRole;
    this.isActive = data.isActive;

    if (!this.middleName) {
      this.middleName = 'N/A';
    }
    if (!this.expenseTypes) {
      this.expenseTypes = [];
    }
  }
}

module.exports = Employee;
