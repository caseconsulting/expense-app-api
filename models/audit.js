const _ = require('lodash');

/**
 * Audit model
 *
 * Fields:
 * - id
 * - dateCreated
 * - type
 * - employeeId
 * - description
 * - timeToLive
 * - tags
 */

class Audit {
  constructor(data) {
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'dateCreated');
    this.setRequiredAttribute(data, 'type');
    this.setRequiredAttribute(data, 'employeeId');
    this.setOptionalAttribute(data, 'description');
    this.setOptionalAttribute(data, 'timeToLive');
    this.setOptionalAttribute(data, 'tags');
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
   * Sets an audit attribute. If the data attribute is empty, sets the attribute to the default value.
   *
   * @param data - audit data
   * @param attribute - audit attribute
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
   * Sets an audit attribute if it is not null or an empty/blank string.
   *
   * @param data - audit data
   * @param attribute - audit attribute
   */
  setOptionalAttribute(data, attribute) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = data[attribute];
    }
  } // setOptionalAttribute
} // Audit



module.exports = Audit;