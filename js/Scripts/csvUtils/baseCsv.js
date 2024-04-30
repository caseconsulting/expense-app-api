/**
 * This CSV utils is designed to make CSV file creating and downloading easier. It is based
 * around the concept of passing through an object, where the keys are the headers and the
 * values are the data. This should work well. There is also minimal support for 2D arrays,
 * though some functionality (such as sorting) will not work. Future work could include
 * parsing a CSV file/string back into an object or working on sorting for 2D array types.
 */

// Imports and constants for all functions
const _ = require('lodash');
const dateUtils = require('../../dateUtils');
const fs = require('fs');
const NEW_LINE = '\n';

/**
 * Combines two CSV strings into one (A on top of B)
 * @param csvA - CSV string to place first
 * @param csvB - CSV string to place second
 * @param spaceBetween (optional) - number of spaces to place between CSVs
 * @return a combined CSV string
 */
function combine(csvA, csvB, spaceBetween = 0) {
  return `${csvA}\n${'""\n'.repeat(spaceBetween)}${csvB}`;
} // combine

/**
 * Downloads a given CSV string as a .csv file.
 *
 * @param csvText - csv text(s) to create as file, eg output of generate
 * @param filename (optional) - file name with which to download file
 */
function download(csvText, filename = null) {
  // build filename
  let ext = '.csv';
  filename = filename ?? `export ${dateUtils.getTodaysDate('YYYY-MM-DD')}`;
  if (filename.substring(ext.length - 4) != ext) filename += ext;

  // build file contents as buffer
  let buffer = Buffer.from(csvText);

  // file path to save file into
  const directory = 'CSV Downloads'; // if you change this, also change the .gitignore
  const filePath = `./${directory}/${filename}`;
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

  // write the blob data to a file
  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('File saved successfully!');
  });
} // download

/**
 * Escapes invalid characters in CSV.
 * @param item - array or string to escape
 * @param quotify (optional) - whether or not to surround result in quotes
 */
function escape(item, quotify = false) {
  let to_return;
  if (Array.isArray(item)) {
    to_return = _.map(item, (s) => {
      s = `${s || ''}`;
      to_return = s.replaceAll('"', '""');
      if (quotify) to_return = `"${to_return}"`;
      return to_return;
    });
  } else {
    item = `${item}`;
    to_return = item.replaceAll('"', '""');
    if (quotify) to_return = `"${to_return}"`;
  }
  return to_return;
} // escape

/**
 * Non-destructively removes undesired headers (keys)
 * @param objects - old array of objects to filter
 * @param desired_headers - which headers (aka keys of objects[x]) to keep
 * @return new array of objects with only and all desired_headers keys
 */
function filterHeaders(objects, desired_headers) {
  let new_objects = [];
  // go through each object...
  _.forEach(objects, (object) => {
    // extract headers we want
    let new_object = {};
    _.forEach(desired_headers, (h) => {
      if (object[h] != undefined) new_object[h] = object[h];
      else new_object[h] = '';
    });
    new_objects.push(new_object);
  });
  return new_objects;
} // filterHeaders

/**
 * Generates a valid CSV "file" string from an object. Object values may
 * be arrays. Object keys will be used as headers.
 * @param object_array - array of objects to make CSV
 * @param delimiter (optional) - string by which arrays will be separated
 * @return file-ready CSV string
 */
function generate(object_array, delimiter = ', ') {
  let final_csv = '';

  // construct headers, preserving order
  let headers = [];
  let seent = new Set();
  _.forEach(object_array, (object) => {
    _.forEach(Object.keys(object), (key, index) => {
      if (!seent.has(key)) {
        seent.add(key);
        headers.splice(index + 1, 0, key);
      }
    });
  });

  // add headers to CSV
  final_csv += `${escape(headers, true).join(',')}${NEW_LINE}`;

  // foreach line of file...
  _.forEach(object_array, (object) => {
    let current;
    let line = [];
    // foreach item (box) in line...
    _.forEach(headers, (header) => {
      // iteration vars
      current = object[header];
      // add line, supporting arrays and escaping characters
      if (current == undefined) {
        line.push('""');
      } else if (Array.isArray(current)) {
        current = current.filter((i) => i !== undefined);
        line.push(`"${escape(current).join(delimiter)}"`);
      } else {
        line.push(`"${escape(current)}"`);
      }
    });
    final_csv += `${line.join(',')}${NEW_LINE}`;
  });

  return final_csv;
} // generate

/**
 * Generates a valid CSV "file" from a 2D array object. All values
 * will be stringified and the first row will be the headers.
 * @param array - 2D array to make CSV
 * @return file-ready CSV string
 */
function generateFrom2dArray(arrays) {
  let linesArray = [];
  for (let i = 0; i < arrays.length; i++) {
    let line = [];
    for (let ii = 0; ii < arrays[i].length; ii++) {
      line.push(escape(arrays[i][ii], true));
    }
    linesArray.push(line.join(','));
  }
  return linesArray.join('\n');
} // generateFrom2dArray

/**
 * Non-destructively sorts an array of objects by a given key. Wrapper
 * for lodash's sort function.
 * @param objects - array of objects to sort
 * @param key - key by which to sort the `objects`, supports arrays for prioritizing
 * @return a new array of sorted `objects`
 */
function sort(objects, key) {
  if (!Array.isArray(key)) key = [key];
  return _.sortBy(objects, key);
} // sort

module.exports = {
  combine,
  download,
  filterHeaders,
  generate,
  generateFrom2dArray,
  sort
};
