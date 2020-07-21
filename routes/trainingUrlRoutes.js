const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const Logger = require('../js/Logger');
const TrainingUrl = require('../models/trainingUrls');

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

    let trainingUrl = new TrainingUrl(data);

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
            `Successfully prepared to update training url ${data.id} with category ${data.category}`
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
      if (this.isEmpty(trainingUrl.id)) {
        // log error
        logger.log(3, '_validateTrainingUrl', 'Training url id is empty');

        // throw error
        err.message = 'Invalid training url.';
        throw err;
      }

      // validate category
      if (this.isEmpty(trainingUrl.category)) {
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
