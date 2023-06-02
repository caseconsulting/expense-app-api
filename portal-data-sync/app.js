const axios = require('axios');
const AWS = require('aws-sdk');
const DatabaseModify = require('./js/databaseModify');

const paramName = '/BambooHR/APIKey';
const baseURL = 'https://api.bamboohr.com/api/gateway.php/consultwithcase/v1';
/**
 * List of employee fields to synchronize:
 *
 * employee number
 * name
 * address
 * phone number (default is fine to not show)
 * date of birth
 * place of birth
 * phone number
 * gender
 * veteran status
 * ethnicity
 * eeo job category
 * hire date
 * status
 * social media info
 * job role
 *
 *
 */

const fieldNames = [
  { field: 'employeeNumber', bambooHRFieldName: 'employeeNumber', casePortalFieldName: 'employeeNumber' },
  { field: 'firstName', bambooHRFieldName: 'firstName', casePortalFieldName: 'firstName' },
  { field: 'lastName', bambooHRFieldName: 'lastName', casePortalFieldName: 'lastName' },
  { field: 'middleName', bambooHRFieldName: 'middleName', casePortalFieldName: 'middleName' },
  { field: 'address1', bambooHRFieldName: 'address1', casePortalFieldName: 'currentStreet' },
  { field: 'city', bambooHRFieldName: 'city', casePortalFieldName: 'currentCity' },
  { field: 'state', bambooHRFieldName: 'state', casePortalFieldName: 'currentState' },
  { field: 'country', bambooHRFieldName: 'country', casePortalFieldName: 'currentCountry' },
  { field: 'homePhone', bambooHRFieldName: 'homePhone', casePortalFieldName: 'privatePhoneNumbers' },
  { field: 'workPhone', bambooHRFieldName: 'workPhone', casePortalFieldName: 'privatePhoneNumbers' },
  { field: 'mobilePhone', bambooHRFieldName: 'mobilePhone', casePortalFieldName: 'privatePhoneNumbers' },
  { field: 'workPhoneExtenstion', bambooHRFieldName: 'workPhoneExtension', casePortalFieldName: 'privatePhoneNumbers' },
  { field: 'dateOfBirth', bambooHRFieldName: 'dateOfBirth', casePortalFieldName: 'birthday' },
  { field: 'placeOfBirth', bambooHRFieldName: 'placeOfBirth', casePortalFieldName: ['city', 'st', 'country'] }, //
  { field: 'gender', bambooHRFieldName: 'gender', casePortalFieldName: 'eeoGender' },
  // {field: 'veteranStatus'},
  {
    field: 'ethnicity',
    bambooHRFieldName: 'ethnicity',
    casePortalFieldName: ['eeoHispanicOrLatino', 'eeoRaceOrEthnicity']
  },
  { field: 'jobCategory', bambooHRFieldName: 'eeo', casePortalFieldName: 'eeoJobCategory' },
  { field: 'hireDate', bambooHRFieldName: 'hireDate', casePortalFieldName: 'hireDate' },
  { field: 'workStatus', bambooHRFieldName: ['employmentHistoryStatus', 'status'], casePortalFieldName: 'workStatus' },
  { field: 'twitter', bambooHRFieldName: 'twitterFeed', casePortalFieldName: 'twitter' },
  { field: 'linkedIn', bambooHRFieldName: 'linkedIn', casePortalFieldName: 'linkedIn' },
  { field: 'jobRole', bambooHRFieldName: 'jobTitle', casePortalFieldName: 'jobRole' }
];

function getSSM() {
  AWS.config.update({ region: 'us-east-1' });
  const ssm = new AWS.SSM();
  return ssm;
}

async function getKey() {
  const ssm = getSSM();
  const params = {
    Name: paramName,
    WithDecryption: true
  };
  const result = await ssm.getParameter(params).promise();
  return result.Parameter.Value;
}

async function getBambooHREmployeeData() {
  const key = await getKey();
  const options = {
    method: 'POST',
    url: baseURL + '/reports/custom',
    params: { format: 'JSON', onlyCurrent: 'true' },
    auth: {
      username: key,
      password: ''
    },
    data: { fields: ['firstName'] }
  };
  const employeeData = await axios(options);
  return employeeData.data.employees;
}

async function getCasePortalEmployeeData() {
  let employeeDynamo = new DatabaseModify('employees');
  let employeeSensitiveDynamo = new DatabaseModify('employees-sensitive');
  let employees = await employeeDynamo.getAllEntriesInDB();
  let employeesSensitive = await employeeSensitiveDynamo.getAllEntriesInDB();
  console.log(employees);
  console.log(employeesSensitive);
}

async function detectAndSync() {
  await getBambooHREmployeeData();
  await getCasePortalEmployeeData();
  console.log(fieldNames);
}

/**
 * Handler to execute lamba function.
 *
 * @param event - request
 */
async function handler() {
  await detectAndSync();
} // handler

module.exports = { handler };
