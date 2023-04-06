const _ = require('lodash');

/**
 * PTOCashOut model
 *
 * Fields:
 * - id
 * - employeeId
 * - creationDate
 * - approvedDate
 * - amount
 */
class PTOCashOut {
  constructor(data) {
    // required attributes
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'employeeId');
    this.setRequiredAttribute(data, 'creationDate');
    this.setRequiredNumberAttribute(data, 'amount', undefined, 2);

    // optional attributes
    this.setOptionalAttribute(data, 'approvedDate');
  } // constructor

  /**
   * Checks if a value is empty. Returns true if the value is null or an empty/blank string.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  _isEmpty(value) {
    return _.isNil(value) || (_.isString(value) && value.trim().length === 0);
  } // isEmpty

  /**
   * Sets a PTOCashOut attribute. If the data attribute is empty, sets the attribute to the default value.
   *
   * @param data - PTOCashOut data
   * @param attribute - PTOCashOut attribute
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

  /**
   * Sets a PTOCashOut attribute if it is not null or an empty/blank string.
   *
   * @param data - PTOCashOut data
   * @param attribute - PTOCashOut attribute
   */
  setOptionalAttribute(data, attribute) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = data[attribute];
    }
  } // setOptionalAttribute
} // PTOCashOut

module.exports = PTOCashOut;
