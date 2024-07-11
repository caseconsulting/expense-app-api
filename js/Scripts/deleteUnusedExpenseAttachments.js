/* eslint-disable max-len */
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

const BUCKET_DELETE_MAX_LENGTH = 1000;

//imports
const _ = require('lodash');
const readlineSync = require('readline-sync');

// set up AWS Clients
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ apiVersion: '2012-08-BUCKET_DELETE_MAX_LENGTH', region: 'us-east-1' })
);
const { ListObjectsV2Command, S3Client, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client();

/**
 * =================================================
 * |                                               |
 * |            Begin helper functions             |
 * |                                               |
 * =================================================
 */

/**
 * Prints out error and exits process.
 * @param {string} msg - error message
 */
function errorExit(msg) {
  console.error('🛑 ERROR 🛑:');
  console.error(msg);
  process.exit(1);
}

// get all the keys in S3
const listAllKeys = (params, out = { Contents: [], KeyCount: 0 }) =>
  new Promise((resolve, reject) => {
    s3Client
      .send(new ListObjectsV2Command(params))
      .then((data) => {
        out.Contents.push(...data.Contents);
        out.KeyCount += data.KeyCount;
        !data.IsTruncated
          ? resolve(out)
          : resolve(listAllKeys(Object.assign(params, { ContinuationToken: data.NextContinuationToken }), out));
      })
      .catch(reject);
  });

/**
 * Prints out all the folders and how many objects there are in the S3 Bucket.
 *  @returns {object[], number} [content, count] - array of content and number of objects in bucket
 */
async function getBucketObjectDetails() {
  try {
    const s3ClientParams = {
      Bucket: BUCKET,
    };
    const response = await listAllKeys(s3ClientParams);
    return [response.Contents, response.KeyCount];
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
} //getBucketObjectDetails()

/**
 * Prints out the number of expenses with attachments in DynamoDB
 * @returns {[object[], number]} [items, count] - array of items array and number of items in table
 */
async function getTableDetails() {
  try {
    let ddbClientParams = {
      TableName: TABLE,
      FilterExpression: 'attribute_exists(receipt)',
      ProjectionExpression: 'id, employeeId, receipt',
    };
    const dynamoDBCommand = new ScanCommand(ddbClientParams);
    const response = await docClient.send(dynamoDBCommand);
    let items = response.Items;
    let count = response.Count;
    //if table is too big, use pagination https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.Pagination
    let LastEvaluatedKey = response.LastEvaluatedKey;
    while (LastEvaluatedKey) {
      Object.assign(ddbClientParams, { ExclusiveStartKey: LastEvaluatedKey });
      const dynamoDBCommand = new ScanCommand(ddbClientParams);
      const response = await docClient.send(dynamoDBCommand);
      items = items.concat(response.Items);
      count += response.Count;
      LastEvaluatedKey = response.LastEvaluatedKey;
      console.log(`Scanning in pagination, scanned ${count} items...`);
    }
    return [items, count];
  } catch (err) {
    errorExit(err.message);
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
      console.log(item);
      errorExit('Item does not have all required properties. Check scan table command');
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
 * @returns {object[]} unusedAttachments - array of S3 objects
 */
function getUnusedS3Attachments(bucketContents, validAttachmentKeys) {
  //filter through bucketContent and remove items without current expense keys
  const unusedAttachments = bucketContents.filter(function (content) {
    if (!content.Key) {
      console.log(content);
      errorExit('Item does not have all required properties. Check list bucket command');
    }
    const notIncludes = !_.includes(validAttachmentKeys, content.Key);
    return notIncludes;
  });
  return unusedAttachments;
}

/**
 * @param {object[]} unusedS3Attachments - array of S3 objects to delete, must have key property
 * @returns {object[]} deleted - array of deleted S3 objects
 */
async function deleteAllUnusedAttachments(unusedS3Attachments) {
  try {
    let deletedS3Objects = [];
    let length = unusedS3Attachments.length;
    let start = 0;
    //deletion only supports up to 1000 objects to delete https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/DeleteObjectsCommand/
    if (length > BUCKET_DELETE_MAX_LENGTH) {
      console.log(`Deleting in more than ${BUCKET_DELETE_MAX_LENGTH} objects, deletion in batches`);
    }
    while (start < length) {
      const input = {
        Bucket: BUCKET,
        Delete: {
          Objects: unusedS3Attachments.slice(start, start + BUCKET_DELETE_MAX_LENGTH)
        }
      };
      new DeleteObjectsCommand(input);
      // const response = await client.send(command);
      // deletedS3Objects = deletedS3Objects.concat(response.Deleted);
      deletedS3Objects = deletedS3Objects.concat(unusedS3Attachments.slice(start, start + BUCKET_DELETE_MAX_LENGTH));
      start += BUCKET_DELETE_MAX_LENGTH;
    }
    return deletedS3Objects;
  } catch (err) {
    console.log('🛑 ERROR 🛑:');
    console.log(err);
    return [];
  }
}

/**
 * =================================================
 * |                                               |
 * |                     Main                      |
 * |                                               |
 * =================================================
 */

async function main() {
  console.log('\n---------------------------START--------------------------\n');

  //log details about table and buckets
  let [bucketContent, bucketCount] = await getBucketObjectDetails();
  let [tableItems, tableCount] = await getTableDetails();

  let expenseAttachmentKeys = getItemKeys(tableItems); //map items into corresponding S3 keys
  let [validAttachmentKeys, validAttachmentCount] = validateKeys(expenseAttachmentKeys, bucketContent);

  console.log('\n🧭--------------------------STATUS----------------------🧭\n');
  console.log('Counting Attachments Bucket Objects...');
  console.log(`There are currently ${bucketCount} objects in ${BUCKET}\n`);

  console.log('Counting Table Items with Attachments...');
  console.log(`There are currently ${tableCount} expenses in ${TABLE} with attachments\n`);

  console.log(
    `\n🟡-------------------------WARNING----------------------🟡
    There are ${tableCount - validAttachmentCount} expense attachment keys that don't have a corresponding S3 object (dynamo item has receipt property but no bucket object).
    These items will not be factored into deletion of bucket objects.
>>> Please try running ReceiptSync.js script to resolve.\n`
  );

  if (bucketCount > validAttachmentCount) {
    console.log(
      `There are currenly ${bucketCount - validAttachmentCount} more attachments than expenses with valid attachments`
    );
  } else {
    errorExit('There are the same number of expenses as attachments');
  }
  readlineSync.setDefaultOptions({ limit: ['yes', 'no'] });
  let input = readlineSync.question('Would you like to proceed? [yes/no]: ');
  if (input == 'no') {
    console.log('\n---------------------------EXITING------------------------\n');
    process.exit(0);
  }
  console.log('\n-------------------------PROCEEDING-----------------------\n');

  //retrived all unusedS3Attachments from the bucket
  const unusedS3Attachments = getUnusedS3Attachments(bucketContent, validAttachmentKeys);
  console.log(`Found ${unusedS3Attachments.length} attachments with no valid expense`);
  if (unusedS3Attachments.length !== bucketCount - validAttachmentCount) {
    errorExit('Different unused attachments count found');
  }

  //prompt user to delete objects
  input = readlineSync.question(`Would you like to delete all ${unusedS3Attachments.length} S3 objects? [yes/no]`);
  if (input == 'no') {
    console.log('\n---------------------------EXITING------------------------\n');
    process.exit(0);
  }

  console.log('\n❌-------------------------DELETING-----------------------❌\n');
  //delete all unused S3 objects
  const deletedS3Objects = await deleteAllUnusedAttachments(unusedS3Attachments);
  if (deletedS3Objects.length > 0) {
    deletedS3Objects.forEach((deletedObj) => {
      console.log(`Sucessfully Deleted ${deletedObj.Key}`);
    });
    console.log(`Successfully deleted ${deletedS3Objects.length} S3 objects`);
  } else {
    console.log('Deleted 0 Objects...');
  }

  // console.log('\n✅------------------------VALIDATING----------------------✅\n');
  // //validating that the counts of the buckets and tables are the same now
  // [bucketContent, bucketCount] = await getBucketObjectDetails();
  // [tableItems, tableCount] = await getTableDetails();

  // console.log('\n🧭 Status 🧭:');
  // console.log('Counting Attachments Bucket Objects...');
  // console.log(`There are currently ${bucketCount} objects in ${BUCKET}\n`);

  // console.log('Counting Table Items with Attachments...');
  // console.log(`There are currently ${tableCount} expenses in ${TABLE} with attachments\n`);

  // if (bucketCount === tableCount) {
  //   console.log('Success! All unused attachments on ${BUCKET} have been deleted');
  // } else {
  //   console.log("🛑Bucket and Table count don't match. Something went wrong...🛑");
  // }

  console.log('\n---------------------------DONE---------------------------\n');
}

main();
