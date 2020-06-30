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
 * - description
 * - employeeId
 * - expenseTypeId
 * - category
 * - showOnFeed
 */
class Expense {
  constructor(data) {
    this.id = data.id;
    this.purchaseDate = data.purchaseDate;
    this.reimbursedDate = data.reimbursedDate;
    this.note = data.note;
    this.url = data.url;
    this.createdAt = data.createdAt;
    this.receipt = data.receipt;
    this.cost = Number(Number(data.cost).toFixed(2));
    this.description = data.description;
    this.employeeId = data.employeeId;
    this.expenseTypeId = data.expenseTypeId;
    this.category = data.category;
    this.showOnFeed = data.showOnFeed;

    // populate empty fields with a space holder
    for (let propName in this) {
      if (this._isEmpty(this[propName])) {
        this[propName] = ' ';
      }
    }
  } // constructor

  /**
   * Check if the expense has a receipt. Returns true if the receipt exists, otherwise returns false.
   *
   * @return boolean - expense has receipt
   */
  hasReceipt() {
    return !this._isEmpty(this.receipt);
  }

  /**
   * Checks if a value is empty. Returns true if the value is null or a single character space String.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  _isEmpty(value) {
    return value == null || value === ' ' || value === '';
  } // isEmpty

  /**
   * Check if the expense is reimbursed. Returns true if reimburse date exists, otherwise returns false.
   *
   * @return boolean - expense is reimbursed
   */
  isReimbursed() {
    return !this._isEmpty(this.reimbursedDate);
  } // isReimbursed
}

module.exports = Expense;
