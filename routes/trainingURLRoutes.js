const Crud = require('./crudRoutes');

const databaseModify = require('../js/databaseModify');
const trainingDynamo = new databaseModify('training-urls');

const moment = require('moment');
const _ = require('lodash');

const TrainingUrls = require('../models/trainingUrls');

class TrainingURLRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = trainingDynamo;
  }

  async _add(url, data) {
    console.warn(moment().format(), 'TrainingURL _add', `with URL ${url}`);

    let trainingURL = new TrainingUrls(data);
    trainingURL.id = url;

    console.log('URL', trainingURL);
    return this._checkFields(trainingURL)
      .then(() => this.databaseModify.addToDB(trainingURL))
      .catch(err => {
        throw err;
      });
  }

  _update(url, data) {
    var atob = require('atob');
    var decodedURL = atob(url);
    console.warn(moment().format(), 'Training URL _update', `for url ${decodedURL}`);

    let trainingURL = new TrainingUrls(data);
    trainingURL.id = decodedURL;

    return this.databaseModify
      .readFromDBURL(decodedURL)
      .then(() => {
        return trainingURL;
      })
      .catch(err => {
        throw err;
      });
  }

  _checkFields(trainingURL) {
    console.warn('Training URL Routes _checkFields');
    let idCheck = !!trainingURL.id;
    let hitsCheck = trainingURL.hits > 0;
    let valid = idCheck && hitsCheck;
    let err = {
      code: 403,
      message: 'One of the required fields is empty.'
    };
    return valid ? Promise.resolve() : Promise.reject(err);
  }

  //unused?
  getURLInfo(req, res) {
    console.warn(moment().format(), 'Training URL route getURLINFO', `with URL ${req.params.id}`);
    const NOT_FOUND = {
      code: 404,
      message: 'entry not found in database'
    };

    return this.databaseModify
      .readFromDBURL(req.params.id)
      .then(output => {
        if (_.first(output)) {
          res.status(200).send(_.first(output));
        } else if (output === null) {
          res.status(200).send(null);
        } else {
          let err = NOT_FOUND;
          throw err;
        }
      })
      .catch(err => this._handleError(res, err));
  }
}
module.exports = TrainingURLRoutes;
