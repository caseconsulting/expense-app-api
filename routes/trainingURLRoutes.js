const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const _ = require('lodash');

const TrainingUrls = require('../models/trainingUrls');
const Logger = require('../js/Logger');
const logger = new Logger('trainingURLRoutes');

const atob = require('atob');

// const metascraper = require('metascraper')([
//   require('metascraper-description')(),
//   require('metascraper-image')(),
//   require('metascraper-logo')(),
//   require('metascraper-clearbit')(),
//   require('metascraper-publisher')(),
//   require('metascraper-title')(),
//   require('metascraper-url')()
// ]);

const got = require('got');

class TrainingURLRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new databaseModify('training-urls');
  }

  async _getMetaData(id) {
    let metadata = {};

    await got(id); // remove this line when including metascraper

    // try {
    //   const { body: html, url } = await got(id);
    //   metadata = await metascraper({ html, url });
    // } catch (err) {
    //   logger.error('_add', `>>> Failed to get metadata for ${id}`);
    // }
    return metadata;
  }

  async _create(data) {
    logger.log(1, '_add', `Attempting to add training url ${data.id} with category ${data.category}`);
    let metadata = await this._getMetaData(data.id);
    metadata.id = data.id;
    metadata.category = data.category;
    metadata.hits = data.hits;

    let trainingURL = new TrainingUrls(metadata);
    //trainingURL.id = url;

    return this._checkFields(trainingURL)
      .catch(err => {
        throw err;
      });
  }

  _checkFields(trainingURL) {
    logger.log(2, '_checkFields', 'Validating if the training url id exists and if the url has any hits');

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
    logger.log(2, '_getURLInfo', `Getting info for url ${req.params.id}`);

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

  async _read(data) {
    if (!data.category) {
    // category does not exist
      let categoryErr = {
        code: 403,
        message: 'Unable to read training url from database. Missing category.'
      };
      return Promise.reject(categoryErr);
    } else {
      let encodedId = data.id.replace(/%2F/g, '/');
      let decodedId = atob(encodedId);

      // category exists
      return this.databaseModify.getEntryUrl(decodedId, data.category); // read from database
    }
  }

  async _update(data) {
    let trainingURL = new TrainingUrls(data);

    logger.log(1, '_update', `Attempting to update url ${trainingURL.id} and category ${trainingURL.category}`);

    return this.databaseModify.getEntryUrl(trainingURL.id, trainingURL.category)
      .then(() => {
        return trainingURL;
      });
  }
}
module.exports = TrainingURLRoutes;
