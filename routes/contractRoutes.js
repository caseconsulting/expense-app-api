const Contract = require('./../models/contract');
const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const Logger = require('../js/Logger');
const _ = require('lodash');

const logger = new Logger('contractRoutes');

class ContractRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new DatabaseModify('contracts');
  } // constructor

  /**
   * Prepares a contract to be created. Returns the contract if it can be successfully created.
   *
   * @param data - data of contract
   * @return Contract - contract prepared to create
   */
  async _create(data) {
    // log method
    logger.log(2, '_create', `Preparing to create contract ${data.id}`);

    // compute method
    try {
      let contract = new Contract(data);

      await this._validateContract(contract); // validate contract
      await this._validateCreate(contract); // validate create

      // log success
      logger.log(2, '_create', `Successfully prepared to create contract ${data.id}`);

      // return prepared contract
      return contract;
    } catch (err) {
      // log error
      logger.log(2, '_create', `Failed to prepare create for contract ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _create

  /**
   * Prepares a contract to be deleted. Returns the contract if it can be successfully deleted.
   *
   * @param id - id of contract
   * @return Contract - contract prepared to delete
   */
  async _delete(id) {
    // log method
    logger.log(2, '_delete', `Preparing to delete contract ${id}`);

    // compute method
    try {
      let contract = new Contract(await this.databaseModify.getEntry(id));
      await this._validateDelete(contract);

      // log success
      logger.log(2, '_delete', `Successfully prepared to delete contract ${id}`);

      // return contract deleted
      return contract;
    } catch (err) {
      // log error
      logger.log(2, '_delete', `Failed to prepare delete for contract ${id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _delete

  /**
   * Reads a contract from the database. Returns the contract read.
   *
   * @param data - parameters of contract
   * @return Contract - contract read
   */
  async _read(data) {
    // log method
    logger.log(2, '_read', `Attempting to read contract ${data.id}`);

    // compute method
    try {
      let contract = new Contract(await this.databaseModify.getEntry(data.id)); // read from database
      // log success
      logger.log(2, '_read', `Successfully read contract ${data.id}`);

      // return contract
      return contract;
    } catch (err) {
      // log error
      logger.log(2, '_read', `Failed to read contract ${data.id}`);

      // return error
      return Promise.reject(err);
    }
  } // _read

  /**
   * Reads all contracts from the database. Returns all contracts.
   *
   * @return Array - all contracts
   */
  async _readAll() {
    // log method
    logger.log(2, '_readAll', 'Attempting to read all contracts');

    // compute method
    try {
      let contractData = await this.databaseModify.getAllEntriesInDB();
      let contracts = _.map(contractData, (contract) => {
        return new Contract(contract);
      });

      // log success
      logger.log(2, '_readAll', 'Successfully read all contracts');

      // return all contracts
      return contracts;
    } catch (err) {
      // log error
      logger.log(2, '_readAll', 'Failed to read all contracts');

      // return error
      return Promise.reject(err);
    }
  } // readAll

  /**
   * Prepares a contract to be updated. Returns the contract if it can be successfully updated.
   *
   * @param req - request
   * @return Contract - contract prepared to update
   */
  async _update(data) {
    // log method
    logger.log(2, '_update', `Preparing to update contract ${data.id}`);

    // compute method
    try {
      let oldContract = new Contract(await this.databaseModify.getEntry(data.id));
      let newContract = new Contract(data);
      await Promise.all([this._validateContract(newContract), this._validateUpdate(oldContract, newContract)]);

      // log success
      logger.log(2, '_update', `Successfully prepared to update contract ${data.id}`);

      // return contract to update
      return newContract;
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for contract ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

  /**
   * Validate that a contract can be created. Returns the contract if the contract can be created.
   *
   * @param contract - Contract to be created
   * @return Contract - validated contract
   */
  async _validateCreate(contract) {
    // log method
    logger.log(3, '_validateCreate', `Validating create for contract ${contract.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating create for contract.'
      };

      let contracts = await this.databaseModify.getAllEntriesInDB();

      // validate duplicate contract id
      if (contracts.some((c) => c.id === contract.id)) {
        // log error
        logger.log(3, '_validateCreate', `Contract ID ${contract.id} is duplicated`);

        // throw error
        err.message = 'Unexpected duplicate id created. Please try submitting again.';
        throw err;
      }

      // validate duplicate contract
      if (contracts.some((c) => c.contractName === contract.contractName && c.primeName === contract.primeName)) {
        // log error
        logger.log(
          3,
          '_validateCreate',
          `Contract name ${contract.contractName} and prime name ${contract.primeName} is duplicated`
        );

        // throw error
        err.message =
          `Contract ${contract.contractName} with prime ${contract.primeName} already taken.` +
          'Please enter a unique contract and prime name combination.';
        throw err;
      }

      // log success
      logger.log(3, '_validateCreate', `Successfully validated create for contract ${contract.id}`);

      // return contract on success
      return Promise.resolve(contract);
    } catch (err) {
      // log error
      logger.log(3, '_validateCreate', `Failed to validate create for contract ${contract.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateCreate

  // TODO: DO NOT DELETE CONTRACT IF ANY EMPLOYEE HAS THAT CONTRACT SELECTED
  /**
   * Validate that a contract can be deleted. Returns the contract if successfully validated, otherwise returns an
   * error.
   *
   * @param contract - contract to validate delete
   * @return Contract - validated contract
   */
  async _validateDelete(contract) {
    // log method
    logger.log(3, '_validateDelete', `Validating delete for contract ${contract.id}`);

    // compute method
    try {
      //   let err = {
      //     code: 403,
      //     message: 'Error validating delete for employee.'
      //   };

      // get all expenses for this employee
      //let expenses = await this.expenseDynamo.querySecondaryIndexInDB('employeeId-index', 'employeeId', employee.id);

      // validate the employee does not have any expenses
      //   if (expenses.length > 0) {
      //     // log error
      //     logger.log(2, '_validateDelete', `Expenses exist for employee ${employee.id}`);

      //     // throw error
      //     err.message = 'Cannot delete an employee with expenses.';
      //     throw err;
      //   }

      // log success
      logger.log(3, '_validateDelete', `Successfully validated delete for contract ${contract.id}`);

      // return contract on success
      return Promise.resolve(contract);
    } catch (err) {
      // log error
      logger.log(3, '_validateDelete', `Failed to validate delete for contract ${contract.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateDelete

  /**
   * Validate that an contract is valid. Returns the contract if successfully validated, otherwise returns an error.
   *
   * @param contract - Contract object to be validated
   * @return Contract - validated contract
   */
  async _validateContract(contract) {
    // log method
    logger.log(3, '_validateContract', `Validating contract ${contract.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating contract.'
      };

      // validate id
      if (_.isNil(contract.id)) {
        // log error
        logger.log(3, '_validateContract', 'Contract id is empty');

        // throw error
        err.message = 'Invalid contract id.';
        throw err;
      }

      // validate contract name
      if (_.isNil(contract.contractName)) {
        // log error
        logger.log(3, '_validateContract', 'Contract name is empty');

        // throw error
        err.message = 'Invalid contract name.';
        throw err;
      }

      // validate prime name
      if (_.isNil(contract.primeName)) {
        // log error
        logger.log(3, '_validateContract', 'Contract prime name is empty');

        // throw error
        err.message = 'Invalid contract prime name.';
        throw err;
      }

      // validate contract projects
      if (_.isNil(contract.projects) || _.isEmpty(contract.projects)) {
        // log error
        logger.log(3, '_validateContract', 'Contract projects are null or empty');

        // throw error
        err.message = 'Invalid contract projects.';
        throw err;
      }

      // validate contract role
      if (_.isNil(contract.costType)) {
        // log error
        logger.log(3, '_validateContract', 'Contract cost type is empty');

        // throw error
        err.message = 'Invalid contract cost type.';
        throw err;
      }

      // validate PoP start date
      if (_.isNil(contract.popStartDate)) {
        // log error
        logger.log(3, '_validateContract', 'Contract PoP start date is empty');

        // throw error
        err.message = 'Invalid contract PoP start date.';
        throw err;
      }

      // validate PoP end date
      if (_.isNil(contract.popEndDate)) {
        // log error
        logger.log(3, '_validateContract', 'Contract PoP end date is empty');

        // throw error
        err.message = 'Invalid contract PoP end date.';
        throw err;
      }

      // log success
      logger.log(3, '_validateContract', `Successfully validated contract ${contract.id}`);

      // return contract on success
      return Promise.resolve(contract);
    } catch (err) {
      // log error
      logger.log(3, '_validateContract', `Failed to validate contract ${contract.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateContract

  /**
   * Validates that a contract can be updated. Returns the contract if the contract being updated is valid.
   *
   * @param oldContract - Contract being updated from
   * @param newContract - Contract being updated to
   * @return Contract - validated contract
   */
  async _validateUpdate(oldContract, newContract) {
    // log method
    logger.log(3, '_validateUpdate', `Validating update for contract ${oldContract.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating update for contract.'
      };

      // validate contract id
      if (oldContract.id != newContract.id) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `Old contract id ${oldContract.id} does not match new contract id ${newContract.id}`
        );

        // throw error
        err.message = 'Error validating contract IDs.';
        throw err;
      }

      let contractData = await this.databaseModify.getAllEntriesInDB();
      let contracts = _.map(contractData, (contractData) => {
        return new Contract(contractData);
      });

      contracts = _.reject(contracts, (c) => {
        return _.isEqual(c, oldContract);
      });

      // validated uplicate contract number
      if (contracts.some((c) => c.contractName === newContract.contractName && c.primeName === newContract.primeName)) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `Contract ${newContract.contractName} and prime ${newContract.primeName} is duplicated`
        );

        // throw error
        err.message =
          `Contract ${newContract.contractName} with prime ${newContract.primeName} already taken.` +
          'Please enter a unique contract and prime combination.';
        throw err;
      }

      // log success
      logger.log(3, '_validateUpdate', `Successfully validated update for contract ${oldContract.id}`);

      // return new contract on success
      return Promise.resolve(newContract);
    } catch (err) {
      // log error
      logger.log(3, '_validateUpdate', `Failed to validate update for contract ${oldContract.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate
} // ContractRoutes

module.exports = ContractRoutes;
