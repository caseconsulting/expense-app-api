/*
 * node ./js/Scripts/employeeScripts.js [dev] [action #]
 */

/*
 * action # table
 *
 * 1. Sets all employee's work status to 100 (Full Time)
 */

// check for stage argument
if (process.argv.length < 3) {
  throw new Error('Must include a stage');
}

// check for action # argument
if (process.argv.length < 4) {
  throw new Error('Must include an action #. See employeeScripts.js for action table');
}

// set and validate stage
const STAGE = process.argv[2];
if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
  throw new Error('Invalid stage. Must be dev, test, or prod');
}

// set and validate action #
let actionArg = process.argv[3];
try {
  actionArg = parseInt(process.argv[3]);
} catch (err) {
  throw new Error('Action # is an invalid number');
}
const ACTION = actionArg;

// set employee table
const TABLE = `${STAGE}-employees`;


const _ = require('lodash');

const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});

// helper to get all entries in dynamodb table
const getAllEntriesHelper = (params, out = []) => new Promise((resolve, reject) => {
  ddb.scan(params).promise()
    .then(({Items, LastEvaluatedKey}) => {
      out.push(...Items);
      !LastEvaluatedKey ? resolve(out)
        : resolve(getAllEntriesHelper(Object.assign(params, {ExclusiveStartKey: LastEvaluatedKey}), out));
    })
    .catch(reject);
});

// get all entries in dynamodb table
function getAllEntries() {
  console.log('Getting all entries in dynamodb employees table');
  let params = {
    TableName: TABLE,
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
}

/**
 * Sets all employee's work status to 100 (Full Time)
 */
async function workStatus100() {
  let employees = await getAllEntries();
  _.forEach(employees, employee => {
    let params = {
      TableName: TABLE,
      Key: {
        'id': employee.id
      },
      UpdateExpression: 'set workStatus = :ws',
      ExpressionAttributeValues: {
        ':ws': 100
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update employee
    ddb.update(params, function(err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Updated employee id ${employee.id}`);
      }
    });
  });
}

/**
 * main - action selector
 */
async function main() {
  switch (ACTION) {
    case 1:
      console.log('Setting all employee\'s work status to 100 (Full Time)');
      workStatus100();
      break;
    // case 2:
    //   break;
    default:
      throw new Error('Action # has no action');
  }
}

main();
