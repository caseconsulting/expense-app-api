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
    this.odFlag = data.odFlag;
    this.endDate = data.endDate;

    // We need to make sure this value is always stored as a number, not a string
    this.budget = Number(data.budget).toFixed(2);

    this.requiredFlag = data.requiredFlag;
    this.recurringFlag = data.recurringFlag;
    this.isInactive = data.isInactive; //mark an expense type as inactive
    this.startDate = data.startDate;
    this.description = data.description;
    this.categories = data.categories;

    if (!this.categories) {
      this.categories = [];
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
