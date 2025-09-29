const _ = require('lodash');

/**
 * Expense model
 *
 * Required Fields:
 * - id
 * - employeeId
 * - createdAt
 * - expenseTypeId
 * - cost
 * - description
 * - purchaseDate
 * - showOnFeed
 *
 * Optional Fields:
 * - category
 * - recipient
 * - reimbursedDate
 * - receipt
 * - rejections
 * - note
 * - url
 * - canDelete
 * - reimbursementWasSeen
 */
class Expense {
  constructor(data) {
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'employeeId');
    this.setRequiredAttribute(data, 'createdAt');
    this.setRequiredAttribute(data, 'expenseTypeId');
    this.setRequiredAttribute(data, 'description');
    this.setRequiredAttribute(data, 'purchaseDate');
    this.setRequiredAttribute(data, 'showOnFeed', false);
    this.setRequiredNumberAttribute(data, 'cost', undefined, 2);

    this.setOptionalAttribute(data, 'category');
    this.setOptionalAttribute(data, 'recipient');
    this.setOptionalAttribute(data, 'reimbursedDate');
    this.setOptionalAttribute(data, 'receipt');
    this.setOptionalAttribute(data, 'rejections');
    this.setOptionalAttribute(data, 'note');
    this.setOptionalAttribute(data, 'url');
    this.setOptionalAttribute(data, 'canDelete');
    this.setOptionalAttribute(data, 'reimbursementWasSeen');
  } // constructor

  /**
   * Check if the expense has a receipt. Returns true if the receipt exists, otherwise returns false.
   *
   * @return boolean - expense has receipt
   */
  hasReceipt() {
    return !this._isEmpty(this.receipt);
  } // hasReceipt

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
   * Check if the expense is reimbursed. Returns true if reimburse date exists, otherwise returns false.
   *
   * @return boolean - expense is reimbursed
   */
  isReimbursed() {
    return !this._isEmpty(this.reimbursedDate);
  } // isReimbursed

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
  } // setNumberAttribute

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
} // Expense

module.exports = Expense;
