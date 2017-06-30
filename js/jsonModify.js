const fs = require('fs');
const filePath = 'json/mock_json.json';
const jsonFile = fs.readFileSync(filePath);
const jsonParsed = JSON.parse(jsonFile);
const _ = require('lodash');

function matches(id){
  return jsonObj => jsonObj.id===id;
}

//read in the json file
//parse existing json to an array
//push new value to array
//stringify the array (JSON>stringify)
//overwrite json
//TODO -> fix naming convention
function addToJson(newJsonObj, callback){
  console.log(jsonParsed);
  const position = _.findIndex(jsonParsed, matches(newJsonObj.id));
  if (position == -1){
    jsonParsed.push(newJsonObj);
    const arrayJson = JSON.stringify(jsonParsed, null, 2);
    fs.writeFile(filePath, arrayJson, err => callback(err));
  }
  else {
    const err = {message:'Object already in system'};
    callback(err);
  }
}
//read in the json file
//parse existing json to an array
//iterate through the json and find the appropriate value and return it
function readFromJson(passedID){
  const found =  _.find(jsonParsed, matches(passedID));
  if(found){
    return found;
  }
  else {
    return null;
  }
}

function removeFromJson(passedID, callback) {
  const output =  _.remove(jsonParsed, matches(passedID)); //removes type from array
  if(output.length<1){ //if error
    const err = {message:'Object not found'};
    callback(err);
  }
  else { //no error
    const arrayJson = JSON.stringify(jsonParsed, null, 2); //makes json readable
    fs.writeFile(filePath, arrayJson, err => callback(err)); //writes json
    return output[0];
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
  getJson
}

module.exports = jsonModify;
