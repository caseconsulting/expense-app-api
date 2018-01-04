const express = require('express');
const _ = require('lodash');
const uuid = require('uuid/v4');

class Crud {
  constructor(databaseModify) {
    this.databaseModify = databaseModify;
    this._router = express.Router();
    this._router.get('/', this.showList.bind(this));
    this._router.post('/', this.create.bind(this));
    this._router.get('/:id', this.read.bind(this));
    this._router.put('/:id', this.update.bind(this));
    this._router.delete('/:id', this.onDelete.bind(this));
  }

  get router() {
    return this._router;
  }

  _handleResponse(errorCode, res) {
    return (err, sendBack) => {
      if (err) {
        res.status(errorCode).send({
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
    //Check result only has something if there is an error
    if (checkResult) {
      let errorCall = this._handleResponse(406, res);
      errorCall({
        message: 'CREATE: All fields needed'
      });
    } else {
      return checkResult;
    }
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
    console.log('New object inside validateinputs\n', newObject);
    let inputCheckerCurried = _.curry(this._inputChecker)(res);
    if (newObject.id) {
      return new Promise(function(resolve, reject) {
        if (inputCheckerCurried.bind(this)(newObject)) {
          reject('New Object did not pass _inputChecker');
        }
        console.log('New object with ID\n', newObject);
        resolve(newObject);
      });
    } else {
      throw 'my error';
    }
  }


  _createInDatabase(res, newObject) {
    console.log("*** Hello Create ***");
    return this.databaseModify.addToDB(newObject)
      .then(function(data) {
        res.status(200).send(data);
      })
      .catch(function(err) {
        console.log(err);
        res.status(500).send(err);
      });
  }

  /**
   * Creates the object in the database
   */
  create(req, res) {
    this._add(uuid(), req.body)
      .then((newObject) => this._validateInputs(res, newObject))
      .then((validated) => this._createInDatabase(res, validated))
      .catch(this._handleError)
  }

  read(req, res) {
    return this.databaseModify.readFromDB(req.params.id)
      .then(function(output) {
        res.status(200).send(_.first(output));
      })
      .catch(function(err) {
        console.log(err);
        res.status(500).send(err);
      });
  }

  /**
   * Updates the object
   */
  _updateDatabase(res, newObject) {
    return this.databaseModify.updateEntryInDB(newObject)
      .then(function(data) {
        res.status(200).send(data);
      })
      .catch(function(err) {
        console.log(err);
        res.status(500).send(err);
      });
  }

  /**
   * update a specified entry
   */
  update(req, res) {
    return this._update(req.params.id, req.body)
      .then((newObject) => this._validateInputs(res, newObject))
      .then((validated) => this._updateDatabase(res, validated))
      .catch(this._handleError);
  }

  /**
   * delete the specified entry
   */
  onDelete(req, res) {
    if (this.databaseModify.filePath === 'json/expense.json') {
      this._delete(req.params.id);
    }
    return this.databaseModify.removeFromDB(req.params.id)
      .then(function(data) {
        res.status(200).send(data);
      })
      .catch(function(err) {
        console.log(err);
        res.status(500).send(err);
      });
  }

  /**
   * Retrieve all items in a given list specified by request
   */
  showList(req, res) {
    this.databaseModify.getAllEntriesInDB()
      .then(function(data) {
        res.status(200).send(data.Items);
      })
      .catch(function(err) {
        console.log(err);
        res.status(500).send(err);
      });
  }
}

module.exports = Crud;