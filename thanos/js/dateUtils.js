// Documentation for Day.js: https://day.js.org/en/
// WARNING: Be careful making edits to these functions as they are used all throughout the code base

const dayjs = require('dayjs');
var utc = require('dayjs/plugin/utc');
var timezone = require('dayjs/plugin/timezone');
var customParseFormat = require('dayjs/plugin/customParseFormat');
var localizedFormat = require('dayjs/plugin/localizedFormat');
var advancedFormat = require('dayjs/plugin/advancedFormat');
var minMax = require('dayjs/plugin/minMax');
var isoWeek = require('dayjs/plugin/isoWeek');
var isSameOrAfter_ = require('dayjs/plugin/isSameOrAfter');
var isSameOrBefore_ = require('dayjs/plugin/isSameOrBefore');
var isBetween_ = require('dayjs/plugin/isBetween');
dayjs.extend(isBetween_);
dayjs.extend(isSameOrBefore_);
dayjs.extend(isSameOrAfter_);
dayjs.extend(isoWeek);
dayjs.extend(minMax);
dayjs.extend(advancedFormat);
dayjs.extend(localizedFormat);
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/New_York');

// constants
export const DEFAULT_ISOFORMAT = 'YYYY-MM-DD';
export const FORMATTED_ISOFORMAT = 'MM/DD/YYYY';
export const PARSED_ISOFORMAT = 'YYYY-MM-DD';

/**
 * Adds an amount to the given date.
 *
 * EXAMPLE: add('2022-10-16', 1, 'M') => OUTPUT: '2022-11-16'
 *
 * @param {String} date - The date to add to
 * @param {Number} amount - The amount to add
 * @param {String} granularity - The unit to add
 *                               (https://day.js.org/docs/en/manipulate/start-of#list-of-all-available-units)
 * @returns String - The added date
 */
export function add(date, amount, granularity, format) {
  return format
    ? dayjs(date).add(amount, granularity).toISOString()
    : dayjs(date).add(amount, granularity).format(format);
} // add

/**
 * Subtracts an amount from the given date.
 *
 * EXAMPLE: subtract('2022-12-24', 2, 'd') => OUTPUT: '2022-12-22'
 *
 * @param {String} date - The date to subtract from
 * @param {Number} amount - The amount to subtract
 * @param {String} granularity - The unit to subtract
 *                               (https://day.js.org/docs/en/manipulate/start-of#list-of-all-available-units)
 * @returns String - The subtracted date
 */
export function subtract(date, amount, granularity, format = DEFAULT_ISOFORMAT) {
  return dayjs(date).subtract(amount, granularity).format(format);
} // subtract

/**
 * Gets the difference in time between the two dates. https://day.js.org/docs/en/display/difference
 * NOTE: If you want a positive number, make date1 be the later date and date2 be the earlier date
 *
 * @param {String} date1 - The first date
 * @param {String} date2 - The second date
 * @param {String} granularity - (OPTIONAL) The unit to compare
 *                               (https://day.js.org/docs/en/manipulate/start-of#list-of-all-available-units)
 * @param {String} format - (OPTIONAL) The format of the dates (if not specified, uses default)
 * @returns Number - The difference in time
 */
export function difference(date1, date2, granularity, format) {
  if (!date1 || !date2) return null;
  let d1 = format ? dayjs(date1, format) : dayjs(date1);
  let d2 = format ? dayjs(date2, format) : dayjs(date2);
  if (granularity) {
    return d1.diff(d2, granularity, true);
  } else {
    return d1.diff(date2);
  }
} // difference

/**
 * Formats a given date and returns the output of the newly formatted date.
 *
 * EXAMPLES: format('2022-12-23', 'MM/DD/YYYY')         => OUTPUT: '12/23/2022'
 *           format('12/16/2022', 'YYYY-MM-DD')         => OUTPUT: '2022-12-16'
 *           format('12/23/2022', 'LLL')                => OUTPUT: 'December 23, 2022 12:00 AM'
 *
 * @param {String} date - The date to format
 * @param {String} format - The format output (https://day.js.org/docs/en/display/format)
 */
export function format(date, oldFormat, newFormat) {
  if (!date) return null;
  let formattedDate = null;
  if (oldFormat) {
    formattedDate = dayjs(date, oldFormat).format(newFormat);
  } else {
    formattedDate = dayjs(date).format(newFormat);
  }
  if (!isValid(formattedDate, newFormat)) return null;
  else return formattedDate;
} // format

