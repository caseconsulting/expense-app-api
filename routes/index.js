var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'ExpenseAPI back-end'
  });
  console.log(req.params);
});

module.exports = router;
