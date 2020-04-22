const moment = require('moment');
const ISOFORMAT = 'YYYY-MM-DD';

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
    this.purchaseDate = moment(data.purchaseDate, ISOFORMAT);
    this.reimbursedDate = moment(data.reimbursedDate, ISOFORMAT);
    this.note = data.note;
    this.url = data.url;
    this.createdAt = moment(data.createdAt, ISOFORMAT);
    this.receipt = data.receipt;
    this.cost = Number(data.cost).toFixed(2);
    this.description = data.description;
    this.employeeId = data.employeeId;
    this.expenseTypeId = data.expenseTypeId;
    this.category = data.category;

    // populate empty fields with a space holder
    for (var propName in this) {
      if (this[propName] === null || this[propName] === '') {
        this[propName] = ' ';
      }
    }
  } // constructor

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
