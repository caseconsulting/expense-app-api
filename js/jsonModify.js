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
  return found;
}

function removeFromJson(passedID) {
  const output =  _.remove(jsonParsed, matches(passedID)); //removes type from array
  const arrayJson = JSON.stringify(jsonParsed, null, 2); //makes json readable
  fs.writeFileSync(filePath, arrayJson); //writes json
  return output[0];
}

function updateJsonEntry(newJsonObj, callback)
{
  const position = _.findIndex(jsonParsed, matches(newJsonObj.id));
  if (position > -1)
  {
    removeFromJson(newJsonObj.id) //remove the old item
    addToJson(newJsonObj,callback);
  }
  else {
    const err = {message:'Object not found :( '};
    callback(err);
  }
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
