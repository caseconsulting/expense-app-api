const Crud = require('./crudRoutes');
const JsonModify = require('../js/jsonModify');
class ExpenseRoutes extends Crud {
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
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
    const expenseIs = this.validateCostToBudget(expenseTypeId, userId, cost);
    if (expenseIs.valid) {
      return {
        id: uuid,
        purchaseDate,
        reimbursedDate,
        cost,
        description,
        note,
        receipt,
        expenseTypeId,
        userId
      };
    } else {
      return expenseIs;
    }
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
    return {
      id,
      purchaseDate,
      reimbursedDate,
      cost,
      description,
      note,
      receipt,
      expenseTypeId,
      userId
    };
  }

  validateCostToBudget(expenseTypeId, userId, cost) {
    //new instance
    const expenseTypeJson = new JsonModify('expenseType.json');
    const employeeJson = new JsonModify('employee.json');
    const expenseType = expenseTypeJson._specificFind("id", expenseTypeId);
    const employee = employeeJson._specificFind("empId", '' + userId);
    let employeeBalance;
    let budgetPosition;
    let remaining;

    console.log(employee, '***');
    for (var i = 0; i < employee.expenseTypes.length; i++) {
      if (employee.expenseTypes[i].id === expenseTypeId) {
        budgetPosition = i;
        employeeBalance = +employee.expenseTypes[i].balance + cost;
        remaining = expenseType.budget - employeeBalance;
      } else {
        //create new balance under the employee
      }
    }
    console.log(expenseType.budget, employeeBalance);
    console.log(expenseType.odFlag);
    //OVERDRAFT
    if (expenseType.budget - employeeBalance < 0 && expenseType.odFlag) {
      console.log('I am grooooot');

      employee.expenseTypes[budgetPosition].balance = '' + employeeBalance;

      employeeJson.updateJsonEntry(employee, err => {
        console.log('something went wrong', err);
      });

      return {
        valid: true,
        newBalance: employeeBalance

      };
    }
    //PARTIAL COVERAGE
    else if (expenseType.budget !== +employee.expenseTypes[budgetPosition].balance && expenseType.budget - employeeBalance < 0 && !expenseType.odFlag && remaining < 0) {
      employee.expenseTypes[budgetPosition].balance = '' + expenseType.budget;
      employee.expenseTypes[budgetPosition].owedAmount = '' + Math.abs(remaining);

      employeeJson.updateJsonEntry(employee, err => {
        console.log('something went wrong', err);
      });

      return {
        valid: true,
        newBalance: employeeBalance
      };
    }
    //COVERED BY BUDGET
    else if (expenseType.budget - employeeBalance >= 0) {
      employee.expenseTypes[budgetPosition].balance = '' + employeeBalance;

      employeeJson.updateJsonEntry(employee, err => {
        console.log('something went wrong', err);
      });

      return {
        valid: true,
        newBalance: employeeBalance
      };
    } else {
      return {
        valid: false,
        newBalance: employeeBalance
      };
    }

  }
}
module.exports = ExpenseRoutes;
