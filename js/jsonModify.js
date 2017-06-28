var fs = require('fs');

//read in the json file
//parse existing json to an array
//push new value to array
//stringify the array (JSON>stringify)
//overwrite json
//TODO -> fix naming convention
var addToJson = function(newExpenseType){
  let filePath = 'json/mock_json.json';
  var jsonFile = fs.readFileSync(filePath);
  var jsonParsed = JSON.parse(jsonFile);
  console.log(jsonParsed);
  jsonParsed.push(newExpenseType);
  var arrayJSON = JSON.stringify(jsonParsed, null, 2);
  fs.writeFileSync(filePath, arrayJSON);
}


jsonModify = {
  addToJson
}

module.exports = jsonModify;
