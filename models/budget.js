const moment = require('moment');
const ISOFORMAT = 'YYYY-MM-DD';

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
 * - amount
 */

class Budget {
  constructor(data) {
    this.id = data.id;
    this.expenseTypeId = data.expenseTypeId;
    this.employeeId = data.employeeId;
    this.reimbursedAmount = Number(data.reimbursedAmount).toFixed(2);
    this.pendingAmount = Number(data.pendingAmount).toFixed(2);
    this.fiscalStartDate = data.fiscalStartDate;
    this.fiscalEndDate = data.fiscalEndDate;
    this.amount = Number(data.amount).toFixed(2);
  } // constructor

  /**
   * Check if a date is in the budget date range. Returns true if the date is between the budget fiscal start start and
   * end date. Returns false otherwise.
   *
   * @param date - moment of date to be checked
   * @return Boolean - date is in range
   */
  isDateInRange(dateStr) {
    let date = moment(dateStr, ISOFORMAT);
    let start = moment(this.fiscalStartDate, ISOFORMAT);
    let end = moment(this.fiscalEndDate, ISOFORMAT);
    return date.isBetween(start, end, null, '[]');
  } // isDateInRange
}

module.exports = Budget;
