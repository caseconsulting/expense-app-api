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
    this.reimbursedDate = data.reimbursedDate;
    this.note = data.note;
    this.url = data.url;

    this.createdAt = data.createdAt;
    this.receipt = data.receipt;
    this.cost = Number(data.cost).toFixed(2);
    this.description = data.description;
    this.userId = data.userId;
    this.expenseTypeId = data.expenseTypeId;
    this.categories = data.categories;

    //sets null values to an empty string
    for (var propName in this) {
      if (this[propName] === null || this[propName] === undefined || this[propName] === '') {
        this[propName] = ' ';
      }
    }
  }
}

module.exports = Expense;
