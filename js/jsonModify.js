var fs = require('fs');
let filePath = 'json/mock_json.json';
let jsonFile = fs.readFileSync(filePath);
let jsonParsed = JSON.parse(jsonFile);
//read in the json file
//parse existing json to an array
//push new value to array
//stringify the array (JSON>stringify)
//overwrite json
//TODO -> fix naming convention
var addToJson = function(newExpenseType){

  console.log(jsonParsed);
  jsonParsed.push(newExpenseType);
  var arrayJSON = JSON.stringify(jsonParsed, null, 2);
  fs.writeFileSync(filePath, arrayJSON);
}

//iterate through the array
//find the object with the passed in ID
var findObjectPosition = function(passedID){
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
  let position = findObjectPosition(passedID);
  return jsonParsed[position];
}

var removeFromJson = function(passedID) {
      let position = findObjectPosition(passedID); //for loop to find position
      jsonParsed.splice(position,1); //removes type from array
      var arrayJSON = JSON.stringify(jsonParsed, null, 2); //makes json readable
      fs.writeFileSync(filePath, arrayJSON); //writes json
    }

jsonModify = {
  addToJson,
  readFromJson,
  removeFromJson
}

module.exports = jsonModify;
