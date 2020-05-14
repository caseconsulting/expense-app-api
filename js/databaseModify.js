const AWS = require('aws-sdk');
const Logger = require('./Logger');
const TrainingUrl = require('../models/trainingUrls.js');
// const moment = require('moment');
const _ = require('lodash');
require('dotenv').config({
  silent: true
});

const logger = new Logger('databaseModify');
const STAGE = process.env.STAGE;

const scanDB = (params, documentClient, out = []) => new Promise((resolve, reject) => {
  documentClient.scan(params).promise()
    .then(({Items, LastEvaluatedKey}) => {
      out.push(...Items);
      !LastEvaluatedKey ? resolve(out)
        : resolve(scanDB(Object.assign(params, {ExclusiveStartKey: LastEvaluatedKey}), documentClient, out));
    })
    .catch(reject);
});

const queryDB = (params, documentClient, out = []) => new Promise((resolve, reject) => {
  documentClient.query(params).promise()
    .then(({Items, LastEvaluatedKey}) => {
      out.push(...Items);
      !LastEvaluatedKey ? resolve(out)
        : resolve(queryDB(Object.assign(params, {ExclusiveStartKey: LastEvaluatedKey}), documentClient, out));
    })
    .catch(reject);
});

class databaseModify {

  constructor(name) {
    this.tableName = `${STAGE}-${name}`;
    AWS.config.apiVersions = {
      dynamodb: '2012-08-10'
      // other service API versions
    };
    AWS.config.update({
      region: 'us-east-1'
    });
  } // constructor

  /**
   * Adds an object as a new entry into the dynamodb table.
   *
   * @param newDyanmoObj - object to add as a new dynamodb entry
   * @return Object - objected add to dynamodb
   */
  async addToDB(newDyanmoObj) {
    // log method
    let tableName = this.tableName;
    logger.log(2, 'addToDB', `Attempting to add new entry to ${tableName}`);

    // compute method
    if (newDyanmoObj) {
      // new object exists
      const params = {
        TableName: tableName,
        Item: newDyanmoObj
      };

      const documentClient = new AWS.DynamoDB.DocumentClient();

      return documentClient.put(params)
        .promise()
        .then(() => {
          // log success
          logger.log(2, 'addToDB', `Successfully added ${newDyanmoObj.id} to ${tableName}`);

          return newDyanmoObj;
        })
        .catch(function(err) {
          // log error
          logger.log(2, '_updateWrapper', `Failed to add ${newDyanmoObj.id} to ${tableName}`);

          // throw error
          throw err;
        });
    } else {
      // new object does not exist
      let err = {
        code: 404,
        message: 'Failed to find object to add to database.'
      };

      // log error
      logger.log(2, 'addToDB', `Invalid object to add to ${tableName}`);

      // return rejected promise
      throw err;
    }
  } // addToDB

  /**
   * Builds table params to update an entry in the budget dynamodb table.
   *
   * @param objToUpdate - budget to be updated
   * @return Object - update table parameters
   */
  _buildBudgetUpdateParams(objToUpdate) {
    // log method
    logger.log(2, '_buildBudgetUpdateParams', `Building update params for ${STAGE}-budgets`);

    // compute method
    return _.assign(
      {
        TableName: `${STAGE}-budgets`,
        Key: {
          id: objToUpdate.id
        },
        ReturnValues: 'ALL_NEW'
      },
      this._buildExpression(objToUpdate)
    );
  } // _buildBudgetUpdateParams

  /**
   * Builds table params to update an entry in the employee dynamodb table.
   *
   * @param objToUpdate - employee to be updated
   * @return Object - update table parameters
   */
  _buildEmployeeUpdateParams(objToUpdate) {
    // log method
    logger.log(2, '_buildEmployeeUpdateParams', `Building update params for ${STAGE}-employees`);

    // compute method
    return _.assign(
      {
        TableName: `${STAGE}-employees`,
        Key: {
          id: objToUpdate.id
        },
        ReturnValues: 'ALL_NEW'
      },
      this._buildExpression(objToUpdate)
    );
  } // _buildEmployeeUpdateParams

  /**
   * Builds table params to update an entry in the expense type dynamodb table.
   *
   * @param objToUpdate - expense type to be updated
   * @return
   */
  _buildExpenseTypeUpdateParams(objToUpdate) {
    // log method
    logger.log(2, '_buildExpenseTypeUpdateParams', `Building update params for ${STAGE}-expense-types`);

    // compute method
    return _.assign(
      {
        TableName: `${STAGE}-expense-types`,
        Key: {
          id: objToUpdate.id
        },
        ReturnValues: 'ALL_NEW'
      },
      this._buildExpression(objToUpdate)
    );
  } // _buildExpenseTypeUpdateParams

