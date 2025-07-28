const _ = require('lodash');
const axios = require('axios');
const express = require('express');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt, invokeLambda } = require(process.env.AWS ? 'utils' : '../js/utils');

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
    SCHEDULE_ID: 650769733,
    MESSAGE_BOARD_ID: 650769731
  },
  TECH_CORNER: {
    ID: 219642,
    SCHEDULE_ID: 34602707
  }
};

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class BasecampRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._invokeLambda = invokeLambda;

    this._router.get('/getBasecampToken', this._checkJwt, this._getUserInfo, this._getBasecampToken.bind(this));
    this._router.get('/getBasecampAvatars', this._checkJwt, this._getUserInfo, this._getBasecampAvatars.bind(this));
    this._router.get('/getBasecampCampfires', this._checkJwt, this._getUserInfo, this._getBasecampCampfires.bind(this));
  } // constructor

  /**
   * get the basecamp token
   *
   * @return - the basecamp token from mysterio
   */
  async _getBasecampToken() {
    //log the attempt
    logger.log(1, '_getBasecampToken', 'Attempting to get Basecamp Token');
    try {
      // lambda function paramters
      let params = {
        FunctionName: `mysterio-basecamp-token-${STAGE}`,
        Qualifier: '$LATEST'
      };

      // invoke mysterio basecamp lambda function
      let resultPayload = await this._invokeLambda(params);

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
    } catch (err) {
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
        pageAvatars = _.map(basecampData, (person) => {
          return {
            email_address: person.email_address,
            avatar_url: person.avatar_url,
            name: person.name
          };
        });
        avatars = _.union(avatars, pageAvatars);
        page++;
      } while (!_.isEmpty(pageAvatars));

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
        pageCampfires = _.map(basecampData, (project) => {
          let chat = _.find(project.dock, (tools) => {
            return tools.title == 'Campfire';
          });
          if (!chat) return; // if project doesn't have campfire, return null to filter out later
          return {
            name: project.name,
            url: chat.app_url
          };
        }).filter((x) => x); // filter out null values
        campfires = _.union(campfires, pageCampfires);
        page++;
      } while (!_.isEmpty(pageCampfires));

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
   * Helper function to get the posts in the message board in HQ
   *
   * @param {*} basecampToken A valid basecamp access token
   * @return {Object} The announcements from Basecamp HQ > Message Boards
   */
  async _getBasecampHqAnnouncements(basecampToken) {
    logger.log(1, '_getBasecampHqAnnouncements', 'Attempting to get Basecamp HQ Announcements');

    try {
      let token = basecampToken;
      const hqProjectId = BASECAMP_PROJECTS.HQ.ID;
      const hqMessageBoardId = BASECAMP_PROJECTS.HQ.MESSAGE_BOARD_ID;
      const url = `${BASECAMP_ROOT_URL}/buckets/${hqProjectId}/message_boards/${hqMessageBoardId}/messages.json`;

      let options = {
        method: 'GET',
        url: url,
        params: {
          page: 1
        },
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'CasePortal (info@consultwithcase.com)'
        }
      };

      let response = await this.callAxios(options);

      // log success
      logger.log(1, '_getBasecampHqAnnouncements', 'Successfully got Basecamp HQ Announcements');

      let filteredResponse = [];
      for (let i = 0; i < response.data.length; i++) {
        const responseItem = response.data[i];

        filteredResponse.push({
          title: responseItem.title,
          url: responseItem.app_url,
          author: responseItem.creator.name,
          createdAt: responseItem.created_at,
          updatedAt: responseItem.updated_at
        });
      }

      return filteredResponse;
    } catch (err) {
      // log error
      logger.log(1, '_getBasecampHqAnnouncements', 'Failed to get Basecamp HQ Announcements:', err.message);
      // return error;
      return err;
    }
  } // _getBasecampHqAnnouncements

  /**
   * Get basecamp Schedule entries for the info@consultwithcase.com basecamp account.
   *
   * @param token - api token
   * @param project - basecamp project
   * @return object - Employee Basecamp Campfires
   */
  async _getScheduleEntries(token, project) {
    logger.log(1, '_getScheduleEntries', 'Attempting to get Basecamp Events');
    try {
      let page = 1;
      let basecampResponse;
      let entries = [];
      let pageEntries = [];
      do {
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
      } while (this.getNextPage(page - 1, pageEntries.length));

      // log success
      logger.log(1, '_getScheduleEntries', 'Successfully got Basecamp Schedule entries');

      return entries;
    } catch (err) {
      logger.log(1, '_getScheduleEntries', `${err.code}: ${err.message}`);

      let error = {
        code: 404,
        message: 'Failed to get schedule entries'
      };

      throw error;
    }
  } // _getScheduleEntries

  /**
   * returns the current basecamp projects - used for testing
   *
   * @return - the basecamp projects
   */
  getBasecampInfo() {
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
  getNextPage(currentPage, responseLength) {
    if (currentPage === 1) {
      return responseLength === 15 ? true : false;
    } else if (currentPage === 2) {
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
