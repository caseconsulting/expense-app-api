const _ = require('lodash');

/**
 * Audit model
 */

class Audit {
  constructor(data) {
    // required attributes
    this.setRequiredAttribute(data, 'id'); // generated id of audit
    this.setRequiredAttribute(data, 'timeToLive'); // audit is auto-deleted after this date
    this.setRequiredAttribute(data, 'datetime'); // YYYY-MM-DDTHH:mm:ssZ of audit
    this.setRequiredAttribute(data, 'type'); // type of audit (regular, resume, etc.)
    this.setRequiredAttribute(data, 'action'); // action taken, must be one of required types in auditRoutes.js

    // optional attributes
    this.setOptionalAttribute(data, 'employeeId'); // employee who spawned audit
    this.setOptionalAttribute(data, 'tableName'); // affected table
    this.setOptionalAttribute(data, 'tableRow'); // id of affected row in table
    this.setOptionalAttribute(data, 'supplemental'); // more type-specific data (eg list attributes that changed in db)
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