  /**
   * Builds table params to update an entry in the employee dynamodb table.
   *
   * @param objToUpdate - expense to be updated
   * @return Object - update table parameters
   */
  _buildExpenseUpdateParams(objToUpdate) {
    // log method
    logger.log(2, '_buildExpenseUpdateParams', `Building update params for ${STAGE}-expenses`);

    // compute method
    return _.assign(
      {
        TableName: `${STAGE}-expenses`,
        Key: {
          id: objToUpdate.id
        },
        ReturnValues: 'ALL_NEW'
      },
      this._buildExpression(objToUpdate)
    );
  } // _buildExpenseUpdateParams

  /**
   * Builds table expressions for an object.
   *
   * @param data - object to build expresions for
   * @return Object - data table expressions
   */
  _buildExpression(data) {
    // log method
    logger.log(2, '_updateWrapper', `Building table expressions for ${data.id}`);

    // compute method
    const alpha = 'abcdefghijklmnopqrstuvwxyz'.split('');
    let ExpressionAttributeValues = {};
    let UpdateExpression = 'set ';
    let ExpressionAttributeNames = {};

    // remove key indexes
    let attributes;
    if (data instanceof TrainingUrl) {
      attributes = _.keys(_.omit(data, ['id', 'category']));
    } else {
      attributes = _.keys(_.omit(data, ['id']));
    }

    // loop attributes
    _.each(attributes, (attribute, index) => {
      const value = _.get(data, attribute);
      if (value != null) {
        // object attribute value exists
        let expressionAttribute = `:${alpha[index]}`;
        ExpressionAttributeValues[expressionAttribute] = value;

        if (attribute === 'url') { // what is this case for? - austin
          UpdateExpression += `#url = ${expressionAttribute},`;
          _.assign(ExpressionAttributeNames, { '#url': 'url' });
        } else {
          UpdateExpression += `${attribute} = ${expressionAttribute},`;
        }
      }
    });
    UpdateExpression = `${_.trimEnd(UpdateExpression, ',')}`;

    return !_.isEmpty(ExpressionAttributeNames)
      ? { ExpressionAttributeValues, UpdateExpression, ExpressionAttributeNames }
      : { ExpressionAttributeValues, UpdateExpression };
  } // _buildExpression

  /**
   * Builds table params to update an entry in the training url dynamodb table.
   *
   * @param objToUpdate - training url to be updated
   * @return Object - update table parameters
   */
  _buildTrainingUrlUpdateParams(objToUpdate) {
    // log method
    logger.log(2, '_buildTrainingUrlUpdateParams', `Building update params for ${STAGE}-training-urls`);

    // compute method
    return _.assign(
      {
        TableName: `${STAGE}-training-urls`,
        Key: {
          id: objToUpdate.id,
          category: objToUpdate.category
        },
        ReturnValues: 'ALL_NEW'
      },
      this._buildExpression(objToUpdate)
    );
  } // _buildTrainingUrlUpdateParams

  /**
    * Builds table params to update an entry in the dynamodb table.
    *
    * @param objToUpdate - entry to be updated
    * @return Object - update table parameters
    */
  _buildUpdateParams(objToUpdate) {
    // log method
    logger.log(2, '_buildUpdateParams', 'Building update params');

    // compute method
    switch (this.tableName) {
      case `${STAGE}-expenses`:
        return this._buildExpenseUpdateParams(objToUpdate);
      case `${STAGE}-employees`:
        return this._buildEmployeeUpdateParams(objToUpdate);
      case `${STAGE}-expense-types`:
        return this._buildExpenseTypeUpdateParams(objToUpdate);
      case `${STAGE}-budgets`:
        return this._buildBudgetUpdateParams(objToUpdate);
      case `${STAGE}-training-urls`:
        return this._buildTrainingUrlUpdateParams(objToUpdate);
    }
  } // _buildUpdateParams

