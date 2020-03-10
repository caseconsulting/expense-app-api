const Crud = require('./crudRoutes');

const databaseModify = require('../js/databaseModify');
const trainingDynamo = new databaseModify('training-urls');

const _ = require('lodash');

const TrainingUrls = require('../models/trainingUrls');
const Util = require('../js/Util');
const util = new Util('trainingURLRoutes');


class TrainingURLRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = trainingDynamo;
  }

  async _add(url, data) {
    util.log(1, '_add', `Attempting to add training url ${url} with category ${data.category}`);

    let trainingURL = new TrainingUrls(data);
    trainingURL.id = url;

    return this._checkFields(trainingURL)
      .then(() => this.databaseModify.addToDB(trainingURL))
      .catch(err => {
        throw err;
      });
  }

  _checkFields(trainingURL) {
    util.log(2, '_checkFields', 'Validating if the training url id exists and if the url has any hits');

    let idCheck = !!trainingURL.id;
    let hitsCheck = trainingURL.hits > 0;
    let valid = idCheck && hitsCheck;
    let err = {
      code: 403,
      message: 'One of the required fields is invalid'
    };

    return valid ? Promise.resolve(trainingURL) : Promise.reject(err);
  }

  //unused?
  _getURLInfo(req, res) {
    util.log(2, '_getURLInfo', `Getting info for url ${req.params.id}`);

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

  _update(id, category, data) {
    var atob = require('atob');
    var decodedURL = atob(id);

    let trainingURL = new TrainingUrls(data);
    trainingURL.id = decodedURL;
    trainingURL.category = category;

    util.log(1, '_update', `Attempting to update url ${trainingURL.id} and category ${trainingURL.category}`);

    return this.databaseModify
      .readFromDBURL(decodedURL, category)
      .then(() => {
        return trainingURL;
      })
      .catch(err => {
        throw err;
      });
  }
}
module.exports = TrainingURLRoutes;
