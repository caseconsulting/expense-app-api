const express = require('express');
const _ = require('lodash');
const uuid = require('uuid/v4');
const moment = require('moment');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
const STAGE = process.env.STAGE;
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

class Crud {
  constructor() {
    this._router = express.Router();
    this._router.get('/', checkJwt, getUserInfo, this.showList.bind(this));
    this._router.post('/', checkJwt, getUserInfo, this.create.bind(this));
    this._router.get('/:id', checkJwt, getUserInfo, this.read.bind(this));
    this._router.put('/:id', checkJwt, getUserInfo, this.update.bind(this));
    this._router.put('/:id/:category', checkJwt, getUserInfo, this.update.bind(this));
    this._router.delete('/:id', checkJwt, getUserInfo, this.onDelete.bind(this));
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
    console.warn(`[${moment().format()}]`,
      'Handling errors',
      '| Processing handled by function crudRoutes._handleError'
    );

    const logColor = '\x1b[31m';
    const resetColor = '\x1b[0m';
    console.error(logColor, 'Error Code: ' + err.code);
    console.error(logColor, 'Error Message: ' + err.message);
    console.error(resetColor);
    return res.status(err.code).send(err);
  }

  /**
   * Validates the inputChecker
   * seperates cases based on newObject
   */
  _validateInputs(res, newObject) {
    console.warn(`[${moment().format()}]`,
      'Validating input checker',
      '| Processing handled by function crduRoutes._validateInputs'
    );

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
        console.warn(`[${moment().format()}]`,
          `Successfully added ${newObject.id} to database`,
          '| Processing handled by function crudRoutes._createInDatabase'
        );
        res.status(200).send(data);
      })
      .catch(err => this._handleError(res, err));
  }

  /**
   * Creates the object in the database
   */
  create(req, res) {
    // console.warn(`[${moment().format()}]`,
    //   'Creating object',
    //   '| Processing handled by function crudRoutes.create'
    // );

    //added for creating a new training-urls entry
    if (this._getTableName() === `${STAGE}-training-urls`) {
      return this._add(req.body.id, req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._createInDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else if (req.employee.employeeRole === 'admin' && this._getTableName() === '') {
      return this._add(uuid(), req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._createInDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else if (this._isAdmin(req) && this._getTableName() !== '') {
      return this._add(uuid(), req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._createInDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else if (!this._isAdmin(req) && this._getTableName() === `${STAGE}-expenses`) {
      return this._add(uuid(), req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._createInDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else {
      let err = {
        code: 403,
        message: 'Unable to create object in database due to insufficient user permissions'
      };
      this._handleError(res, err);
    }
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
    // console.warn(`[${moment().format()}]`,
    //   'Reading object',
    //   '| Processing handled by function crudRoutes.read'
    // );

    const FORBIDDEN = {
      code: 403,
      message: 'Unable to get objects from database due to insuffieicient user permissions'
    };
    const NOT_FOUND = {
      code: 404,
      message: 'entry not found in database'
    };
    //added for the training-urls table (not sure if works will have to be tested)
    if (this._getTableName() === `${STAGE}-training-urls`) {
      return this.databaseModify
        .readFromDBURL(req.params.id)
        .then(output => {
          if (_.first(output)) {
            res.status(200).send(_.first(output));
          } else {
            let err = NOT_FOUND;
            throw err;
          }
        })
        .catch(err => this._handleError(res, err));
    } else if (this._isAdmin(req)) {
      return this.databaseModify
        .readFromDB(req.params.id)
        .then(output => {
          if (_.first(output)) {
            res.status(200).send(_.first(output));
          } else {
            let err = NOT_FOUND;
            throw err;
          }
        })
        .catch(err => this._handleError(res, err));
    } else if (this._getTableName() === `${STAGE}-expenses` && !this._isAdmin(req)) {
      this.databaseModify.readFromDB(req.params.id).then(expense => {
        if (_.first(expense).userId === req.employee.id) {
          console.warn(
            moment().format(),
            'crudRoutes _read',
            `from table ${this._getTableName()} for employee ${req.employee.id}`
          );
          res.status(200).send(_.first(expense));
        } else {
          let err = FORBIDDEN;
          this._handleError(res, err);
        }
      });
    } else if (this._getTableName() === `${STAGE}-expense-types` && !this._isAdmin(req)) {
      this.databaseModify
        .readFromDB(req.params.id)
        .then(output => {
          if (_.first(output)) {
            console.warn(
              moment().format(),
              'crudRoutes _read',
              `from table ${this._getTableName()} for employee ${req.employee.id}`
            );
            res.status(200).send(_.first(output));
          } else {
            let err = NOT_FOUND;
            throw err;
          }
        })
        .catch(err => this._handleError(res, err));
    } else {
      let err = FORBIDDEN;
      this._handleError(res, err);
    }
  }

  /**
   * Updates the object
   */
  _updateDatabase(res, newObject) {
    // console.warn(`[${moment().format()}]`,
    //   'Updating database',
    //   '| Processing handled by function crudRoutes._updateDatabase'
    // );

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
    // console.warn(`[${moment().format()}]`,
    //   'Updating object',
    //   '| Processing handled by function crudRoutes.update'
    // );

    //added if statement for training-url table
    if (this._getTableName() === `${STAGE}-training-urls`) {
      console.warn('id', req.body.id);
      return this._update(req.body.id, req.body.category, req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._updateDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else if (req.employee.employeeRole === 'admin' && this._getTableName() === `${STAGE}-employees`) {
      return this._update(req.params.id, req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._updateDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else if (this._isAdmin(req) && this._getTableName() !== `${STAGE}-employees`) {
      return this._update(req.params.id, req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._updateDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else if (!this._isAdmin(req) && this._getTableName() === `${STAGE}-expenses`) {
      return this._update(req.params.id, req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._updateDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else if (!this._isAdmin(req) && this._getTableName() === `${STAGE}-expenses`) {
      return this._update(req.params.id, req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._updateDatabase(res, validated))
        .catch(err => this._handleError(res, err));
    } else {
      let err = {
        code: 403,
        message: 'Unable to update object in database due to insufficient user permissions'
      };
      this._handleError(res, err);
    }
  }

  /**
   * delete the specified entry
   */
  onDelete(req, res) {
    //console.warn(moment().format(), 'CRUD routes onDelete');

    if (this._isAdmin(req)) {
      if (this._checkTableName(['expenses', 'expense-types', 'employees'])) {
        //TODO: should this promise be returned? Did not return before
        this._onDeleteHelper(req.params.id, res);
      } else {
        return this.databaseModify
          .removeFromDB(req.params.id)
          .then(data => {
            console.warn(`[${moment().format()}]`,
              `Successfully deleted ${req.params.id} from database`,
              '| Processing handled by function crudRoutes.onDelete'
            );
            res.status(200).send(data);
          })
          .catch(err => this._handleError(res, err));
      }
    } else if (this._checkPermissionForOnDelete(req)) {
      this._onDeleteHelper(req.params.id, res);
    } else {
      let err = {
        code: 403,
        message: 'Unable to delete object in database due to insuffieicient user permissions'
      };
      this._handleError(res, err);
    }
  }
  _onDeleteHelper(id, res) {
    //console.warn('CRUD routes _onDeleteHelper');

    return this._delete(id)
      .then(value => {
        console.warn(`[${moment().format()}]`,
          `Successfully deleted ${id} from database`,
          '| Processing handled by function crudRoutes.onDelete'
        );
        res.status(200).send(value);
      })
      .catch(error => this._handleError(res, error));
  }
  // checks to see if the current table name is in the list of vaild table names
  // returns true if found and false if the current table name is not in the list
  _checkTableName(listOfValidTables) {
    let foundItem = _.find(listOfValidTables, tableName => this.databaseModify.tableName === `${STAGE}-${tableName}`);
    return foundItem != undefined;
  }

  _checkPermissionForOnDelete(req) {
    return this._isUser(req) && this._checkTableName(['expenses']);
  }
  /**
   * Retrieve all items in a given list specified by request
   */
  showList(req, res) {
    // console.warn(`[${moment().format()}]`,
    //   'Displaying expense type list',
    //   '| Processing handled by function crudRoutes.showList'
    // );

    let hasPermission = this._checkPermissionForShowList(req);
    if (hasPermission) {
      return this.databaseModify
        .getAllEntriesInDB()
        .then(data => res.status(200).send(data))
        .catch(err => this._handleError(res, err));
    } else {
      let err = {
        code: 403,
        message: 'Unable to get objects from database due to insuffieicient user permissions'
      };
      this._handleError(res, err);
    }
  }

  _checkPermissionForShowList(req) {
    return this._isAdmin(req) || this._checkTableName(['expense-types', 'employees']);
  }

  _getTableName() {
    return this.databaseModify.tableName;
  }
  _isAdmin(req) {
    return req.employee.employeeRole === 'admin';
  }
  _isUser(req) {
    return req.employee.employeeRole === 'user';
  }
}

module.exports = Crud;