  /**
   * Gets all entries in the dynamodb table.
   *
   * @return Array - All entries in the dynamodb table.
   */
  async getAllEntriesInDB() {
    // log method
    let tableName = this.tableName;
    logger.log(2, 'getAllEntriesInDB', `Getting all entries from ${tableName}`);

    // compute method
    let params = {
      TableName: tableName
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();

    return scanDB(params, documentClient)
      .then(function(items) {
        // log success
        logger.log(2, 'getAllEntriesInDB', `Successfully read all ${items.length} entries from ${tableName}`);

        return _.sortBy(items, ['lastName', 'middleName', 'firstName', 'budgetName', 'purchaseDate']);
      })
      .catch(function(err) {
        // log error
        logger.log(2, 'getAllEntriesInDB', `Failed to read all entries from ${tableName}`);

        // throw error
        throw err;
      });
  } // getAllEntriesInDB

  /**
   * Gets an entry from the dynamodb table by a single ID.
   *
   * @param passedID - ID of entry
   * @return Object - entry obtained
   */
  async getEntry(passedID) {
    // log method
    logger.log(2, 'getEntry', `Attempting to get entry ${passedID} from database`);

    // compute method
    return this._readFromDB(passedID)
      .then(function(data) {
        if (_.first(data)) {
          // entry found
          // log success
          logger.log(2, 'getEntry', `Successfully got entry ${passedID} from database`);

          // return the first entry
          return _.first(data);
        } else {
          // entry not found
          // log error
          logger.log(2, 'getEntry', `Entry ${passedID} not found`);

          let err = {
            code: 404,
            message: 'Entry not found in database'
          };

          // throw error to be handled by catch
          throw err;
        }
      })
      .catch(function(err) {
        // log error
        logger.log(2, 'getEntry', `Failed to get entry ${passedID} from database`);

        // throw error
        throw err;
      });
  } // getEntry

  /**
   * Gets a url entry with an ID and category from the dynamodb table.
   *
   * @param passedID - id of entry
   * @param category - category of entry
   * @return Object - entry obtained
   */
  async getEntryUrl(passedID, category) {
    // log method
    logger.log(2, 'getEntryUrl', `Attempting to get entry ${passedID} and ${category} from database`);

    // compute method
    return this._readFromDBUrl(passedID, category)
      .then(function(data) {
        if (_.first(data)) {
          // entry found
          // log success
          logger.log(2, 'getEntryUrl', `Successfully got entry ${passedID} and ${category} from database`);

          // return the first entry
          return _.first(data);
        } else {
          // entry not found
          // log error
          logger.log(2, 'getEntryUrl', `Entry ${passedID} and ${category} not found`);

          let err = {
            code: 404,
            message: 'Entry not found in database'
          };

          // throw error to be handled by catch
          throw err;
        }
      })
      .catch(function(err) {
        // log error
        logger.log(2, 'getEntryUrl', `Failed to get entry ${passedID} and ${category} from database`);

        // throw error
        throw err;
      });
  } // getEntryUrl

  /**
   * Query dynamodb index for entries by a single attribute.
   *
   * @param secondaryIndex - index name
   * @param queryKey - key attribute to query by
   * @param queryParam - parameter value of entries
   */
  async querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam) {
    // log method
    let tableName = this.tableName;
    logger.log(2, 'querySecondaryIndexInDB',
      `Attempting to query ${secondaryIndex} from table ${tableName} with key ${queryKey} and value ${queryParam}`
    );

    // compute method
    const params = {
      TableName: tableName,
      IndexName: secondaryIndex,
      ExpressionAttributeValues: {
        ':queryKey': queryParam
      },
      KeyConditionExpression: `${queryKey} = :queryKey`
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return queryDB(params, documentClient)
      .then(entries => {
        // log success
        logger.log(2, 'querySecondaryIndexInDB',
          `Successfully queried ${entries.length} entries for ${secondaryIndex} from table ${tableName} with key`,
          `${queryKey} and value ${queryParam}`
        );

        // return entries
        return entries;
      })
      .catch(err => {
        // log error
        logger.log(2, 'querySecondaryIndexInDB',
          `Failed to query ${secondaryIndex} from table ${tableName} with key ${queryKey} and value ${queryParam}`
        );

        // throw error
        throw err;
      });
  } // querySecondaryIndexInDB

  /**
   * Query dynamodb employeeId-expenseTypeId-index for entries given an employee ID and expense type ID.
   *
   * @param employeeId - Employee ID
   * @param expenseTypeId - ExpenseType ID
   * @param queryParam - parameter value of entries
   */
  async queryWithTwoIndexesInDB(employeeId, expenseTypeId) {
    // log method
    let tableName = this.tableName;
    logger.log(2, 'queryWithTwoIndexesInDB',
      `Attempting to query employeeId-expenseTypeId-index for table ${tableName} for employee ${employeeId} and`,
      `expense type ${expenseTypeId}`
    );

    // compute method
    const params = {
      TableName: tableName,
      IndexName: 'employeeId-expenseTypeId-index',
      ExpressionAttributeValues: {
        ':expenseTypeId': expenseTypeId,
        ':employeeId': employeeId
      },
      KeyConditionExpression: 'expenseTypeId = :expenseTypeId and employeeId = :employeeId'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return queryDB(params, documentClient)
      .then(entries => {
        // log success
        logger.log(2, 'queryWithTwoIndexesInDB',
          `Successfully queried ${entries.length} entries from employeeId-expenseTypeId-index from table`,
          `${tableName} for employee ${employeeId} and expense type ${expenseTypeId}`
        );

        // return entries
        return entries;
      })
      .catch(err => {
        // log error
        logger.log(2, 'queryWithTwoIndexesInDB',
          `Failed to query employeeId-expenseTypeId-index for table ${tableName} for employee ${employeeId} and`,
          `expense type ${expenseTypeId}`
        );

        // throw error
        throw err;
      });
  } // queryWithTwoIndexesInDB

  /**
   * Reads entries from the dynamodb table by a single ID.
   *
   * @param passedID - ID of entry to read
   * @return Object - entries read
   */
  async _readFromDB(passedID) {
    // log method
    let tableName = this.tableName;
    logger.log(2, '_readFromDB', `Attempting to read entries from ${tableName} with ID ${passedID}`);

    // compute method
    const params = {
      TableName: tableName,
      ExpressionAttributeValues: {
        ':id': passedID
      },
      KeyConditionExpression: 'id = :id'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return queryDB(params, documentClient)
      .then(function(entries) {
        // log success
        logger.log(2, '_readFromDB',
          `Successfully read ${entries.length} entries from ${tableName} with ID ${passedID}`
        );

        // return entries
        return entries;
      })
      .catch(function(err) {
        // log error
        logger.log(2, '_readFromDB', `Failed to read entries from ${tableName} with ID ${passedID}`);

        // throw error
        throw err;
      });
  } // _readFromDB

  /**
   * Reads url entries from the dynamodb table by an ID and category.
   *
   * @param passedID - id of entry to read
   * @param category - category of entry to read
   * @return Object - entries read
   */
  async _readFromDBUrl(passedID, category) {
    // log method
    let tableName = this.tableName;
    logger.log(2, '_readFromDBUrl',
      `Attempting to read url entries from ${tableName} with ID ${passedID} and category ${category}`
    );

    // compute method
    const params = {
      TableName: tableName,
      ExpressionAttributeValues: {
        ':id': passedID,
        ':category': category
      },
      KeyConditionExpression: 'id = :id AND category = :category'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return queryDB(params, documentClient)
      .then(function(entries) {
        // log success
        logger.log(2, '_readFromDBUrl',
          `Successfully read ${entries.length} url entries from ${tableName} with ID ${passedID} and category`,
          `${category}`
        );
        // return entries
        return entries;
      })
      .catch(function(err) {
        // log error
        logger.log(2, '_readFromDBUrl',
          `Failed to read url entries from ${tableName} with ID ${passedID} and category ${category}`
        );
        // throw error
        throw err;
      });
  } // _readFromDBUrl

  /**
   * Deletes entries from the dynamodb table by a single ID.
   *
   * @param passedID - ID of entry to delete
   * @return Object - entries deleted
   */
  async removeFromDB(passedID) {
    // log method
    let tableName = this.tableName;
    logger.log(2, 'removeFromDB', `Attempting to delete entires from ${tableName} with ID ${passedID}`);

    // compute method
    const params = {
      TableName: tableName,
      Key: {
        id: passedID
      },
      ReturnValues: 'ALL_OLD'
    };
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .delete(params)
      .promise()
      .then(data => {
        // log success
        logger.log(2, 'removeFromDB', `Successfully deleted entires from ${tableName} with ID ${passedID}`);

        return data.Attributes;
      })
      .catch(function(err) {
        // log error
        logger.log(2, 'removeFromDB', `Failed to delete entires from ${tableName} with ID ${passedID}`);

        // throw error
        throw err;
      });
    // .then(data => data.Attributes)
    // .catch(function(err) {
    //   console.error(err);
    //   throw err;
    // }); //Throw error and handle properly in crudRoutes

  } // removeFromDB

  /**
   * Updates an entry in the dynamodb table.
   *
   * @param newDyanmoObj - object to update dynamodb entry to
   * @return Object - object updated in dynamodb
   */
  updateEntryInDB(newDyanmoObj) {
    // log method
    let tableName = this.tableName;
    logger.log(2, 'updateEntryInDB', `Attempting to update entry in ${tableName} with ID ${newDyanmoObj.id}`);

    // compute method
    const params = this._buildUpdateParams(newDyanmoObj);
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .update(params)
      .promise()
      .then(data => {
        // log success
        logger.log(2, 'updateEntryInDB', `Successfully updated entry in ${tableName} with ID ${newDyanmoObj.id}`);

        return data.Attributes;
      })
      .catch(function(err) {
        // log error
        logger.log(2, 'updateEntryInDB', `Failed to update entry in ${tableName} with ID ${newDyanmoObj.id}`);

        // throw error
        throw err;
      });

    // .then(function(data) {
    //   return data.Attributes;
    // })
    // .catch(function(err) {
    //   console.error(err);
    //   throw err;
    // });
  } // updateEntryInDB
} // databaseModify

module.exports = databaseModify;
