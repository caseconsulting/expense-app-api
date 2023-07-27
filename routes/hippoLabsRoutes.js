const axios = require('axios');
const express = require('express');
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
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

const BASE_URL = 'http://universities.hipolabs.com/search';
class HippoLabsRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.get('/getColleges/:college', this._checkJwt, this._getUserInfo, this._getColleges.bind(this));
    this._router.get('/getColleges/', this._checkJwt, this._getUserInfo, this._getColleges.bind(this));
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
   * Used to retrieve a list of colleges related to the user's query on their Education profile form,
   * We use the api described here https://github.com/Hipo/university-domains-list
   *
   * @return -  JSON of colleges, else it returns an error if failed to retrieve
   */
  async _getColleges(req, res) {
    req.params.college = req.params.college ? req.params.college : '';
    logger.log(1, '_getColleges', `Attempting to get school for ${req.params.college}`);
    var config = {
      method: 'get',
      url: `${BASE_URL}?name=${req.params.college}`
    };
    try {
      let response = (await this.callAxios(config)).data;
      let finalColleges = [];
      for (let i = 0; i < response.length; i++) {
        finalColleges.push(response[i].name);
      }
      res.status(200).send(finalColleges);
      return finalColleges;
    } catch (err) {
      let error = {
        code: 400,
        message: err.message
      };
      this._sendError(res, error);
      return err;
    }
  } // _getColleges

  /**
   *
   * @param options - parameters for axios call
   * @return promise - axios response
   */
  async callAxios(options) {
    return axios(options);
  } // callAxios

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
} // HippoLabsRoutes

module.exports = HippoLabsRoutes;
