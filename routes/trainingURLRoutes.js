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

    return this._checkFields(trainingURL)
      .then(() => this.databaseModify.addToDB(trainingURL))
      .catch(err => {
        throw err;
      });
  }

  _update(id, category, data) {
    console.log('url', id);
    var atob = require('atob');
    var decodedURL = atob(id);
    console.warn(moment().format(), 'Training URL _update', `for url ${decodedURL}`, `and category ${category}`);

    let trainingURL = new TrainingUrls(data);
    trainingURL.id = decodedURL;
    trainingURL.category = category;

    return this.databaseModify
      .readFromDBURL(decodedURL, category)
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
        console.log('made it here');
        if (output) {
          console.log('made it here1');
          res.status(200).send(_.first(output));
        } else if (output === null) {
          console.log('made it here2');
          res.status(200).send(null);
        } else {
          console.log('made it here3');
          let err = NOT_FOUND;
          throw err;
        }
        // if (_.first(output)) {
        //   res.status(200).send(_.first(output));
        // } else if (output === null) {
        //   res.status(200).send(null);
        // } else {
        //   let err = NOT_FOUND;
        //   throw err;
        // }
      })
      .catch(err => this._handleError(res, err));
  }
}
module.exports = TrainingURLRoutes;
