const express = require('express');
const databaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const ExpenseRoutes = require(process.env.AWS ? 'expenseRoutes' : '../routes/expenseRoutes');
const GiftCard = require(process.env.AWS ? 'giftCard' : '../models/giftCard');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');
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
    this.giftCardDynamo = new databaseModify('gift-cards');
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
   * @return Object - The response from the lambda function
   */
  async _getGiftCard() {
    try {
      // log method
      logger.log(1, '_getGiftCard', 'Attempting to get gift card');
      // lambda invoke parameters
      let params = {
        FunctionName: `mysterio-generate-gift-card-${STAGE}`,
        Qualifier: '$LATEST'
      };
      const resp = await lambdaClient.send(new InvokeCommand(params));
      const result = JSON.parse(Buffer.from(resp.Payload));
      if ((result && result.errorType) || result instanceof Error) {
        return Promise.reject(result.errorType);
      }
      // return result from lambda function
      return result;
    } catch (err) {
      // return error
      return Promise.reject(err);
    }
  } // _getGiftCard

  /**
   * Processes the reimbursement of a high five.
   *
   * @param {Object} req - The request
   * @param {Object} res - The response
   * @returns
   */
  async _processHighFive(req, res) {
    let expense, giftCard, emailSent;
    // 1: reimburse high five expense
    try {
      let data = req.body;
      let expenseUpdated = await expenseRoutes._update(data);
      expense = await expenseRoutes.databaseModify.updateEntryInDB(expenseUpdated);
    } catch (err) {
      // log error
      logger.log(2, '_processHighFive', `Failed to reimburse expense ${expense.id}`);
      // early exit and return rejected promise
      res.status(403).send(err);
      return Promise.reject(err);
    }
    // 2: generate gift card
    try {
      giftCard = await this._getGiftCard();
      logger.log(2, '_processHighFive', 'Successfully generated gift card');
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
      let isProd = STAGE === 'prod';
      let [donor, recipient] = await Promise.all([
        this.employeeDynamo.getEntry(expense.employeeId),
        this.employeeDynamo.getEntry(expense.recipient)
      ]);
      if (isProd || (!isProd && req.employee.email === recipient.email)) {
        await this._sendGiftCardEmail(giftCard, expense.note, donor, recipient, isProd);
        emailSent = true;
        logger.log(2, '_processHighFive', `Successfully sent gift card information to user ${expense.employeeId}`);
      }
    } catch (err) {
      emailSent = false;
      logger.log(2, '_processHighFive', `Failed to email gift card information to user ${expense.employeeId}`);
    }
    // 4: store gift card info with expense and employee ID
    try {
      let resp = await this._storeGiftCard(giftCard, expense, emailSent);
      logger.log(2, '_processHighFive', `Successfully stored gift card information with ID ${resp.id}`);
    } catch (err) {
      logger.log(2, '_processHighFive', 'Failed to store gift card information: ' + err);
    }
    // return reimbursed expense
    res.status(200).send(expense);
    return Promise.resolve(expense);
  } // _processHighFive

  /**
   * Sends the recipient an email containing the message from the donor and the generated gift
   * card details.
   *
   * @param {Object} giftCard - The gift card object
   * @param {String} message - The message from the high five
   * @param {Object} donor - The user giving the high five
   * @param {Object} recipient - The user recceiving the high five
   * @param {Object} isProd - If on production
   * @returns Promise - Resolves if the email was sent
   */
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
      let result = await sesClient.send(command);
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  } // _sendGiftCardEmail

  /**
   * Stores the gift card information and relevant high five data.
   *
   * @param {Object} giftCard - The gift card object
   * @param {Object} expense - The expense
   * @param {Boolean} emailSent - True if email was sent to recipient
   * @returns Promise - The object stored in DynamoDB if successful
   */
  async _storeGiftCard(giftCard, expense, emailSent) {
    try {
      let model = {
        id: giftCard.creationRequestId,
        employeeId: expense.employeeId,
        expenseId: expense.id,
        creationDate: dateUtils.getTodaysDate(dateUtils.ISO8601_ISOFORMAT),
        gcClaimCode: giftCard.gcClaimCode,
        gcId: giftCard.gcId,
        status: giftCard.status,
        emailSent: emailSent
      };
      let giftCardModel = new GiftCard(model);
      let resp = await this.giftCardDynamo.addToDB(giftCardModel);
      return Promise.resolve(resp);
    } catch (err) {
      return Promise.reject(err);
    }
  } // storeGiftCard
} // HighFiveRoutes

module.exports = HighFiveRoutes;
