const express = require('express');


// C
function crud(jsModify, _add, _update){
const router = express.Router();
function create(req, res)
{
  //response is passed in body
  console.log('output ',req.body);
  const newEmployee = _add(req.body);
  console.log('new employee ', newEmployee);
  jsonModify.addToJson(newEmployee, (err, updatedEmployee) => {
    if(err) {
      res.status(409).send({error: err.message});
    }
    else {
      res.status(200).send(updatedEmployee);
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
  jsonModify.removeFromJson(id , (err, output) =>{
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

return {create, onDelete, read, router, showList, update };
}

module.exports = crud;
