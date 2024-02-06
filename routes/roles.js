var express = require('express');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils');

const logger = new Logger('roles');

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

class Roles {
  constructor() {
    this._router = express.Router();
    this._router.get('/role', checkJwt, getUserInfo, this.getUserRole.bind(this));
    this._router.get('/me', checkJwt, getUserInfo, this.getUser.bind(this));
  } // constructor

  /**
   * Returns the instace express router.
   *
   * @return Router Object - express router
   */
  get router() {
    return this._router;
  } // router

  /**
   * gets the user's role
   *
   * @param req - api request
   * @param res - api response
   */
  getUserRole(req, res) {
    logger.log(5, 'getUserRole', `Getting user role for user ${req.employee.id}`);

    if (req.employee.employeeRole) {
      res.status(200).send(req.employee.employeeRole);
    } else {
      res.status(404).send('entry not found in database');
    }
  } // getUserRole

  /**
   * gets the employee object for the user
   *
   * @param req - api request
   * @param res - api response
   */
  getUser(req, res) {
    logger.log(5, 'getUser', `Getting employee info for user ${req.employee.id}`);

    if (req.employee.employeeRole) {
      res.status(200).send(req.employee);
    } else {
      res.status(404).send('entry not found in database');
    }
  } // getUser
} // Roles

module.exports = Roles;
