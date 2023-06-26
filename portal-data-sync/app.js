const axios = require('axios');
const AWS = require('aws-sdk');
const DatabaseModify = require('./js/databaseModify');
const _ = require('lodash');

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

const bambooHRFields = [
  { bambooHRFieldName: 'employeeNumber', casePortalFieldName: 'employeeNumber' }, // equivalent
  { bambooHRFieldName: 'firstName', casePortalFieldName: 'firstName' }, // equivalent
  { bambooHRFieldName: 'lastName', casePortalFieldName: 'lastName' }, // equivalent
  { bambooHRFieldName: 'middleName', casePortalFieldName: 'middleName' }, // equivalent
  { bambooHRFieldName: ['address1', 'address2'], casePortalFieldName: 'currentStreet' }, // not 1-1
  { bambooHRFieldName: 'city', casePortalFieldName: 'currentCity' }, // equivalent
  { bambooHRFieldName: 'state', casePortalFieldName: 'currentState' }, // equivalent
  { bambooHRFieldName: 'country', casePortalFieldName: 'currentCountry' }, // equivalent
  { bambooHRFieldName: 'homePhone', casePortalFieldName: 'privatePhoneNumbers' }, // not 1-1
  { bambooHRFieldName: 'workPhone', casePortalFieldName: 'privatePhoneNumbers' }, // not 1-1
  { bambooHRFieldName: 'mobilePhone', casePortalFieldName: 'privatePhoneNumbers' }, // not 1-1
  { bambooHRFieldName: 'workPhoneExtension', casePortalFieldName: 'privatePhoneNumbers' }, // not 1-1
  { bambooHRFieldName: 'dateOfBirth', casePortalFieldName: 'birthday' }, // equivalent
  { bambooHRFieldName: 'placeOfBirth', casePortalFieldName: ['city', 'st', 'country'] }, // not 1-1
  { bambooHRFieldName: 'gender', casePortalFieldName: 'eeoGender' }, // not 1-1
  // {field: 'veteranStatus'}, // CANNOT FIND BAMBOOHR FIELD NAME
  { bambooHRFieldName: 'ethnicity', casePortalFieldName: 'eeoHispanicOrLatino' }, // not 1-1
  { bambooHRFieldName: 'eeo', casePortalFieldName: 'eeoJobCategory' }, // not 1-1
  { bambooHRFieldName: 'hireDate', casePortalFieldName: 'hireDate' }, // equivalent
  { bambooHRFieldName: 'employmentHistoryStatus', casePortalFieldName: 'workStatus' }, // not 1-1
  { bambooHRFieldName: 'twitterFeed', casePortalFieldName: 'twitter' }, // equivalent
  { bambooHRFieldName: 'linkedIn', casePortalFieldName: 'linkedIn' }, // equivalent
  { bambooHRFieldName: 'jobTitle', casePortalFieldName: 'jobRole' } // equivalent
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
    data: { fields: bambooHRFields.map((f) => f.bambooHRFieldName) }
  };
  const employeeData = await axios(options);
  return employeeData.data.employees;
}

async function getCasePortalEmployeeData() {
  let employeeDynamo = new DatabaseModify('employees');
  let employeeSensitiveDynamo = new DatabaseModify('employees-sensitive');
  let employees = await employeeDynamo.getAllEntriesInDB();
  let employeesSensitive = await employeeSensitiveDynamo.getAllEntriesInDB();

  // merges employee non-sensitive data with sensitive data into one object
  let employeeData = employees.map((e) => {
    let employeeSensitiveData = employeesSensitive.find((es) => es.id == e.id);
    return { ...employeeSensitiveData, ...e };
  });
  return employeeData;
}

function isEmpty(value) {
  return _.isNil(value) || (_.isString(value) && value.trim().length === 0);
}

