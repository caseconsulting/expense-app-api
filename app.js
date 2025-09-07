const express = require('express');
const path = require('path');
const morganLogger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const dateUtils = require('./js/dateUtils');

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

const UtilityRoutes = require('./routes/utilityRoutes');
const utilityRoutes = new UtilityRoutes();

const AttachmentRoutes = require('./routes/attachmentRoutes');
const attachmentRoutes = new AttachmentRoutes();

const ResumeRoutes = require('./routes/resumeRoutes');
const resumeRoutes = new ResumeRoutes();

const TimesheetsRoutes = require('./routes/timesheetsRoutes');
const timesheetsRoutes = new TimesheetsRoutes();

const BasecampRoutes = require('./routes/basecampRoutes');
const basecampRoutes = new BasecampRoutes();

const EmsiRoutes = require('./routes/emsiRoutes');
const emsiRoutes = new EmsiRoutes();

const GoogleMapRoutes = require('./routes/googleMapsRoutes');
const googleMapRoutes = new GoogleMapRoutes();

const AuditRoutes = require('./routes/auditRoutes');
const auditRoutes = new AuditRoutes();

const AuditRoutesV2 = require('./routes/auditRoutesV2');
const auditRoutesV2 = new AuditRoutesV2();

const ContractRoutes = require('./routes/contractRoutes');
const contractRoutes = new ContractRoutes();

const HighFiveRoutes = require('./routes/highFiveRoutes');
const highFiveRoutes = new HighFiveRoutes();

const PTOCashOutRoutes = require('./routes/ptoCashOutRoutes');
const ptoCashOutRoutes = new PTOCashOutRoutes();

const TagRoutes = require('./routes/tagRoutes');
const tagRoutes = new TagRoutes();

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

let corsConfig = {
  allowedHeaders: ['Authorization', 'Content-Type']
};

morganLogger.token('timestamp', () => {
  return `[${dateUtils.getTodaysDate('YYYY-MM-DDTHH:mm:ssZ')}]`;
});

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
app.use('/resume', resumeRoutes.router);
app.use('/timesheets', timesheetsRoutes.router);
app.use('/basecamp', basecampRoutes.router);
app.use('/emsi', emsiRoutes.router);
app.use('/googleMaps', googleMapRoutes.router);
app.use('/audits', auditRoutes.router);
app.use('/auditsV2', auditRoutesV2.router);
app.use('/contracts', contractRoutes.router);
app.use('/highFives', highFiveRoutes.router);
app.use('/ptoCashOuts', ptoCashOutRoutes.router);
app.use('/tags', tagRoutes.router);
// catch 404 and forward to error handler
app.use((_req, _res, next) => {
  const err = new Error(' No Route Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, _next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
