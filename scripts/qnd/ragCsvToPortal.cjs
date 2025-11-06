/**
 * Script to migrate CSV file to employees in Dynamo.
 */
const fs = require('fs');
const path = require('path');
const { generateUUID } = require(process.env.AWS ? 'utils' : '../../js/utils');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../../js/databaseModify');
const EmployeeRoutes = require(process.env.AWS ? 'employeeRoutes' : '../../routes/employeeRoutes');


const employeeRoutes = new EmployeeRoutes();

// Settings
const DEFAULT_PART_TIME_PERCENTAGE = 50;
const STAGE = process.env.STAGE || 'dev';
const EXCLUDE = [
  { 'Email': '****@consultwithcase.com' },
  { 'Email': '****@consultwithcase.com' }
]

// CSV info
const HEADERS_CSV_PORTAL = {
  'Email': 'email',
  'Employee Number': 'employeeNumber',
  'First Name': 'firstName',
  'Middle Name': 'middleName',
  'Last Name': 'lastName',
  'Hire Date': 'hireDate',
  'Employment Status': 'workStatus',
  'Birth Date': 'birthday'
}
const HEADERS_PORTAL_CSV = {};
for (let [k, v] of Object.entries(HEADERS_CSV_PORTAL)) HEADERS_PORTAL_CSV[v] = k;

// Dynamo database info
const REQUIRED_FIELDS = new Set([
  'email',
  'employeeNumber',
  'firstName',
  'lastName',
  'hireDate',
  'workStatus',
  'employeeRole'
]);
const SENSITIVE_FIELDS = new Set([
  'birthday',
  'city',
  'country',
  'currentCity',
  'currentState',
  'currentStreet',
  'currentZip',
  'employeeRole',
  'notes',
  'personalEmail',
  'privatePhoneNumbers',
  'st'
]);

async function getCsvData(filename) {
  const filePath = path.resolve(process.cwd(), filename);
  const data = await fs.promises.readFile(filePath, 'utf-8');
  const lines = data.split('\n');
  const headers = lines.splice(0, 1)[0].split(',');
  const csvData = [];
  for (let line of lines) {
    if (line === '') continue;
    let obj = {};
    const values = line.split(',');
    for (let i in values) obj[headers[i].trim()] = values[i];
    csvData.push(obj);
  }
  return csvData;
}

function convertDate(rawDate) {
  let date = new Date(rawDate);
  let year = date.getFullYear();
  let month = (date.getMonth() + 1).toString().padStart(2, '0');
  let day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmployees(csvLines) {
  let employees = [];

  // generators
  let workStatusMap = { full: 100, part: 50 };
  let gen = {
    employeeRole: () => 'user',
    workStatus: (e) => workStatusMap[e[HEADERS_PORTAL_CSV.workStatus].slice(0, 4).toLowerCase()] ?? 0,
    hireDate: (e) => convertDate(e[HEADERS_PORTAL_CSV.hireDate]),
    birthday: (e) => convertDate(e[HEADERS_PORTAL_CSV.birthday])
  }
  
  csv: for (let csvEmp of csvLines) {
    // skip employee if in exclude list
    for (let exclude of EXCLUDE)
      for (let [k, v] of Object.entries(exclude))
        if (csvEmp[k.trim()] == v)
          continue csv;
    // basic info
    let id = generateUUID();
    if (STAGE === 'dev') id = 'ragnarok' + id.substring(8); // TODO remove
    let basic = { id };
    let sensitive = { id };
    // add all fields from CSV
    for (let [csvKey, csvValue] of Object.entries(csvEmp)) {
      let portalKey = HEADERS_CSV_PORTAL[csvKey.trim()];
      let target = SENSITIVE_FIELDS.has(portalKey) ? sensitive : basic;
      let value = gen[portalKey]?.(csvEmp) ?? csvValue;
      target[portalKey] = value;
    }
    // ensure all required fields are present
    for (let field of REQUIRED_FIELDS) {
      if (!basic[field] && !sensitive[field]) {
        let target = SENSITIVE_FIELDS.has(field) ? sensitive : basic;
        target[field] = gen[field]?.(csvEmp) ?? undefined;
      }
    }
    // check required fields
    for (let field of REQUIRED_FIELDS)
      if (!basic[field] && !sensitive[field])
        throw new Error(`Missing required field ${field} for employee ${basic.firstName} ${basic.lastName}`);
    // all added, push to list
    employees.push({ basic, sensitive });
  }

  return employees;
}

async function createPortalEmployee(employee) {
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
    await DatabaseModify.TransactItems(items);
    return Promise.resolve(employee);
  } catch (e) {
    throw new Error(`Error creating employee ${basic.firstName} ${basic.lastName}: ${e.message}`);
  }
}
  
function batchify(arr, size) {
  let batches = [];
  while (arr.length) batches.push(arr.splice(0, size));
  return batches;
}

async function batchCreatePortalEmployees(batch) {
  let returnData = { errors: [], successes: [] };

  let promises = [];
  for (let employee of batch) promises.push(createPortalEmployee(employee));
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

async function main() {
  // get employees and batch them
  let csvEmployees = await getCsvData('rag.csv');
  let employeeObjs = createEmployees(csvEmployees);
  let batches = batchify(employeeObjs, 50); // AWS should allow up to 50

  // create batches, error handling by lower functions
  let successes = [];
  let errors = [];
  let results;
  for (let batch of batches) {
    results = await batchCreatePortalEmployees(batch);
    successes.push(...results.successes);
    errors.push(...results.errors);
  }
  console.log(`\nSuccessfully created ${successes.length} employees`);
  // for (let e of successes) console.log(e);
  console.log(`Failed to create ${errors.length} employees`);
  // for (let e of errors) console.log(e);
  console.log(`Used ${batches.length} batches of sizes ${batches.map(b => b.length).join(', ')}`)
}

(async () => {
  await main();
})();
