const { APPLICATIONS } = require('./fields-shared.js');

/** 
 * Custom method to check equality of an employee's work status
 * 
 * @param a first value to check
 * @param b second value to check
 * @param apps applications of status1 and status2, eg { first: APPLICATIONS.CASE, second: APPLICATIONS.BAMBOO }
 * 
 */
function checkWorkStatus(status1, status2, apps) {
  // no function to do this for ADP
  if (apps.first === APPLICATIONS.ADP || apps.second === APPLICATIONS.ADP) return undefined;

  // possible values for abstraction
  let options = { 0: 'terminated', 1: 'parttime', 2: 'fulltime' };

  // convert to a common value
  let convert = (value) => {
    let alpha = value.replace(/[^a-zA-Z]/, '').toLowerCase(); // get just alphabetic chars, in lowercase
    if (alpha.includes('terminated')) return options[0];
    if (alpha.includes('parttime')) return options[1];
    if (alpha.includes('fulltime')) return options[2];
  };
  
  // return converted values equality
  return convert(status1) === convert(status2);
}

module.exports = {
  checkWorkStatus
};
