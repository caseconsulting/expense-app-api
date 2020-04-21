const _ = require('lodash');
const AWS = require('aws-sdk');
require('dotenv').config({
  silent: true
});

const moment = require('moment');
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
  }

  /**
   * Add the entry to the database
   */
  addToDB(newDyanmoObj) {
    if (newDyanmoObj) {
      const params = {
        TableName: this.tableName,
        Item: newDyanmoObj
      };
      const documentClient = new AWS.DynamoDB.DocumentClient();
      return documentClient
        .put(params)
        .promise()
        .then(function() {
          return newDyanmoObj;
        })
        .catch(function(err) {
          console.error(err);
          throw err; //Throw error and handle properly in crudRoutes
        });
    } else {
      let err = {
        code: 406,
        message: 'ADD: Object already in system'
      };
      return Promise.reject(err);
    }
  }

  _buildBudgetUpdateParams(objToUpdate) {
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
  }

  _buildEmployeeUpdateParams(objToUpdate) {
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
  }

  _buildExpenseTypeUpdateParams(objToUpdate) {
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
  }

  _buildExpenseUpdateParams(objToUpdate) {
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
  }

  _buildExpression(data) {
    const alpha = 'abcdefghijklmnopqrstuvwxyz'.split('');
    let ExpressionAttributeValues = {};
    let UpdateExpression = 'set ';
    let ExpressionAttributeNames = {};
    const attributes = _.keys(_.omit(data, ['id', 'category']));

    _.each(attributes, (attribute, index) => {
      const value = _.get(data, attribute);
      if (value != null) {
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
  }

  _buildTrainingUrlUpdateParams(objToUpdate) {
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
  }

  /**
   * Builds the parameters for update depending on the this.tableName
   * @return the parameters for update
   */
  _buildupdateparams(objToUpdate) {
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
  }

  getAllEntriesInDB() {
    let params = {
      TableName: this.tableName
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();

    return scanDB(params, documentClient)
      .then(function(items) {
        return _.sortBy(items, ['lastName', 'middleName', 'firstName', 'budgetName', 'purchaseDate']);
      })
      .catch(function(err) {
        console.error(err);
        throw err;
      });
  }

  /**
   * returns the value if it exists
   */
  getEntry(primaryKey) {
    return this.readFromDB(primaryKey)
      .then(function(data) {
        if (_.first(data)) {
          return _.first(data);
        } else {
          let err = {
            code: 404,
            message: 'Entry not found in database'
          };
          throw err;
        }
      })
      .catch(function(err) {
        console.error(err);
        throw err; //Throw error and handle properly in crudRoutes
      });
  }

  /**
   * returns the value if it exists
   */
  getEntryUrl(primaryKey, secondary) {

    return this.readFromDBUrl(primaryKey, secondary)
      .then(function(data) {
        if (_.first(data)) {
          return _.first(data);
        } else {
          let err = {
            code: 404,
            message: 'Entry not found in database'
          };
          throw err;
        }
      })
      .catch(function(err) {
        console.error(err);
        throw err; //Throw error and handle properly in crudRoutes
      });
  }

  querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam) {
    const params = {
      TableName: this.tableName,
      IndexName: secondaryIndex,
      ExpressionAttributeValues: {
        ':queryKey': queryParam
      },
      KeyConditionExpression: `${queryKey} = :queryKey`
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return queryDB(params, documentClient)
      .then(items => {
        return items;
      })
      .catch(err => {
        console.error(err);
        throw err;
      });
  }

  queryWithTwoIndexesInDB(employeeId, expenseTypeId) {
    const params = {
      TableName: this.tableName,
      IndexName: 'employeeId-expenseTypeId-index',
      ExpressionAttributeValues: {
        ':expenseTypeId': expenseTypeId,
        ':employeeId': employeeId
      },
      KeyConditionExpression: 'expenseTypeId = :expenseTypeId and employeeId = :employeeId'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return queryDB(params, documentClient)
      .then(items => {
        if (!_.isEmpty(items)) {
          return items;
        } else {
          return null;
        }
      })
      .catch(err => {
        console.error(err);
        throw err;
      });
  }

  readFromDB(passedID) {
    const params = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':id': passedID
      },
      KeyConditionExpression: 'id = :id'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return queryDB(params, documentClient)
      .then(function(items) {
        if (!_.isEmpty(items)) {
          return items;
        } else {
          let err = {
            code: 404,
            message: 'Item not found'
          };
          throw err;
        }
      })
      .catch(function(err) {
        console.error(err);
        throw err;
      });
  }

  readFromDBUrl(passedID, category) {
    console.log(
      `[${moment().format()}]`,
      `Reading from training-urls database with id ${passedID} and category ${category}`,
      '| Processing handled by function databaseModify.readFromDBUrl'
    );

    const params = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':id': passedID,
        ':category': category
      },
      KeyConditionExpression: 'id = :id AND category = :category'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return queryDB(params, documentClient)
      .then(function(items) {
        if (!_.isEmpty(items)) {
          return items;
        } else {
          return null;
        }
      })
      .catch(function(err) {
        console.error(err);
        throw err;
      });
  }

  /**
   * Removes the object from the database according to its index key
   */
  removeFromDB(passedID) {
    const params = {
      TableName: this.tableName,
      Key: {
        id: passedID
      },
      ReturnValues: 'ALL_OLD'
    };
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .delete(params)
      .promise()
      .then(data => data.Attributes)
      .catch(function(err) {
        console.error(err);
        throw err;
      }); //Throw error and handle properly in crudRoutes
  }

  updateEntryInDB(newDyanmoObj) {
    const params = this._buildupdateparams(newDyanmoObj);
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .update(params)
      .promise()
      .then(function(data) {
        return data.Attributes;
      })
      .catch(function(err) {
        console.error(err);
        throw err;
      });
  }
}
module.exports = databaseModify;
