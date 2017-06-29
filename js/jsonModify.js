var fs = require('fs');

//read in the json file
//parse existing json to an array
//push new value to array
//stringify the array (JSON>stringify)
//overwrite json
//TODO -> fix naming convention
var addToJson = function(newExpenseType){
  let filePath = 'json/mock_json.json';
  let jsonFile = fs.readFileSync(filePath);
  let jsonParsed = JSON.parse(jsonFile);
  console.log(jsonParsed);
  jsonParsed.push(newExpenseType);
  var arrayJSON = JSON.stringify(jsonParsed, null, 2);
  fs.writeFileSync(filePath, arrayJSON);
}

var findObjectPosition = function(passedID){
  let filePath = 'json/mock_json.json';
  let jsonFile = fs.readFileSync(filePath);
  let jsonParsed = JSON.parse(jsonFile);
  for (let i = 0; i<jsonParsed.length; i++)
  {
    if (jsonParsed[i].id == passedID)
    {
      return i;
    }
  }
  console.log("No object found with matching ID");

}

//read in the json file
//parse existing json to an array
//iterate through the json and find the appropriate value and return it
var readFromJson = function(passedID){
  let filePath = 'json/mock_json.json';
  let jsonFile = fs.readFileSync(filePath);
  let jsonParsed = JSON.parse(jsonFile);
  let position = findObjectPosition(passedID);
  return jsonParsed[position];

}

jsonModify = {
  addToJson,
  readFromJson
}

module.exports = jsonModify;
