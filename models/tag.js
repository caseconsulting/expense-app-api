const _ = require('lodash');

/**
 * Tag model
 *
 * Fields:
 * - id
 * - tagName
 * - employees
 */
class Tag {
  constructor(data) {
    // required attributes
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'tagName');

    // optional attributes
    this.setOptionalAttribute(data, 'employees');
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
   * Sets a Tag attribute. If the data attribute is empty, sets the attribute to the default value.
   *
   * @param data - Tag data
   * @param attribute - Tag attribute
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
   * Sets a Tag attribute if it is not null or an empty/blank string.
   *
   * @param data - Tag data
   * @param attribute - Tag attribute
   */
  setOptionalAttribute(data, attribute) {
    if (!this._isEmpty(data[attribute])) {
      this[attribute] = data[attribute];
    }
  } // setOptionalAttribute
} // Tag

module.exports = Tag;
