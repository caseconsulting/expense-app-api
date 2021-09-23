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
    this._router.get(
      '/getBasecampCampfires',
      this._checkJwt,
      this._getUserInfo,
      this._getBasecampCampfires.bind(this)
    );
  } // constructor

  /**
   * gets the token
   *
   * @param params - params for the lambda invoke call 
   * @return - promise containing token 
   */
  async getToken(params){
    return lambda.invoke(params).promise();
  } // getToken

  /**
   * get the basecamp token
   * 
   * @return - the basecamp token from mysterio 
   */
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
      let result = await this.getToken(params);

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
  } // _getBasecampToken

  /**
   * make a call to axios
   * 
   * @param options - options for the axios call
   * @return promise - axios return
   */
  async callAxios(options) {
    return axios(options);
  } // callAxios

  /**
   * Get basecamp avatars for all employees in the Case Consulting Basecamp.
   *
   * @param req - api request
   * @param res - api response
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
        basecampResponse = await this.callAxios(options);
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

  /**
   * Get basecamp Campfires for the info@consultwithcase.com basecamp account.
   *
   * @param req - api request
   * @param res - api respone
   * @return object - Employee Basecamp Campfires
   */
  async _getBasecampCampfires(req, res) {
    // log method
    logger.log(1, '_getBasecampCampfires', 'Attempting to get Basecamp Campfires');

    // compute method
    try {
      let token = await this._getBasecampToken();
      let page = 1;
      let basecampResponse;
      let campfires = [];
      let pageCampfires = [];

      do {
        let options = {
          method: 'GET',
          url: `${BASECAMP_ROOT_URL}/projects.json`,
          params: {
            page: page
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'CasePortal (info@consultwithcase.com)'
          }
        };
        basecampResponse = await this.callAxios(options);
        let basecampData = basecampResponse.data;
        pageCampfires = _.map(basecampData, project => {
          let chat = _.find(project.dock, tools => {
            return tools.title == 'Campfire';
          });
          return {
            name: project.name,
            url: chat.app_url
          };
        });
        campfires = _.union(campfires, pageCampfires);
        page++;
      } while(!_.isEmpty(pageCampfires));

      // log success
      logger.log(1, '_getBasecampCampfires', 'Successfully got Basecamp Campfires');

      // send successful 200 response and basecamp campfire data
      res.status(200).send(campfires);

      // return campfires data
      return campfires;
    } catch (err) {
      // log error
      logger.log(1, '_getBasecampCampfires', 'Failed to get Basecamp Campfires');

      let error = {
        code: 404,
        message: err.message
      };

      // send error status
      this._sendError(res, error);

      // return error;
      return err;
    }
  } // _getBasecampCampfires

  /**
   * Get basecamp Schedule entries for the info@consultwithcase.com basecamp account.
   *
   * @param token - api token
   * @param project - basecamp project
   * @return object - Employee Basecamp Campfires
   */
  async _getScheduleEntries(token, project) {
    logger.log(1, '_getScheduleEntries', 'Attempting to get Basecamp Events');
    try{
      let page = 1;
      let basecampResponse;
      let entries = [];
      let pageEntries = [];
      do{
        let options = {
          method: 'GET',
          url: `${BASECAMP_ROOT_URL}/buckets/${project.ID}/schedules/${project.SCHEDULE_ID}/entries.json`,
          params: {
            page: page
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'User-Agent': 'CasePortal (info@consultwithcase.com)'
          }
        };
        basecampResponse = await this.callAxios(options);
        pageEntries = basecampResponse.data;
        entries = _.union(entries, pageEntries);
        page++;
      }while(this.getNextPage((page - 1), pageEntries.length));

      // log success
      logger.log(1, '_getScheduleEntries', 'Successfully got Basecamp Schedule entries');

      return entries;

    } catch(err) {
      logger.log(1, '_getScheduleEntries', `${err.code}: ${err.message}`);

      let error = {
        code: 404,
        message: 'Failed to get schedule entries'
      };

      throw error;
    }
  } // _getScheduleEntries

  /**
   * Get basecamp schedule entries for all the selected projects for the info@consultwithcase.com basecamp account.
   * @param req - api request
   * @param res - api respone
   * @return object - Employee Basecamp Campfires
   */
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
  } // _getFeedEvents

  /**
   * returns the current basecamp projects - used for testing
   *
   * @return - the basecamp projects 
   */
  getBasecampInfo(){
    return BASECAMP_PROJECTS;
  } // getBasecampInfo

  /**
   * Check to see if we need to make another call for paginated things
   *
   * @param currentPage - the current page
   * @param responseLength - the amount of responses that were returned
   * @return - true if the number of responses is the max for that page(and therefore there might be more entries to
   *            get) and false otherwise
   */
  getNextPage(currentPage, responseLength){
    if(currentPage === 1){
      return responseLength === 15 ? true : false;
    } else if (currentPage === 2){
      return responseLength === 30 ? true : false;
    } else if (currentPage === 3) {
      return responseLength === 50 ? true : false;
    } else if (currentPage >= 4) {
      return responseLength === 100 ? true : false;
    }
  } // getNextPage

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
} // BasecampRoutes

module.exports = BasecampRoutes;
