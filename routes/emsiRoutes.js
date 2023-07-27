const axios = require('axios');
const express = require('express');
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const oauth = require('axios-oauth-client');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');

const logger = new Logger('emsiRoutes');

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

const BASE_URL = 'https://emsiservices.com';
class EmsiRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.get('/getTechSkills/:tech', this._checkJwt, this._getUserInfo, this._getTechSkills.bind(this));
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
   * Used to retrieve a list of skills related to the user's query on their Technology profile form,
   * utilizes EMSI's skills API: https://api.emsidata.com/apis/skills
   *
   * @param req - api request
   * @param res - api response
   * @return - JSON of tech skills, else it returns an error if failed to retrieve
   */
  async _getTechSkills(req, res) {
    logger.log(1, '_getTechSkills', `Attempting to get requested skill list for ${req.params.tech}`);
    const token = await this.getEmsiToken();
    var config = {
      method: 'get',
      url: `${BASE_URL}/skills/versions/latest/skills?q=${req.params.tech}&typeIds=ST1&fields=name,type&limit=10`,
      headers: {
        Authorization: `Bearer ${token}`
      }
    };
    try {
      let response = await this.callAxios(config);
      res.status(200).send(response.data);
      return response;
    } catch (err) {
      let error = {
        code: 400,
        message: err.message
      };
      this._sendError(res, error);
      return err;
    }
  } // _getTechSkills

  /**
   * makes a call to axios
   *
   * @param options - parameters of the axios call
   * @return promise - response from axios
   */
  async callAxios(options) {
    return axios(options);
  } // callAxios

  /**
   * Gets a token for the EMSI service
   * @return - token, else it returns an error if failed to retrieve
   */
  async getEmsiToken() {
    logger.log(1, 'getEmsiToken', 'Attempting to retrieve emsi token');
    try {
      const token = await oauth.client(axios.create(), {
        url: 'https://auth.emsicloud.com/connect/token',
        grant_type: 'client_credentials',
        client_id: 'ij4t48a91zkw30tq',
        client_secret: 'G1sWyMUo',
        scope: 'emsi_open'
      })();
      let accessToken = token.access_token;
      logger.log(1, 'getEmsiToken', 'Successfully retrieved emsi token');
      return accessToken;
    } catch (err) {
      logger.log(1, 'getEsmiToken', 'Failed to retrieve emsi token');
      return err;
    }
  } // getEmsiToken

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
} // EmsiRoutes

module.exports = EmsiRoutes;
