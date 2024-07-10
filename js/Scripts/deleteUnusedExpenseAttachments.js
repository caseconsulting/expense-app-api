/**
 * node ./js/Scripts/deleteUnusedExpenseAttachments.js dev
 * node ./js/Scripts/deleteUnusedExpenseAttachments.js test
 * node ./js/Scripts/deleteUnusedExpenseAttachments.js prod (must set aws credentials for prod as default)
 */

// handles unhandled rejection errors
process.on('unhandledRejection', (error) => {
  console.error('unhandledRejection', error);
});

// check for stage argument
if (process.argv.length < 3) {
  throw new Error('Must include a stage');
}

// set and validate stage
const STAGE = process.argv[2];
if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
  throw new Error('Invalid stage. Must be dev, test, or prod');
}

// set expenses table
const TABLE = `${STAGE}-expenses`;

// sets expense attachments s3 bucket
let prodFormat = STAGE == 'prod' ? 'consulting-' : '';
const BUCKET = `case-${prodFormat}expense-app-attachments-${STAGE}`;

//imports
const _ = require('lodash');
const readlineSync = require('readline-sync');

// set up AWS Clients
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' }));
const { ListObjectsV2Command, S3Client } = require('@aws-sdk/client-s3');
const s3Client = new S3Client();

/**
 * Prints out all the folders and how many objects there are in the S3 Bucket.
 *  @returns {object[], number} [content, count] - array of content and number of objects in bucket
 */
async function getBucketObjectDetails() {
  try {
    const s3ClientParams = {
      Bucket: BUCKET
    };
    const s3ClientCommand = new ListObjectsV2Command(s3ClientParams);
    const response = await s3Client.send(s3ClientCommand);
    return [response.Contents, response.KeyCount];
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
} //getBucketObjectDetails()

/**
 * Prints out the number of expenses with attachments in DynamoDB
 * @returns {[object[], number]} [items, count] - array of items array and number of items in table
 */
async function getTableDetails() {
  try {
    const ddbClientParams = {
      TableName: TABLE,
      FilterExpression: 'attribute_exists(receipt)',
      ProjectionExpression: 'id, employeeId, receipt'
    };
    const dynamoDBCommand = new ScanCommand(ddbClientParams);
    const response = await docClient.send(dynamoDBCommand);
    return [response.Items, response.Count];
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
}

/**
 * Map table items to their corresponding key in S3
 * @param {object[]} tableItems - array of table items with id, employeeId, and receipt properties
 * @return {string[]} tableItemKeys - array of keys from table items formatted in S3 keys
 */
function getItemKeys(tableItems) {
  // all keys used in expenses table formatted as S3 keys
  const tableItemKeys = _.map(tableItems, function (item) {
    if (!item.employeeId || !item.id || !item.receipt) {
      console.log('🛑 ERROR 🛑:');
      console.log('Item does not have all required properties. Check scan table command');
      console.log(item);
      process.exit(1);
    }
    return item.employeeId + '/' + item.id + '/' + item.receipt;
  });
  return tableItemKeys;
}

/**
 * Validate keys such that an S3 object exists
 * @returns {[string[], number]} - [validItemKeys, validKeyCount] array of valid S3 keys and number of valid keys
 */
function validateKeys(itemKeys, bucketContents) {
  const validItemKeys = [];
  itemKeys.forEach((key) => {
    let includesKey = false;
    bucketContents.forEach((content) => {
      if (content.Key === key) {
        includesKey = true;
      }
    });
    if (!includesKey) {
      console.log(`Warning: Bucket ${BUCKET} doesn't include ${key}`);
    } else {
      validItemKeys.push(key);
    }
  });
  return [validItemKeys, validItemKeys.length];
}

/**
 * Find all attachments that are not linked to an expense
 * @param {object[]} bucketContents - array of bucket content with Key property.
 */
async function getUnusedAttachments(bucketContents, validAttachmentKeys) {
  //filter through bucketContent and remove items without current expense keys
  const unusedAttachments = bucketContents.filter(function (content) {
    if (!content.Key) {
      console.log('🛑 ERROR 🛑:');
      console.log('Item does not have all required properties. Check list bucket command');
      console.log(content);
      process.exit(1);
    }
    return !_.includes(validAttachmentKeys, content.Key);
  });
  console.log(unusedAttachments.length);
}

async function main() {
  console.log('\n---------------------------START--------------------------\n');

  const [bucketContent, bucketCount] = await getBucketObjectDetails();
  const [tableItems, tableCount] = await getTableDetails();

  const expenseAttachmentKeys = getItemKeys(tableItems); //map items into corresponding S3 keys
  const [validAttachmentKeys, validAttachmentCount] = validateKeys(expenseAttachmentKeys, bucketContent);

  
  console.log('\n🧭 Status 🧭:');
  console.log('Counting Attachments Bucket Objects...');
  console.log(`There are currently ${bucketCount} objects in ${BUCKET}\n`);
  
  console.log('Counting Table Items with Attachments...');
  console.log(`There are currently ${tableCount} expenses in ${TABLE} with attachments\n`);
  
  console.log(
    `🟡 Warning 🟡 : There are ${
      tableCount - validAttachmentCount
    } keys that don't have a corresponding S3 object. \n These items will not be factored into deletion.\n`
  );

  if (bucketCount > validAttachmentCount) {
    console.log(
      `There are currenly ${bucketCount - validAttachmentCount} more attachments than expenses with valid attachments`
    );
  } else {
    console.log('🛑 ERROR 🛑:');
    console.log('There are the same number of expenses as attachments');
    process.exit(1);
  }
  readlineSync.setDefaultOptions({ limit: ['yes', 'no'] });
  let input = readlineSync.question('Would you like to proceed? [yes/no]: ');
  if (input == 'no') {
    console.log('\n---------------------------EXITING------------------------\n');
    process.exit(0);
  }

  console.log('\n-------------------------PROCEEDING-----------------------\n');

  await getUnusedAttachments(bucketContent, validAttachmentKeys);
}

main();
