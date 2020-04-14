require('dotenv').config({
  silent: true
});

const _ = require('lodash');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

// validate the stage (dev, test, prod)
let STAGE;
if (process.argv.length > 2) {
  STAGE = process.argv[2];
  if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
    console.log('stage env must be dev, test, or prod');
    throw new Error();
  }
} else {
  console.log('must include a stage env');
  throw new Error();
}

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const BUCKET = `case-consulting-expense-app-attachments-${STAGE}`;

const ddb = new AWS.DynamoDB.DocumentClient({apiVersion: '2012-08-10'});
const table = `${STAGE}-expenses`;

// get all the entries in dynamo the given table
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
  return getAllEntries(params);
}

// get all the keys in S3
const listAllKeys = (params, out = []) => new Promise((resolve, reject) => {
  s3.listObjectsV2(params).promise()
    .then(({Contents, IsTruncated, NextContinuationToken}) => {
      out.push(...Contents);
      !IsTruncated ? resolve(out)
        : resolve(listAllKeys(Object.assign(params, {ContinuationToken: NextContinuationToken}), out));
    })
    .catch(reject);
});

// create a mapping of employeeId/expense to receipt name
function s3PathMap(keys) {
  console.log('Creating s3 map for employeeId/expense to receipt name');
  let map = [];
  _.forEach(keys, key => {
    let splitIndex = key.Key.indexOf('/', key.Key.indexOf('/') + 1);
    let mapKey = key.Key.substring(0, splitIndex);
    let mapValue = key.Key.substring(splitIndex + 1);
    let find = _.find(map, {'path': mapKey});
    if (find) {
      if (key.LastModified > find.lastModified)
      {
        _.remove(map, current => {
          return current == find;
        });
        map.push({
          path: mapKey,
          name: mapValue,
          lastModified: key.LastModified
        });
      }
    } else {
      map.push({
        path: mapKey,
        name: mapValue,
        lastModified: key.LastModified
      });
    }
  });
  return map;
}

// update the receipt fields of each expense
async function updateReceiptFields() {
  console.log('Getting all attachment keys in s3');
  // get all the keys
  listAllKeys({Bucket: BUCKET})
    .then( async keys => {
      let map = s3PathMap(keys);

      // get all the expenses
      let expenses = await getAllEntriesInDB();
      _.forEach(expenses, expense => {
        // find the S3 key that matches this expense
        let mapping = _.find(map, {'path': `${expense.employeeId}/${expense.id}`});
        // if the there is a match
        let params = {
          TableName: table,
          Key: {
            'id': expense.id
          },
          UpdateExpression: 'set receipt = :r',
          ExpressionAttributeValues: {
            ':r': ' '
          },
          ReturnValues: 'UPDATED_NEW'
        };

        if (mapping) {
          // set up dyanmo update params
          params.ExpressionAttributeValues = {
            ':r': mapping.name
          };
        }

        // update expense
        ddb.update(params, function(err, data) {
          if (err) {
            console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
          } else {
            console.log(`Updated expenseId ${expense.id} with receipt "${data.Attributes.receipt}"`);
          }
        });
      });
    })
    .catch(console.log);
}

updateReceiptFields();
