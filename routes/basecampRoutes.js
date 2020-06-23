const AWS = require('aws-sdk');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const Logger = require('../js/Logger');

const lambda = new AWS.Lambda();
const logger = new Logger('basecampRoutes');
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


class BasecampRoutes {
  constructor() {
    this._router = express.Router(); 
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;

    this._router.get(
      '/getBasecampToken',
      this._checkJwt,
      this._getUserInfo,
      this._getBasecampToken.bind(this)
    );
  }

  
  async _getBasecampToken() {
    //log the attempt
    logger.log(1, '_getBasecampToken', 'Attempting to get Basecamp Token');
    console.log('    ');
    try{
      // lambda function paramters
      let params = {
        FunctionName: `mysterio-basecamp-token-${STAGE}`, 
        Qualifier: '$LATEST'
      };


      // invoke mysterio basecamp lambda function
      let result = await lambda.invoke(params).promise();

      let resultPayload = JSON.parse(result.Payload);

      if (resultPayload.body) {
        logger.log(1, '_getBasecampToken', 'Successfully acquired token');

        
        let token = resultPayload.body;

        return token.access_token;
      } else {
        throw {
          code: 404,
          message: 'Failed to acquire the Access Token'
        };
      }
    } catch(err) {
      logger.log(1, '_getBasecampToken', `${err.code}: ${err.message}`);


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
    logger.log(5, 'router', 'Getting router');

    return this._router;
  } // router

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


}

module.exports = BasecampRoutes;