const AWS = require('aws-sdk');
const Expense = require('./models/expense');
const ExpenseType = require('./models/expenseType');
const DatabaseModify = require('./js/databaseModify');
const { v4: uuid } = require('uuid');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');

/**
 * Change the mifi status
 */
async function checkMifiChange(event, context) {
  //intake dynamodb stream data
  console.info('EVENT >>>>>');
  console.info(event);
  console.info('CONTEXT >>>>>');
  console.info(context);
  let records = event.Records;
  let dynamodb = records[0];
  console.info('dynamodb >>>>>>');
  console.info(dynamodb);
  let sns = new AWS.SNS();
  let expenseModify = new DatabaseModify('expenses');
  let expenseTypeModify = new DatabaseModify('expense-types');
  let technologyId;
  let expenseTypes = await expenseTypeModify.getAllEntriesInDB();
  expenseTypes.forEach(expenseType => {
    expenseType =  new ExpenseType(expenseType);
    if (expenseType.budgetName === 'Technology') {
      technologyId = expenseType.id;
    }
  });
  let params;
  let eventText;
  await asyncForEach(records, async record => {
    console.info('in for each');
    if (record.eventName === 'INSERT') {
      //if it's a new entry 
      console.info('new entry if statement');
      if (record.dynamodb.NewImage.mifiStatus === 'false') {
        console.info('new entry with false trigger publish');
        //create text for the expense/mifi
        eventText = 
          record.dynamodb.NewImage.firstName +
          ' ' + 
          record.dynamodb.NewImage.lastName +
          ' (employee Id: ' + record.dynamodb.NewImage.id +
          ') has been created without a mifi benefit.';
        //create expense
        let now = moment();
        let expense = {
          id: uuid(),
          employeeId: record.dynamodb.NewImage.id,
          createdAt: now,
          expenseTypeId: technologyId,
          cost: -150,
          description: eventText,
          purchaseDate: now,
          showOnFeed: false
        };
        //add expense
        expenseModify.addToDB(new Expense(expense));
        //create params for publish
        params = {
          Message: eventText, 
          Subject: 'Mifi status change',
          TopicArn: 'arn:aws:sns:us-east-1:453274522834:MifiStatus' 
        };
        //publish sns
        await sns.publish(params, function(err, data) {
          console.info('in publish callback');
          console.info(err);
          console.info(data);
          if (err) {
            console.info(err.stack);
            return;
          }
          console.info('push sent');
          console.info(data);
  
          // Notify Lambda that we are finished
        });
      } else {
        //created with true means only do mifi sns call don't bother with other stuff
        console.log('new entry with set to true');
        eventText = 
          record.dynamodb.NewImage.firstName +
          ' ' + 
          record.dynamodb.NewImage.lastName +
          ' (employee Id: ' + record.dynamodb.NewImage.id +
          ') has been created with a mifi benefit.';
        params = {
          Message: eventText, 
          Subject: 'Mifi status change',
          TopicArn: 'arn:aws:sns:us-east-1:453274522834:MifiStatus' 
        };
        await sns.publish(params, function(err, data) {
          console.info('in publish callback');
          console.info(err);
          console.info(data);
          if (err) {
            console.info(err.stack);
            return;
          }
          console.info('push sent');
          console.info(data);
          // Notify Lambda that we are finished
        });
      }
    } else if (record.eventName === 'MODIFY') {
      //if it is an entry being modified
      console.info('modify if statement');
      if (record.dynamodb.OldImage.mifiStatus === undefined || record.dynamodb.OldImage.mifiStatus.BOOL) {
        //if the previous mifiStatus was empty or true
        console.info('modify if swapped to false');
        console.info(record.dynamodb.NewImage.mifiStatus.BOOL);
        if (!record.dynamodb.NewImage.mifiStatus.BOOL) {
          //if the new status is false
          //create negative expense and post it? or let Paul handle that?
          //post message to sns topic
          console.info('in the actual statement');
          console.info(record.dynamodb.NewImage.firstName);
          console.info(record.dynamodb.NewImage.lastName);
          eventText = 
            record.dynamodb.NewImage.firstName.S +
            ' ' +
            record.dynamodb.NewImage.lastName.S +
            ' (employee Id: ' +
            record.dynamodb.NewImage.id.S +
            ') has opted out of the mifi benefit.';

          let now = moment();
          let expense = {
            id: uuid(),
            employeeId: record.dynamodb.NewImage.id,
            createdAt: now,
            expenseTypeId: technologyId,
            cost: -150,
            description: eventText,
            purchaseDate: now,
            showOnFeed: false
          };
          expenseModify.addToDB(new Expense(expense));
          console.info('Event text ^^^^^^^^^^');
          console.info(eventText);
          params = {
            Message: eventText, 
            Subject: 'Mifi status change',
            TopicArn: 'arn:aws:sns:us-east-1:453274522834:MifiStatus'
          };
          console.info(params);
          let result = await sns.publish(params, function(err, data) {
            console.info('in publish callback');
            console.info(err);
            console.info(data);
            if (err) {
              console.info(err.stack);
              return;
            }
            console.info('push sent');
            console.info(data);
    
            // Notify Lambda that we are finished
          });
          console.info('result');
          console.info(result);
        }
      } else if (!record.dynamodb.OldImage.mifiStatus.BOOL) {
        //if it was previously false
        console.info('was false before');
        if (record.dynamodb.NewImage.mifiStatus.BOOL) {
          //and is not true
          console.info('is true now');

          let now = moment();
          let expense = {
            id: uuid(),
            employeeId: record.dynamodb.NewImage.id,
            createdAt: now,
            expenseTypeId: technologyId,
            cost: 150,
            description: eventText,
            purchaseDate: now,
            showOnFeed: false
          };
          expenseModify.addToDB(new Expense(expense));
          eventText = 
            record.dynamodb.NewImage.firstName.S +
            ' ' +
            record.dynamodb.NewImage.lastName.S +
            ' (employee Id: ' +
            record.dynamodb.NewImage.id.S +
            ') has opted into the mifi benefit.';
          console.info('Event text ^^^^^^^^^^');
          console.info(eventText);

          params = {
            Message: eventText, 
            Subject: 'Mifi status change',
            TopicArn: 'arn:aws:sns:us-east-1:453274522834:MifiStatus'
          };
        }
      }
    }
    console.info('end');
    context.done();
  });
  //check old value to see if it was null
  //check new value
  //write message about change to be passed to sns
}