/**
 * Gets hour of the date (0 to 23).
 *
 * @param {String} date - The date to get the hour of.
 * @param {String} format - (OPTIONAL) The format of the date (if not specified, uses default)
 * @returns Number - Hour of the given date
 */
export function getHour(date, format) {
  if (date) return format ? dayjs(date, format).hour() : dayjs(date).hour();
  return null;
} // getHour

/**
 * Gets the day number of the date
 *
 * @param {String} date - The date to get the day of.
 * @returns Number - Day of the given date
 */
export function getDay(date) {
  return dayjs(date).date();
} // getDay

/**
 * Gets the month of the date (0-11).
 *
 * @param {String} date - The date to get the month of.
 * @returns Number - Month of the given date (0-11)
 */
export function getMonth(date) {
  return dayjs(date).month();
} // getYear

/**
 * Gets year of the date.
 *
 * @param {String} date - The date to get the year of.
 * @returns Number - Year of the given date
 */
export function getYear(date) {
  return dayjs(date).year();
} // getYear

/**
 * Returns a number based on what day of the week it is. https://day.js.org/docs/en/get-set/iso-weekday
 *
 * @param {*} date - The given date
 * @returns Number - An integer from 1(monday)-7(sunday)
 */
export function getIsoWeekday(date) {
  return dayjs(date).isoWeekday();
} // getIsoWeekday

/**
 * Returns today's date.
 *
 * @param {String} format - The format output (https://day.js.org/docs/en/display/format)
 * @returns String - Today's date
 */
export function getTodaysDate(format) {
  if (format) {
    return dayjs().format(format);
  } else {
    return dayjs().format(DEFAULT_ISOFORMAT);
  }
} // getTodaysDate

/**
 * Verifies if the first date is after the second date in time.
 *
 * EXAMPLES: isAfter('2022-12-24', '2022-12-23')         => OUTPUT: true
 *           isAfter('2022-12-23', '2022-12-23')         => OUTPUT: false
 *           isAfter('2022-12-23', '2022-12-18', 'M')    => OUTPUT: true
 *
 * @param {String} date1 - The first date
 * @param {String} date2 - The second date
 * @param {String} granularity - (OPTIONAL) The unit to compare
 *                               (https://day.js.org/docs/en/manipulate/start-of#list-of-all-available-units)
 * @param {String} format - (OPTIONAL) Format of the dates, assumes default format if not specified
 * @returns Boolean - True if the first date comes after the second date, false otherwise
 */
export function isAfter(date1, date2, granularity, format) {
  if (granularity) {
    if (format) {
      return dayjs(date1, format, true).isAfter(dayjs(date2, format, true), granularity);
    } else {
      return dayjs(date1).isAfter(dayjs(date2), granularity);
    }
  } else {
    if (format) {
      return dayjs(date1, format, true).isAfter(dayjs(date2, format, true));
    } else {
      return dayjs(date1).isAfter(dayjs(date2));
    }
  }
} // isAfter

/**
 * Verifies if the first date is before the second date in time.
 *
 * EXAMPLES: isBefore('2022-12-23', '2022-12-24')         => OUTPUT: true
 *           isBefore('2022-12-16', '2022-12-16')         => OUTPUT: false
 *           isBefore('2022-12-14', '2022-12-16', 'M')    => OUTPUT: false
 *
 * @param {String} date1 - The first date
 * @param {String} date2 - The second date
 * @param {String} granularity - (OPTIONAL) The unit to compare
 *                               (https://day.js.org/docs/en/manipulate/start-of#list-of-all-available-units)
 * @param {String} format - (OPTIONAL) Format of the dates, assumes default format if not specified
 * @returns Boolean - True if the first date comes before the second date, false otherwise
 */
export function isBefore(date1, date2, granularity, format) {
  if (granularity) {
    if (format) {
      return dayjs(date1, format, true).isBefore(dayjs(date2, format, true), granularity);
    } else {
      return dayjs(date1).isBefore(dayjs(date2), granularity);
    }
  } else {
    if (format) {
      return dayjs(date1, format, true).isBefore(dayjs(date2, format, true));
    } else {
      return dayjs(date1).isBefore(dayjs(date2));
    }
  }
} // isBefore

/**
 * Checks if date is between a date range.
 *
 * @param {String} date - The date to check if it is between range
 * @param {String} startDate - The start date of range
 * @param {String} endDate - The end date of range
 * @param {String} granularity - The unit of time for precision
 * @param {String} interval - Identifies inclusive or exclusive for
 *                             endpoints (Ex. '()', '[)', '[]')
 * @returns Boolean - True if date is between date range, false otherwise
 */
