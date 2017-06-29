const uuid = require('uuid/v4');

function add({name, budget, odFlag}) {
  console.log(name, budget, odFlag);
  return {id: uuid(), name, budget, odFlag};
}

function update(id, {name, budget, odFlag}) {
  console.log(name, budget, odFlag);
  return {id, name, budget, odFlag};
}


const expenseTypes = {
  add,
  update
}


module.exports = expenseTypes;