function mismatchBambooHR(casePortalData, bambooHRData, bambooHRFieldName, casePortalFieldName) {
  // Checks if both field values are empty
  if (Array.isArray(bambooHRFieldName)) {
    if (!bambooHRFieldName.some((f) => isEmpty(f)) && isEmpty(casePortalData[casePortalFieldName])) {
      console.log(1);
      return false;
    }
  } else if (Array.isArray(casePortalFieldName)) {
    if (!casePortalFieldName.some((f) => isEmpty(f)) && isEmpty(casePortalData[casePortalFieldName])) {
      console.log(2);
      return false;
    }
  } else {
    if (isEmpty(bambooHRData[bambooHRFieldName]) && isEmpty(casePortalData[casePortalFieldName])) {
      console.log(3);
      return false;
    }
  }

  if (casePortalFieldName == 'currentStreet') {
    let bambooHRAddress;
    if (bambooHRData.address1 && bambooHRData.address2) {
      bambooHRAddress = bambooHRData.address1 + ', ' + bambooHRData.address2;
    } else if (bambooHRData.address1) {
      bambooHRAddress = bambooHRData.address1;
    } else {
      bambooHRAddress = bambooHRData.address2;
    }
    return bambooHRAddress != casePortalData.currentStreet;
  } else if (bambooHRFieldName == 'homePhone') {
    let caseHomePhone =
      casePortalData.privatePhoneNumbers
        .filter((p) => p.type == 'Home')
        .find((p) => p.number.replace(/-|\s/g, '') == bambooHRData.homePhone.replace(/-|\s/g, '')) ||
      casePortalData.publicPhoneNumbers
        .filter((p) => p.type == 'Home')
        .find((p) => p.number.replace(/-|\s/g, '') == bambooHRData.homePhone.replace(/-|\s/g, ''));
    return !caseHomePhone;
  } else if (bambooHRFieldName == 'workPhone') {
    let caseWorkPhone =
      casePortalData.privatePhoneNumbers
        .filter((p) => p.type == 'Work')
        .find((p) => p.number.replace(/-|\s/g, '') == bambooHRData.workPhone.replace(/-|\s/g, '')) ||
      casePortalData.publicPhoneNumbers
        .filter((p) => p.type == 'Work')
        .find((p) => p.number.replace(/-|\s/g, '') == bambooHRData.workPhone.replace(/-|\s/g, ''));
    return !caseWorkPhone;
  } else if (bambooHRFieldName == 'mobilePhone') {
    let caseMobilePhone =
      casePortalData.privatePhoneNumbers
        .filter((p) => p.type == 'Cell')
        .find((p) => p.number.replace(/-|\s/g, '') == bambooHRData.mobilePhone.replace(/-|\s/g, '')) ||
      casePortalData.publicPhoneNumbers
        .filter((p) => p.type == 'Cell')
        .find((p) => p.number.replace(/-|\s/g, '') == bambooHRData.mobilePhone.replace(/-|\s/g, ''));
    return !caseMobilePhone;
  } else if (bambooHRFieldName == 'workPhoneExtension') {
    let bambooHRWorkPhone = bambooHRData.workPhone;
    if (isEmpty(bambooHRWorkPhone)) {
      return false;
    }
    let caseWorkPhone =
      casePortalData.privatePhoneNumbers
        .filter((p) => p.type == 'Work')
        .find((p) => p.number.replace(/-|\s/g, '') == bambooHRWorkPhone.replace(/-|\s/g, '')) ||
      casePortalData.publicPhoneNumbers
        .filter((p) => p.type == 'Work')
        .find((p) => p.number.replace(/-|\s/g, '') == bambooHRWorkPhone.replace(/-|\s/g, ''));
    if (!caseWorkPhone) {
      return false;
    }
    return caseWorkPhone.ext.replace(/\D/g, '') != bambooHRData.workPhoneExtension.replace(/\D/g, '');
  } else if (bambooHRFieldName == 'placeOfBirth') {
    // check if city and country mismatches
    return (
      !bambooHRData[bambooHRFieldName].includes(casePortalData['city']) ||
      !bambooHRData[bambooHRFieldName].includes(casePortalData['country'])
    );
  } else if (bambooHRFieldName == 'gender') {
    return bambooHRData.gender != casePortalData.eeoGender.text;
  } else if (bambooHRFieldName == 'ethnicity') {
    if (bambooHRData.ethnicity == 'Hispanic or Latino' && casePortalData.eeoHispanicOrLatino.value) {
      return false;
    }
    return bambooHRData.ethnicity != casePortalData.eeoRaceOrEthnicity.text;
  } else if (bambooHRFieldName == 'eeo') {
    return bambooHRData.eeo != casePortalData.eeoJobCategory.text;
  } else if (casePortalFieldName == 'workStatus') {
    // console.log('workStatus')
    let caseWorkStatus =
      casePortalData.workStatus == 100 ? 'Full-Time' : casePortalData.workStatus == 0 ? 'Inactive' : 'Part-Time';
    return caseWorkStatus != bambooHRData.employmentHistoryStatus;
  } else {
    return casePortalData[casePortalFieldName] != bambooHRData[bambooHRFieldName];
  }
}

