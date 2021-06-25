const _ = require('lodash');
const AWS = require('aws-sdk');

/**
 * Change the mifi status
 */
async function checkMifiChange(event, context) {
  //intake dynamodb stream data
  console.info('EVENT >>>>>');
  console.info(event);
  console.info('CONTEXT >>>>>');
  console.info(context);
  let records = event.Records; //TODO: make sure this is how to interact with the stream
  let sns = new AWS.SNS();
  let params;
  let eventText;
  _.forEach(records, record => {
    if (record.eventName === 'INSERT') {
      //if it's a new entry 
      if (record.dynamodb.NewImage.mifiStatus === 'false') {
        eventText = 
          record.dynamodb.NewImage.firstName +
          record.dynamodb.NewImage.lastName +
          ' (employee Id: ' + record.dynamodb.NewImage.id +
          ') has been created without a mifi benefit.';
        //TODO: create an expense for the person
        params = {
          Message: eventText, 
          Subject: 'Mifi status change',
          TopicArn: 'arn:aws:sns:us-east-1:453274522834:MifiStatus' 
        };
        sns.publish(params, context.done);
      }
    } else if (record.eventName === 'MODIFY') {
      //if it is an entry being modified
      if (record.dynamodb.OldImage.mifiStatus === null || record.dynamodb.OldImage.mifiStatus === 'true') {
        if (record.dynamodb.NewImage.mifiStatus === 'false') { //TODO: will it just come back as a boolean?
          //create negative expense and post it? or let Paul handle that?
          //post message to sns topic
          eventText = 
            record.dynamodb.NewImage.firstName +
            record.dynamodb.NewImage.lastName +
            ' (employee Id: ' +
            record.dynamodb.NewImage.id +
            ') has opted out of the mifi benefit.';
          //TODO: create an expense for the person
          params = {
            Message: eventText, 
            Subject: 'Mifi status change',
            TopicArn: 'arn:aws:sns:us-east-1:453274522834:MifiStatus' 
          };
          sns.publish(params, context.done);
        }
      }
    }
  });
  //check old value to see if it was null
  //check new value
  //write message about change to be passed to sns
}


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
async function handler(event) {
  console.info(JSON.stringify(event)); // eslint-disable-line no-console
  
  await checkMifiChange();
} // handler
  
module.exports = { handler };