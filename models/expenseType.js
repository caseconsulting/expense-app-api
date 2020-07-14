const moment = require('moment');
const ISOFORMAT = 'YYYY-MM-DD';
const _ = require('lodash');

/**
 * ExpenseType model
 *
 * Required Fields:
 * - id
 * - budgetName
 * - budget
 * - description
 * - odFlag
 * - recurringFlag
 * - requiredFlag
 * - isInactive
 * - accessiblyBy
 * - categories
 * - hasRecipient
 * - alwaysOnFeed
 *
 * Optional Fields:
 * - startDate
 * - endDate
 */

class ExpenseType {
  constructor(data) {
    this.setRequiredAttribute(data, 'id');
    this.setRequiredAttribute(data, 'budgetName');
    this.setRequiredNumberAttribute(data, 'budget', undefined, 2); // fixed 2 decimal places
    this.setRequiredAttribute(data, 'description');
    this.setRequiredAttribute(data, 'odFlag', false); // default: overdraft not allowed
    this.setRequiredAttribute(data, 'recurringFlag', false); // default: not recurring
    this.setRequiredAttribute(data, 'requiredFlag', true); // default: receipt required
    this.setRequiredAttribute(data, 'isInactive', false); // default: active
    this.setRequiredAttribute(data, 'accessibleBy', 'ALL'); // default: accessible by all employees
    this.setRequiredAttribute(data, 'categories', []); // default: no categories
    this.setRequiredAttribute(data, 'hasRecipient', false); // default: no recipient
    this.setRequiredAttribute(data, 'alwaysOnFeed', false); // default: do not show on feed


    this.setOptionalAttribute(data, 'startDate');
    this.setOptionalAttribute(data, 'endDate');
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
   * Checks if a value is empty. Returns true if the value is null or an empty/blank string.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  _isEmpty(value) {
    return _.isNil(value) || (_.isString(value) && value.trim().length === 0);
  } // isEmpty

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
}

module.exports = ExpenseType;
