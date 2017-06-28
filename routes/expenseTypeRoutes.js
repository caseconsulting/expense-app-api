var express = require('express');
var router = express.Router();
var expenseTypes = require('../js/expenseTypes');
/* create expense type listing. */
router.put('/create/:id/:name/:budget/:over', function(req, res) {
  let input = req.params;
  console.log(req.params);
  expenseTypes.addExpense(input.id, input.name, input.budget, input.odFlag);
  res.sendStatus(200);

});

module.exports = router;
