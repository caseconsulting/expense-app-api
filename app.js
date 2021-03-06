var express = require('express');
var path = require('path');
var morganLogger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cors = require('cors');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');

require('dotenv').config({
  silent: true
});

const Roles = require('./routes/roles');
const roles = new Roles();

const Budget = require('./routes/budgetRoutes');
const budget = new Budget();

const Ping = require('./routes/ping');
const ping = new Ping();

const ExpenseRoutes = require('./routes/expenseRoutes');
const expenseRoutes = new ExpenseRoutes();

const ExpenseTypeRoutes = require('./routes/expenseTypeRoutes');
const expenseTypeRoutes = new ExpenseTypeRoutes();

const EmployeeRoutes = require('./routes/employeeRoutes');
const employeeRoutes = new EmployeeRoutes();

const TrainingUrlRoutes = require('./routes/trainingUrlRoutes');
const trainingUrlRoutes = new TrainingUrlRoutes();

const UtilityRoutes = require('./routes/utilityRoutes');
const utilityRoutes = new UtilityRoutes();

const AttachmentRoutes = require('./routes/attachmentRoutes');
const attachmentRoutes = new AttachmentRoutes();

const TSheetsRoutes = require('./routes/tSheetsRoutes');
const tSheetsRoutes = new TSheetsRoutes();

const TwitterRoutes = require('./routes/twitterRoutes');
const twitterRoutes = new TwitterRoutes();

const BasecampRoutes = require('./routes/basecampRoutes');
const basecampRoutes = new BasecampRoutes();

const BlogRoutes = require('./routes/blogRoutes');
const blogRoutes = new BlogRoutes();

const BlogAttachmentRoutes = require('./routes/blogAttachtmentRoutes');
const blogAttachtmentRoutes = new BlogAttachmentRoutes();

const BlogFileRoutes = require('./routes/blogFileRoutes');
const blogFileRoutes = new BlogFileRoutes();

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

let corsConfig = {
  allowedHeaders: ['Authorization', 'Content-Type']
};

morganLogger.token('timestamp', () => { return `[${moment().format()}]`; });

app.use(morganLogger(':timestamp \\__ :method request made to :url with status :status took :response-time ms'));
app.use(cors(corsConfig));
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
app.use('/utility', utilityRoutes.router);
app.use('/budgets', budget.router);
app.use('/attachment', attachmentRoutes.router);
app.use('/training-urls', trainingUrlRoutes.router);
app.use('/tSheets', tSheetsRoutes.router);
app.use('/twitter', twitterRoutes.router);
app.use('/basecamp', basecampRoutes.router);
app.use('/blog', blogRoutes.router);
app.use('/blogFile', blogFileRoutes.router);
app.use('/blogAttachments', blogAttachtmentRoutes.router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error(' No Route Found');
  err.status = 404;
  next(err);
});

// error handler
//eslint is disabled because we need 4th param but never use it
/*eslint-disable*/ app.use(function(err, req, res, next) {
  /*eslint-enable*/

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
