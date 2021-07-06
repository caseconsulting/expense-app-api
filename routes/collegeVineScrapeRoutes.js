const axios = require('axios');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const Logger = require('../js/Logger');
const logger = new Logger('collegeVineScrape');

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

const BASE_URL = 'https://blog.collegevine.com/list-of-college-majors/';
class CollegeVineScrapeRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.get('/getMajors', this._checkJwt, this._getUserInfo, this._getMajors.bind(this));
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
   * Used to retrieve a list of majors. It is taken, and then scraped from the website 
   *   https://blog.collegevine.com/list-of-college-majors/
   * @returns A DOM of the website, else it returns an error if failed to retrieve
   */
  async _getMajors(req, res) {
    logger.log(1, '_getMajors', 'Attempting to get requested majors');
    var config = {
      method: 'get',
      url: `${BASE_URL}`,
    };
    try {
      let response = await this.callAxios(config);
      res.status(200).send(response.data);
      return response;
    } catch(err) {
      let error = {
        code: 400,
        message: err.message
      };
      this._sendError(res, error);
      return err;
    }
  }

  async callAxios(options) {
    return axios(options);
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
}


module.exports = CollegeVineScrapeRoutes;
