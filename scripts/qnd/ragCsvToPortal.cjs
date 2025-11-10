/**
 * Script to migrate CSV file to employees in Dynamo.
 */

const csv = require('@fast-csv/parse');
const fs = require('fs');
const path = require('path');
const { generateUUID } = require(process.env.AWS ? 'utils' : '../../js/utils');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../../js/databaseModify');
const EmployeeRoutes = require(process.env.AWS ? 'employeeRoutes' : '../../routes/employeeRoutes');
const employeeRoutes = new EmployeeRoutes();

// Settings you might want to change
const VERBOSE = 2; // 0 = none, 1 = summary, 2 = details
const TESTING = true; // set to true to not make DB changes
const CSV_FILENAME = 'rag.csv';
const EXCLUDE = [
  { 'Email': 'rlitscher@consultwithcase.com' },
  { 'Email': 'csantiago@consultwithcase.com' }
]

// Settings you probably don't want to change
const DEFAULT_PART_TIME_PERCENTAGE = 50;
const STAGE = process.env.STAGE || 'dev';
const IDENTIFIER = 'email'; // constant identifier for employees, as id and employee number might not be the best

// Conversions of data, Portal Name -> CSV name, or function(csvData)
const CONVERSIONS = {
  'email': 'CASE Email',
  'personalEmail': 'Home Email',
  'firstName': 'First Name',
  'middleName': 'Middle Name',
  'lastName': 'Last Name',
  'currentStreet': 'Address Line 1',
  'currentCity': 'City',
  'currentState': 'State',
  'currentZIP': 'Zip Code',
  'country': 'Country',
  'personalEmail': 'Home Email',
  'jobRole': 'Job Title',
  'employeeRole': () => 'user',
  'birthday': (csvItem) => convertDate(csvItem['Birth Date']),
  'hireDate': (csvItem) => convertDate(csvItem['Hire Date']),
  'clearances': (csvItem) => ([{
    biDates: [csvItem['BI Date']],
    polyDates: [csvItem['Last Poly Date']],
    badgeExpirationDate: csvItem['Badge Expiration Date']
  }]),
  'emergencyContacts': (csvItem) => ([{
    'name': csvItem['Emergency Contact Name'],
    'relationship': csvItem['Emergency Contact Relationship'],
    'homePhone': csvItem['Emergency Contact Home Phone'],
    'mobilePhone': csvItem['Emergency Contact Mobile Phone'],
    'workPhone': csvItem['Emergency Contact Work Phone'],
    'email': csvItem['Emergency Contact Email'],
    'country': csvItem['Emergency Contact Country'],
    'addressLine1': csvItem['Emergency Contact Street 1'],
    'addressLine2': csvItem['Emergency Contact Street 2'],
    'city': csvItem['Emergency Contact City'],
    'state': csvItem['Emergency Contact State'],
    'zipcode': csvItem['Emergency Contact ZIP Code']
  }]),
  'education': (csvItem) => ([{
      name: csvItem['College/Institution'],
      degreeType: csvItem['Degree']?.replaceAll('\'', '') || '',
      majors: [csvItem['Major/Specialization']]
  }]),
  'privatePhoneNumbers': (csvItem) => {
    let phoneNumbers = [];
    if (csvItem['Mobile Phone']) {
      phoneNumbers.push({
        number: csvItem['Mobile Phone'],
        private: true,
        tupe: 'Cell'
      })
    }
    if (csvItem['Home Phone']) {
      phoneNumbers.push({
        number: csvItem['Home Phone'],
        private: true,
        tupe: 'Home'
      })
    }
  }
}

// CSV headers -> Portal Name mapping
const CSV_HEADERS = {
  'CASE Email': 'email',
  'Home Email': 'personalEmail',
  'First Name': 'firstName',
  'Middle Name': 'middleName',
  'Last Name': 'lastName',
  'Address Line 1': 'currentStreet',
  'City': 'currentCity',
  'State': 'currentState',
  'Zip Code': 'currentZIP',
  'Country': 'country',
  'Home Email': 'personalEmail',
  'Job Title': 'jobRole',
  'Mobile Phone': 'privatePhoneNumbers',
  'Home Phone': 'privatePhoneNumbers',
}

// Fields that are in sensitive table
const SENSITIVE_FIELDS = new Set([
  'eeoGender',
  'eeoHispanicOrLatino',
  'eeoRaceOrEthnicity',
  'eeoJobCategory',
  'eeoHasDisability',
  'eeoIsProtectedVeteran',
  'eeoDeclineSelfIdentify',
  'eeoAdminHasFilledOutEeoForm',
  'emergencyContacts',
  'birthday',
  'city',
  'country',
  'st',
  'currentCity',
  'currentState',
  'currentStreet',
  'currentStreet2',
  'currentZIP',
  'notes',
  'personalEmail',
  'privatePhoneNumbers',
]);

/**
 * Logs if verbosity matches
 * 
 * @param {Number} level minimum level at which to log msg
 * @param {String | Array | Object} msg what to console log
 */
function log(level, msg) {
  if (VERBOSE < level) return;
  if (Array.isArray(msg)) for (let m of msg) console.log(m);
  else if (typeof msg === 'object') console.log(JSON.stringify(msg));
  else console.log(msg);
}



/**
 * Converts csv file into an array of objects, using the headers as the names of
 * the object values
 * 
 * @param {String} filename 
 * @returns {Array} Array of objects from CSV
 */
async function getCsvData(filename) {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filename)
      .pipe(csv.parse({ headers: true, trim: true }))
      .on('error', reject)
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results));
  });
}

/**
 * Uses default JS date parsing to convert to YYYY-MM-DD, regardless of input format
 * 
 * @param {String} rawDate 
 * @returns {String} YYYY-MM-DD formatted date
 */
