/**
 * Budget model
 *
 * Fields:
 * - id
 * - expenseTypeId
 * - employeeId
 * - reimbursedAmount
 * - pendingAmount
 * - fiscalStartDate
 * - fiscalEndDate
 */

class Budget {
  constructor(data) {
    this.id = data.id;
    this.expenseTypeId = data.expenseTypeId;
    this.employeeId = data.employeeId;
    this.reimbursedAmount = Number(data.reimbursedAmount);
    this.pendingAmount = Number(data.pendingAmount);
    this.fiscalStartDate = data.fiscalStartDate;
    this.fiscalEndDate = data.fiscalEndDate;
    this.amount = data.amount;
  }
}

module.exports = Budget;
