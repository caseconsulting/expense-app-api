var express = require('express');

const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
// const jwtAuthz = require('express-jwt-authz');
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
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

class Roles{
  constructor(){
    this._router = express.Router();
    this._router.get('/',checkJwt, getUserInfo, this.getUserRole.bind(this));
  }

  get router() {
    return this._router;
  }
  getUserRole(req,res){
    if(req.employee.role){
      res.status(200).send(req.employee.role);
    }
    else{
      res.status(404).send('entry not found in database');
    }
  }
}
module.exports = Roles;
