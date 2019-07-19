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
  }
}

module.exports = ExpenseType;
