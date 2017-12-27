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
    const found = _.find(this.jsonParsed, [indexKey, targetValue]);
    if (found) {
      return found;
    } else {
      return null;
    }
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
  //read in the json file
  //parse existing json to an array
  //push new value to array
  //stringify the array (JSON>stringify)
  //overwrite json
  addToJson(newJsonObj, callback) {
    if (newJsonObj) {
      this.jsonParsed = this.jsonParsed.concat([newJsonObj]);
      const arrayJson = JSON.stringify(this.jsonParsed, null, 2);
      fs.writeFile(this.filePath, arrayJson, this._writeCallback(newJsonObj, callback));
      var params = {
        TableName: this.getTableName(),
        Item: newJsonObj
      };
      var documentClient = new AWS.DynamoDB.DocumentClient();
      documentClient.put(params)
        .promise()
        .then(function(data) {
          console.log(newJsonObj.id + 'it worked');
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
    console.log('***', JSON.stringify(params), '***');
    var documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient.query(params)
      .promise()
      .then(function(data) {
        console.log(passedID, 'it worked');
        console.log(JSON.stringify(data));
        return data.Items;
      })
      .catch(function(err) {
        console.warn(err);
      });
    // const found = _.find(this.jsonParsed, this._matches(passedID));
    // if (found) {
    //   return found;
    // } else {
    //   return null;
    // }
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
  updateJsonEntry(newJsonObj, callback) {
    this.removeFromJson(newJsonObj.id, this._addToJson(newJsonObj, callback));
  }
  getJson() {
    return this.jsonParsed;
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
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :id',
        };
      case 'Employee':
        return {
          KeyConditionExpression: 'id = :id',
        }
    }
  }
}
module.exports = JsonModify;
