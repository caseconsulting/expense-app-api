require('dotenv').config({
  silent: true
});

const _ = require('lodash');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  ScanCommand,
  TransactWriteCommand,
  QueryCommand,
  UpdateCommand
} = require('@aws-sdk/lib-dynamodb');
const Logger = require(process.env.AWS ? 'Logger' : './Logger');

const documentClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    apiVersion: '2012-08-10',
    region: 'us-east-1'
  }),
  { marshallOptions: { convertClassInstanceToMap: true, removeUndefinedValues: true } }
);
const logger = new Logger('databaseModify');
const STAGE = process.env.STAGE;

const scanDB = (params, documentClient, out = []) =>
  new Promise((resolve, reject) => {
    documentClient
      .send(new ScanCommand(params))
      .then(({ Items, LastEvaluatedKey }) => {
        out.push(...Items);
        !LastEvaluatedKey
          ? resolve(out)
          : resolve(scanDB(Object.assign(params, { ExclusiveStartKey: LastEvaluatedKey }), documentClient, out));
      })
      .catch(reject);
  });

const queryDB = (params, documentClient, out = []) =>
  new Promise((resolve, reject) => {
    documentClient
      .send(new QueryCommand(params))
      .then(({ Items, LastEvaluatedKey }) => {
        out.push(...Items);
        !LastEvaluatedKey
          ? resolve(out)
          : resolve(queryDB(Object.assign(params, { ExclusiveStartKey: LastEvaluatedKey }), documentClient, out));
      })
      .catch(reject);
  });

class databaseModify {
  constructor(name) {
    this.tableName = `${STAGE}-${name}`;
  } // constructor

