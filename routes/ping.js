var express = require('express');

class Ping {
  //open route for checking server
  constructor() {
    this._router = express.Router();
    this._router.get('/', this.talkBack.bind(this));
  }

  get router() {
    return this._router;
  }

  talkBack(req, res) {
    res.status(200).send('I can hear you'); //sends back health res
  }
}
module.exports = Ping; //exports class to be called outside
