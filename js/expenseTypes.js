var uuid = require('uuid/v4');

var addExpense = function({name, budget, odFlag}) {

  console.log(name, budget, odFlag);
  var newExpense = {id: uuid(), name, budget, odFlag};
  return newExpense;
}

var expenseTypes = {
  addExpense
}
module.exports = expenseTypes;
