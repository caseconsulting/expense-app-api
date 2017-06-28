var express = require('express');
var router = express.Router();


/* GET users listing. */
router.put('/:id/:name/:budget/:over', function(req, res) {
  res.sendStatus(200);
  console.log(req.params);
  // console.log(req.query);
  addExpense(req.params.id, req.params.name, req.params.budget, req.params.odFlag);
});

var expenseTypes=[];

function addExpense(newId, newName, newBudget, newodFlag) {
  //the inputs will be checked on client site before being passed
  console.log('id: '+ newId + ' name: ' + newName + ' budget: ' + newBudget + ' odFlag: ' + newodFlag);
  var newExpense = { id: newId, name: newName, budget: newBudget, overdraftFlag: newodFlag };
  expenseTypes.push(newExpense);
  console.log(expenseTypes);
}


module.exports = router;
//remember to add this to app.js so that it can use the routes in this file
