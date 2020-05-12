const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const got = require('got');
const Logger = require('../js/Logger');
const TrainingUrl = require('../models/trainingUrls');
// const moment = require('moment');
// const _ = require('lodash');

const atob = require('atob');
const logger = new Logger('trainingUrlRoutes');

// const metascraper = require('metascraper')([
//   require('metascraper-description')(),
//   require('metascraper-image')(),
//   require('metascraper-logo')(),
//   require('metascraper-clearbit')(),
//   require('metascraper-publisher')(),
//   require('metascraper-title')(),
//   require('metascraper-url')()
// ]);

class TrainingUrlRoutes extends Crud {

  constructor() {
    super();
    this.databaseModify = new DatabaseModify('training-urls');
  } // constructor

  /**
   * Prepares a training url to be created. Returns the training url if it can be successfully created.
   *
   * @param data - data of training url
   * @return TrainingUrls - training url prepared to create
   */
  async _create(data) {
    // log method
    logger.log(2, '_create', `Preparing to create training url ${data.id} with category ${data.category}`);

    // compute method
    let metadata = await this._getMetaData(data.id);
    metadata.id = data.id;
    metadata.category = data.category;
    metadata.hits = data.hits;

    let trainingUrl = new TrainingUrl(metadata);

    return this._validateTrainingUrl(trainingUrl) // validate training url
      .then(() => {
        // log success
        logger.log(2, '_create',
          `Successfully prepared to create training url ${data.id} with category ${data.category}`
        );

        // return prepared training url
        return trainingUrl;
      })
      .catch(err => {
        // log error
        logger.log(2, '_create', `Failed to prepare create for training url ${data.id} with category ${data.category}`);

        // return rejected promise
        return Promise.reject(err);
      });
  } // _create

  /**
   * Decodes a url. Converts url from ascii to binary.
   *
   * @param url - encoded url
   * @return String - decoded url
   */
  async _decodeUrl(id) {
    // return atob(id.replace(/%2F/g, '/'));
    return atob(id);
  }

  /**
   * Scrapes metadata from a website url. Returns the url title, description, image, logo, and publisher.
   *
   * @param id - website url
   * @return object - url metadata
   */
  async _getMetaData(id) {
    // log method
    logger.log(2, '_getMetaData', `Attempting to scrape metadata from ${id}`);

    // compute method
    return this._got(id)
      .then(data => this._metascraper(data))
      .then(metaData => {
        // log success
        logger.log(2, '_getMetaData', `Successfully scraped metadata from ${id}`);

        return metaData;
      })
      .catch(() => {
        // log error
        logger.log(2, '_getMetaData', `Failed to scrape metadata from ${id}`);
        return {};
      });
  } // _getMetaData

  /**
   * Executes a http request to a url and returns information about the request. (Helper function for testing)
   *
   * @param id - url
   * @return Object - html request body and url
   */
  async _got(id) {
    // log method
    logger.log(2, '_got', `Getting http request for ${id}`);

    // compute method
    const { body: html, url } = await got(id);
    return {html, url};
  } // _got

  /**
   * Scrapes a url http request and returns an object with metadata from the url: title, description, image, logo,
   * and publisher. (Helper function for testing)
   *
   * @param data - object containing the html data and url
   * @return Object - url metadata
   */
  async _metascraper(data) {
    // log method
    logger.log(2, '_metascraper', `Scraping ${data.url} for metadata`);

    // compute method
    // return metascraper(data);
    return {};
  } // _metascraper

  /**
   * Reads a training url from the database. Returns the training url read.
   *
   * @param data - parameters of training url
   * @return TrainingUrl - training url read
   */
  async _read(data) {
    // log method
    logger.log(2, '_read', `Attempting to read training url ${data.id} with category ${data.category}`);

    // compute method
    try {
      let decodedUrl = await this._decodeUrl(data.id);

      let trainingUrl = new TrainingUrl(await this.databaseModify.getEntryUrl(decodedUrl, data.category));

      // log success
      logger.log(2, '_read', `Successfully read training url ${data.id} with category ${data.category}`);

      // return training url
      return trainingUrl;
    } catch (err) {
      // log error
      logger.log(2, '_read', `Failed to read training url ${data.id} with category ${data.category}`);

      // return error
      return Promise.reject(err);
    }
  } // _read

