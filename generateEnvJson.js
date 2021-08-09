//This script is used to generate a JSON file of the specified variables in the .env file.
//Used for the update and create:claudia commands instead of having to include/update hard-coded values
//(see package.json)
const fs = require('fs');
require('dotenv').config({
  silent: true
});

//include name of key to include in env-varaibles.json
let listOfEnvToInclude = ['NODE_ENV_GOOGLE_MAPS_KEY', 'STAGE', 'VUE_APP_AUTH0_DOMAIN', 'VUE_APP_AUTH0_AUDIENCE'];
let envJson = {};
//iterates thru lists of keys to include
for (let i = 0; i < listOfEnvToInclude.length; i++) {
  let envKey = listOfEnvToInclude[i];
  let envValue = process.env[envKey];
  envJson[envKey] = envValue;
}

var envStringify = JSON.stringify(envJson);
fs.writeFile('env-varaibles.json', envStringify, 'utf8', (err) => {
  if (err) throw err;
});

console.log('generated env-varaibles.json');