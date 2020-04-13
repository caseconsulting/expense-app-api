/**
 * Budget model
 *
 * Fields:
 * - id
 * - expenseTypeId
 * - userId
 * - reimbursedAmount
 * - pendingAmount
 * - fiscalStartDate
 * - fiscalEndDate
 */

class Budget {
  constructor(data) {
    this.id = data.id;
    this.expenseTypeId = data.expenseTypeId;
    this.userId = data.userId;
    this.reimbursedAmount = Number(data.reimbursedAmount);
    this.pendingAmount = Number(data.pendingAmount);
    this.fiscalStartDate = data.fiscalStartDate;
    this.fiscalEndDate = data.fiscalEndDate;
    this.amount = data.amount;
  }
}

module.exports = Budget;
