// APPLICATIONS
const APPLICATIONS = {
  CASE: 'Case',
  BAMBOO: 'BambooHR',
  ADP: 'ADP'
};

// Global variable for employees that have values being updated for sync process
const EMPLOYEE_DATA = { [APPLICATIONS.CASE]: null, [APPLICATIONS.BAMBOO]: null }; // global value

module.exports = {
  APPLICATIONS,
  EMPLOYEE_DATA
};
