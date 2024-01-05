const express = require('express');
const databaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const ExpenseRoutes = require(process.env.AWS ? 'expenseRoutes' : '../routes/expenseRoutes');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const sesClient = new SESClient({ region: 'us-east-1' });
const expenseRoutes = new ExpenseRoutes();
const lambdaClient = new LambdaClient();
const logger = new Logger('giftCardRoutes');
const STAGE = process.env.STAGE;
const EMAIL_SENDER_ADDRESS = process.env.APP_COMPANY_EMAIL_ADDRESS;

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class HighFiveRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.post('/process', this._checkJwt, this._getUserInfo, this._processHighFive.bind(this));
    this.employeeDynamo = new databaseModify('employees');
  } // constructor

  /**
   * Returns the instace express router.
   *
   * @return Router Object - express router
   */
  get router() {
    // log method
    logger.log(5, 'router', 'Getting router');
    return this._router;
  } // router

  /**
   * Invokes the gift card lambda function to get a gift card for an employee and email them their code.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - The response from the lambda function
   */
  async _getGiftCard() {
    // log method
    logger.log(1, '_getGiftCard', 'Attempting to get gift card');
    try {
      // lambda invoke parameters
      let params = {
        FunctionName: `mysterio-generate-gift-card-${STAGE}`,
        Qualifier: '$LATEST'
      };
      const resp = await lambdaClient.send(new InvokeCommand(params));
      const result = JSON.parse(Buffer.from(resp.Payload));
      if ((result && result.errorType) || result instanceof Error) {
        return Promise.reject('Failed to get gift card');
      }
      // return result from lambda function
      return result;
    } catch (err) {
      // log error
      logger.log(1, '_getGiftCard', 'Failed to get gift card');
      // return error
      return Promise.reject(err);
    }
  } // _syncApplications

  async _processHighFive(req, res) {
    let data = req.body;
    let expense, giftCard;
    // 1: reimburse high five expense
    try {
      let expenseUpdated = await expenseRoutes._update(data);
      expense = await expenseRoutes.databaseModify.updateEntryInDB(expenseUpdated);
    } catch (err) {
      // log error
      logger.log(2, '_processHighFive', `Failed to prepare update for expense ${expense.id}`);
      // early exit and return rejected promise
      res.status(403).send(err);
      return Promise.reject(err);
    }
    // 2: generate gift card
    try {
      giftCard = await this._getGiftCard();
    } catch (err) {
      // gift card creation failed -> now unreimburse expense
      try {
        expense.reimbursedDate = null;
        let expenseUnreimbursed = await expenseRoutes._update(expense);
        expense = await expenseRoutes.databaseModify.updateEntryInDB(expenseUnreimbursed);
        logger.log(
          2,
          '_processHighFive',
          `Failed to create gift card then successfully unreimbursed expense ${expense.id}`
        );
        // early exit and return rejected promise
        res.status(403).send(err);
        return Promise.reject(err);
      } catch (err) {
        // gift card creation failed AND failed to unreimburse expense
        logger.log(
          2,
          '_processHighFive',
          `Failed to unreimburse expense ${expense.id} after gift card creation failed`
        );
        // early exit and return rejected promise
        res.status(403).send(err);
        return Promise.reject(err);
      }
    }
    // 3: email user gift card info
    try {
      console.info('high five: ' + 'step 6');
      let isProd = STAGE === 'prod';
      let [donor, recipient] = await Promise.all([
        this.employeeDynamo.getEntry(expense.employeeId),
        this.employeeDynamo.getEntry(expense.recipient)
      ]);
      console.info('high five: ' + 'step 7');
      if (isProd || (!isProd && req.employee.email === recipient.email)) {
        let result = await this._sendGiftCardEmail(giftCard, expense.note, donor, recipient, isProd);
        console.info('high five: ' + 'step 7 result: ' + result);
      }
      console.info('high five: ' + 'step 8');
    } catch (err) {
      console.info('high five: ' + 'step 6, 7, or 8 fail');
      logger.log(2, '_processHighFive', `Failed to send gift card information to user ${expense.employeeId}`);
    }
    // 4: store gift card info with expense and employee ID
    // TODO
    // return reimbursed expense
    console.info('high five: ' + 'last step finish');
    res.status(200).send(expense);
    return Promise.resolve(expense);
  } // _processHighFive

  async _sendGiftCardEmail(giftCard, message, donor, recipient, isProd) {
    try {
      let command = new SendEmailCommand({
        Destination: {
          ToAddresses: [recipient.email]
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              // prettier-ignore
              // eslint-disable-next-line max-len
              Data: `<!DOCTYPE html><html><head><title>Page Title</title><style>html { background: url('https://www.bu.edu/files/2020/12/Feature-iStock-1184848537.jpg') no-repeat center center fixed; background-size: cover; color: white}a.button {-webkit-appearance: button; -moz-appearance: button; appearance: button; text-decoration: none; padding: 7px 20px 7px 20px; background-color: orange; color: black;}.flex-container {display: flex; flex-direction: row; justify-content: space-between; align-items: center}.container {padding: 10px 60px 10px 60px; margin-top: 415px;}.claim-code {padding: 7px 20px 7px 20px;border: 2px dashed; border-image: linear-gradient(to right, red 18%, orange 36%, yellow 51%, green 69%, blue 87%, purple 100%) 6;}.message {font-weight: 400; font-size: 20px;}</style></head><body><div class="container"> ${!isProd ? '<div class="message" style="margin-bottom: 20px;">Note: Claim code is invalid because it was generated on a non-production environment</div>' : '' } <div class="message">Congratulations, ${recipient.nickname || recipient.firstName}! ${donor.nickname || donor.firstName} ${donor.lastName} has given you have High Five with a message of "${message}"</div> <hr> <div class="flex-container"> <div> <div style="font-weight: bold; font-size: 25px;">$50</div> <div style="color: azure;">Amazon Gift Card</div> </div> <div> <img src="https://www.pngall.com/wp-content/uploads/15/Amazon-Smile-Logo-PNG-Photos.png" width="100px" /> </div> </div> <hr> <div class="flex-container"> <div class="claim-code"> Claim Code: ${giftCard.gcClaimCode} </div> <div> <a href="https://www.amazon.com/gc/redeem" target="_blank" class="button">Redeem on Amazon</a> <div> </div></div></body></html>`
            }
          },
          Subject: {
            Charset: 'UTF-8',
            Data: 'CASE sent you an Amazon Gift Card for receiving a High Five!'
          }
        },
        Source: EMAIL_SENDER_ADDRESS
      });
      console.info('gc message setup: ' + JSON.stringify(command));
      let result = await sesClient.send(command);
      return Promise.resolve(result);
    } catch (err) {
      console.info('gc err: ' + err);
      return Promise.reject(err);
    }
  }
} // EmsiRoutes

module.exports = HighFiveRoutes;
