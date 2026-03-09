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
  } // constructor

  /**
   * get the basecamp token
   *
   * @return - the basecamp token from mysterio
   */
  async _getExpenseTypes(req, res) {
    //log the attempt
    logger.log(1, '_getExpenseTypes', 'Attempting to get Unanet expense types');
    try {
      // lambda function paramtersu
      let event = { actions: ['getExpenseTypes', 'getProjects'] };
      let params = {
        FunctionName: `mysterio-external-expense-${STAGE}`,
        Payload: JSON.stringify(event),
        Qualifier: '$LATEST'
      };

      // invoke mysterio basecamp lambda function
      let response = await this._invokeLambda(params);

      if (response.body) {
        logger.log(1, '_getExpenseTypes', 'Successfully fetched Unanet expense types');
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
