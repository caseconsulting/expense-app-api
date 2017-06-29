const fs = require('fs');
const filePath = 'json/mock_json.json';
const jsonFile = fs.readFileSync(filePath);
const jsonParsed = JSON.parse(jsonFile);

//read in the json file
//parse existing json to an array
//push new value to array
//stringify the array (JSON>stringify)
//overwrite json
//TODO -> fix naming convention
function addToJson(newExpenseType){
  console.log(jsonParsed);
  const position = findObjectPosition(newExpenseType.id);
  if (position == -1){
    jsonParsed.push(newExpenseType);
    const arrayJSON = JSON.stringify(jsonParsed, null, 2);
    fs.writeFileSync(filePath, arrayJSON);
  }
  else {
    console.log("That ID exists. Use update if you would like to update "
    + "the exisitng expense type");
  }
}

//iterate through the array
//find the object with the passed in ID
function findObjectPosition(passedID){
  for (let i = 0; i<jsonParsed.length; i++)
  {
    if (jsonParsed[i].id == passedID)
    {
      return i;
    }
  }
  return -1;
}

//read in the json file
//parse existing json to an array
//iterate through the json and find the appropriate value and return it
function readFromJson(passedID){
  const position = findObjectPosition(passedID);
  return jsonParsed[position];
}

function removeFromJson(passedID) {
  const position = findObjectPosition(passedID); //for loop to find position
  const output = jsonParsed.splice(position,1); //removes type from array
  const arrayJSON = JSON.stringify(jsonParsed, null, 2); //makes json readable
  fs.writeFileSync(filePath, arrayJSON); //writes json
  return output;
}

function updateJsonEntry(newExpenseType)
{
  const position = findObjectPosition(newExpenseType.id);
  if (position >= 0)
  {
    removeFromJson(newExpenseType.id) //remove the old item
    addToJson(newExpenseType);
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
