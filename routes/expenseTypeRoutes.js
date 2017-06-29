var express = require('express');
var router = express.Router();
var expenseTypes = require('../js/expenseTypes');
var jsonModify = require('../js/jsonModify');
/* create expense type listing. */
router.put('/create/:id/:name/:budget/:odFlag', function(req, res) {
  let input = req.params;
  let newExpenseType = expenseTypes.addExpense(input.id, input.name, input.budget, input.odFlag);
  jsonModify.addToJson(newExpenseType);
  res.status(200).send('created ID: '+input.id);
});
//read route
router.get('/read/:id', function(req, res) {
  let input = req.params;
  console.log("get request recieved");
  let output = jsonModify.readFromJson(input.id);
  res.status(200).send(output);
});
//update route
router.put('/update/:id/:name/:budget/:odFlag',function(req,res){
  let input = req.params;
  let newExpenseType = expenseTypes.addExpense(input.id, input.name, input.budget, input.odFlag);
  jsonModify.updateJsonEntry(newExpenseType);
  res.status(200).send(newExpenseType);
});
//delete route
router.delete('/delete/:id',function(req,res){
  
  let id = req.params.id;
  jsonModify.removeFromJson(id);
  res.status(200).send('ID to delete: '+id);
});

module.exports = router;
