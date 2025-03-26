// const { APPLICATIONS } = require('./fields-shared.js');

/** 
 * Custom method to check equality of an employee's work status
 * 
 * @param a first value to check
 * @param b second value to check
 * @param apps (unused) applications of status1 and status2 eg { first: APPLICATIONS.CASE, second: APPLICATIONS.BAMBOO }
 * 
 */
function checkWorkStatus(status1, status2) {
  // possible values for abstraction
  let options = { 0: 'terminated', 1: 'parttime', 2: 'fulltime' };

  // convert to a common value
  let convert = (value) => {
    let alpha = value.replaceAll(/[^a-zA-Z]/g, '').toLowerCase(); // get just alphabetic chars, in lowercase
    if (alpha.includes('terminated')) return options[0];
    if (alpha.includes('parttime')) return options[1];
    if (alpha.includes('fulltime')) return options[2];
    return undefined;
  };

  let [a, b] = [convert(status1), convert(status2)]; // get values
  if ([a, b].includes(undefined)) return false; // return false if one value was unable to convert
  return a === b; // return whether or not they are the same
}

module.exports = {
  checkWorkStatus
};
