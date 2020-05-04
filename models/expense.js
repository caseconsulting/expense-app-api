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

    // populate empty fields with a space holder
    for (let propName in this) {
      if (this[propName] == null || this[propName] === '') {
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
    return !this.isEmpty(this.receipt);
  }

  /**
   * Check if the attribute is empty. Returns true if attribute is null or a space holder.
   *
   * @return boolean - attribute is empty
   */
  isEmpty(attribute) {
    return attribute == null || attribute.trim().length <= 0;
  } // isEmpty

  /**
   * Check if the expense is reimbursed. Returns true if reimburse date exists, otherwise returns false.
   *
   * @return boolean - expense is reimbursed
   */
  isReimbursed() {
    return !this.isEmpty(this.reimbursedDate);
  } // isReimbursed
}

module.exports = Expense;
