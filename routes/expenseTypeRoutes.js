const express = require('express');
const router = express.Router();
const expenseTypes = require('../js/expenseTypes');
const jsonModify = require('../js/jsonModify');
/* create expense type listing. */
router.post('/', function(req, res) {
  //response is passed in body

  const newExpenseType = expenseTypes.add(req.body);
  //const newExpenseType = expenseTypes.addExpense(input.name, input.budget, input.odFlag);
  jsonModify.addToJson(newExpenseType);
  res.status(200).send(newExpenseType);
});
//read route
router.get('/:id', function(req, res) {
  console.log("get request recieved");
  const output = jsonModify.readFromJson(req.params.id);
  res.status(200).send(output);
});

router.get('/', function(req, res) {
  console.log("get request recieved for everything");
  const output = jsonModify.getJson();
  res.status(200).send(output);
});

//update route
router.put('/:id',function(req,res){
  const input = req.body;
  console.log(input);
  const newExpenseType = expenseTypes.update(req.params.id, req.body);
  jsonModify.updateJsonEntry(newExpenseType);
  res.status(200).send(newExpenseType);
});

//delete route
router.delete('/:id',function(req,res){

  const id = req.params.id;
  const output = jsonModify.removeFromJson(id);
  res.status(200).send(output);
});

module.exports = router;
