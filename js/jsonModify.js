const fs = require('fs');
const _ = require('lodash');
const AWS = require('aws-sdk');

class JsonModify {
  constructor(fileName) {
    this.filePath = fileName ? `json/${fileName}` : 'json/';
    this.jsonFile = fileName ? fs.readFileSync(this.filePath) : '';
    this.jsonParsed = fileName ? JSON.parse(this.jsonFile) : [];
    AWS.config.apiVersions = {
      dynamodb: '2012-08-10',
      // other service API versions
    };
    AWS.config.update({
      region: 'us-east-1'
    });
  }

  _matches(id) {
    return jsonObj => jsonObj.id === id;
  }

  /**
   * returns the value if it exists
   */
  _specificFind(indexKey, targetValue) {
    return this.readFromJson(targetValue)
      .then(function(data) {
        return _.first(data);
      });
  }

  /**
   * Add the entry to the database
   */
  addToJson(newJsonObj) {
    if (newJsonObj) {
      const params = {
        TableName: this.getTableName(),
        Item: newJsonObj,
      };
      const documentClient = new AWS.DynamoDB.DocumentClient();
      return documentClient.put(params)
        .promise()
        .then(function(data) {
          return newJsonObj;
        });
    } else {
      return Promise.reject('ADD: Object already in system');
    }
  }

  //read in the json file
  //parse existing json to an array
  //iterate through the json and find the appropriate value and return it
  readFromJson(passedID) {
    const tableName = this.getTableName();
    const params = _.assign({}, {
      TableName: tableName,
      ExpressionAttributeValues: {
        ':id': passedID,
      }
    }, this.buildParams(tableName));
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient.query(params).promise()
      .then(function(data) {
        return data.Items;
      })
      .catch(function(err) {
        console.log(err);
      });
  }

  /**
   * Removes the object from the database according to its index key
   */
  removeFromJson(passedID) {
    const params = {
      TableName: this.getTableName(),
      Key: {
        'id': passedID
      }
    };
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient.delete(params).promise()
      .then(function(data) {
        console.log('deleting data', data);
        return data;
      });
  }

  updateJsonEntry(newJsonObj) {
    const tableName = this.getTableName();
    const params = this.buildUpdateParams(newJsonObj);
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient.update(params)
      .promise()
      .then(function(data) {
        return data.Attributes;
      })
      .catch(function(err) {
        console.warn(err);
      });
  }

  getJson() {
    const tableName = this.getTableName();
    var params = {
      TableName: tableName
    };
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient.scan(params).promise();
  }

  getTableName() {
    let table = this.filePath.substring(5, this.filePath.indexOf('.json'));
    table = table.charAt(0).toUpperCase() + table.slice(1);
    return table;
  }

  //TODO just move this where the params are being created since they're all the same
  buildParams(table) {
    switch (table) {
      case 'Expense':
        return {
          // IndexName: 'userId-index',
          KeyConditionExpression: 'id = :id',
        };
      case 'Employee':
        return {
          KeyConditionExpression: 'id = :id',
        }
      case 'ExpenseType':
        return {
          KeyConditionExpression: 'id = :id',
        }
    }
  }

  buildUpdateParams(objToUpdate) {
    const tableName = this.getTableName();
    switch (tableName) {
      case 'Expense':
        return {
          TableName: 'Expense',
          Key: {
            'id': objToUpdate.id
          },
          UpdateExpression: 'set purchaseDate = :pd, reimbursedDate = :rd, cost = :c, description = :d, note = :n, receipt = :r, expenseTypeId = :eti, userId = :ui',
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
          ReturnValues: "ALL_NEW"
        };
      case 'Employee':
        return {
          TableName: 'Employee',
          Key: {
            'id': objToUpdate.id
          },
          UpdateExpression: 'set firstName = :fn, middleName = :mn, lastName = :ln, empId = :eid, hireDate = :hd, expenseTypes = :et',
          ExpressionAttributeValues: {
            ':fn': objToUpdate.firstName,
            ':mn': objToUpdate.middleName,
            ':ln': objToUpdate.lastName,
            ':eid': objToUpdate.empId,
            ':hd': objToUpdate.hireDate,
            ':et': objToUpdate.expenseTypes,
          },
          ReturnValues: "ALL_NEW"
        };
      case 'ExpenseType':
        return {
          TableName: 'ExpenseType',
          Key: {
            'id': objToUpdate.id
          },
          UpdateExpression: 'set budgetName = :bn, budget = :b, odFlag = :odf, description = :d',
          ExpressionAttributeValues: {
            ':bn': objToUpdate.budgetName,
            ':b': objToUpdate.budget,
            ':odf': false,
            ':d': objToUpdate.description,
          },
          ReturnValues: "ALL_NEW"
        };
    }
  }
}
module.exports = JsonModify;