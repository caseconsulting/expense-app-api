const express = require('express');
const fs = require('fs');
const databaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const ExpenseRoutes = require(process.env.AWS ? 'expenseRoutes' : '../routes/expenseRoutes');
const GiftCard = require(process.env.AWS ? 'giftCard' : '../models/giftCard');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');
const { getExpressJwt, invokeLambda, sendEmail } = require(process.env.AWS ? 'utils' : '../js/utils');

const expenseRoutes = new ExpenseRoutes();
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
    this._router.get('/readAll', this._checkJwt, this._getUserInfo, this._readAllGiftCards.bind(this));
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
      const result = await invokeLambda(params);
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

  async _cancelGiftCard() {
    // TODO:
  }

  /**
   * Processes the reimbursement of a high five.
   *
   * @param {Object} req - The request
   * @param {Object} res - The response
   * @returns
   */
  async _processHighFive(req, res) {
    let expense, giftCard, emailSent;

    // on error: log what succeeded, what failed, and what didn't happen
    // if gift card generated but not sent out, cancel the gift card (need cancel code maybe?)

    // Generate gift card
    try {
      giftCard = await this._getGiftCard();
      logger.log(2, '_processHighFive', 'Successfully generated gift card');
    } catch (err) {
      logger.log(
        2,
        '_processHighFive',
        `Failed to generate gift card with error: ${err}`
      );
      Promise.reject({
        code: 500,
        message: 'Failed to generate gift card, please check balance and try again later. Expense not reimbursed.'
      });
    }

    // Email gift card to recipient
    try {
      let isProd = STAGE === 'prod';
      let [donor, recipient] = await Promise.all([
        this.employeeDynamo.getEntry(req.body.employeeId),
        this.employeeDynamo.getEntry(req.body.recipient)
      ]);
      if (isProd || (!isProd && req.employee.email === recipient.email)) {
        await this._sendGiftCardEmail(giftCard, req.body.note, donor, recipient);
        emailSent = true;
        logger.log(2, '_processHighFive', `Successfully sent gift card information to user ${req.body.employeeId}.`);
      }
    } catch (err) {
      // TODO:
      // Cancel gift card, since there's no way to redeem it without the email being sent to the user.
      // This was only not done because the story was de-prioritized. It absolutely should be done.
      // https://developer.amazon.com/docs/incentives-api/gift-codes-on-demand.html#cancelgiftcard
      emailSent = false;
      logger.log(
        2,
        '_processHighFive',
        `Failed to email gift card information to user ${req.body.employeeId} with error: ${err}`
      );
      Promise.reject({
        code: 500,
        message: `Failed to email code to employee ${req.body.employeeId}.`
      });
    }

    // reimburse expense
    try {
      let expenseUpdated = await expenseRoutes._update(req);
      expense = await expenseRoutes.databaseModify.updateEntryInDB(expenseUpdated);
    } catch (err) {
      logger.log(2, '_processHighFive', `Failed to reimburse high five expense ${req.body.id}`);
      Promise.reject({
        code: 500,
        message: 'Please manually reimburse expense. Gift Card was sent to employee.'
      });
    }

    // log gift card to db
    try {
      let resp = await this._storeGiftCard(giftCard, expense, emailSent);
      logger.log(2, '_processHighFive', `Successfully stored gift card information with ID ${resp.id}`);
    } catch (e) {
      logger.log(2, '_processHighFive',
        `Failed to log gift card to DB: gcId: ${giftCard.gcId}, status: ${giftCard.status}, expenseId: ${expense.id}`
      );
      Promise.reject({
        code: 500,
        message: 'Everything succeeded, but gift card information failed to store in DB.'
      });
    }

    // return expense for frontend
    expense['emailSent'] = emailSent;
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
   * @returns Promise - Resolves if the email was sent
   */
  async _sendGiftCardEmail(giftCard, message, donor, recipient) {
    try {
      let template = fs.readFileSync(require.resolve('../views/giftCardTemplate.html')).toString();
      template = template.replace(':recipient:', recipient.nickname || recipient.firstName);
      template = template.replace(':donor:', `${donor.nickname || donor.firstName} ${donor.lastName}`);
      template = template.replace(':giftCardInfo:', giftCard.gcClaimCode);
      template = template.replace(':message:', message);
      let source = EMAIL_SENDER_ADDRESS;
      let toAddresses = [recipient.email];
      let subject = 'CASE sent you an Amazon Gift Card for receiving a High Five!';
      let body = template;
      let isHtml = true;
      await sendEmail(source, toAddresses, subject, body, { isHtml });
    } catch (err) {
      return Promise.reject(err);
    }
  } // _sendGiftCardEmail

  async _readAllGiftCards(req, res) {
    // log method
    logger.log(2, '_readAllGiftCards', 'Attempting to read all gift cards');

    // compute method
    try {
      let giftCardData = await this.giftCardDynamo.getAllEntriesInDB();
      let giftCards = giftCardData.map((giftCard) => new GiftCard(giftCard));

      // log success
      logger.log(2, '_readAllGiftCards', 'Successfully read all gift cards');

      // return all expenses
      res.status(200).send(giftCards);
      return Promise.resolve(giftCards);
    } catch (err) {
      // log error
      logger.log(2, '_readAllGiftCards', 'Failed to read all gift cards');

      // return error
      return Promise.reject(err);
    }
  } // _readAll

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
