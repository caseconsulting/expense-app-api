const axios = require('axios');
const ssm = require('aws-client');

const paramName = '/BambooHR/APIKey';
const baseURL = 'https://api.bamboohr.com/api/gateway.php/consultwithcase/v1';

async function getKey() {
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
  console.log(employeeData);
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
