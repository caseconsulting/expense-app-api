const AWS = require('aws-sdk');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const Logger = require('../js/Logger');
const axios = require('axios');

const lambda = new AWS.Lambda();
const logger = new Logger('twitterRoutes');
const STAGE = process.env.STAGE;

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS
  // endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: process.env.VUE_APP_AUTH0_AUDIENCE,
  issuer: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

class TwitterRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;

    this._router.get(
      '/getTwitterToken',
      this._checkJwt,
      this._getUserInfo,
      this._getTwitterToken.bind(this)
    );

    this._router.get(
      '/getCaseTimeline',
      this._checkJwt,
      this._getUserInfo,
      this._getCaseTimeline.bind(this)
    );
  }

  async _getTwitterToken(req, res) {
    //log the attempt
    logger.log(1, '_getTwitterToken', 'Attempting to get Twitter Token');

    try{

      // lambda invoke parameters
      let params = {
        FunctionName: `mysterio-twitter-token-${STAGE}`,
        //Payload: JSON.stringify(payload),
        Qualifier: '$LATEST'
      };

      // invoke mysterio time sheets lambda function
      let result = await lambda.invoke(params).promise();

      // invoke mysterio pto balances lambda function
      let resultPayload = JSON.parse(result.Payload);

      if (resultPayload.body) {
        logger.log(1, '_getTwitterToken', 'Successfully acquired twitter token');

        
        let token = resultPayload.body;

        return token;
      } else {
        throw {
          code: 404,
          message: 'Failed to acquire the Twitter Access Token'
        };
      }
    } catch(err) {
      logger.log(1, '_getTwitterToken', `${err.code}: ${err.message}`);

      this._sendError(res, err);

      return err;
    }
  }

  async _getCaseTimeline(req, res) {
    //log the attempt
    logger.log(1, '_getCaseTimeline', 'Attempting to get Case Consulting timeline');

    try{
      // auth token for twitter get
      let token = await this._getTwitterToken();

      // format request info for axios
      let info = {
        method: 'GET',
        url: 'https://api.twitter.com/1.1/statuses/user_timeline.json',
        params: {
          screen_name: 'ConsultwithCase',
          count: 25,
          tweet_mode: 'extended'
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      };

      // call twitter api with axios and get json object as response
      let result = await axios(info);

      if (result.data) {
        logger.log(1, '_getCaseTimeline', 'Successfully acquired Case Consulting timeline');
        
        let token = result.data;

        res.status(200).send(token);

        return token;
      } else {
        throw {
          code: 404,
          message: 'Failed to acquire the Case Consulting timeline'
        };
      }
    } catch(err) {
      logger.log(1, '_getCaseTimeline', `${err.code}: ${err.message}`);

      this._sendError(res, err);

      return err;
    }
  }

  /**
   * Send api response error status.
   *
   * @param res - api response
   * @param err - status error
   * @return API Status - error status
   */
  _sendError(res, err) {
    // log method
    logger.log(3, '_sendError', `Sending ${err.code} error status: ${err.message}`);

    // return error status
    return res.status(err.code).send(err);
  } // _sendError

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
}

module.exports = TwitterRoutes;