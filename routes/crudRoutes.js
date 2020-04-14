const express = require('express');
const _ = require('lodash');
const uuid = require('uuid/v4');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
const TrainingUrls = require('../models/trainingUrls');
const STAGE = process.env.STAGE;
const Logger = require('../js/Logger');
const logger = new Logger('crudRoutes');
const moment = require('moment');
//const IsoFormat = 'YYYY-MM-DD';


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

  /* eslint-disable no-unused-vars */
  _add(uuid, body) {
    //This function must be overwritten
    //soley for supa secret testing purposes
    //because inheritance is tricky to test
    //https://gph.is/1H1lkH0
  }
  /* eslint-enable no-unused-vars */

  _checkPermissionForOnDelete(req) {
    logger.log(3, '_checkPermissionForOnDelete', 'Checking permissions for on delete');

    return this._isUser(req) && this._checkTableName(['expenses']);
  }

  _checkPermissionForShowList(req) {
    logger.log(3, '_checkPermissionForShowList', 'Checking permissions for show list');

    return this._isAdmin(req) || this._checkTableName(['expense-types', 'employees']);
  }

  /**
   * checks to see if the current table name is in the list of vaild table names
   *
   * @return true if found and false if the current table name is not in the list
   */
  _checkTableName(listOfValidTables) {
    logger.log(3, '_checkTableName', 'Checking if current table name is in list of valid tables');

    let foundItem = _.find(listOfValidTables, tableName => this.databaseModify.tableName === `${STAGE}-${tableName}`);
    return foundItem != undefined;
  }

  /**
  * Creates the object in the database
  */
  create(req, res) {
    logger.log(3, 'create', 'Creating object');

    if (this._validPermissions(req)) {
      let id = this._getTableName() === `${STAGE}-training-urls` ? req.body.id : uuid();
      return this._add(id, req.body)
        .then(newObject => this._validateInputs(res, newObject))
        .then(validated => this._createInDatabase(res, validated))
        .catch(err => {this._handleError(res, err);});
    } else {
      let err = {
        code: 403,
        message: 'Unable to create object in database due to insufficient user permissions'
      };
      this._handleError(res, err);
    }
  }

  _createInDatabase(res, newObject) {
    logger.log(3, '_createInDatabase', 'Creating object in database');

    return this.databaseModify
      .addToDB(newObject)
      .then(data => {
        if (newObject instanceof TrainingUrls) {
          logger.log(1, '_createInDatabase',
            `Successfully added ${newObject.id} with category ${newObject.category} to database`
          );
        } else {
          logger.log(1, '_createInDatabase',
            `Successfully added ${newObject.id} to database`
          );
        }
        res.status(200).send(data);
      })
      .catch(err => this._handleError(res, err));
  }

  /* eslint-disable no-unused-vars */
  _delete(uuid) {
    //This function must be overwritten
  }
  /* eslint-enable no-unused-vars */

  _getBudgetDates(hireDate) {
    logger.log(3, '_getBudgetDates', `Getting budget dates for ${hireDate}`);

    let anniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
    let anniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
    let anniversaryYear = moment(hireDate, 'YYYY-MM-DD').year();
    const anniversaryComparisonDate = moment([anniversaryYear, anniversaryMonth, anniversaryDay]);
    let startYear;
    const today = moment();

    if (anniversaryComparisonDate.isBefore(today)) {
      startYear = today.isBefore(moment([today.year(), anniversaryMonth, anniversaryDay]))
        ? today.year() - 1
        : today.year();

    } else {
      startYear = anniversaryYear;
    }

    let startDate = moment([startYear, anniversaryMonth, anniversaryDay]);
    let endDate = moment([startYear, anniversaryMonth, anniversaryDay])
      .add('1', 'years')
      .subtract('1', 'days');

    return {
      startDate,
      endDate
    };
  }

  _getTableName() {
    logger.log(3, '_getTableName', 'Getting table name');

    return this.databaseModify.tableName;
  }

  /**
  * Handles any errors in crud operations
  */
  _handleError(res, err) {
    logger.error('_handleError', `Error code: ${err.code}. ${err.message}`);

    return res.status(err.code).send(err);
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

  _isAdmin(req) {
    logger.log(3, '_isAdmin', 'Checking if user role is admin');

    return req.employee.employeeRole === 'admin';
  }

  _isUser(req) {
    logger.log(3, '_isAdmin', 'Checking if user role is user');

    return req.employee.employeeRole === 'user';
  }

  /**
  * delete the specified entry
  */
  onDelete(req, res) {
    logger.log(3, 'onDelete', 'Deleting specific entry');

    if (this._isAdmin(req)) {
      if (this._checkTableName(['expenses', 'expense-types', 'employees'])) {
        //TODO: should this promise be returned? Did not return before
        this._onDeleteHelper(req.params.id, res);
      } else {
        return this.databaseModify
          .removeFromDB(req.params.id)
          .then(data => {
            logger.log(1, 'onDelete', `Successfully deleted ${req.params.id} from database`);

            res.status(200).send(data);
          })
          .catch(err => this._handleError(res, err));
      }
    } else if (this._checkPermissionForOnDelete(req)) {
      this._onDeleteHelper(req.params.id, res);
    } else {
      let err = {
        code: 403,
        message: 'Unable to delete object in database due to insufficient user permissions'
      };
      this._handleError(res, err);
    }
  }

  _onDeleteHelper(id, res) {
    logger.log(3, '_onDeleteHelper', 'Helping delete');

    return this._delete(id)
      .then(value => {
        logger.log(1, '_onDeleteHelper', `Successfully deleted ${id} from database`);

        res.status(200).send(value);
      })
      .catch(error => this._handleError(res, error));
  }

  read(req, res) {
    logger.log(3, 'read', 'Reading object');

    const FORBIDDEN = {
      code: 403,
      message: 'Unable to get objects from database due to insufficient user permissions'
    };
    const NOT_FOUND = {
      code: 404,
      message: 'entry not found in database'
    };
    //added for the training-urls table (not sure if works will have to be tested)
    if (this._getTableName() === `${STAGE}-training-urls`) {
      return this.databaseModify.readFromDBURL(req.params.id).then(output => {
        if (_.first(output)) {
          res.status(200).send(_.first(output));
        } else {
          let err = NOT_FOUND;
          throw err;
        }
      })
        .catch(err => this._handleError(res, err));
    } else if (this._isAdmin(req)) {
      return this.databaseModify.readFromDB(req.params.id).then(output => {
        if (_.first(output)) {
          res.status(200).send(_.first(output));
        } else {
          let err = NOT_FOUND;
          throw err;
        }
      })
        .catch(err => this._handleError(res, err));
    } else if (this._getTableName() === `${STAGE}-expenses` && this._isUser(req)) {
      return this.databaseModify.readFromDB(req.params.id).then(expense => {
        if (_.first(expense).userId === req.employee.id) {
          logger.log(2, 'read', `Read from table ${this._getTableName()} for employee ${req.employee.id}`);

          res.status(200).send(_.first(expense));
        } else {
          let err = FORBIDDEN;
          this._handleError(res, err);
        }
      });
    } else if (this._getTableName() === `${STAGE}-expense-types` && this._isUser(req)) {
      return this.databaseModify.readFromDB(req.params.id).then(output => {
        if (_.first(output)) {
          logger.log(2, 'read', `Read from table ${this._getTableName()} for employee ${req.employee.id}`);

          res.status(200).send(_.first(output));
        } else {
          let err = NOT_FOUND;
          throw err;
        }
      }).catch(err => this._handleError(res, err));
    } else {
      let err = FORBIDDEN;
      return this._handleError(res, err);
    }
  }

  /**
  * Retrieve all items in a given list specified by request
  */
  showList(req, res) {
    logger.log(3, 'showList', 'Retrieving all items in a given list');

    let hasPermission = this._checkPermissionForShowList(req);
    if (hasPermission) {
      return this.databaseModify
        .getAllEntriesInDB()
        .then(data => res.status(200).send(data))
        .catch(err => this._handleError(res, err));
    } else {
      let err = {
        code: 403,
        message: 'Unable to get objects from database due to insufficient user permissions'
      };
      this._handleError(res, err);
    }
  }

  /* eslint-disable no-unused-vars */
  _update(uuid, body) {
    //This function must be overwritten
  }
  /* eslint-enable no-unused-vars */

  /**
  * update a specified entry
  */
  update(req, res) {
    logger.log(3, 'update', 'Updating object');

    if (this._validPermissions(req)) {
      if (this._getTableName() === `${STAGE}-training-urls`) {
        return this._update(req.body.id, req.body.category, req.body)
          .then(newObject => this._validateInputs(res, newObject))
          .then(validated => this._updateDatabase(res, validated))
          .catch(err => this._handleError(res, err));
      } else {
        return this._update(req.params.id, req.body)
          .then(newObject => this._validateInputs(res, newObject))
          .then(validated => this._updateDatabase(res, validated))
          .catch(err => this._handleError(res, err));
      }
    } else {
      let err = {
        code: 403,
        message: 'Unable to update object in database due to insufficient user permissions'
      };
      this._handleError(res, err);
    }
  }

  /**
  * Updates the object
  */
  _updateDatabase(res, newObject) {
    logger.log(3, '_updateDatabase', 'Updating object in database');

    return this.databaseModify
      .updateEntryInDB(newObject)
      .then(data => {
        if (newObject instanceof TrainingUrls) {
          logger.log(1, '_updateDatabase',
            `Successfully updated ${newObject.id} with category ${newObject.category} to database`
          );
        } else {
          logger.log(1, '_updateDatabase', `Successfully updated ${newObject.id} from database`);
        }
        res.status(200).send(data);
      })
      .catch(err => this._handleError(res, err));
  }

  /**
   * Validates the inputChecker
   * seperates cases based on newObject
   */
  _validateInputs(res, newObject) {
    logger.log(2, '_validateInputs', 'Validating input for database fields');

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

  _validPermissions(req) {
    logger.log(3, '_validPermissions', 'Validating permissions');

    return (this._isAdmin(req) && this._checkTableName(['expense-types', 'employees', 'expenses', 'training-urls']))
    || (this._isUser(req) && this._checkTableName(['expenses', 'training-urls'])) ;
  }
}

module.exports = Crud;
