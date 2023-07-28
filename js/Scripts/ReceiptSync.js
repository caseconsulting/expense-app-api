require('dotenv').config({
  silent: true
});

const _ = require('lodash');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

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

const s3 = new S3Client({ apiVersion: '2006-03-01' });
let prodFormat = STAGE == 'prod' ? 'consulting-' : '';
const BUCKET = `case-${prodFormat}expense-app-attachments-${STAGE}`;

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' }), {
  marshallOptions: { convertClassInstanceToMap: true }
});
const table = `${STAGE}-expenses`;

// get all the entries in dynamo the given table
const getAllEntries = (params, out = []) =>
  new Promise((resolve, reject) => {
    ddb
      .send(new ScanCommand(params))
      .then(({ Items, LastEvaluatedKey }) => {
        out.push(...Items);
        !LastEvaluatedKey
          ? resolve(out)
          : resolve(getAllEntries(Object.assign(params, { ExclusiveStartKey: LastEvaluatedKey }), out));
      })
      .catch(reject);
  });

/**
 * get all entries in the db
 *
 * @return - all the entries
 */
function getAllEntriesInDB() {
  console.log('Getting all entries in dynamodb expense table');
  let params = {
    TableName: table
  };
  return getAllEntries(params);
} // getAllEntriesInDB

// get all the keys in S3
const listAllKeys = (params, out = []) =>
  new Promise((resolve, reject) => {
    s3.send(new ListObjectsV2Command(params))
      .then(({ Contents, IsTruncated, NextContinuationToken }) => {
        out.push(...Contents);
        !IsTruncated
          ? resolve(out)
          : resolve(listAllKeys(Object.assign(params, { ContinuationToken: NextContinuationToken }), out));
      })
      .catch(reject);
  });

/**
 * create a mapping of employeeId/expense to receipt name
 *
 * @param keys - the s3 keys
 * @return - the new mapping
 */
function s3PathMap(keys) {
  console.log('Creating s3 map for employeeId/expense to receipt name');
  let map = [];
  _.forEach(keys, (key) => {
    let splitIndex = key.Key.indexOf('/', key.Key.indexOf('/') + 1);
    let mapKey = key.Key.substring(0, splitIndex);
    let mapValue = key.Key.substring(splitIndex + 1);
    let find = _.find(map, { path: mapKey });
    if (find) {
      if (key.LastModified > find.lastModified) {
        _.remove(map, (current) => {
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
} // s3PathMap

/**
 * update the receipt fields of each expense
 */
async function updateReceiptFields() {
  console.log('Getting all attachment keys in s3');
  // get all the keys
  listAllKeys({ Bucket: BUCKET })
    .then(async (keys) => {
      let map = s3PathMap(keys);

      // get all the expenses
      let expenses = await getAllEntriesInDB();
      _.forEach(expenses, (expense) => {
        // find the S3 key that matches this expense
        let mapping = _.find(map, { path: `${expense.employeeId}/${expense.id}` });
        // if the there is a match
        if (mapping) {
          // set up dyanmo update params
          let params = {
            TableName: table,
            Key: {
              id: expense.id
            },
            UpdateExpression: 'set receipt = :r',
            ExpressionAttributeValues: {
              ':r': mapping.name
            },
            ReturnValues: 'UPDATED_NEW'
          };

          // update expense
          ddb
            .send(new UpdateCommand(params))
            .then((data) => console.log(`Updated expenseId ${expense.id} with receipt "${data.Attributes.receipt}"`))
            .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
        } else {
          delete expense.receipt;

          let params = {
            TableName: table,
            Item: expense
          };
          ddb
            .send(new PutCommand(params))
            .then(() => console.log(`Could not find receipt for expenseId ${expense.id}. Removed receipt attribute.`))
            .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
        }
      });
    })
    .catch(console.log);
} // updateReceiptFields

updateReceiptFields();
