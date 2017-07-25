const JsonModify = require('../js/jsonModify');
const jsonModify = new JsonModify('expenseType.json');
const uuid = require('uuid/v4');

function _add(uuid,{
  name,
  budget,
  odFlag
}) {

  let found = jsonModify._specificFind("name", name);
  console.log(name, budget, odFlag);
  if (found)
  {
    return null;
  }
  else {
    return {
      id: uuid,
      name,
      budget,
      odFlag
    };
  }
}

function _update(id, {
  name,
  budget,
  odFlag
}) {
  console.log(id, name, budget, odFlag);
  return {
    id,
    name,
    budget,
    odFlag
  };
}

const crud = require('./crudRoutes')(jsonModify, _add, _update, uuid());
module.exports = Object.assign({}, crud, {
  _add,
  _update
});