export function isBetween(date, startDate, endDate, granularity, interval) {
  if (granularity) {
    return interval
      ? dayjs(date).isBetween(startDate, endDate, granularity, interval)
      : dayjs(date).isBetween(startDate, endDate, granularity);
  } else {
    return dayjs(date).isBetween(startDate, endDate);
  }
} // isBetween

/**
 * Checks if both dates are the same.
 *
 * @param {String} date1 - The first date to check equivalency
 * @param {String} date2 - The second date to check equivalency
 * @param {String} granularity - The unit of time for precision
 * @returns Boolean - True if date1 and date2 are the same, false otherwise
 */
export function isSame(date1, date2, granularity = null) {
  return granularity ? dayjs(date1).isSame(date2, granularity) : dayjs(date1).isSame(date2);
} // isSame

/**
 * Checks if date1 is the same or after date2.
 *
 * @param {String} date1 - The first date
 * @param {String} date2 - The second date
 * @param {String} granularity - The unit of time for precision
 * @returns Boolean - True if date1 is the same or after date2, false otherwise
 */
export function isSameOrAfter(date1, date2, granularity) {
  if (granularity) {
    return dayjs(date1).isSameOrAfter(date2, granularity);
  } else {
    return dayjs(date1).isSameOrAfter(date2);
  }
} // isSameOrAfter

/**
 * Checks if date1 is the same or before date2.
 *
 * @param {String} date1 - The first date
 * @param {String} date2 - The second date
 * @param {String} granularity - The unit of time for precision
 * @returns Boolean - True if date1 is the same or before date2, false otherwise
 */
export function isSameOrBefore(date1, date2, granularity) {
  if (granularity) {
    return dayjs(date1).isSameOrBefore(date2, granularity);
  } else {
    return dayjs(date1).isSameOrBefore(date2);
  }
} // isSameOrBefore

/**
 * Checks the validity of a given date at a given format.
 *
 * @param {String} date The date to validate
 * @param {*} format The format of the date
 * @returns True if the date is valid at the given format
 */
export function isValid(date, format) {
  return dayjs(date, format, true).isValid();
} // isValid

/**
 * Returns the earliest date from an array of dates.
 *
 * @param {Array} dates An array of string dates
 * @returns The earliest date in string format
 */
export function minimum(dates) {
  dates = dates.map((date) => dayjs(date));
  return dayjs.min(dates).format();
} // minimum

/**
 * Returns the latest date from an array of dates.
 *
 * @param {Array} dates An array of string dates
 * @returns The latest date in string format
 */
export function maximum(dates) {
  dates = dates.map((date) => dayjs(date));
  return dayjs.max(dates).format();
} // maximum

/**
 * Sets the dates day and returns a string of the date.
 *
 * @param {String} date The given date
 * @param {Number} day The day to set the date to
 * @returns String - The date at the given day
 */
export function setDay(date, day) {
  return dayjs(date).date(day).format(DEFAULT_ISOFORMAT);
} // setDay

/**
 * Sets the dates month and returns a string of the date.
 *
 * @param {String} date The given date
 * @param {Number} month The month to set the date to (0-11)
 * @returns String - The date with the given month
 */
export function setMonth(date, month) {
  return dayjs(date).month(month).format(DEFAULT_ISOFORMAT);
} // setMonth

/**
 * Sets the dates year and returns a string of the date.
 *
 * @param {String} date The given date
 * @param {Number} year The year to set the date to
 * @returns String - The date at the given year
 */
export function setYear(date, year) {
  return dayjs(date).year(year).format(DEFAULT_ISOFORMAT);
} // setYear

/**
 * Gets the date at the start of given unit time.
 *
 * @param {String} date - The date to find the start of
 * @param {String} granularity - The unit to find the start of
 * @returns String - Start of date at given unit time
 */
export function startOf(date, granularity) {
  return dayjs(date).startOf(granularity).format();
} // startOf

export default {
  DEFAULT_ISOFORMAT,
  FORMATTED_ISOFORMAT,
  PARSED_ISOFORMAT,
  add,
  subtract,
  difference,
  format,
  getHour,
  getDay,
  getMonth,
  getYear,
  getIsoWeekday,
  getTodaysDate,
  isAfter,
  isBefore,
  isBetween,
  isSame,
  isSameOrAfter,
  isSameOrBefore,
  isValid,
  maximum,
  minimum,
  setDay,
  setMonth,
  setYear,
  startOf
};
