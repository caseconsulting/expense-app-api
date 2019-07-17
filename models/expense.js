/**
 * Expense model
 *
 * Fields:
 * - id
 * - purchaseDate
 * - reimbursedDate
 * - note
 * - url
 * - createdAt
 * - receipt
 * - cost
 * - name
 * - description
 * - userId
 * - expenseTypeId
 */
class Expense {
  constructor(data) {
    this.id = data.id;
    this.purchaseDate = data.purchaseDate;

    // DynamoDB interprets NULL values as true. If we do not include them as
    // class attributes, then it will be undefined in DynamoDB.
    if (data.reimbursedDate) this.reimbursedDate = data.reimbursedDate;
    if (data.note) this.note = data.note;
    if (data.url) this.url = data.url;

    this.createdAt = data.createdAt;
    this.receipt = data.receipt;
    this.cost = Number(data.cost).toFixed(2);
    this.name = data.name;
    this.description = data.description;
    this.userId = data.userId;
    this.expenseTypeId = data.expenseTypeId;
  }
}

module.exports = Expense;
