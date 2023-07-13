const AWS = require('aws-sdk');
const FormData = require('form-data');
const fs = require('fs');
const ExpenseType = require('expenseType'); // from shared layer
const DatabaseModify = require('databaseModify'); // from shared layer
const ExpenseRoutes = require('expenseRoutes'); // from shared layer
const dateUtils = require('dateUtils'); // from shared layer
const { generateUUID } = require('utils'); // from shared layer

const STAGE = process.env.STAGE;
let prodFormat = STAGE == 'prod' ? 'consulting-' : '';
const BUCKET = `case-${prodFormat}expense-app-attachments-${STAGE}`;
const ISOFORMAT = 'YYYY-MM-DD';

/**
 * Change the mifi status
 *
 * @param event - the event of the trigger
 * @param context - the context of the trigger
 */
async function checkMifiChange(event, context) {
  //intake dynamodb stream data
  console.info();

  let records = event.Records;
  let dynamodb = records[0];
  // let file = new File();

  console.info('Changes to the dynamo:');
  console.info(dynamodb);
  const expenseRoutes = new ExpenseRoutes();
  //const attachmentRoutes = new AttachmentRoutes();
  let sns = new AWS.SNS();
  //let expenseModify = new DatabaseModify('expenses');
  let expenseTypeModify = new DatabaseModify('expense-types');
  let expenseTypes = await expenseTypeModify.getAllEntriesInDB();

  let technologyExpenseType, expense;

  let now = dateUtils.getTodaysDate(ISOFORMAT);

  let fileName = 'MifiStatusChange.png';
  let receiptFile = fs.readFileSync('./resources/' + fileName);

  let imageForm = new FormData();
  imageForm.append('receipt', receiptFile);

  //look for technology expensetypeId
  expenseTypes.forEach((expenseType) => {
    expenseType = new ExpenseType(expenseType);
    if (expenseType.budgetName === 'Technology') {
      technologyExpenseType = new ExpenseType(expenseType);
    }
  });

  let params;
  let eventText;

  var docClient = new AWS.DynamoDB.DocumentClient();

  //Create a Translator object, which comes from the DocumentClient
  var dynamodbTranslator = docClient.getTranslator();

  //It needs a SDK 'shape'. The individual Items in the Stream record
  //are themselves the same Item shape as we see in a getItem response
  var ItemShape = docClient.service.api.operations.getItem.output.members.Item;

  await asyncForEach(records, async (record) => {
    record.dynamodb.OldImage = dynamodbTranslator.translateOutput(record.dynamodb.OldImage, ItemShape);
    record.dynamodb.NewImage = dynamodbTranslator.translateOutput(record.dynamodb.NewImage, ItemShape);

    if (record.eventName === 'INSERT') {
      //if it's a new employee entry
      console.info('New Employee has been created');
      if (record.dynamodb.NewImage.mifiStatus === false && record.dynamodb.NewImage.mifiStatus != null) {
        console.info('Employee has indicated that they do not want the mifi benefit');
        //create text for the expense/mifi
        let snsInfo = getSNSParams(record.dynamodb.NewImage, 'has been created without a mifi benefit.');
        eventText = snsInfo.eventText;
        params = snsInfo.params;

        let newUuid = generateUUID();

        expense = {
          id: newUuid,
          employeeId: record.dynamodb.NewImage.id,
          createdAt: now,
          expenseTypeId: technologyExpenseType.id,
          cost: -150,
          description: eventText,
          purchaseDate: now,
          showOnFeed: false,
          receipt: fileName,
          canDelete: false
        };

        //publish sns
        try {
          let Key = record.dynamodb.NewImage.id + '/' + newUuid + '/' + fileName;

          let preparedExpense = await expenseRoutes._create(expense);
          let validatedExpense = await expenseRoutes._validateInputs(preparedExpense);
          await expenseRoutes.databaseModify.addToDB(validatedExpense); // add object to database
          await uploadAttachmentToS3(receiptFile, Key);

          await sns.publish(params).promise();
          console.info(`Message ${eventText} has been sent to topic with ARN ${process.env.MifiTopicArn}`);
        } catch (err) {
          console.info(err);
          console.info(err.stack);
          return;
        }
      } else {
        //created with true means only do mifi sns call don't bother with other stuff
        console.info('Employee has indicated that they do want the mifi benefit');
        let snsInfo = getSNSParams(record.dynamodb.NewImage, 'has been created with a mifi benefit.');
        eventText = snsInfo.eventText;
        params = snsInfo.params;
        try {
          await sns.publish(params).promise();
          console.info(`Message ${eventText} has been sent to topic with ARN ${process.env.MifiTopicArn}`);
        } catch (err) {
          console.info(err);
          console.info(err.stack);
          return;
        }
      }
    } else if (record.eventName === 'MODIFY') {
      //if it is an entry being modified
      console.info('Employee has been modified');

      if (record.dynamodb.OldImage.mifiStatus === undefined || record.dynamodb.OldImage.mifiStatus) {
        //if the previous mifiStatus was empty or true
        if (!record.dynamodb.NewImage.mifiStatus && record.dynamodb.NewImage.mifiStatus != null) {
          //if the new status is false
          //create negative expense and post it
          //post message to sns topic

          console.info('MifiStatus has been swapped from true to false');

          let snsInfo = getSNSParams(
            record.dynamodb.NewImage,
            'has indicated that they no longer want the mifi benefit.'
          );
          eventText = snsInfo.eventText;
          params = snsInfo.params;

          let newUuid = generateUUID();

          expense = {
            id: newUuid,
            employeeId: record.dynamodb.NewImage.id,
            createdAt: now,
            expenseTypeId: technologyExpenseType.id,
            cost: -150,
            description: eventText,
            purchaseDate: now,
            showOnFeed: false,
            receipt: fileName,
            canDelete: false
          };

          try {
            let Key = record.dynamodb.NewImage.id + '/' + newUuid + '/' + fileName;

            let preparedExpense = await expenseRoutes._create(expense);
            let validatedExpense = await expenseRoutes._validateInputs(preparedExpense);
            await expenseRoutes.databaseModify.addToDB(validatedExpense); // add object to database
            await uploadAttachmentToS3(receiptFile, Key);

            await sns.publish(params).promise();
            console.info(`Message ${eventText} has been sent to topic with ARN ${process.env.MifiTopicArn}`);
          } catch (err) {
            console.info(err);
            console.info(err.stack);
            return;
          }
        }
      } else if (!record.dynamodb.OldImage.mifiStatus) {
        //if it was previously false
        if (record.dynamodb.NewImage.mifiStatus) {
          //and is not true
          console.info('MifiStatus has been swapped from false to true');

          let newUuid = generateUUID();

          let snsInfo = getSNSParams(record.dynamodb.NewImage, 'has indicated that they would like the mifi benefit');
          eventText = snsInfo.eventText;
          params = snsInfo.params;

          expense = {
            id: newUuid,
            employeeId: record.dynamodb.NewImage.id,
            createdAt: now,
            expenseTypeId: technologyExpenseType.id,
            cost: 150,
            description: eventText,
            purchaseDate: now,
            showOnFeed: false,
            receipt: fileName,
            canDelete: false
          };

          let Key = record.dynamodb.NewImage.id + '/' + newUuid + '/' + fileName;

          try {
            let preparedExpense = await expenseRoutes._create(expense);
            let validatedExpense = await expenseRoutes._validateInputs(preparedExpense);
            await expenseRoutes.databaseModify.addToDB(validatedExpense); // add object to database
            await uploadAttachmentToS3(receiptFile, Key);

            await sns.publish(params).promise();
            console.info(`Message ${eventText} has been sent to topic with ARN ${process.env.MifiTopicArn}`);
          } catch (err) {
            console.info(err);
            console.info(err.stack);
            return;
          }
        }
      }
    }
  });
  context.done();
} // checkMifiChange

