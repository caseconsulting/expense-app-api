var express = require('express');
const databaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils');

const logger = new Logger('roles');

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class Settings {
  constructor() {
    this._router = express.Router();
    this.settingsDynamo = new databaseModify('settings');

    this._router.get('/', checkJwt, getUserInfo, this.getSettings.bind(this));
  }
 
  /**
   * Returns the instace express router.
   *
   * @return Router Object - express router
   */
  get router() {
    return this._router;
  }

  async getSettings(req, res) {
    try {
      // log method
      logger.log(1, 'getSettings', 'Attempting to get settings');
      let settings = await this.settingsDynamo.getAllEntriesInDB();
      res.status(200).send(settings);
    } catch (err) {
      logger.log(0, 'getSettings', `Error getting settings: ${err}`);
      return res.status(500).json({ message: 'Error getting settings' });
    }
  }
}

module.exports = Settings;