function convertDate(rawDate) {
  let date = new Date(rawDate);
  let year = date.getFullYear();
  let month = (date.getMonth() + 1).toString().padStart(2, '0');
  let day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Takes array of objects (converted from CSV by getCsvData()) and creates a DB-insertable
 * employee object of of them.
 * 
 * @param {*} csvLines Array of objects from CSV
 * @param {*} defaultList (optional) Primer for employee list from getExistingPortalEmployees()
 * @returns {Array} Array of employee objects for DB insertion
 */
function createEmployees(csvLines, defaultList) {
  let employees = defaultList ?? {};
  
  csv: for (let csvEmp of csvLines) {
    // skip employee if in exclude list
    for (let exclude of EXCLUDE)
      for (let [k, v] of Object.entries(exclude))
        if (csvEmp[k] == v)
          continue csv;
    // generate boilerplate info
    let id = generateUUID();
    if (STAGE === 'dev') id = 'ragnarok' + id.substring(8);
    let basic = { id };
    let sensitive = { id };
    // add all fields from CSV
    for (let [portalName, conversion] of Object.entries(CONVERSIONS)) {
      let target = SENSITIVE_FIELDS.has(portalKey) ? sensitive : basic;
      let value = null;
      if (typeof conversion === 'function') value = conversion(csvEmp) ?? null; // run func
      else value = csvEmp[conversion] ?? null; // access by string
      if (value != null) target[portalName] = value;
    }
    // add to list
    // this could be improved by doing a comparison and adding to arrays if they are different,
    // but with the current CSV only the emergency contacts are different
    if (!employees[basic[IDENTIFIER]]) employees[basic.id] = { basic, sensitive };
    else employees[basic[IDENTIFIER]].emergencyContacts.push(sensitive.emergencyContacts[0]);
  }

  return Object.values(employees);
}

/**
 * Submits a single employee object to Dynamo after validation
 * 
 * @param {Object} employee 
 * @returns result of Dynamo TransactItems()
 */
async function submitPortalEmployee(employee) {
  let { basic, sensitive } = employee;
  try {
    await employeeRoutes._validateEmployee(basic, sensitive);
    let items = [
      {
        Put: {
          TableName: `${STAGE}-employees`,
          Item: basic
        }
      },
      {
        Put: {
          TableName: `${STAGE}-employees-sensitive`,
          Item: sensitive
        }
      }
    ];
    // all or nothing call
    if (TESTING) {
      log(2, `Would have created employee ${basic.firstName} ${basic.lastName}`);
      return;
    }
    await DatabaseModify.TransactItems(items);
    return Promise.resolve(employee);
  } catch (e) {
    throw new Error(`Error creating employee ${basic.firstName} ${basic.lastName}: ${e.message}`);
  }
}

/**
 * Creates batches out of an array. Eg:
 * [1, 2, 3, 4, 5, 6, 7,] => [[1, 2, 3], [4, 5, 6], [7, 8]]
 * 
 * @param {Array} arr Array to batch
 * @param {Number} size Number of elements desired in each batch
 * @returns Array of array batches
 */
function batchify(arr, size) {
  let batches = [];
  while (arr.length) batches.push(arr.splice(0, size));
  return batches;
}

/**
 * Submits a batch of employees to Dynamo in parallel
 * 
 * @param {Array[Object]} batch Array of employee objects to submit
 * @returns {Object} {errors[], successes[]} of names of people for logging
 */
async function batchCreatePortalEmployees(batch) {
  let returnData = { errors: [], successes: [] };

  let promises = [];
  for (let employee of batch) promises.push(submitPortalEmployee(employee));
  let results = await Promise.all(promises);
  for (let i in results) {
    let res = results[i];
    let { basic: emp } = batch[i];
    let name = `${emp.firstName} ${emp.lastName}`;
    if (res instanceof Error) {
      returnData.errors.push(name)
    } else {
      returnData.successes.push(name);
    }
  }

  return returnData;
}

/**
 * Gets existing Portal employees from DynamoDB, with indexing
 * 
 * @returns {Object} indexed employees
 */
async function getExistingPortalEmployees() {
  // get dynamos
  let basicDynamo = new DatabaseModify('employees');
  let sensitiveDynamo = new DatabaseModify('employees-sensitive');
  // fetch data
  let basicData = await basicDynamo.getAllEntriesInDB();
  let sensitiveData = await sensitiveDynamo.getAllEntriesInDB();
  // make object
  let employees = {};
  for (let emp of basicData) employees[emp.id] = emp; // get basic
  for (let emp of sensitiveData) employees[emp.id] = { ...employees[emp.id], ...emp } // get sensitive
  // index by email
  for (let [id, data] of Object.entries(employees)) {
    employees[data[IDENTIFIER]] = data;
    delete employees[id];
  }
  return employees;
}

async function main() {
  // get employees and batch them
  let csvEmployees = await getCsvData(CSV_FILENAME);
  let existingEmployees = getExistingPortalEmployees();
  let employeeObjs = createEmployees(csvEmployees, existingEmployees);
  let batches = batchify(employeeObjs, 50); // AWS should allow up to 50

  console.log(batches);
  return;

  // create batches, error handling by lower functions
  let successes = [];
  let errors = [];
  let results;
  for (let batch of batches) {
    results = await batchCreatePortalEmployees(batch);
    successes.push(...results.successes);
    errors.push(...results.errors);
  }
  
  log(1, `\nSuccessfully created ${successes.length} employees`);
  log(2, successes);
  log(1, `Failed to create ${errors.length} employees`);
  log(2, errors);
  log(1, `Used ${batches.length} batches of sizes ${batches.map(b => b.length).join(', ')}`)
}

(async () => {
  await main();
})();
