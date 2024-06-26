//This script is used to generate a JSON file of the specified variables in the .env file.
//Used for the update and create:claudia commands instead of having to include/update hard-coded values
//(see package.json)
const fs = require('fs');
require('dotenv').config({
  silent: true
});

//include name of key to include in env-variables.json
let listOfEnvToInclude = [
  'APP_COMPANY_EMAIL_ADDRESS',
  'APP_COMPANY_PAYROLL_ADDRESS',
  'AWS_SDK_LOAD_CONFIG',
  'NODE_ENV_GOOGLE_MAPS_KEY',
  'STAGE',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_AUDIENCE'
];
let envJson = {};
//iterates thru lists of keys to include
for (let i = 0; i < listOfEnvToInclude.length; i++) {
  let envKey = listOfEnvToInclude[i];
  let envValue = process.env[envKey];
  envJson[envKey] = envValue;
}

var envStringify = JSON.stringify(envJson);
fs.writeFile('env-variables.json', envStringify, 'utf8', (err) => {
  if (err) throw err;
});

console.log('generated env-variables.json');
