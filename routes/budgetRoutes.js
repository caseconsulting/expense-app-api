const express = require('express');
// const _ = require('lodash');
const databaseModify = require('../js/databaseModify');
const budgetDynamo = new databaseModify('budgets');

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
    jwksUri: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: process.env.VUE_APP_AUTH0_AUDIENCE,
  issuer: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});
class Budgets {
  constructor(){
    this.budgetDynamo = budgetDynamo;
    this._router = express.Router();
    this._router.get('/user/:id', checkJwt, getUserInfo, this.getBudgetByUser.bind(this));
    this._router.get('/', checkJwt, getUserInfo, this.getCaller.bind(this));
  }
  get router() {
    return this._router;
  }

  getBudgetByUser(req, res) {
    if (this._isAdmin(req)) {
      return this.budgetDynamo
        .querySecondaryIndexInDB('userId-expenseTypeId-index', 'userId', req.params.id)
        .then(data => {
          return res.status(200).send(data);
        })
        .catch(err => {
          throw err;
        });
    }
  }

  getCaller(req, res) {
    return this.budgetDynamo
      .querySecondaryIndexInDB('userId-expenseTypeId-index', 'userId', req.employee.id)
      .then(data => {
        return data ? res.status(200).send(data) : res.status(200).send([]);
      })
      .catch(err => {
        throw err;
      });
  }

  _isAdmin(req) {
    return req.employee.employeeRole === 'admin';
  }
}

module.exports = Budgets;