/*
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
 * 
 * 
  "Records": [
    {
      "eventID": "1",
      "eventVersion": "1.0",
      "dynamodb": {
        "Keys": {
          "Id": {
            "N": "101"
          }
        },
        "NewImage": {
          "Message": {
            "S": "New item!"
          },
          "Id": {
            "N": "101"
          }
        },
        "StreamViewType": "NEW_AND_OLD_IMAGES",
        "SequenceNumber": "111",
        "SizeBytes": 26
      },
      "awsRegion": "us-west-2",
      "eventName": "INSERT",
      "eventSourceARN": eventsourcearn,
      "eventSource": "aws:dynamodb"
    },
    {
      "eventID": "2",
      "eventVersion": "1.0",
      "dynamodb": {
        "OldImage": {
          "Message": {
            "S": "New item!"
          },
          "Id": {
            "N": "101"
          }
        },
        "SequenceNumber": "222",
        "Keys": {
          "Id": {
            "N": "101"
          }
        },
        "SizeBytes": 59,
        "NewImage": {
          "Message": {
            "S": "This item has changed"
          },
          "Id": {
            "N": "101"
          }
        },
        "StreamViewType": "NEW_AND_OLD_IMAGES"
      },
      "awsRegion": "us-west-2",
      "eventName": "MODIFY",
      "eventSourceARN": sourcearn,
      "eventSource": "aws:dynamodb"
    }} event 
 */

/**
 * Handler to execute lamba function.
 * @param event - request
 * @return Object - response
 */
async function handler(event, context) {
  console.info(JSON.stringify(event)); // eslint-disable-line no-console
  
  await checkMifiChange(event, context);
} // handler
  
module.exports = { handler };