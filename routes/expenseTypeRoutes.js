var express = require('express');
var router = express.Router();
var expenseTypes = require('../js/expenseTypes');
var jsonModify = require('../js/jsonModify');
/* create expense type listing. */
router.put('/create/:id/:name/:budget/:over', function(req, res) {
  let input = req.params;
  console.log(req.params);
  let newExpenseType = expenseTypes.addExpense(input.id, input.name, input.budget, input.odFlag);
  jsonModify.addToJson(newExpenseType);
  res.sendStatus(200);
});

router.get('/read/:id', function(req, res) {
  console.log("get request recieved");
  res.status(200).send('request recieved for id' + req.params.id);
});
//update route
router.put('/update/:id',function(req,res){
  let id = req.params.id;
  console.log(id);
  res.status(200).send('ID recived: '+id);
});
//delete route


module.exports = router;
