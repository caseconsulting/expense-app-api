var express = require('express');
var router = express.Router();


/* GET users listing. */
router.put('/', function(req, res) {
  res.sendStatus(200);
  //console.log(req.params.id);
  addExpense(req.params.id, req.params.name, req.params.budget, req.params.overdraftFlag);
});

var expenseTypes=[];

function addExpense(newId, newName, newBudget, newOverdraftFlag) {
  //the inputs will be checked on client site before being passed
  console.log('id: '+ newId +' name: '+newName +' budget: '+newBudget +' overdraftFlag: '+newOverdraftFlag);
  var newExpense = { id: newId, name: newName, budget: newBudget, overdraftFlag: newOverdraftFlag };
  expenseTypes.push(newExpense);
  console.log(expenseTypes);
}


module.exports = router;
//remember to add this to app.js so that it can use the routes in this file
