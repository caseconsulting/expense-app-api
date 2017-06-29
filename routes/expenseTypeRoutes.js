var express = require('express');
var router = express.Router();
var expenseTypes = require('../js/expenseTypes');
var jsonModify = require('../js/jsonModify');
/* create expense type listing. */
router.post('/', function(req, res) {
  //response is passed in body

  let newExpenseType = expenseTypes.addExpense(req.body);
  //let newExpenseType = expenseTypes.addExpense(input.name, input.budget, input.odFlag);
  jsonModify.addToJson(newExpenseType);
  res.status(200).send(newExpenseType);
});
//read route
router.get('/:id', function(req, res) {
  console.log("get request recieved");
  let output = jsonModify.readFromJson(req.params.id);
  res.status(200).send(output);
});

router.get('/', function(req, res) {
  console.log("get request recieved for everything");
  let output = jsonModify.getJson();
  res.status(200).send(output);
});

//update route
router.put('/:id',function(req,res){
  let input = req.body;
  console.log(input);
  let newExpenseType = expenseTypes.addExpense(req.params.id, input.name, input.budget, input.odFlag);
  jsonModify.updateJsonEntry(newExpenseType);
  res.status(200).send(newExpenseType);
});

//delete route
router.delete('/:id',function(req,res){

  let id = req.params.id;
  jsonModify.removeFromJson(id);
  res.status(200).send('ID to delete: '+id);
});

module.exports = router;
