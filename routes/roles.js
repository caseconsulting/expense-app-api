var express = require('express');

const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
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
  }

  get router() {
    return this._router;
  }
  getUserRole(req, res) {
    if (req.employee.employeeRole) {
      res.status(200).send(req.employee.employeeRole);
    } else {
      res.status(404).send('entry not found in database');
    }
  }
  getUser(req, res) {
    if (req.employee.employeeRole) {
      res.status(200).send(req.employee);
    } else {
      res.status(404).send('entry not found in database');
    }
  }
}
module.exports = Roles;
