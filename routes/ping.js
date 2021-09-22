var express = require('express');

class Ping {
  //open route for checking server
  constructor() {
    this._router = express.Router();
    this._router.get('/', this.talkBack.bind(this));
  } // constructor

  /**
   * Returns the instace express router.
   *
   * @return Router Object - express router
   */
  get router() {
    return this._router;
  } // router

  /**
   * sends back response
   * 
   * @param req - api request
   * @param res - api response
   */
  talkBack(req, res) {
    res.status(200).send('I can hear you'); //sends back health res
  } // talkBack
} // Ping
module.exports = Ping; //exports class to be called outside
