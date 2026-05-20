const _ = require('lodash');
const axios = require('axios');
const express = require('express');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt, invokeLambda } = require(process.env.AWS ? 'utils' : '../js/utils');

const logger = new Logger('unanetRoutes');
const checkJwt = getExpressJwt();
const STAGE = process.env.STAGE;
const URL_SUFFIX = STAGE === 'prod' ? '' : '-sand';
const BASE_URL = `https://consultwithcase${URL_SUFFIX}.unanet.biz/platform`;

class UnanetRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._invokeLambda = invokeLambda;

    this._router.get('/expenseTypes/', this._checkJwt, this._getUserInfo, this._getExpenseTypes.bind(this));
    this._router.get('/projects/', this._checkJwt, this._getUserInfo, this._getProjects.bind(this));
    this._router.post('/uploadExpense/', this._checkJwt, this._getUserInfo, this._uploadExpense.bind(this));
  } // constructor

  /**
   * Get Unanet expenses
   *
   * @return - the expenses from Unanet
   */
  async _getExpenseTypes(req, res) {
    //log the attempt
    logger.log(1, '_getExpenseTypes', 'Attempting to get Unanet expense types');
    try {
      // lambda function paramters
      let event = { action: 'getExpenseTypes' };
      let params = {
        FunctionName: `mysterio-external-expense-${STAGE}`,
        Payload: JSON.stringify(event),
        Qualifier: '$LATEST'
      };

      // invoke mysterio lambda function
      let response = await this._invokeLambda(params);

      if (response.body) {
        logger.log(1, '_getExpenseTypes', 'Successfully got Unanet expense types');
        return res.status(200).send(response.body);
      } else {
        throw {
          code: 404,
          message: 'Failed to get Unanet expense types'
        };
      }
    } catch (err) {
      logger.log(1, '_getExpenseTypes', `${err.code}: ${err.message}`);
      return err;
    }
  }

  /**
   * Get Unanet expenses
   *
   * @return - the expenses from Unanet
   */
  async _getProjects(req, res) {
    //log the attempt
    logger.log(1, '_getProjects', 'Attempting to get Unanet projects');
    try {
      // lambda function paramters
      let event = { action: 'getProjects' };
      let params = {
        FunctionName: `mysterio-external-expense-${STAGE}`,
        Payload: JSON.stringify(event),
        Qualifier: '$LATEST'
      };

      // invoke mysterio lambda function
      let response = await this._invokeLambda(params);

      if (response.body) {
        logger.log(1, '_getProjects', 'Successfully got Unanet projects');
        return res.status(200).send(response.body);
      } else {
        throw {
          code: 404,
          message: 'Failed to get Unanet expense types'
        };
      }
    } catch (err) {
      logger.log(1, '_getProjects', `${err.code}: ${err.message}`);
      return err;
    }
  }

  /**
   * Uploads a given expense to Unanet
   * 
   * @param req - request with data
   * @param res - response to send
   * @return success or fail
   */
  async _uploadExpense(req, res) {
    //log the attempt
    logger.log(1, '_uploadExpense', 'Attempting to upload Portal expense to Unanet');
    try {
      // lambda function paramters
      let expense = req.body;
      let event = { action: 'portalSync', params: { expense } };
      let params = {
        FunctionName: `mysterio-external-expense-${STAGE}`,
        Payload: JSON.stringify(event),
        Qualifier: '$LATEST'
      };

      // invoke mysterio lambda function
      let response = await this._invokeLambda(params);

      if (response.body) {
        logger.log(1, '_uploadExpense', 'Successfully uploaded Portal expense to Unanet');
        return res.status(200).send(response.body);
      } else {
        throw {
          code: 404,
          message: 'Failed to upload Portal expense to Unanet'
        };
      }
    } catch (err) {
      logger.log(1, '_uploadExpense', `${err.code}: ${err.message}`);
      return err;
    }
  }

  /**
   * Returns the instace express router.
   *
   * @return Router Object - express router
   */
  get router() {
    // log method
    logger.log(5, 'router', 'Getting router for unanetRoutes');

    return this._router;
  }

  /**
   * Send api response error status.
   *
   * @param res - api response
   * @param err - status error
   * @return API Status - error status
   */
  _sendError(res, err) {
    logger.log(3, '_sendError', `Sending ${err.code} error status: ${err.message}`);
    return res.status(err.code).send(err);
  }
}

module.exports = UnanetRoutes;
