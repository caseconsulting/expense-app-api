var express = require('express');

class Ping {
  constructor() {
    this._router = express.Router();
    this._router.get('/', this.talkBack.bind(this));
  }

  get router() {
    return this._router;
  }

  talkBack(req, res) {
    res.status(200).send('I can hear you');
  }
}
module.exports = Ping;
