/*
 * node ./js/Scripts.js dev add 10
 * node ./js/Scripts.js dev get
 * node ./js/Scripts.js dev delete
 */

const uuid = require('uuid/v4');
const _ = require('lodash');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

// validate the stage (dev, test, prod)
let STAGE;
let COMMAND;
let VALUE;
if (process.argv.length > 3) {
  STAGE = process.argv[2];
  if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
    throw new Error('stage env must be dev, test, or prod');
  }
  COMMAND = process.argv[3];
  if (COMMAND == 'add') {
    if (process.argv.length <= 4) {
      throw new Error('must include how many items to add');
    }
    VALUE = parseInt(process.argv[4]);
  } else if (COMMAND != 'delete' && COMMAND != 'get') {
    throw new Error('invalid command. use [add #], [delete], or [get]');
  }
} else {
  throw new Error('must include a stage env and command');
}

const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const table = `${STAGE}-expenses`;

// get all the entries in dynamo expense table
const getAllEntries = (params, out = []) => new Promise((resolve, reject) => {
  ddb.scan(params).promise()
    .then(({Items, LastEvaluatedKey}) => {
      out.push(...Items);
      !LastEvaluatedKey ? resolve(out)
        : resolve(getAllEntries(Object.assign(params, {ExclusiveStartKey: LastEvaluatedKey}), out));
    })
    .catch(reject);
});

// get all expenses in the expense table
function getAllEntriesInDB() {
  console.log('Getting all entries in dynamodb expense table');
  let params = {
    TableName: table,
  };
  let entries = getAllEntries(params);
  console.log('Finished getting all entries');
  return entries;
}

// Used for testing dynamo limitations - populates data table with expenses
function addItems(numberOfItems) {
  console.log(`Add ${numberOfItems} items`);
  for (let i = 0; i < numberOfItems; i++) {
    let params = {
      TableName: table,
      Item: {
        id: uuid(),
        categories: 'test category',
        cost: 1,
        createdAt: '2020-03-23',
        description: 'test description',
        expenseTypeId: '891ed076-65fd-4810-8988-e30e770c7c95', // technology
        note: 'test note',
        purchaseDate: '2020-03-23',
        receipt: 'testReceipt.jpeg',
        reimbursedDate: '2020-03-23',
        url: 'https://testUrl.com',
        userId: 'c722279e-2e11-43bb-a1d2-4999e8a98a6c' // info account
      }
    };
    ddb.put(params, function(err) {
      if (err) {
        console.error('Unable to add item. Error JSON:', JSON.stringify(err, null, 2));
      }
    });
  }
  console.log('Finished adding items');
}

// Used for testing dynamo limitations - deletes all expenses
async function deleteAllExpenses() {
  console.log('Deleting all expenses');
  let expenses = await getAllEntriesInDB();
  _.forEach(expenses, expense => {
    let params = {
      TableName: table,
      Key: {
        'id': expense.id
      }
    };

    ddb.delete(params, function(err) {
      if (err) {
        console.error('Unable to delete item. Error JSON:', JSON.stringify(err, null, 2));
      }
    });
  });
  console.log('Completed deleting all expenses');
}

async function main() {
  if (COMMAND == 'add') {
    addItems(VALUE);
  } else if (COMMAND == 'get') {
    console.log(await getAllEntriesInDB());
  } else if (COMMAND == 'delete') {
    deleteAllExpenses();
  } else {
    throw new Error('invalid command');
  }
}

main();