  /**
   * Adds an object as a new entry into the dynamodb table.
   *
   * @param newDyanmoObj - object to add as a new dynamodb entry
   * @return Object - objected add to dynamodb
   */
  async addToDB(newDyanmoObj, key = 'id') {
    // log method
    let tableName = this.tableName;
    logger.log(4, 'addToDB', `Attempting to add entry to ${tableName}`);

    // compute method
    if (newDyanmoObj) {
      // new object exists
      const params = {
        TableName: tableName,
        Item: newDyanmoObj
      };

      const putCommand = new PutCommand(params);
      return documentClient
        .send(putCommand)
        .then(() => {
          // log success
          logger.log(4, 'addToDB', `Successfully added ${newDyanmoObj[key]} to ${tableName}`);

          return newDyanmoObj;
        })
        .catch(function (err) {
          // log error
          logger.log(4, 'addToDB', `Failed to add ${newDyanmoObj[key]} to ${tableName}`);

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
      logger.log(4, 'addToDB', `Invalid object to add to ${tableName}`);

      // return rejected promise
      throw err;
    }
  } // addToDB

  /**
   * Gets all entries in the dynamodb table.
   *
   * @return Array - All entries in the dynamodb table.
   */
  async getAllEntriesInDB() {
    // log method
    let tableName = this.tableName;
    logger.log(4, 'getAllEntriesInDB', `Getting all entries from ${tableName}`);

    // compute method
    let params = {
      TableName: tableName
    };

    return scanDB(params, documentClient)
      .then(function (items) {
        // log success
        logger.log(4, 'getAllEntriesInDB', `Successfully read all ${items.length} entries from ${tableName}`);

        return _.sortBy(items, ['lastName', 'middleName', 'firstName', 'budgetName', 'purchaseDate']);
      })
      .catch(function (err) {
        // log error
        logger.log(4, 'getAllEntriesInDB', `Failed to read all entries from ${tableName}`);

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
    logger.log(4, 'getEntry', `Attempting to get entry ${passedID} from database`);

    // compute method
    return this._readFromDB(passedID)
      .then(function (data) {
        if (_.first(data)) {
          // entry found
          // log success
          logger.log(4, 'getEntry', `Successfully got entry ${passedID} from database`);

          // return the first entry
          return _.first(data);
        } else {
          // entry not found
          // log error
          logger.log(4, 'getEntry', `Entry ${passedID} not found`);

          let err = {
            code: 404,
            message: 'Entry not found in database'
          };

          // throw error to be handled by catch
          throw err;
        }
      })
      .catch(function (err) {
        // log error
        logger.log(4, 'getEntry', `Failed to get entry ${passedID} from database`);

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
    logger.log(4, 'getEntryUrl', `Attempting to get entry ${passedID} and ${category} from database`);

    // compute method
    return this._readFromDBUrl(passedID, category)
      .then(function (data) {
        if (_.first(data)) {
          // entry found
          // log success
          logger.log(4, 'getEntryUrl', `Successfully got entry ${passedID} and ${category} from database`);

          // return the first entry
          return _.first(data);
        } else {
          // entry not found
          // log error
          logger.log(4, 'getEntryUrl', `Entry ${passedID} and ${category} not found`);

          let err = {
            code: 404,
            message: 'Entry not found in database'
          };

          // throw error to be handled by catch
          throw err;
        }
      })
      .catch(function (err) {
        // log error
        logger.log(4, 'getEntryUrl', `Failed to get entry ${passedID} and ${category} from database`);

        // throw error
        throw err;
      });
  } // getEntryUrl

  /**
   * Scan dynamodb index for entries by a single attribute.
   *
   * @param secondaryIndex - index name
   * @param scanKey - key attribute to scan by
   * @param scanParam - parameter value of entries
   * @param additionalParams - optional parameter to add or overwrite default param values
   * @return - the entries that fit the parameters
   */
  async scanWithFilter(scanKey, scanParam, additionalParams = {}) {
    // log method
    let tableName = this.tableName;
    logger.log(
      4,
      'scanWithFilter',
      `Attempting to scan from table ${tableName} with key ${scanKey} and value ${scanParam}`
    );

    // compute method
    const params = _.assign(
      {
        TableName: tableName,
        ExpressionAttributeValues: {
          ':scanKey': scanParam
        },
        FilterExpression: `${scanKey} = :scanKey`
      },
      additionalParams
    );

    return scanDB(params, documentClient)
      .then((entries) => {
        // log success
        logger.log(
          4,
          'scanWithFilter',
          `Successfully scanned ${entries.length} entries from table ${tableName} with key`,
          `${scanKey} and value ${scanParam}`
        );

        // return entries
        return entries;
      })
      .catch((err) => {
        // log error
        logger.log(
          4,
          'scanWithFilter',
          `Failed to scan from table ${tableName} with key ${scanKey} and value ${scanParam}`
        );

        // throw error
        throw err;
      });
  } // scanWithFilter

  /**
   * Query dynamodb index for entries by a single attribute.
   *
   * @param secondaryIndex - index name
   * @param queryKey - key attribute to query by
   * @param queryParam - parameter value of entries
   * @param additionalParams - optional parameter to add or overwrite default param values
   * @return - the entries that fit the parameters
   */
  async querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam, additionalParams = {}) {
    // log method
    let tableName = this.tableName;
    logger.log(
      4,
      'querySecondaryIndexInDB',
      `Attempting to query ${secondaryIndex} from table ${tableName} with key ${queryKey} and value ${queryParam}`
    );
    // compute method
    const params = _.assign(
      {
        TableName: tableName,
        IndexName: secondaryIndex,
        ExpressionAttributeValues: {
          ':queryKey': queryParam
        },
        KeyConditionExpression: `${queryKey} = :queryKey`
      },
      additionalParams
    );
    return queryDB(params, documentClient)
      .then((entries) => {
        // log success
        logger.log(
          4,
          'querySecondaryIndexInDB',
          `Successfully queried ${entries.length} entries for ${secondaryIndex} from table ${tableName} with key`,
          `${queryKey} and value ${queryParam}`
        );

        // return entries
        return entries;
      })
      .catch((err) => {
        // log error
        logger.log(
          4,
          'querySecondaryIndexInDB',
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
   * @return - the entries matching the parameters
   */
  async queryWithTwoIndexesInDB(employeeId, expenseTypeId) {
    // log method
    let tableName = this.tableName;
    logger.log(
      4,
      'queryWithTwoIndexesInDB',
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

    return queryDB(params, documentClient)
      .then((entries) => {
        // log success
        logger.log(
          4,
          'queryWithTwoIndexesInDB',
          `Successfully queried ${entries.length} entries from employeeId-expenseTypeId-index from table`,
          `${tableName} for employee ${employeeId} and expense type ${expenseTypeId}`
        );

        // return entries
        return entries;
      })
      .catch((err) => {
        // log error
        logger.log(
          4,
          'queryWithTwoIndexesInDB',
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
    logger.log(4, '_readFromDB', `Attempting to read entries from ${tableName} with ID ${passedID}`);

    // compute method
    const params = {
      TableName: tableName,
      ExpressionAttributeValues: {
        ':id': passedID
      },
      KeyConditionExpression: 'id = :id'
    };

    return queryDB(params, documentClient)
      .then(function (entries) {
        // log success
        logger.log(
          4,
          '_readFromDB',
          `Successfully read ${entries.length} entries from ${tableName} with ID ${passedID}`
        );

        // return entries
        return entries;
      })
      .catch(function (err) {
        // log error
        logger.log(4, '_readFromDB', `Failed to read entries from ${tableName} with ID ${passedID}`);

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
    logger.log(
      4,
      '_readFromDBUrl',
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

    return queryDB(params, documentClient)
      .then(function (entries) {
        // log success
        logger.log(
          4,
          '_readFromDBUrl',
          `Successfully read ${entries.length} url entries from ${tableName} with ID ${passedID} and category`,
          `${category}`
        );
        // return entries
        return entries;
      })
      .catch(function (err) {
        // log error
        logger.log(
          4,
          '_readFromDBUrl',
          `Failed to read url entries from ${tableName} with ID ${passedID} and category ${category}`
        );
        // throw error
        throw err;
      });
  } // _readFromDBUrl

  /**
   * Deletes entries from the dynamodb table by an ID and category.
   *
   * @param passedID - ID of entry to delete
   * @param category - category of entry to delete
   * @return Object - entries deleted
   */
  async removeFromDBUrl(passedID, category) {
    // log method
    let tableName = this.tableName;
    logger.log(4, 'removeFromDB', `Attempting to delete entires from ${tableName} with ID ${passedID}`);

    // compute method
    const params = {
      TableName: tableName,
      Key: {
        id: passedID,
        category: category
      },
      ReturnValues: 'ALL_OLD'
    };

    const deleteCommand = new DeleteCommand(params);
    return documentClient
      .send(deleteCommand)
      .then((data) => {
        // log success
        logger.log(4, 'removeFromDB', `Successfully deleted entires from ${tableName} with ID ${passedID}`);

        return data.Attributes;
      })
      .catch(function (err) {
        // log error
        logger.log(4, 'removeFromDB', `Failed to delete entires from ${tableName} with ID ${passedID}`);

        // throw error
        throw err;
      });
  } // removeFromDBUrl

  /**
   * Deletes entries from the dynamodb table by a single ID.
   *
   * @param passedID - ID of entry to delete
   * @return Object - entries deleted
   */
  async removeFromDB(passedID, key = 'id') {
    // log method
    let tableName = this.tableName;
    logger.log(4, 'removeFromDB', `Attempting to delete entires from ${tableName} with ${key} ${passedID}`);

    // compute method
    const params = {
      TableName: tableName,
      Key: {
        [key]: passedID
      },
      ReturnValues: 'ALL_OLD'
    };
    const deleteCommand = new DeleteCommand(params);
    return documentClient
      .send(deleteCommand)
      .then((data) => {
        // log success
        logger.log(4, 'removeFromDB', `Successfully deleted entires from ${tableName} with ${key} ${passedID}`);

        return data.Attributes;
      })
      .catch(function (err) {
        // log error
        logger.log(4, 'removeFromDB', `Failed to delete entires from ${tableName} with ${key} ${passedID}`);

        // throw error
        throw err;
      });
  } // removeFromDB

  /**
   * Updates an entry in the dynamodb table.
   *
   * @param newDyanmoObj - object to update dynamodb entry to
   * @return Object - object updated in dynamodb
   */
  async updateEntryInDB(newDyanmoObj) {
    // log method
    let tableName = this.tableName;
    logger.log(4, 'updateEntryInDB', `Attempting to update entry in ${tableName} with ID ${newDyanmoObj.id}`);

    // updated an expense, expense-type, or employee
    await this._readFromDB(newDyanmoObj.id).catch((err) => {
      // log error
      logger.log(4, 'updateEntryInDB', `Failed to find entry to update in ${tableName} with ID ${newDyanmoObj.id}`);

      // throw error
      throw err;
    });

    const params = {
      TableName: tableName,
      Item: newDyanmoObj
    };

    const putCommand = new PutCommand(params);
    return documentClient
      .send(putCommand)
      .then(() => {
        // log success
        logger.log(4, 'updateEntryInDB', `Successfully updated entry in ${tableName} with ID ${newDyanmoObj.id}`);

        return newDyanmoObj;
      })
      .catch(function (err) {
        // log error
        logger.log(4, 'updateEntryInDB', `Failed to update entry in ${tableName} with ID ${newDyanmoObj.id}`);

        // throw error
        throw err;
      });
  } // updateEntryInDB

  /**
   * Updates an entry in the dynamodb table.
   *
   * @param newDyanmoObj - object to update dynamodb entry to
   * @return Object - object updated in dynamodb
   */
  async updateAttributeInDB(dynamoObj, attribute) {
    let tableName = this.tableName;
    // log method
    logger.log(4, 'updateEntryInDB', `Attempting to update attribute in ${tableName} with ID ${dynamoObj.id}`);

    let params = { TableName: tableName, Key: { id: dynamoObj.id } };
    if (dynamoObj[attribute]) {
      params['UpdateExpression'] = `set ${attribute} = :a`;
      params['ExpressionAttributeValues'] = { ':a': dynamoObj[attribute] };
    } else {
      params['UpdateExpression'] = `remove ${attribute}`;
    }

    const updateCommand = new UpdateCommand(params);
    try {
      let dynamoObj = await documentClient.send(updateCommand);
      logger.log(4, 'updateEntryInDB', `Successfully updated entry in ${tableName} with ID ${dynamoObj.id}`);
      return dynamoObj;
    } catch (err) {
      // log error
      logger.log(4, 'updateEntryInDB', `Failed to update entry in ${tableName} with ID ${dynamoObj.id}`);

      // throw error
      throw err;
    }
  } // updateEntryInDB

  /**
   * Updates multiple attributes for an entry in the dynamodb table.
   *
   * @param dynamoObj - object with values to update
   * @param {[{table: string, attributes: string[]}]} table objects containing table name and attributes to update
   * @return Object - object updated in dynamodb
   */
  static async updateAttributesInDB(dynamoObj, tables) {
    // log method
    let tableNames = tables.reduce((str, table) => (str += table.table + ', '), '');
    logger.log(4, 'updateAttributesInDB', `Attempting to update attributes in ${tableNames} with ID ${dynamoObj.id}`);

    try {
      let transactItems = [];
      tables.forEach((table) => {
        let setExpression = [];
        let expressionAttributeValues = {};
        let removeExpression = [];
        let params = { TableName: table.table, Key: { id: dynamoObj.id } };
        let attributeList = table.attributes;
        if (_.isEmpty(attributeList)) return;
        //set attributes in updated object, remove attributes not in object
        for (let i = 0; i < attributeList.length; i++) {
          if (dynamoObj[attributeList[i]] || dynamoObj[attributeList[i]] === 0) {
            setExpression.push(`${attributeList[i]} = :${attributeList[i]}`);
            expressionAttributeValues[`:${attributeList[i]}`] = dynamoObj[attributeList[i]];
          } else {
            removeExpression.push(`${attributeList[i]}`);
          }
        }
        //combine set expressions and remove expressions into one command
        params['UpdateExpression'] =
          (setExpression.length > 0 ? 'SET ' + setExpression.join() : '') +
          ' ' +
          (removeExpression.length > 0 ? 'REMOVE ' + removeExpression.join() : '');
        if (setExpression.length > 0) params['ExpressionAttributeValues'] = expressionAttributeValues;
        transactItems.push({ Update: params });
      });
      if (_.isEmpty(transactItems)) {
        logger.log(4, 'updateAttributesInDB', `No attributes to update with ID ${dynamoObj.id}`);
        return dynamoObj;
      }
      await databaseModify.TransactItems(transactItems);
      logger.log(4, 'updateAttributesInDB', `Successfully updated attributes in ${tableNames} with ID ${dynamoObj.id}`);
      return dynamoObj;
    } catch (err) {
      // log error
      logger.log(4, 'updateAttributesInDB', `Failed to update attributes in ${tableNames} with ID ${dynamoObj.id}`);

      // throw error
      throw err;
    }
  } // updateAttributesInDB

  /**
   * Invokes multiple API requests to DynamoDB. If one request fails, all requests fails.
   *
   * @param paramsList list of request parameters
   */
  static async TransactItems(paramsList) {
    logger.log(4, 'transactItems', 'Attempting to perform write operations');

    let params = {
      TransactItems: paramsList
    };
    const transactCommand = new TransactWriteCommand(params);
    return documentClient
      .send(transactCommand)
      .then((data) => {
        logger.log(4, 'transactItems', 'Successfully performed write operations');
        return data;
      })
      .catch((err) => {
        logger.log(
          4,
          'transactItems',
          'Failed to perform write operations. All succeeded action requests have been rolled back'
        );
        throw err;
      });
  }
} // databaseModify

module.exports = databaseModify;
