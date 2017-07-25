const fs = require('fs');
const _ = require('lodash');

class JsonModify{
  constructor(fileName){
   this.filePath = 'json/' + fileName;
   this.jsonFile = fs.readFileSync(this.filePath);
   this.jsonParsed = JSON.parse(this.jsonFile);
 }
   _matches(id) {
    return jsonObj => jsonObj.id === id;
  }

   _specificFind(indexKey, targetValue)
  {
    const found = _.find(this.jsonParsed, [indexKey, targetValue]);
    //console.log(found);
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
    // const position = _.findIndex(this.jsonParsed, this._matches(newJsonObj.id));
    // console.log(position);
    if (newJsonObj) {
      this.jsonParsed = this.jsonParsed.concat([newJsonObj]);
      const arrayJson = JSON.stringify(this.jsonParsed, null, 2);
      fs.writeFile(this.filePath, arrayJson, this._writeCallback(newJsonObj, callback));
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
    //const output =  _.remove(this.jsonParsed, this._matches(passedID)); //removes type from array
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
