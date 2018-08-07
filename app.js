var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
require('dotenv').config({
  silent: true
});

const Roles = require('./routes/roles');
const roles = new Roles();

const Budget = require('./routes/budgetRoutes');
const budget = new Budget();

const Ping = require('./routes/ping');
const ping = new Ping();
const databaseModify = require('./js/databaseModify');
var ExpenseRoutes = require('./routes/expenseRoutes');
const expenseRoutes = new ExpenseRoutes(new databaseModify('expenses'));
var ExpenseTypeRoutes = require('./routes/expenseTypeRoutes');
const expenseTypeRoutes = new ExpenseTypeRoutes(new databaseModify('expense-types'));
var EmployeeRoutes = require('./routes/employeeRoutes');
const employeeRoutes = new EmployeeRoutes(new databaseModify('employees'));

var SpecialRoutes = require('./routes/specialRoutes');
const specialRoutes = new SpecialRoutes(
  new databaseModify('expenses'),
  new databaseModify('employees'),
  new databaseModify('expense-types')
);
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

let corsConfig = {
  allowedHeaders: ['Authorization', 'Content-Type']
};

app.use(cors(corsConfig));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/ping', ping.router);
app.use('/info', roles.router);
app.use('/expense-types', expenseTypeRoutes.router);
app.use('/employees', employeeRoutes.router);
app.use('/expenses', expenseRoutes.router);
app.use('/special', specialRoutes.router);
app.use('/budgets', budget.router);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error(' No Route Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