async function detectAndSyncBamboooHR() {
  const employeeBambooHRData = await getBambooHREmployeeData();
  const employeeCasePortalData = await getCasePortalEmployeeData();

  let sampleBamboo = employeeBambooHRData.find((b) => b['employeeNumber'] == 10063);
  let sampleCase = employeeCasePortalData.find((c) => c['employeeNumber'] == 10063);

  bambooHRFields.forEach((f) => {
    try {
      if (isEmpty(sampleCase[f.casePortalFieldName]) && !isEmpty(sampleBamboo[f.bambooHRFieldName])) {
        // CASE portal field is empty and BambooHR field is not empty
        console.log(
          `EMPTY FIELD CASE ${f.casePortalFieldName}: ${JSON.stringify(
            sampleCase[f.casePortalFieldName]
          )} | ${JSON.stringify(sampleBamboo[f.bambooHRFieldName])}`
        );
      } else if (!isEmpty(sampleCase[f.casePortalFieldName]) && isEmpty(sampleBamboo[f.bambooHRFieldName])) {
        // CASE portal field is not empty and BambooHR field is empty
        console.log(
          `EMPTY FIELD BAMBOOHR ${f.bambooHRFieldName}: ${JSON.stringify(
            sampleCase[f.casePortalFieldName]
          )} | ${JSON.stringify(sampleBamboo[f.bambooHRFieldName])}`
        );
      } else if (mismatchBambooHR(sampleCase, sampleBamboo, f.bambooHRFieldName, f.casePortalFieldName)) {
        // Mismatch of data
        console.log(
          `MISMATCH! ${f.bambooHRFieldName}: ${JSON.stringify(sampleCase[f.casePortalFieldName])} | ${JSON.stringify(
            sampleBamboo[f.bambooHRFieldName]
          )}`
        );
      } else {
        // Data matches
        console.log(
          `MATCH! ${f.bambooHRFieldName}: ${JSON.stringify(sampleCase[f.casePortalFieldName])} | ${JSON.stringify(
            sampleBamboo[f.bambooHRFieldName]
          )}`
        );
      }
    } catch (err) {
      console.log(err);
    }
  });
}

// async function updateBambooHRField(employeeNumber, field, value) {
//   if (field == 'mobilePhone') {
//   } else if (field == 'workPhone') {
//   } else if (field == 'homePhone') {
//   } else if (field == 'ethnicity') {
//   }
// }

// async function updateCASEPortalField(employeeNumber, field, value) {
//   if (field == 'mobilePhone') {
//   } else if (field == 'workPhone') {
//   } else if (field == 'homePhone') {
//   } else if (field == 'eeoHispanicOrLatino') {
//     // update eeoRaceOrEthnicity
//   }
// }

/**
 * Handler to execute lamba function.
 *
 * @param event - request
 */
async function handler() {
  await detectAndSyncBamboooHR();
} // handler

module.exports = { handler };
