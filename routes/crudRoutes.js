const express = require('express');
const _ = require('lodash');

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
        res.status(200).send(sendBack);
      }
    };
  }

  _inputChecker(objectToCheck, res) {
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
    if (_.isFunction(newObject)) {
      newObject((err, value) => {
        console.log('What...');
        this.jsonModify.addToJson(value, this._handleResponse(409, res));
        //TODO error checking
      });
    } else if (newObject.id) {
      if (!this._inputChecker(newObject, res)) {
        this.jsonModify.addToJson(newObject, this._handleResponse(409, res));
      }
    } else {
      const err = {
        message: newObject.msg
      }
      const error = this._handleResponse(422, res);
      error(err);
    }
  }

  read(req, res) {

    console.log("get request recieved");
    const output = this.jsonModify.readFromJson(req.params.id);
    if (output) {
      res.status(200).send(output);
    } else {
      const err = {
        message: 'READ: Object not found'
      };
      res.status(404).send({
        error: err.message
      });
    }
  }

  update(req, res) {
    const newObject = this._update(req.params.id, req.body);
    if (_.isFunction(newObject)) {
      newObject((err, value) => {
        this.jsonModify.updateJsonEntry(value, this._handleResponse(404, res));
      });
    } else if (newObject.id) {
      if (!this._inputChecker(newObject, res)) {
        this.jsonModify.updateJsonEntry(newObject, this._handleResponse(404, res));
      }
    } else {
      const err = {
        message: 'UPDATE: Object already exists'
      }
      const error = this._handleResponse(409, res);
      error(err);
    }
  }

  onDelete(req, res) {
    if (this.jsonModify.filePath === 'json/expense.json') {
      this._delete(req.params.id);
    }
    this.jsonModify.removeFromJson(req.params.id, this._handleResponse(404, res));
  }

  showList(req, res) {
    console.log("get request recieved for everything");
    const output = this.jsonModify.getJson();

    res.status(200).send(output);
  }

}
module.exports = Crud;
