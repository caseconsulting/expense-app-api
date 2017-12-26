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

    this.dynamodb = new AWS.DynamoDB.DocumentClient();


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
      let tableToWriteTo = this.filePath.substring(5, this.filePath.indexOf('.json'));
      tableToWriteTo = tableToWriteTo.charAt(0).toUpperCase() + tableToWriteTo.slice(1);
      console.log('***' + tableToWriteTo + '***');
      var params = {
        TableName: tableToWriteTo,
        Item: newJsonObj
      };
      var documentClient = new AWS.DynamoDB.DocumentClient();

      documentClient.put(params, function(err, data) {
        if (err) console.warn(err);
        else console.log(data + 'it worked');
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
    const found = _.find(this.jsonParsed, this._matches(passedID));
    if (found) {
      return found;
    } else {
      return null;
    }
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
}

module.exports = JsonModify;
