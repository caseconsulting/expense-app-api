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

module.exports = router;
