/*
 * node ./js/Scripts/expenseTypesScripts.js [dev] [action #]
 */

/*
 * action # table
 *
 * 1. Sets all expense type's accessible by value to 'ALL'
 */

// check for stage argument
if (process.argv.length < 3) {
  throw new Error('Must include a stage');
}

// check for action # argument
if (process.argv.length < 4) {
  throw new Error('Must include an action #. See expenseTypesScripts.js for action table');
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

// set expense types table
const TABLE = `${STAGE}-expense-types`;


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
  console.log('Getting all entries in dynamodb expense type table');
  let params = {
    TableName: TABLE,
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
}

/**
 * Sets all expense type's accessible by value to 'ALL'
 */
async function accessibleByAll() {
  let expenseTypes = await getAllEntries();
  _.forEach(expenseTypes, expenseType => {
    let params = {
      TableName: TABLE,
      Key: {
        'id': expenseType.id
      },
      UpdateExpression: 'set accessibleBy = :a',
      ExpressionAttributeValues: {
        ':a': 'ALL'
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update expense type
    ddb.update(params, function(err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Updated expense type id ${expenseType.id}`);
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
      console.log('Setting all expense type\'s accessible by value to \'ALL\'');
      accessibleByAll();
      break;
    // case 2:
    //   break;
    default:
      throw new Error('Action # has no action');
  }
}

main();
