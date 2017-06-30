const express = require('express');
const router = express.Router();
const jsonModify = require('../js/jsonModify');
// C
function _add({firstName, middleName, lastName, id, hireDate}) {
  console.log(firstName, middleName, lastName, id, hireDate);
  return {firstName, middleName, lastName, id, hireDate};
}
function _update(id, {name, budget, odFlag}) {
  console.log(id,name, budget, odFlag);
  return {id, name, budget, odFlag};
}
function create(req, res)
{
  //response is passed in body
  const newEmployee = _add(req.body);
  jsonModify.addToJson(newEmployee, err => {
    if(err) {
      res.status(409).send({error: err.message});
    }
    else {
      res.status(200).send(newEmployee);
    }
  });
}
// R
function read(req, res) {
  console.log("get request recieved");
  const output = jsonModify.readFromJson(req.params.id);
  if(output){
    res.status(200).send(output);
  }
  else {
    const err = {message:'READ: Object not found'};
    res.status(404).send({error: err.message});
  }
}
// U
function update(req,res){
  const input = req.body;
  console.log(input);
  const newEmployee = _update(req.params.id, req.body);
  jsonModify.updateJsonEntry(newEmployee, err => {
    if(err) {
      res.status(404).send({error: err.message});
    }
    else {
      res.status(200).send(newEmployee);
    }
  });
}
//D
function onDelete(req,res){
  const id = req.params.id;
  const output = jsonModify.removeFromJson(id , err =>{
    if(err) {
      res.status(404).send({error: err.message});
    }
    else {
      res.status(200).send(output);
    }
  });
}
function showList(req, res) {
  console.log("get request recieved for everything");
  const output = jsonModify.getJson();
  res.status(200).send(output);
}

router.get('/', showList);
router.post('/', create);
router.get('/:id', read);
router.put('/:id', update);
router.delete('/:id', onDelete);

module.exports = {create, onDelete, read, router, showList, update };
