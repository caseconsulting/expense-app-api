const _ = require('lodash');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');
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
 * - legacyCarryover
 */

class Budget {
  constructor(data) {
    // required attributes
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'expenseTypeId');
    this.setRequiredAttribute(data, 'employeeId');
    this.setRequiredNumberAttribute(data, 'reimbursedAmount', undefined, 2);
    this.setRequiredNumberAttribute(data, 'pendingAmount', undefined, 2);
    this.setRequiredAttribute(data, 'fiscalStartDate');
    this.setRequiredAttribute(data, 'fiscalEndDate');
    this.setRequiredNumberAttribute(data, 'amount', undefined, 2);
    // optional attributes
    this.setOptionalNumberAttribute(data, 'legacyCarryover', undefined, 2);
  } // constructor

  /**
   * Check if a date is in the budget date range. Returns true if the date is between the budget fiscal start start and
   * end date. Returns false otherwise.
   *
   * @param dateStr - date to be checked
   * @return Boolean - date is in range
   */
  isDateInRange(dateStr) {
    let start = dateUtils.format(this.fiscalStartDate, null, ISOFORMAT);
    let end = dateUtils.format(this.fiscalEndDate, null, ISOFORMAT);
    return dateUtils.isBetween(dateStr, start, end, 'day', '[]');
  } // isDateInRange

  /**
   * Checks if a value is empty. Returns true if the value is null or an empty/blank string.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  _isEmpty(value) {
    return _.isNil(value) || (_.isString(value) && value.trim().length === 0);
  } // _isEmpty

  /**
   * Sets an employee attribute if it is not null or an empty/blank string.
   *
   * @param data - employee data
   * @param attribute - employee attribute
   */
  setOptionalAttribute(data, attribute) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = data[attribute];
    }
  } // setOptionalAttribute

  /**
   * Sets an employee attribute number if it is not null or an empty/blank string.
   *
   * @param data - employee data
   * @param attribute - employee attribute
   * @param fixed - decimal places to fix value
   */
  setOptionalNumberAttribute(data, attribute, fixed) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = fixed ? Number(Number(data[attribute]).toFixed(fixed)) : Number(data[attribute]);
    }
  } // setOptionalNumberAttribute

  /**
   * Sets an employee attribute. If the data attribute is empty, sets the attribute to the default value.
   *
   * @param data - employee data
   * @param attribute - employee attribute
   * @param defaultValue - default value
   */
  setRequiredAttribute(data, attribute, defaultValue) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = data[attribute];
    } else {
      this[attribute] = defaultValue;
    }
  } // setRequiredAttribute

  /**
   * Sets an employee attribute number. If the data attribute is empty, sets the attribute to the default value.
   *
   * @param data - employee data
   * @param attribute - employee attribute
   * @param defaultValue - default value
   * @param fixed - decimal places to fix value
   */
  setRequiredNumberAttribute(data, attribute, defaultValue, fixed) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = fixed ? Number(Number(data[attribute]).toFixed(fixed)) : Number(data[attribute]);
    } else {
      this[attribute] = defaultValue;
    }
  } // setRequiredNumberAttribute
} // Budget

module.exports = Budget;
