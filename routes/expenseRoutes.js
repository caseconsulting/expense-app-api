const Crud = require('./crudRoutes');
const JsonModify = require('../js/jsonModify');
class ExpenseRoutes extends Crud {
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
  }

  _delete(id) {
    const expense = this.jsonModify._specificFind("id", id);
    this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost, (err, value) => {
      console.log('delete finished');
    });
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
        console.log('add finished');
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

    console.log(expense);
    return function(callback) {
      this.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost, (err, value) => {
        console.log('delete finished');
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
    //add the new expense to employees budget


    // Promise
    // let instance = this;
    // var willIGetNewPhone = new Promise(
    //   function(resolve, reject) {
    //     let deletedCost = instance.deleteCostFromBudget(expense.expenseTypeId, expense.userId, expense.cost);
    //     if (deletedCost.valid) {
    //       console.log('delete cost validity', deletedCost.valid);
    //       resolve(deletedCost.valid);
    //     } else {
    //       var reason = new Error('mom is not happy');
    //       reject(reason);
    //     }
    //   }
    // );
    //
    // // call our promise
    // var askMom = function() {
    //   willIGetNewPhone
    //     .then(function(fulfilled) {
    //       console.log('promise fulfilled', fulfilled);
    //       expenseIs = instance.validateCostToBudget(expenseTypeId, userId, cost);
    //       console.log(expenseIs);
    //     })
    //     .catch(function(error) {
    //       // ops, mom don't buy it
    //       console.log(error.message);
    //     });
    // }
    // askMom();
  }


  validateCostToBudget(expenseTypeId, userId, cost, callback) {
    //new instance

    const expenseTypeJson = new JsonModify('expenseType.json');
    const employeeJson = new JsonModify('employee.json');
    console.log('86 employeeJson', employeeJson);
    const expenseType = expenseTypeJson._specificFind("id", expenseTypeId);
    console.log('88 expenseType', expenseType);
    const employee = employeeJson._specificFind("empId", '' + userId);
    console.log('90 employee', employee);

    let employeeBalance;
    let budgetPosition;
    let remaining;
    console.log('I am groot');
    for (var i = 0; i < employee.expenseTypes.length; i++) {
      console.log('In for loop');
      if (employee.expenseTypes[i].id === expenseTypeId) {
        console.log('in if for 94');
        budgetPosition = i;
        employeeBalance = +employee.expenseTypes[i].balance + cost;
        remaining = expenseType.budget - employeeBalance;
      } else {
        //create new balance under the employee
      }
    }
    //OVERDRAFT
    if (expenseType.budget - employeeBalance < 0 && expenseType.odFlag) {
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
      console.log('employee ', employee);
      employeeJson.updateJsonEntry(employee, callback);
    } else {
      callback({
        failure: true
      });
    }

  }

  deleteCostFromBudget(expenseTypeId, userId, cost, callback) {
    //new instance
    const expenseTypeJson = new JsonModify('expenseType.json');
    const employeeJson = new JsonModify('employee.json');
    const expenseType = expenseTypeJson._specificFind("id", expenseTypeId);
    const employee = employeeJson._specificFind("empId", '' + userId);
    let employeeBalance;

    for (var i = 0; i < employee.expenseTypes.length; i++) {
      if (employee.expenseTypes[i].id === expenseTypeId) {
        employeeBalance = +employee.expenseTypes[i].balance - cost;
        employee.expenseTypes[i].balance = '' + employeeBalance;
        console.log('203 deleteCostFromBudget', employee);
        employeeJson.updateJsonEntry(employee, callback);
        //TODO: what happens if it can't find employees expense
      }
    }
  }
}
module.exports = ExpenseRoutes;
