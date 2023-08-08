var express = require('express');
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');

const logger = new Logger('roles');

// Authentication middleware. When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
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
