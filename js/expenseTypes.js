var addExpense = function(newId, newName, newBudget, newodFlag) {

  console.log('id: '+ newId + ' name: ' + newName + ' budget: ' + newBudget + ' odFlag: ' + newodFlag);
  var newExpense = { id: newId, name: newName, budget: newBudget, overdraftFlag: newodFlag };
  return newExpense;
}

var expenseTypes = {
  addExpense
}
module.exports = expenseTypes;
