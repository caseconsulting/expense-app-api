const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const Logger = require('../js/Logger');
const TrainingUrl = require('../models/trainingUrls');
const _ = require('lodash');

const atob = require('atob');
const logger = new Logger('trainingUrlRoutes');

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
    try {
      let trainingUrl = new TrainingUrl(data);
      await this._validateTrainingUrl(trainingUrl); // validate training url

      // log success
      logger.log(2, '_create',
        `Successfully prepared to create training url ${data.id} with category ${data.category}`
      );

      // return prepared training url
      return trainingUrl;
    } catch (err) {
      // log error
      logger.log(2, '_create', `Failed to prepare create for training url ${data.id} with category ${data.category}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _create

  /**
   * Decodes a URL. Converts id from ascii to binary.
   *
   * @param id - encoded url
   * @return String - decoded url
   */
  async _decodeUrl(id) {
    // return atob(id.replace(/%2F/g, '/'));
    return atob(id);
  } // _decodeUrl

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
   * Reads all training urls from the database. Returns all training urls
   *
   * @return Array - all training urls
   */
  async _readAll() {
    // log method
    logger.log(2, '_readAll', 'Attempting to read all training urls');

    // compute method
    try {
      let trainingUrlsData = await this.databaseModify.getAllEntriesInDB();
      let trainingUrls = _.map(trainingUrlsData, trainingUrl => {
        return new TrainingUrl(trainingUrl);
      });

      // log success
      logger.log(2, '_readAll', 'Successfully read all training urls');

      // return all training urls
      return trainingUrls;
    } catch (err) {
      // log error
      logger.log(2, '_readAll', 'Failed to read all training urls');

      // return error
      return Promise.reject(err);
    }
  } // readAll

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
      let oldTrainingUrl = new TrainingUrl(await this.databaseModify.getEntryUrl(data.id, data.category));
      let newTrainingUrl = new TrainingUrl(data);

      await this._validateTrainingUrl(newTrainingUrl); // validate training url
      await this._validateUpdate(oldTrainingUrl, newTrainingUrl); // validate update

      // log success
      logger.log(2, '_update',
        `Successfully prepared to update training url ${data.id} with category ${data.category}`
      );

      // return training url to update
      return newTrainingUrl;
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
    logger.log(3, '_validateTrainingUrl',
      `Validating training url ${trainingUrl.id} with category ${trainingUrl.category}`
    );

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating training url.'
      };

      // validate id
      if (_.isNil(trainingUrl.id)) {
        // log error
        logger.log(3, '_validateTrainingUrl', 'Training url id is empty');

        // throw error
        err.message = 'Invalid training url.';
        throw err;
      }

      // validate category
      if (_.isNil(trainingUrl.category)) {
        // log error
        logger.log(3, '_validateTrainingUrl', 'Training url category is empty');

        // throw error
        err.message = 'Invalid training category.';
        throw err;
      }

      // validate hits
      if (trainingUrl.hits < 0) {
        // log error
        logger.log(3, '_validateTrainingUrl', 'Training url hits is less than 0');

        // throw error
        err.message = 'Training url hits cannot be less than zero.';
        throw err;
      }

      // log success
      logger.log(3, '_validateTrainingUrl',
        `Successfully validated training url ${trainingUrl.id} with category ${trainingUrl.category}`
      );

      // return training url on success
      return Promise.resolve(trainingUrl);
    } catch (err) {
      // log error
      logger.log(3, '_validateTrainingUrl',
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
    logger.log(3, '_validateUpdate', `Validating update for training url ${oldTrainingUrl.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating update for training url.'
      };

      // validate training url
      if (oldTrainingUrl.id != newTrainingUrl.id) {
        // log error
        logger.log(3, '_validateUpdate',
          `Old training url id ${oldTrainingUrl.id} does not match new training url id ${newTrainingUrl.id}`
        );

        // throw error
        err.message = 'Error validating training url.';
        throw err;
      }

      // validate training url
      if (oldTrainingUrl.category != newTrainingUrl.category) {
        // log error
        logger.log(3, '_validateUpdate',
          `Old training url category ${oldTrainingUrl.category} does not match new training url category`,
          `${newTrainingUrl.category}`
        );

        // throw error
        err.message = 'Error validating training url category.';
        throw err;
      }

      // log success
      logger.log(3, '_validateUpdate', `Successfully validated update for training url ${oldTrainingUrl.id}`);

      // return new training url on success
      return Promise.resolve(newTrainingUrl);
    } catch (err) {
      // log error
      logger.log(3, '_validateUpdate', `Failed to validate update for training url ${oldTrainingUrl.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate
} // TrainingUrlRoutes

module.exports = TrainingUrlRoutes;
