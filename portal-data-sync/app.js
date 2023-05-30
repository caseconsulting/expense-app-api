const axios = require('axios');
const AWS = require('aws-sdk');

const paramName = '/BambooHR/APIKey';
const baseURL = 'https://api.bamboohr.com/api/gateway.php/consultwithcase/v1';

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
    method: 'GET',
    url: baseURL + '/meta/users',
    auth: {
      username: key,
      password: ''
    }
  };
  const employeeData = await axios(options);
  console.info(employeeData);
}

/**
 * Handler to execute lamba function.
 *
 * @param event - request
 */
async function handler() {
  await getBambooHREmployeeData();
} // handler

module.exports = { handler };
