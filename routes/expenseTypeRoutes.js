const express = require('express');
const router = express.Router();
const expenseTypes = require('../js/expenseTypes');
const jsonModify = require('../js/jsonModify');
/* create expense type listing. */
function create(req, res) {
  //response is passed in body
  const newExpenseType = expenseTypes.add(req.body);
  //const newExpenseType = expenseTypes.addExpense(input.name, input.budget, input.odFlag);
  jsonModify.addToJson(newExpenseType);
  res.status(200).send(newExpenseType);
}

function read(req, res) {
  console.log("get request recieved");
  const output = jsonModify.readFromJson(req.params.id);
  res.status(200).send(output);
}

function showList(req, res) {
  console.log("get request recieved for everything");
  const output = jsonModify.getJson();
  res.status(200).send(output);
}

function update(req,res){
  const input = req.body;
  console.log(input);
  const newExpenseType = expenseTypes.update(req.params.id, req.body);
  jsonModify.updateJsonEntry(newExpenseType);
  res.status(200).send(newExpenseType);
}

function onDelete(req,res){

  const id = req.params.id;
  const output = jsonModify.removeFromJson(id);
  res.status(200).send(output);
}

router.get('/', showList);
router.post('/', create);
router.get('/:id', read);
router.put('/:id', update);
router.delete('/:id', onDelete);

module.exports = {create, onDelete, read, router, showList, update };
