const moment = require('moment');
const ISOFORMAT = 'YYYY-MM-DD';

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
 * - requiredFlag
 * - startDate
 * - description
 * - isInactive
 * - categories
 * - accessiblyBy
 * - hasRecipient
 */

class ExpenseType {
  constructor(data) {
    this.id = data.id;
    this.budgetName = data.budgetName;
    this.budget = Number(Number(data.budget).toFixed(2));
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.odFlag = data.odFlag;
    this.requiredFlag = data.requiredFlag;
    this.recurringFlag = data.recurringFlag;
    this.isInactive = data.isInactive;
    this.description = data.description;
    this.categories = data.categories;
    this.accessibleBy = data.accessibleBy;
    this.hasRecipient = data.hasRecipient;

    if (!this.categories) {
      this.categories = []; // default: no categories
    }

    if (!this.accessibleBy) {
      this.accessibleBy = 'ALL'; // default: accessible by all employees
    }

    if (this.requiredFlag == null) {
      this.requiredFlag = true; // default: receipt required
    }

    if (this.recurringFlag == null) {
      this.recurringFlag = false; // default: not recurring
    }

    if (this.odFlag == null) {
      this.odFlag = false; // default: overdraft not allowed
    }

    if (this.isInactive == null) {
      this.isInactive = false; // default: active
    }

    // populate empty fields with a space holder
    for (let propName in this) {
      if (this._isEmpty(this[propName])) {
        this[propName] = ' ';
      }
    }
  } // constructor

  /**
   * Check if a date is in the expense type date range. Returns true if the expense type is recurring or the date is
   * between the expense type start and end date. Returns false otherwise.
   *
   * @param date - moment of date to be checked
   * @return Boolean - date is in range
   */
  isDateInRange(dateStr) {
    if (this.recurringFlag) {
      return true;
    } else {
      let date = moment(dateStr, ISOFORMAT);
      let start = moment(this.startDate, ISOFORMAT);
      let end = moment(this.endDate, ISOFORMAT);
      return date.isBetween(start, end, null, '[]');
    }
  } // isDateInRange

  /**
   * Checks if a value is empty. Returns true if the value is null or a single character space String.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  _isEmpty(value) {
    return value == null || value === ' ' || value === '';
  } // isEmpty
}

module.exports = ExpenseType;
