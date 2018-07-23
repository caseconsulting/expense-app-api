const express = require('express');
const _ = require('lodash');
const uuid = require('uuid/v4');
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

const request = require('request');
const getUserInfo = (req, res, next) => {
  let options = {
    method: 'GET',
    url: 'https://consultwithcase.auth0.com/userInfo',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      Authorization: req.headers.authorization
    }
  };

  request(options, error => {
    if (error) {
      throw new Error(error);
    }
  });

  next(); //$$$ PROFIT $$$💰
};

class Crud {
  constructor(databaseModify) {
    this.databaseModify = databaseModify;
    this._router = express.Router();
    this._router.get('/', checkJwt, getUserInfo, this.showList.bind(this));
    this._router.post('/', this.create.bind(this));
    this._router.get('/:id', this.read.bind(this));
    this._router.put('/:id', this.update.bind(this));
    this._router.delete('/:id', this.onDelete.bind(this));
  }

  get router() {
    return this._router;
  }

  /**
   * Checks to see if objectToCheck has any blank fields
   * @param objectToCheck the object to validate
   * @return true if the object contains empty strings,
   *   false if objectToCheck was valid
   */
  _inputChecker(objectToCheck) {
    //Check if there are any strings
    const checkResult = _.includes(objectToCheck, '');
    //Check result is true only if there is an error
    return checkResult;
  }

  /**
   * Handles any errors in crud operations
   */
  _handleError(res, err) {
    const logColor = '\x1b[31m';
    const resetColor = '\x1b[0m';
    console.error(logColor, 'Error Code: ' + err.code);
    console.error(logColor, 'Error Message: ' + err.message);
    console.error(resetColor);
    return res.status(err.code).send(err);
  }

  /**
   * Validates the inputCheker
   * seperates cases based on newObject
   */
  _validateInputs(res, newObject) {
    if (newObject.id) {
      let inputCheckerCurried = _.curry(this._inputChecker);
      return new Promise(function(resolve, reject) {
        if (inputCheckerCurried.bind(this)(newObject)) {
          let err = {
            code: 406, //Not Acceptable
            message: 'All fields are needed'
          };
          reject(err);
        }
        resolve(newObject);
      });
    } else {
      throw {
        code: 400, //Bad Request
        message: 'input validation error'
      };
    }
  }

  _createInDatabase(res, newObject) {
    return this.databaseModify
      .addToDB(newObject)
      .then(data => {
        res.status(200).send(data);
      })
      .catch(err => this._handleError(res, err));
  }

  /**
   * Creates the object in the database
   */
  create(req, res) {
    return this._add(uuid(), req.body)
      .then(newObject => this._validateInputs(res, newObject))
      .then(validated => this._createInDatabase(res, validated))
      .catch(err => this._handleError(res, err));
  }

  /* eslint-disable no-unused-vars */
  _add(uuid, body) {
    //This function must be overwritten
    //soley for supa secret testing purposes
    //because inheritance is tricky to test
    //https://gph.is/1H1lkH0
  }

  _update(uuid, body) {
    //This function must be overwritten
  }

  _delete(uuid) {
    //This function must be overwritten
  }
  /* eslint-enable no-unused-vars */

  read(req, res) {
    return this.databaseModify
      .readFromDB(req.params.id)
      .then(output => {
        if (_.first(output)) {
          res.status(200).send(_.first(output));
        } else {
          let err = {
            code: 404,
            message: 'entry not found in database'
          };
          throw err;
        }
      })
      .catch(err => this._handleError(res, err));
  }

  /**
   * Updates the object
   */
  _updateDatabase(res, newObject) {
    return this.databaseModify
      .updateEntryInDB(newObject)
      .then(data => {
        res.status(200).send(data);
      })
      .catch(err => this._handleError(res, err));
  }

  /**
   * update a specified entry
   */
  update(req, res) {
    return this._update(req.params.id, req.body)
      .then(newObject => this._validateInputs(res, newObject))
      .then(validated => this._updateDatabase(res, validated))
      .catch(err => this._handleError(res, err));
  }

  /**
   * delete the specified entry
   */
  onDelete(req, res) {
    if (this.databaseModify.tableName === 'Expense') {
      this._delete(req.params.id)
        .then(value => value)
        .catch(error => error);
    }
    return this.databaseModify
      .removeFromDB(req.params.id)
      .then(data => {
        res.status(200).send(data);
      })
      .catch(err => this._handleError(res, err));
  }

  /**
   * Retrieve all items in a given list specified by request
   */
  showList(req, res) {
    return this.databaseModify
      .getAllEntriesInDB()
      .then(data => res.status(200).send(data))
      .catch(err => this._handleError(res, err));
  }
}

module.exports = Crud;