  /**
   * Prepares a training url to be updated. Returns the training url if it can be successfully updated.
   *
   * @param data - data of training url
   * @return TrainingUrl - training url prepared to update
   */
  async _update(data) {
    // log method
    logger.log(2, '_update', `Preparing to update training url ${data.id} with category ${data.category}`);

    // compute method
    try {
      let newTrainingUrl = new TrainingUrl(data);
      let oldTrainingUrl = new TrainingUrl(await this.databaseModify.getEntryUrl(data.id, data.category));

      return this._validateTrainingUrl(newTrainingUrl) // validate training url
        .then(() => this._validateUpdate(oldTrainingUrl, newTrainingUrl)) // validate update
        .then(() => {
          // log success
          logger.log(2, '_update',
            `Successfully prepared update for training url ${data.id} with category ${data.category}`
          );

          // return training url to update
          return newTrainingUrl;
        })
        .catch(err => {
          throw err;
        });
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for training url ${data.id} with category ${data.category}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

  /**
   * Validate that a training url is valid. Returns the training url if successfully validated, otherwise returns an
   * error.
   *
   * @param trainingUrl - TrainingUrl object to be validated
   * @return TrainingUrl - validated training url
   */
  _validateTrainingUrl(trainingUrl) {
    // log method
    logger.log(2, '_validateTrainingUrl',
      `Validating training url ${trainingUrl.id} with category ${trainingUrl.category}`
    );

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating training url.'
      };

      // validate id
      if (this.isEmpty(trainingUrl.id)) {
        // log error
        logger.log(2, '_validateTrainingUrl', 'Training url id is empty');

        // throw error
        err.message = 'Invalid training url.';
        throw err;
      }

      // validate category
      if (this.isEmpty(trainingUrl.category)) {
        // log error
        logger.log(2, '_validateTrainingUrl', 'Training url category is empty');

        // throw error
        err.message = 'Invalid training category.';
        throw err;
      }

      // validate hits
      if (trainingUrl.hits < 0) {
        // log error
        logger.log(2, '_validateTrainingUrl', 'Training url hits is less than 0');

        // throw error
        err.message = 'Training url hits cannot be less than zero.';
        throw err;
      }

      // log success
      logger.log(2, '_validateTrainingUrl',
        `Successfully validated training url ${trainingUrl.id} with category ${trainingUrl.category}`
      );

      // return training url on success
      return Promise.resolve(trainingUrl);
    } catch (err) {
      // log error
      logger.log(2, '_validateTrainingUrl',
        `Failed to validate training url ${trainingUrl.id} with category ${trainingUrl.category}`
      );

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateTrainingUrl

  /**
   * Validates that a training url can be updated. Returns the training url if the training url being updated is valid.
   *
   * @param oldTrainingUrl - TrainingUrl being updated from
   * @param newTrainingUrl - TrainingUrl being updated to
   * @return TrainingUrl - validated training url
   */
  async _validateUpdate(oldTrainingUrl, newTrainingUrl) {
    // log method
    logger.log(2, '_validateUpdate', `Validating update for training url ${oldTrainingUrl.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating update for training url.'
      };

      // validate training url
      if (oldTrainingUrl.id != newTrainingUrl.id) {
        // log error
        logger.log(2, '_validateUpdate',
          `Old training url id ${oldTrainingUrl.id} does not match new training url id ${newTrainingUrl.id}`
        );

        // throw error
        err.message = 'Error validating training url.';
        throw err;
      }

      // validate training url
      if (oldTrainingUrl.category != newTrainingUrl.category) {
        // log error
        logger.log(2, '_validateUpdate',
          `Old training url category ${oldTrainingUrl.category} does not match new training url category`,
          `${newTrainingUrl.category}`
        );

        // throw error
        err.message = 'Error validating training url category.';
        throw err;
      }

      // log success
      logger.log(2, '_validateUpdate', `Successfully validated update for training url ${oldTrainingUrl.id}`);

      // return new training url on success
      return Promise.resolve(newTrainingUrl);
    } catch (err) {
      // log error
      logger.log(2, '_validateUpdate', `Failed to validate update for training url ${oldTrainingUrl.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate
} // TrainingUrlRoutes

module.exports = TrainingUrlRoutes;