/**
 * upload tiny attachment to s3 for later
 * @param file - file to upload
 * @param key - where to upload it to
 */
async function uploadAttachmentToS3(file, key) {
  console.info('mifistatus uploadAttachmentToS3: attempting to upload file to key ' + key + ' of bucket: ' + BUCKET);
  let s3 = new AWS.S3();
  let params = {
    Bucket: BUCKET,
    Key: key,
    Body: file
  };

  s3.putObject(params, function (err, data) {
    if (err) console.info(err, err.stack);
    // an error occurred
    else console.info(data); // successful response
  });
} //uploadAttachmentToS3

/**
 * Async function to loop an array.
 *
 * @param array - Array of elements to iterate over
 * @param callback - callback function
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
} // asyncForEach

/**
 * generate the params for sns
 *
 * @param newImage - the new dynamodb entry
 * @param messageEnd = the ending to the message after the employee info
 * @return - the params for sns
 */
function getSNSParams(newImage, messageEnd) {
  let eventText = newImage.firstName + ' ' + newImage.lastName + ' ' + messageEnd;

  return {
    eventText: eventText,
    params: {
      Message: eventText,
      Subject: 'Mifi status change',
      TopicArn: process.env.MifiTopicArn
    }
  };
} //getSNSParams

/**
 * Handler to execute lamba function.
 *
 * @param event - request
 * @param context - context
 */
async function handler(event, context) {
  console.info(JSON.stringify(event)); // eslint-disable-line no-console

  await checkMifiChange(event, context);
} // handler

module.exports = { handler };
