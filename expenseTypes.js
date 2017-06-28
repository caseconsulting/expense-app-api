var expenseTypes=[], expenseType = { id, name, budget, overdraftFlag };


function addExpense(let newId, let newName, let newBudget, let newOverdraftFlag) {
  //the inputs will be checked on client site before being passed
  var newExpense = { id: newId, name: newName, budget: newBudget, overdraftFlag: newOverdraftFlag };
  expenseTypes.push(newExpense);
}
