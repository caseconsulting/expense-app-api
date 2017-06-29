var uuid = require('uuid/v4');

var addExpense = function({name, budget, odFlag}) {

  console.log(name, budget, odFlag);
  var newExpense = {id: uuid(), name, budget, odFlag};
  return newExpense;
}

var updateExpense = function(id, {name, budget, odFlag}) {

  console.log(name, budget, odFlag);
  var newExpense = {id, name, budget, odFlag};
  return newExpense;
}


var expenseTypes = {
  addExpense,
  updateExpense
}


module.exports = expenseTypes;
