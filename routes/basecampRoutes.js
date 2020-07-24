const axios = require('axios');
const AWS = require('aws-sdk');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const Logger = require('../js/Logger');
const _ = require('lodash');

const lambda = new AWS.Lambda();
const logger = new Logger('basecampRoutes');
const STAGE = process.env.STAGE;

const BASECAMP_ROOT_URL = 'https://3.basecampapi.com/3097063';

const BASECAMP_PROJECTS = {
  CASE_CARES: {
    ID: 9208019,
    SCHEDULE_ID: 1315884569
  },
  HQ: {
    ID: 4708396,
    SCHEDULE_ID: 650769733
  },
  TECH_CORNER: {
    ID: 219642,
    SCHEDULE_ID: 34602707
  }
};

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
    this._router.get(
      '/getFeedEvents',
      this._checkJwt,
      this._getUserInfo,
      this._getFeedEvents.bind(this)
    );
    this._router.get(
      '/getBasecampAvatars',
      this._checkJwt,
      this._getUserInfo,
      this._getBasecampAvatars.bind(this)
    );
  }


  async _getBasecampToken() {
    //log the attempt
    logger.log(1, '_getBasecampToken', 'Attempting to get Basecamp Token');
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
   * Get basecamp avatars for all employees in the Case Consulting Basecamp.
   *
   * @return object - Employee Basecamp avatar data
   */
  async _getBasecampAvatars(req, res) {
    // log method
    logger.log(1, '_getBasecampAvatars', 'Attempting to get Basecamp Employee Avatars');

    // compute method
    try {
      let token = await this._getBasecampToken();
      let page = 1;
      let basecampResponse;
      let avatars = [];
      let pageAvatars = [];

      do {
        let options = {
          method: 'GET',
          url: `${BASECAMP_ROOT_URL}/people.json`,
          params: {
            page: page
          },
          // url: `${BASECAMP_ROOT_URL}/people.json`,
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'CasePortal (info@consultwithcase.com)'
          }
        };
        basecampResponse = await axios(options);
        let basecampData = basecampResponse.data;
        pageAvatars = _.map(basecampData, person => {
          return {
            email_address: person.email_address,
            avatar_url: person.avatar_url,
            name: person.name
          };
        });
        avatars = _.union(avatars, pageAvatars);
        page++;
      } while(!_.isEmpty(pageAvatars));

      // log success
      logger.log(1, '_getBasecampAvatars', 'Successfully got Basecamp Employee Avatars');

      // send successful 200 response and employee avatar data
      res.status(200).send(avatars);

      // return avatar data
      return avatars;
    } catch (err) {
      // log error
      logger.log(1, '_getBasecampAvatars', 'Failed to get Basecamp Employee Avatars');

      let error = {
        code: 404,
        message: err.message
      };

      // send error status
      this._sendError(res, error);

      // return error;
      return err;
    }
  } // _getBasecampAvatars

  async _getScheduleEntries(token, project) {
    logger.log(1, '_getFeedEvents', 'Attempting to get Basecamp Events');
    try{
      let options = {
        method: 'GET',
        url: `${BASECAMP_ROOT_URL}/buckets/${project.ID}/schedules/${project.SCHEDULE_ID}/entries.json`,
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'CasePortal (info@consultwithcase.com)'
        }
      };
      let basecampResponse = await axios(options);
      return basecampResponse.data;

    } catch(err) {
      logger.log(1, '_getFeedEvents', `${err.code}: ${err.message}`);

      return err;
    }
  }

  async _getFeedEvents(req, res) {
    logger.log(1, '_getFeedEvents', 'Attempting to get Basecamp Events');
    try{
      let entries = [];
      let accessToken = await this._getBasecampToken();
      for (let proj in BASECAMP_PROJECTS) {
        entries.push(await this._getScheduleEntries(accessToken, BASECAMP_PROJECTS[proj]));
      }

      res.status(200).send(entries);

      return entries;

    } catch(err) {
      logger.log(1, '_getFeedEvents', `${err.code}: ${err.message}`);
      return err;
    }
  }

  getBasecampInfo(){
    return BASECAMP_PROJECTS;
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
