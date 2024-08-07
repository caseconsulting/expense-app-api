const axios = require('axios');
const express = require('express');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils');

const logger = new Logger('googleMapRoutes');

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class GoogleMapRoutes {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.get('/getLocation/:location', this._checkJwt, this._getUserInfo, this._getLocation.bind(this));
    this._router.get('/getZipCode/:addressId', this._checkJwt, this._getUserInfo, this._getZipCode.bind(this));
    this._router.get('/getCity/:location', this._checkJwt, this._getUserInfo, this._getCity.bind(this));
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
   * Used to return a list of 'predictions' of addresses according to the user's input.
   *
   * @param req - contains string of location typed by user
   * @param res - returns Google Maps API object according to the user's input in the street field
   */
  async _getLocation(req, res) {
    let location = req.params.location;
    location = location.replace(' ', '+');
    let googleKey = process.env.NODE_ENV_GOOGLE_MAPS_KEY;
    let baseURL = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${googleKey}`;
    logger.log(1, '_getLocation', `Attempting to get requested location for ${location}`);
    var config = {
      method: 'get',
      url: `${baseURL}&types=address&components=country:us&input=${location}`
    };
    try {
      let response = await this.callAxios(config);
      logger.log(1, '_getLocation', 'Successfully obtained location(s)!');
      res.status(200).send(response.data);
    } catch (err) {
      let error = {
        code: 400,
        message: err.message
      };
      this._sendError(res, error);
    }
  } //_getLocation

  /**
   * Obtains an object that contains the zip code of a given address ID
   *
   * @param req: holds params.addressId of the location to get the zip code of
   * @param res: object of multiple fields about the given location
   */
  async _getZipCode(req, res) {
    let addressId = req.params.addressId;
    let googleKey = process.env.NODE_ENV_GOOGLE_MAPS_KEY;
    let baseURL = `https://maps.googleapis.com/maps/api/place/details/json?key=${googleKey}`;
    logger.log(1, '_getZipCode', `Attempting to get requested zip code for ${addressId}`);
    var config = {
      method: 'get',
      url: `${baseURL}&fields=address_component&place_id=${addressId}`
    };
    try {
      let response = await this.callAxios(config);
      logger.log(1, '_getZipCode', 'Successfully obtained zip code!');
      res.status(200).send(response.data);
    } catch (err) {
      let error = {
        code: 400,
        message: err.message
      };
      this._sendError(res, error);
    }
  } //_getZipCode

  /**
   * Used to return a list of 'predictions' of cities according to the user's input.
   *
   * @param req - contains string of location typed by user
   * @param res - returns Google Maps API object according to the user's input in the city field
   */
  async _getCity(req, res) {
    let city = req.params.location;
    city = city.replace(' ', '+');
    let googleKey = process.env.NODE_ENV_GOOGLE_MAPS_KEY;
    let baseURL = `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${googleKey}`;
    logger.log(1, '_getLocation', `Attempting to get requested city for ${city}`);
    var config = {
      method: 'get',
      url: `${baseURL}&types=locality&input=${city}`
    };
    try {
      let response = await this.callAxios(config);
      logger.log(1, '_getLocation', 'Successfully obtained location(s)!');
      res.status(200).send(response.data);
    } catch (err) {
      let error = {
        code: 400,
        message: err.message
      };
      this._sendError(res, error);
    }
  } //_getLocation

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
} // GoogleMapRoutes

module.exports = GoogleMapRoutes;
