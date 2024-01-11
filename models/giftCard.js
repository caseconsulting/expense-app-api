const _ = require('lodash');

/**
 * Gift card model
 */
class GiftCard {
  constructor(data) {
    // required attributes
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'employeeId');
    this.setRequiredAttribute(data, 'expenseId');
    this.setRequiredAttribute(data, 'creationDate');
    this.setRequiredAttribute(data, 'gcId');
    this.setRequiredAttribute(data, 'emailSent');
    this.setRequiredAttribute(data, 'status');
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
   * Sets a contract attribute. If the data attribute is empty, sets the attribute to the default value.
   *
   * @param data - contract data
   * @param attribute - contract attribute
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
   * Sets a contract attribute if it is not null or an empty/blank string.
   *
   * @param data - contract data
   * @param attribute - contract attribute
   */
  setOptionalAttribute(data, attribute) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = data[attribute];
    }
  } // setOptionalAttribute
} // Contract

module.exports = GiftCard;
