var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
var index = require('./routes/index');


const databaseModify = require('./js/databaseModify');
var ExpenseRoutes = require('./routes/expenseRoutes');
const expenseRoutes = new ExpenseRoutes(new databaseModify('expense.json'));
var ExpenseTypeRoutes = require('./routes/expenseTypeRoutes');
const expenseTypeRoutes = new ExpenseTypeRoutes(new databaseModify('expenseType.json'));
var EmployeeRoutes = require('./routes/employeeRoutes');
const employeeRoutes = new EmployeeRoutes(new databaseModify('employee.json'));
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(cors());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/expense-types', expenseTypeRoutes.router);
app.use('/employees', employeeRoutes.router);
app.use('/expenses', expenseRoutes.router);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error(' No Route Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;