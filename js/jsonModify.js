const fs = require('fs');
const _ = require('lodash');

function setFilePath(fileName){
  const filePath = 'json/'+fileName;
  const jsonFile = fs.readFileSync(filePath);
  let jsonParsed = JSON.parse(jsonFile);

  function _matches(id){
    return jsonObj => jsonObj.id===id;
  }
  function _writeCallback(object, callback) {
    return err => {
      if(err){
        callback(err);
      }
      else{
        callback(null,object);
      }

    }
  }
  //read in the json file
  //parse existing json to an array
  //push new value to array
  //stringify the array (JSON>stringify)
  //overwrite json
  function addToJson(newJsonObj, callback){
    const position = _.findIndex(jsonParsed, jsonModify._matches(newJsonObj.id));
    if (position == -1){
      jsonParsed = jsonParsed.concat([newJsonObj]);
      const arrayJson = JSON.stringify(jsonParsed, null, 2);
      fs.writeFile(filePath, arrayJson, jsonModify._writeCallback(newJsonObj, callback));
    }
      else {
        const err = {message:'ADD: Object already in system'};
        callback(err);
      }
    }
    //read in the json file
    //parse existing json to an array
    //iterate through the json and find the appropriate value and return it
    function readFromJson(passedID){
      const found =  _.find(jsonParsed, jsonModify._matches(passedID));
      if(found){
        return found;
      }
      else {
        return null;
      }
    }

    function removeFromJson(passedID, callback) {
      const position =  _.findIndex(jsonParsed, jsonModify._matches(passedID)); //removes type from array
      //const output =  _.remove(jsonParsed, jsonModify._matches(passedID)); //removes type from array
      if(position == -1){ //if error
        const err = {message:'REMOVE: Object not found'};
        callback(err);
      }
      else { //no error
        const output = _.find(jsonParsed, jsonModify._matches(passedID)); //used find to make testing easier
        jsonParsed = _.reject(jsonParsed, jsonModify._matches(passedID));
        const arrayJson = JSON.stringify(jsonParsed, null, 2); //makes json readable
        fs.writeFile(filePath, arrayJson, jsonModify._writeCallback(output, callback)); //writes json
      }
    }

    function updateJsonEntry(newJsonObj, callback)
    {
      removeFromJson(newJsonObj.id, err => {
        if(err){
          callback(err);
        }
        else{
          addToJson(newJsonObj,callback);
        }
      });
    }

    function getJson()
    {
      return jsonParsed;
    }

    jsonModify = {
      addToJson,
      readFromJson,
      removeFromJson,
      updateJsonEntry,
      getJson,
      _matches,
      _writeCallback
    }
    return jsonModify;
  }
  module.exports = setFilePath;
