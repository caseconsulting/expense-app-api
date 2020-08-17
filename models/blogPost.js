const _ = require('lodash');

/**
 * BlogPost model
 *
 * Fields:
 * - id
 * - authorId
 * - createDate
 * - bucketId -- might be unecessary
 * - tags
 */

class BlogPost {
  constructor(data) {
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'authorId');
    this.setRequiredAttribute(data, 'createDate');
    this.setRequiredAttribute(data, 'bucketId');
    this.setOptionalAttribute(data, 'tags');
  }

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
}



module.exports = BlogPost;