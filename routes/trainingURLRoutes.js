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
    console.warn(
      `[${moment().format()}]`,
      `>>> Attempting to add training url ${url} with category ${data.category}`,
      '| Processing handled by function trainingURLRoutes._add'
    );

    let trainingURL = new TrainingUrls(data);
    trainingURL.id = url;

    return this._checkFields(trainingURL)
      .then(() => this.databaseModify.addToDB(trainingURL))
      .catch(err => {
        throw err;
      });
  }

  _update(id, category, data) {

    var atob = require('atob');
    var decodedURL = atob(id);

    let trainingURL = new TrainingUrls(data);
    trainingURL.id = decodedURL;
    trainingURL.category = category;

    console.warn(
      `[${moment().format()}]`,
      `Attempting to update url ${trainingURL.id} and category ${trainingURL.category}`,
      '| Processing handled by function trainingURLRoutes._update'
    );

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
    console.warn(
      `[${moment().format()}]`,
      'Validating if the training url id exists and if the url has any hits',
      '| Processing handled by function trainingURLRoutes.checkFields'
    );

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
    console.warn(
      `[${moment().format()}]`,
      `Getting info for url ${req.params.id}`,
      '| Processing handled by function trainingURLRoutes.getURLInfo'
    );

    const NOT_FOUND = {
      code: 404,
      message: 'entry not found in database'
    };

    return this.databaseModify
      .readFromDBURL(req.params.id)
      .then(output => {
        if (output) {
          res.status(200).send(_.first(output));
        } else if (output === null) {
          res.status(200).send(null);
        } else {
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
