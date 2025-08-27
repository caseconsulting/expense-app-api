require('dotenv').config('STAGE=dev'); //configures env variables

const fs = require('fs');

console.log('\n---------------------------START--------------------------\n');
console.log('⌛️ INITIALIZING ..\n');

//creates function called path to that directs to file location
const pathTo = (file) => require('./' + file);

/**
 * function to print final response
 *
 * @param result - the response to print
 */
function done(result) {
  console.log('\n****************************\n');
  console.log('\n 🏁 Response 🏁 :');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n---------------------------DONE---------------------------\n');
} // done

//list of lambda parent folder names
const lambdas = {
  chron: { function: pathTo('chronos/chronos.js'), event: null },
  thanos: { function: pathTo('thanos/thanos.js'), event: null }
};

//reads arguments
let i = 0;
process.argv[i++]; // nodeName
process.argv[i++]; // cliName
const lambdaName = process.argv[i++];

//checks to see if there is a valid parameter
if (!lambdaName || !Object.keys(lambdas).includes(lambdaName)) {
  let output = lambdaName
    ? `${lambdaName} is not a valid parameter option.`
    : 'This function takes at least 1 parameter.';
  console.log(output + ' Here is a list of Valid Parameter Options:');
  console.log(Object.keys(lambdas));
  console.log();
} else {
  //retrieve function path and event file name from list of lambdas based on user key input
  const lambdaFile = lambdas[lambdaName].function;
  const eventFile = lambdas[lambdaName].event;

  //parses event file into JSON if there is an event attached to test
  const event = eventFile ? JSON.parse(fs.readFileSync(eventFile, 'utf-8')) : null;

  //sets context for function call
  const context = {};

  console.log(`🚗 INVOKING: ${lambdaName}`);
  console.log('\n****************************\n');
  console.log('\t🖨  OUTPUTS 🖨 :\n');

  //promise chain for testing code and printing out status
  lambdaFile.handler(event, context).then(done);
}
