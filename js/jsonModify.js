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

  _specificFind(indexKey, targetValue) {
    console.log('********** _specificFind ************');
    const found = _.find(this.jsonParsed, [indexKey, targetValue]);
    console.log(found);
    this.readFromJson(targetValue)
      .then(function(data) {
        console.log(data);
        return _.first(data);
      })
      .catch(function(err) {
        console.log(err);
      });
  }

  _writeCallback(object, callback) {
    return err => {
      if (err) {
        callback(err);
      } else {
        callback(null, object);
      }
    }
  }

  _addToJson(newJsonObj, callback) {
    return err => {
      if (err) {
        callback(err);
      } else {
        this.addToJson(newJsonObj, callback);
      }
    };
  }

  /**
   * Add the entry to the database
   */
  addToJson(newJsonObj, callback) {
    if (newJsonObj) {
      // this.jsonParsed = this.jsonParsed.concat([newJsonObj]);
      // const arrayJson = JSON.stringify(this.jsonParsed, null, 2);
      // fs.writeFile(this.filePath, arrayJson, this._writeCallback(newJsonObj, callback));
      var params = {
        TableName: this.getTableName(),
        Item: newJsonObj
      };
      var documentClient = new AWS.DynamoDB.DocumentClient();
      documentClient.put(params)
        .promise()
        .then(function(data) {
          console.log(newJsonObj.id);
        })
        .catch(function(err) {
          console.warn(err);
        });
    } else {
      const err = {
        message: 'ADD: Object already in system'
      };
      callback(err);
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
    var documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient.query(params).promise()
      .then(function(data) {
        console.log(data.Items);
        return data.Items;
      })
      .catch(function(err) {
        console.log(err);
      });
  }

  removeFromJson(passedID, callback) {
    const position = _.findIndex(this.jsonParsed, this._matches(passedID)); //removes type from array
    if (position == -1) { //if error
      const err = {
        message: 'REMOVE: Object not found'
      };
      callback(err);
    } else { //no error
      const output = _.find(this.jsonParsed, this._matches(passedID)); //used find to make testing easier
      this.jsonParsed = _.reject(this.jsonParsed, this._matches(passedID));
      const arrayJson = JSON.stringify(this.jsonParsed, null, 2); //makes json readable
      fs.writeFile(this.filePath, arrayJson, this._writeCallback(output, callback)); //writes json
    }
  }

  updateJsonEntry(newJsonObj) {
    // this.removeFromJson(newJsonObj.id, this._addToJson(newJsonObj, callback));
    const tableName = this.getTableName();
    console.log('TABLE NAME', tableName);
    const params = this.buildUpdateParams(newJsonObj);
    console.log(params, 'params ******************');
    var documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient.update(params)
      .promise()
      .then(function(data) {
        console.log('data returned from dynamo:', JSON.stringify(data));
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
    var documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient.scan(params).promise();
  }

  getTableName() {
    let table = this.filePath.substring(5, this.filePath.indexOf('.json'));
    table = table.charAt(0)
      .toUpperCase() + table.slice(1);
    console.log('***' + table + '***');
    return table;
  }

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
    const tableName = this.getTableName()
    console.log(objToUpdate);
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