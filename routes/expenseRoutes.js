const Crud = require('./crudRoutes');
const JsonModify = require('../js/jsonModify');

class ExpenseRoutes extends Crud {
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
  }

  _delete(id) {
    const expense = this.jsonModify._specificFind("id", id);
    this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost, (err, value) => {});
  }

  _add(uuid, {
    purchaseDate,
    reimbursedDate,
    cost,
    description,
    note,
    receipt,
    expenseTypeId,
    userId
  }) {
    return function(callback) {
      this.validateCostToBudget(expenseTypeId, userId, cost, (err, value) => {
        if (err) {
          callback(err);
          //TODO handle error here
        } else {

          callback(null, {
            id: uuid,
            purchaseDate,
            reimbursedDate,
            cost,
            description,
            note,
            receipt,
            expenseTypeId,
            userId
          });
        }
      });
    }.bind(this);

  }

  _update(id, {
    purchaseDate,
    reimbursedDate,
    cost,
    description,
    note,
    receipt,
    expenseTypeId,
    userId
  }) {

    //removes old cost from employees budget
    const expense = this.jsonModify._specificFind("id", id);

    return function(callback) {
      if (expense.cost === cost) {
        return callback(null, {
          id,
          purchaseDate,
          reimbursedDate,
          cost,
          description,
          note,
          receipt,
          expenseTypeId,
          userId
        });
      }
      this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost, (err, value) => {

        this.validateCostToBudget(expenseTypeId, userId, cost, (err, value) => {
          if (err) {
            callback(err);
            //TODO handle error here
          } else {
            return callback(null, {
              id,
              purchaseDate,
              reimbursedDate,
              cost,
              description,
              note,
              receipt,
              expenseTypeId,
              userId
            });
          }
        });
      });
    }.bind(this);
  }


  validateCostToBudget(expenseTypeId, userId, cost, callback) {
    //new instance

    const expenseTypeJson = new JsonModify('expenseType.json');
    const employeeJson = new JsonModify('employee.json');
    const expenseType = expenseTypeJson._specificFind("id", expenseTypeId);
    //TODO remove empty quotes from User ID since UUID is always string
    const employee = employeeJson._specificFind("id", '' + userId);
    console.log(employee);
    if (!employee.expenseTypes) {
      //create new balance under the employee
      employee.expenseTypes = [];
      console.log(employee);
      employeeJson.updateJsonEntry(employee, callback);
    }
    let employeeBalance;
    let budgetPosition;
    let remaining;
    for (var i = 0; i < employee.expenseTypes.length; i++) {
      if (employee.expenseTypes[i].id === expenseTypeId) {

        budgetPosition = i;
        employeeBalance = +employee.expenseTypes[i].balance + cost;
        remaining = expenseType.budget - employeeBalance;
      }
    }
    if (!employeeBalance) {
      //create new balance under the employee
      let newExpense = {
        id: expenseTypeId,
        balance: '' + cost,
        owedAmount: '0'
      }
      employee.expenseTypes.push(newExpense);
      employeeJson.updateJsonEntry(employee, callback);
    }
    //OVERDRAFT
    else if (expenseType.budget - employeeBalance < 0 && expenseType.odFlag) {
      employee.expenseTypes[budgetPosition].balance = '' + employeeBalance;

      employeeJson.updateJsonEntry(employee, callback);
    }
    //PARTIAL COVERAGE
    else if (expenseType.budget !== +employee.expenseTypes[budgetPosition].balance && expenseType.budget - employeeBalance < 0 && !expenseType.odFlag && remaining < 0) {
      employee.expenseTypes[budgetPosition].balance = '' + expenseType.budget;
      employee.expenseTypes[budgetPosition].owedAmount = '' + Math.abs(remaining);
      employeeJson.updateJsonEntry(employee, callback);
    }
    //COVERED BY BUDGET
    else if (expenseType.budget - employeeBalance >= 0) {
      employee.expenseTypes[budgetPosition].balance = '' + employeeBalance;
      employeeJson.updateJsonEntry(employee, callback);
    } else {
      callback({
        msg: `expense over budget limit: ${Math.abs(remaining)}`,
        code: 422
      }, null);
    }

  }

  deleteCostFromBudget(expenseTypeId, userId, cost, callback) {
    //new instance
    const expenseTypeJson = new JsonModify('expenseType.json');
    const employeeJson = new JsonModify('employee.json');
    const expenseType = expenseTypeJson._specificFind("id", expenseTypeId);
    //TODO remove empty quotes from User ID since UUID is always string
    const employee = employeeJson._specificFind("id", '' + userId);
    let employeeBalance;
    if (!employee) {
      callback({
        msg: 'employee not found',
        code: 404
      }, null);
    }

    for (var i = 0; i < employee.expenseTypes.length; i++) {
      if (employee.expenseTypes[i].id === expenseTypeId) {
        employeeBalance = +employee.expenseTypes[i].balance - cost;
        employee.expenseTypes[i].balance = '' + employeeBalance;
        employeeJson.updateJsonEntry(employee, callback);
      }
    }
    if (!employeeBalance) {
      callback({
        msg: 'Expense not found',
        code: 404
      }, null);
    }
  }
}
module.exports = ExpenseRoutes;
