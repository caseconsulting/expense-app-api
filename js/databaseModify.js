const _ = require('lodash');
const AWS = require('aws-sdk');

class databaseModify {
  constructor(name) {
    this.tableName = name;
    AWS.config.apiVersions = {
      dynamodb: '2012-08-10'
      // other service API versions
    };
    AWS.config.update({
      region: 'us-east-1'
    });
  }

  /**
   * returns the value if it exists
   */
  findObjectInDB(primaryKey) {
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
        throw err; //Throw error and handle properly in crudRoutes
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

  readFromDB(passedID) {
    const params = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':id': passedID
      },
      KeyConditionExpression: 'id = :id'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .query(params)
      .promise()
      .then(function(data) {
        if (!_.isEmpty(data.Items)) {
          return data.Items;
        } else {
          let err = {
            code: 404,
            message: 'Item not found'
          };
          throw err;
        }
      })
      .catch(function(err) {
        throw err;
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
    return documentClient
      .query(params)
      .promise()
      .then(data => {
        if (!_.isEmpty(data.Items)) {
          return data.Items[0];
        } else {
          let err = {
            code: 404,
            message: 'Item not found'
          };
          throw err;
        }
      })
      .catch(err => {
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
        throw err;
      }); //Throw error and handle properly in crudRoutes
  }

  updateEntryInDB(newDyanmoObj) {
    const params = this.buildUpdateParams(newDyanmoObj);
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .update(params)
      .promise()
      .then(function(data) {
        return data.Attributes;
      })
      .catch(function(err) {
        throw err;
      });
  }

  getAllEntriesInDB() {
    var params = {
      TableName: this.tableName
    };
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .scan(params)
      .promise()
      .then(function(data) {
        return data.Items;
      })
      .catch(function(err) {
        throw err;
      });
  }

  /**
   * Builds the parameters for update depending on the this.tablePath
   * @return the parameters for update
   */
  buildUpdateParams(objToUpdate) {
    switch (this.tableName) {
    case 'Expense':
      return {
        TableName: 'Expense',
        Key: {
          id: objToUpdate.id
        },
        UpdateExpression: `set purchaseDate = :pd, reimbursedDate = :rd, cost = :c,
         description = :d, note = :n, receipt = :r, expenseTypeId = :eti, userId = :ui`,
        ExpressionAttributeValues: {
          ':pd': objToUpdate.purchaseDate,
          ':rd': objToUpdate.reimbursedDate,
          ':c': objToUpdate.cost,
          ':d': objToUpdate.description,
          ':n': objToUpdate.note,
          ':r': objToUpdate.receipt,
          ':eti': objToUpdate.expenseTypeId,
          ':ui': objToUpdate.userId
        },
        ReturnValues: 'ALL_NEW'
      };
    case 'Employee':
      return {
        TableName: 'Employee',
        Key: {
          id: objToUpdate.id
        },
        UpdateExpression: `set firstName = :fn, middleName = :mn,
        lastName = :ln, empId = :eid, hireDate = :hd, expenseTypes = :et, isActive = :ia,
        role = :r, email = :eml`,
        ExpressionAttributeValues: {
          ':fn': objToUpdate.firstName,
          ':mn': objToUpdate.middleName,
          ':ln': objToUpdate.lastName,
          ':eid': objToUpdate.empId,
          ':hd': objToUpdate.hireDate,
          ':et': objToUpdate.expenseTypes,
          ':ia': objToUpdate.isActive,
          ':r': objToUpdate.role,
          ':eml': objToUpdate.email
        },
        ReturnValues: 'ALL_NEW'
      };
    case 'ExpenseType':
      return {
        TableName: 'ExpenseType',
        Key: {
          id: objToUpdate.id
        },
        UpdateExpression: 'set budgetName = :bn, budget = :b, odFlag = :odf, description = :d',
        ExpressionAttributeValues: {
          ':bn': objToUpdate.budgetName,
          ':b': objToUpdate.budget,
          ':odf': objToUpdate.odFlag,
          ':d': objToUpdate.description
        },
        ReturnValues: 'ALL_NEW'
      };
    }
  }
}
module.exports = databaseModify;
