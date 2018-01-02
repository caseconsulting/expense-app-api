const express = require('express');
const _ = require('lodash');
const AWS = require('aws-sdk');

class Crud {
  constructor(jsonModify, _uuid) {
    this.jsonModify = jsonModify;
    this._uuid = _uuid;
    this._router = express.Router();
    this._router.get('/', this.showList.bind(this));
    this._router.post('/', this.create.bind(this));
    this._router.get('/:id', this.read.bind(this));
    this._router.put('/:id', this.update.bind(this));
    this._router.delete('/:id', this.onDelete.bind(this));
    AWS.config.apiVersions = {
      dynamodb: '2012-08-10',
      // other service API versions
    };
    AWS.config.update({
      region: 'us-east-1'
    });
  }

  get router() {
    return this._router;
  }

  _handleResponse(errorCode, res) {
    return (err, sendBack) => {
      if (err) {
        res.status(errorCode)
          .send({
            error: err.message
          });
      } else {
        res.status(200)
          .send(sendBack);
      }
    };
  }

  //TODO make sure message is correct for create and update
  _inputChecker(res, objectToCheck) {
    const checkResult = _.includes(objectToCheck, "");
    if (checkResult) {
      let errorCall = this._handleResponse(406, res);
      errorCall({
        message: 'CREATE: All fields needed'
      });
    } else {
      return checkResult;
    }
  }

  create(req, res) {
    const newObject = this._add(this._uuid, req.body);
    console.log('***', newObject, '***');
    if (_.isFunction(newObject)) {
      newObject((err, value) => {
        console.log('What...');
        if (value) {
          if (!this._inputChecker(res, value)) {
            this.jsonModify.addToJson(value, this._handleResponse(422, res));
          }
        } else if (err) {
          const errMsg = {
            message: err.msg
          }
          const error = this._handleResponse(err.code, res);
          error(errMsg);
        }
      });
    } else if (newObject === null) {
      console.log('I should execute');
    } else if (newObject.id) {
      if (!this._inputChecker(res, newObject)) {
        this.jsonModify.addToJson(newObject, this._handleResponse(409, res));
      }
    } else {
      const err = {
        message: `Hmm.. Strange.. The request didn't match any of our cases ):
        Server Message: ${newObject.msg}`
      }
      console.log('Recieved request');
      const error = this._handleResponse(501, res);
      error(err);
    }
  }

  read(req, res) {
    return this.jsonModify.readFromJson(req.params.id)
      .then(function(output) {
        if (output) {
          console.log(output);
          res.status(200)
            .send(_.first(output));
        } else {
          const err = {
            message: 'READ: Object not found'
          };
        }
      })
      .catch(function(err) {
        console.log(err);
        res.status(500)
          .send({
            error: err.message
          });
      });
  }

  /**
   * Updates the object
   */
  _updateDatabase(res, newObject) {
    return this.jsonModify.updateJsonEntry(newObject)
      .then(function(data) {
        res.status(200)
          .send(data);
      })
      .catch(function(err) {
        console.log(err);
        res.status(500)
          .send(err);
      });
  }

  /**
   * Handles any errors in crud operations
   */
  _handleError(err) {
    // this._handleResponse(err.code, err.message);
    console.log(err);
  }

  /**
   * Validates the inputCheker
   * seperates cases based on newObject
   */
  _validateInputs(res, newObject) {
    if (_.isFunction(newObject)) {
      //Curry inputCheker so that you have access inside promise
      let inputCheckerCurried = _.curry(this._inputChecker)(res);
      return newObject((err, value) =>
        new Promise(function(resolve, reject) {
          if (value) {
            if (inputCheckerCurried.bind(this)(value)) {
              reject('New Object did not pass _inputChecker');
            }
            resolve(value);
          }
        }));
    } else if (newObject.id) {
      if (this._inputChecker(res, newObject)) {
        throw 'New Object did not pass _inputChecker';
      }
      console.log('New object with ID\n', newObject);
      return newObject;
    } else {
      throw 'my error';
    }
  }

  /**
   * update a specified entry
   */
  update(req, res) {
    let _validateInputsCurried = _.curry(this._validateInputs)(res);
    let _updateDatabaseCurried = _.curry(this._updateDatabase)(res);
    this._update(req.params.id, req.body)
      .then(_validateInputsCurried.bind(this))
      .then(_updateDatabaseCurried.bind(this))
      .catch(this._handleError);
  }

  /**
   * delete the specified entry
   */
  onDelete(req, res) {
    if (this.jsonModify.filePath === 'json/expense.json') {
      this._delete(req.params.id);
    }
    this.jsonModify.removeFromJson(req.params.id, this._handleResponse(404, res));
  }

  /**
   * Retrieve all items in a given list specified by request
   */
  showList(req, res) {
    console.log("get request recieved for everything");
    this.jsonModify.getJson()
      .then(function(data) {
        res.status(200)
          .send(data.Items);
      })
      .catch(function(err) {
        console.log(err);
        res.status(500)
          .send(err);
      });
  }
}
module.exports = Crud;