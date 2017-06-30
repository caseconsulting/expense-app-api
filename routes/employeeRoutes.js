const express = require('express');
const router = express.Router();
const jsonModify = require('../js/jsonModify');
// C
router.post('/', create)

function _add({firstName, middleName, lastName, empNumber, hireDate}) {
  console.log(firstName, middleName, lastName, empNumber, hireDate);
  return {firstName, middleName, lastName, empNumber, hireDate};
}

function create(req, res)
{
  //response is passed in body
  const newEmployee = _add(req.body);
  jsonModify.addToJson(newExpenseType, err => {
    if(err) {
      res.status(409).send({error: err.message});
    }
    else {
      res.status(200).send(newExpenseType);
    }
  });
}
// R
// U
// D
