/**
 * ExpenseType model
 *
 * Fields:
 * - id
 * - budgetName
 * - odFlag
 * - endDate
 * - budget
 * - recurringFlag
 * - startDate
 * - description
 */

class ExpenseType {
  constructor(data) {
    this.id = data.id;
    this.budgetName = data.budgetName;

    // We need to make sure this value is always stored as a number, not a string
    this.budget = Number(data.budget).toFixed(2);
    
    this.startDate = data.startDate;
    this.endDate = data.endDate;

    this.odFlag = data.odFlag;
    this.requiredFlag = data.requiredFlag;
    this.recurringFlag = data.recurringFlag;
    this.isInactive = data.isInactive; //mark an expense type as inactive

    this.description = data.description;
    this.categories = data.categories;
    this.accessibleBy = data.accessibleBy;

    if (!this.categories) {
      this.categories = [];
    }

    if (!this.accessibleBy) {
      this.accessibleBy = 'ALL'; // 'ALL' = accessible by all employees
    }

    if (this.requiredFlag == null) {
      this.requiredFlag = true;
    }

    if (this.recurringFlag == null) {
      this.recurringFlag = false;
    }

    if (this.odFlag == null) {
      this.odFlag = false;
    }

    if (this.isInactive == null) {
      this.isInactive = false;
    }

    //sets null values to an empty string
    for (var propName in this) {
      if (this[propName] === null || this[propName] === undefined || this[propName] === '') {
        this[propName] = ' ';
      }
    }
  }
}

module.exports = ExpenseType;
