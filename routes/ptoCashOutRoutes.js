const PTOCashOut = require('./../models/ptoCashOut');
const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const Logger = require('../js/Logger');
const _ = require('lodash');

const logger = new Logger('ptoCashOutRoutes');

class PTOCashOutRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new DatabaseModify('pto-cashouts');
  } // constructor

  /**
   * Prepares a PTOCashOut to be created. Returns the PTOCashOut if it can be successfully created.
   *
   * @param data - data of PTOCashOut
   * @return PTOCashOut - PTOCashOut prepared to create
   */
  async _create(data) {
    // log method
    logger.log(2, '_create', `Preparing to create PTOCashOut ${data.id}`);

    // compute method
    try {
      let ptoCashOut = new PTOCashOut(data);

      await this._validatePTOCashOut(ptoCashOut); // validate ptoCashOut
      await this._validateCreate(ptoCashOut); // validate create

      // log success
      logger.log(2, '_create', `Successfully prepared to create PTOCashOut ${data.id}`);

      // return prepared PTOCashOut
      return ptoCashOut;
    } catch (err) {
      // log error
      logger.log(2, '_create', `Failed to prepare create for PTOCashOut ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _create

  /**
   * Prepares a PTOCashOut to be deleted. Returns the PTOCashOut if it can be successfully deleted.
   *
   * @param id - id of PTOCashOut
   * @return PTOCashOut - PTOCashOut prepared to delete
   */
  async _delete(id) {
    // log method
    logger.log(2, '_delete', `Preparing to delete PTOCashOut ${id}`);

    // compute method
    try {
      let ptoCashOut = new PTOCashOut(await this.databaseModify.getEntry(id));
      await this._validateDelete(ptoCashOut);

      // log success
      logger.log(2, '_delete', `Successfully prepared to delete PTOCashOut ${id}`);

      // return PTOCashOut deleted
      return ptoCashOut;
    } catch (err) {
      // log error
      logger.log(2, '_delete', `Failed to prepare delete for PTOCashOut ${id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _delete

  /**
   * Prepares a PTOCashOut to be updated. Returns the PTOCashOut if it can be successfully updated.
   *
   * @param req - request
   * @return PTOCashOut - PTOCashOut prepared to update
   */
  async _update(data) {
    // log method
    logger.log(2, '_update', `Preparing to update PTOCashOut ${data.id}`);

    // compute method
    try {
      let oldPtoCashOut = new PTOCashOut(await this.databaseModify.getEntry(data.id));
      let newPtoCashOut = new PTOCashOut(data);
      await Promise.all([this._validatePTOCashOut(newPtoCashOut), this._validateUpdate(oldPtoCashOut, newPtoCashOut)]);

      // log success
      logger.log(2, '_update', `Successfully prepared to update PTOCashOut ${data.id}`);
      // return PTOCashOut to update
      return newPtoCashOut;
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for PTOCashOut ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

  /**
   * Validate that a contPTOCashOutract can be created. Returns the PTOCashOut if the PTOCashOut can be created.
   *
   * @param ptoCashOut - ptoCashOut to be created
   * @return PTOCashOut - validated PTOCashOut
   */
  async _validateCreate(ptoCashOut) {
    // log method
    logger.log(3, '_validateCreate', `Validating create for PTOCashOut ${ptoCashOut.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating create for PTOCashOut.'
      };

      let ptoCashOuts = await this.databaseModify.getAllEntriesInDB();

      // validate duplicate ptoCashOut id
      if (ptoCashOuts.some((p) => p.id === ptoCashOut.id)) {
        // log error
        logger.log(3, '_validateCreate', `ptoCashOut ID ${ptoCashOut.id} is duplicated`);

        // throw error
        err.message = 'Unexpected duplicate id created. Please try submitting again.';
        throw err;
      }

      // log success
      logger.log(3, '_validateCreate', `Successfully validated create for ptoCashOut ${ptoCashOut.id}`);

      // return ptoCashOut on success
      return Promise.resolve(ptoCashOut);
    } catch (err) {
      // log error
      logger.log(3, '_validateCreate', `Failed to validate create for ptoCashOut ${ptoCashOut.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateCreate

  /**
   * Validate that a ptoCashOut can be deleted. Returns the ptoCashOut if successfully validated, otherwise returns an
   * error.
   *
   * @param ptoCashOut - ptoCashOut to validate delete
   * @return PTOCashOut - validated ptoCashOut
   */
  async _validateDelete(ptoCashOut) {
    // log method
    logger.log(3, '_validateDelete', `Validating delete for ptoCashOut ${ptoCashOut.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating delete for ptoCashOut.'
      };

      if (ptoCashOut.approvedDate) {
        // log error
        logger.log(3, '_validateDelete', 'PTOCashOut cannot be deleted if it was already approved');

        // throw error
        err.message = 'Cannot delete PTOCashOut, PTOCashOut has already been approved';
        throw err;
      }

      // log success
      logger.log(3, '_validateDelete', `Successfully validated delete for ptoCashOut ${ptoCashOut.id}`);

      // return ptoCashOut on success
      return Promise.resolve(ptoCashOut);
    } catch (err) {
      // log error
      logger.log(3, '_validateDelete', `Failed to validate delete for ptoCashOut ${ptoCashOut.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateDelete

  /**
   * Validate that a ptoCashOut is valid. Returns the ptoCashOut if successfully validated, otherwise returns an error.
   *
   * @param ptoCashOut - ptoCashOut object to be validated
   * @return PTOCashOut - validated PTOCashOut
   */
  async _validatePTOCashOut(ptoCashOut) {
    // log method
    logger.log(3, '_validatePTOCashOut', `Validating ptoCashOut ${ptoCashOut.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating ptoCashOut.'
      };

      // validate id
      if (_.isNil(ptoCashOut.id)) {
        // log error
        logger.log(3, '_validatePTOCashOut', 'PTOCashOut id is empty');

        // throw error
        err.message = 'Invalid ptoCashOut id.';
        throw err;
      }

      // validate employeeId
      if (_.isNil(ptoCashOut.employeeId)) {
        // log error
        logger.log(3, '_validatePTOCashOut', 'employeeId is empty');

        // throw error
        err.message = 'Invalid employeeId.';
        throw err;
      }

      // validate creationDate
      if (_.isNil(ptoCashOut.creationDate)) {
        // log error
        logger.log(3, '_validatePTOCashOut', 'creationDate is empty');

        // throw error
        err.message = 'Invalid creationDate.';
        throw err;
      }

      // validate amount
      if (_.isNil(ptoCashOut.amount) || ptoCashOut.amount <= 0) {
        // log error
        logger.log(3, '_validatePTOCashOut', 'amount is empty');

        // throw error
        err.message = 'Invalid amount.';
        throw err;
      }

      // log success
      logger.log(3, '_validatePTOCashOut', `Successfully validated ptoCashOut ${ptoCashOut.id}`);

      // return ptoCashOut on success
      return Promise.resolve(ptoCashOut);
    } catch (err) {
      // log error
      logger.log(3, '_validatePTOCashOut', `Failed to validate ptoCashOut ${ptoCashOut.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validatePTOCashOut

  /**
   * Validates that a ptoCashOut can be updated. Returns the ptoCashOut if the ptoCashOut being updated is valid.
   *
   * @param oldPtoCashOut - PTOCashOut being updated from
   * @param newPtoCashOut - PTOCashOut being updated to
   * @return PTOCashOut - validated ptoCashOut
   */
  async _validateUpdate(oldPtoCashOut, newPtoCashOut) {
    // log method
    logger.log(3, '_validateUpdate', `Validating update for ptoCashOut ${oldPtoCashOut.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating update for ptoCashOut.'
      };

      // validate ptoCashOut id
      if (oldPtoCashOut.id != newPtoCashOut.id) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `old PtoCashOut id ${oldPtoCashOut.id} does not match new PtoCashOut id ${newPtoCashOut.id}`
        );

        // throw error
        err.message = 'Error validating ptoCashOut IDs.';
        throw err;
      }

      // validate ptoCashOut amount
      if (oldPtoCashOut.amount != newPtoCashOut.amount) {
        if (oldPtoCashOut.approvedDate && newPtoCashOut.approvedDate) {
          // log error
          logger.log(3, '_validateUpdate', 'Cannot change amount of approved ptoCashOut');

          // throw error
          err.message = 'Cannot change amount of approved ptoCashOut.';
          throw err;
        }
      }

      // log success
      logger.log(3, '_validateUpdate', `Successfully validated update for ptoCashOut ${oldPtoCashOut.id}`);

      // return new PtoCashOut on success
      return Promise.resolve(newPtoCashOut);
    } catch (err) {
      // log error
      logger.log(3, '_validateUpdate', `Failed to validate update for PtoCashOut ${oldPtoCashOut.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate
} // PTOCashOutRoutes

module.exports = PTOCashOutRoutes;
