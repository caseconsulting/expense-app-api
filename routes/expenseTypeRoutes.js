const express = require('express');
const router = express.Router();
const jsonModify = require('../js/jsonModify');
const uuid = require('uuid/v4');

function _add({name, budget, odFlag}) {
  console.log(name, budget, odFlag);
  return {id: uuid(), name, budget, odFlag};
}

function _update(id, {name, budget, odFlag}) {
  console.log(id,name, budget, odFlag);
  return {id, name, budget, odFlag};
}


function create(req, res) {
  //response is passed in body
  const newExpenseType = _add(req.body);
  jsonModify.addToJson(newExpenseType, err => {
    if(err) {
      res.status(409).send({error: err.message});
    }
    else {
      res.status(200).send(newExpenseType);
    }
  });

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
  const newExpenseType = _update(req.params.id, req.body);
  jsonModify.updateJsonEntry(newExpenseType, err => {
    if(err) {
      res.status(404).send({error: err.message});
    }
    else {
      res.status(200).send(newExpenseType);
    }
  });
}

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

router.get('/', showList);
router.post('/', create);
router.get('/:id', read);
router.put('/:id', update);
router.delete('/:id', onDelete);

module.exports = {create, onDelete, read, router, showList, update };
