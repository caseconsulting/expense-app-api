const Crud = require('./crudRoutes');
const databaseModify = require('../js/databaseModify');
const _ = require('lodash');
const uuid = require('uuid/v4');
const Moment = require('moment');
const MomentRange = require('moment-range');
const IsoFormat = 'YYYY-MM-DD';
const moment = MomentRange.extendMoment(Moment);
const Util = require('../js/Util');
const util = new Util('expenseRoutes');

const Employee = require('./../models/employee');
const Expense = require('./../models/expense');
const ExpenseType = require('./../models/expenseType');
const Budget = require('./../models/budget');

const AWS = require('aws-sdk');
const STAGE = process.env.STAGE;
const BUCKET = `case-consulting-expense-app-attachments-${STAGE}`;
const s3 = new AWS.S3({params: {Bucket: BUCKET}, region: 'us-east-1', apiVersion: '2006-03-01'});

class ExpenseRoutes extends Crud {
  constructor() {
    super();
    this.budgetDynamo = new databaseModify('budgets');
    this.expenseTypeDynamo = new databaseModify('expense-types');
    this.employeeDynamo = new databaseModify('employees');
    this.expenseDynamo = new databaseModify('expenses');
    this.databaseModify = this.expenseDynamo;
    this.moment = moment;
  }

  async _add(id, data) {
    //query DB to see if Budget exists
    let expenseType, budget, expense, employee;
    var budgets = [];

    expense = new Expense(data);
    //expense.id = id; // ignore the api generated uuid

    if (!this._isReimbursed(expense)) {
      util.log(1, '_add',
        `Attempting to add pending expense ${expense.id} for expense type id ${expense.expenseTypeId}`,
        `for user ${expense.userId}`
      );
    }
    else {
      util.log(1, '_add',
        `Attempting to add reimbursed expense ${expense.id} for expense type id ${expense.expenseTypeId}`,
        `for user ${expense.userId}`
      );
    }

    try {
      employee = new Employee(await this.employeeDynamo.findObjectInDB(expense.userId));
      expenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(expense.expenseTypeId));
      if (expenseType.isInactive) {
        let err = {
          code: 403,
          message:
            'The Expense Type selected is Inactive. New Expenses can not be created with an Inactive Expense Type'
        };
        throw err;
      }
      if (expenseType.requiredFlag && this._isEmpty(data.receipt)) {
        let err = {
          code: 403,
          message:
            `The Expense Type ${expenseType.budgetName} requires a receipt.`
        };
        throw err;
      }
      this._isPurchaseWithinRange(expenseType, expense.purchaseDate);
      budgets = await this.budgetDynamo.queryWithTwoIndexesInDB(expense.userId, expense.expenseTypeId);
      // budget = await this._getBudgetData(budgets, expenseType, employee, expense);
      budget = await this._getCurrentBudgetData(budgets, expenseType, employee);
    } catch (err) {
      util.log(1, '_add',
        `Failed to add pending expense ${expense.id} for expense type id ${expense.expenseTypeId}`,
        `for user ${expense.userId}`
      );
      util.error('_add', `Error code: ${err.code}`);
      throw err;
    }

    return this.checkValidity(expense, expenseType, budget, employee)
      .then(() => this._decideIfBudgetExists(budget, expense, expenseType))
      .then(() => this.expenseDynamo.addToDB(expense))
      .then(expense => {
        return expense;
      })
      .catch(err => {
        throw err;
      });
  }

  //returns number fixed at 2 decimal places after addtion operation
  _addCost(addTo, addWith) {
    util.log(4, '_addCost', 'Adding two costs together');

    let newValue = addTo + addWith;
    newValue = Number(newValue);
    return Number(newValue.toFixed(2));
  }

  _addExpenseToBudget(expense, budget) {
    if (!this._isReimbursed(expense)) {
      util.log(1, '_addExpenseToBudget', `Adding pending expense ${expense.id} to budget ${budget.id}`);

      budget.pendingAmount += expense.cost;
    } else {
      util.log(1, '_addExpenseToBudget', `Adding reimbursed expense ${expense.id} to budget ${budget.id}`);

      budget.reimbursedAmount += expense.cost;
    }
    return budget;
  }

  _areExpenseTypesEqual(expense, oldExpense) {
    util.log(3, '_areExpenseTypesEqual',
      `Checking new and old expense types are equal for expense ${expense.id}`
    );

    if (expense && oldExpense) {
      return expense.expenseTypeId === oldExpense.expenseTypeId;
    } else {
      return true; //this is a new expense
    }
  }

  /*
   * calculate the overdraft for a particular employee budget
   */
  async _calcOverdraft(budget, employeeId, expenseType) {
    util.log(3, '_calcOverdraft',
      `Calculating overdraft for user ${employeeId} for budget ${budget.id} for expense type ${expenseType}`
    );

    let totalExp = await this._getEmployeeExpensesTotalReimbursedInBudget(employeeId, budget, expenseType);
    let overdraft = totalExp - Number(expenseType.budget);

    return overdraft;
  }

  _calculateBudgetOverage(budget, expenseType) {
    util.log(3, '_calculateBudgetOverage',
      `Calculating reimbursed overage for budget ${budget.id} and expense type ${expenseType.id}`
    );

    return budget.reimbursedAmount - expenseType.budget;
  }

  /*
   * Change the path name for objects in an a s3 bucket
   */
  async _changeBucket(userId, oldId, newId) {
    util.log(2, '_changeBucket', `Attempting to change S3 file from ${oldId} to ${newId}`);

    var oldPrefix = `${oldId}`;
    var newPrefix = `${newId}`;

    let listParams = {
      Bucket: BUCKET,
      Prefix: `${userId}/${oldPrefix}`
    };
    s3.listObjectsV2(listParams, function(err, data) {
      if (data.Contents.length) {
        let mostRecentFile;
        _.forEach(data.Contents, file => {
          if (!mostRecentFile || file.LastModified > mostRecentFile.LastModified) {
            mostRecentFile = file;
          }
        });

        var params = {
          Bucket: BUCKET,
          CopySource: BUCKET + '/' + mostRecentFile.Key,
          Key: mostRecentFile.Key.replace(oldPrefix, newPrefix)
        };

        s3.copyObject(params, function(copyErr) {
          if (copyErr) {
            util.error('_changeBucket', copyErr);
          } else {
            util.log(2, '_changeBucket', `Copied S3 ${mostRecentFile.Key} to ${params.Key}`);
          }
        });

        /* // code below copies all files but last modified is same making the receipt sync out of order
        _.forEach(data.Contents, async file => {
          var params = {
            Bucket: BUCKET,
            CopySource: BUCKET + '/' + file.Key,
            Key: file.Key.replace(oldPrefix, newPrefix)
          };
          s3.copyObject(params, function(copyErr){
            if (copyErr) {
              util.error('_changeBucket', copyErr);
            }
            else {
              util.log(2, '_changeBucket', `Copied S3 ${file.Key} to ${params.Key}`);
            }
          });
         }); */
      }
    });
  }

  _checkBalance(expense, expenseType, budget, oldExpense) {
    util.log(2, '_checkBalance', `Validating budget for expense ${expense.id}`);

    expense.cost = Number(expense.cost);
    let oldCost = oldExpense ? oldExpense.cost : 0;
    if (!budget && expense.cost <= expenseType.budget) {
      // no budget exists yet, but the cost is valid
      return true;
    } else if (!budget && expense.cost <= expenseType.budget * 2 && expenseType.odFlag) {
      // if no budget exists yet, the expense type is overdraftable and the cost is valid
      return true;
    } else if (!budget) {
      // any other case where the budget is null
      return false;
    }

    let sum = Number((budget.pendingAmount + budget.reimbursedAmount + expense.cost - oldCost).toFixed(2));
    if (sum <= expenseType.budget) {
      return true;
    } else if (expenseType.odFlag && sum <= 2 * expenseType.budget) {
      //enough OD balance
      return true;
    } else {
      return false;
    }
  }

  _checkExpenseDate(purchaseDate, stringStartDate, stringEndDate) {
    util.log(3, '_checkExpenseDate',
      `Checking purchase date ${purchaseDate} is between ${stringStartDate} - ${stringEndDate}`
    );

    let startDate, endDate;
    startDate = moment(stringStartDate, IsoFormat);
    endDate = moment(stringEndDate, IsoFormat);
    return moment(purchaseDate).isBetween(startDate, endDate, 'day', '[]');
  }

  checkValidity(expense, expenseType, budget, employee, oldExpense) {
    util.log(2, 'checkValidity', `Validating expense ${expense.id}`);

    let expenseTypeValid, err, startDate, endDate, validDateRange, balanceCheck;

    startDate = expenseType.recurringFlag ? budget.fiscalStartDate : expenseType.startDate;
    endDate = expenseType.recurringFlag ? budget.fiscalEndDate : expenseType.endDate;
    validDateRange = this._checkExpenseDate(expense.purchaseDate, startDate, endDate);
    balanceCheck = this._checkBalance(expense, expenseType, budget, oldExpense);
    expenseTypeValid = this._areExpenseTypesEqual(expense, oldExpense);
    let valid = expenseTypeValid && validDateRange && balanceCheck && !employee.isInactive;
    let errMessage = 'Expense is not valid because:';
    if (!valid) {
      if (!expenseTypeValid) {
        errMessage += ' the expense type is not valid';
      }
      if (!validDateRange) {
        errMessage += ` the expense is outside the budget range, ${startDate} to ${endDate}`;
      }
      if (!balanceCheck) {
        errMessage += ' the expense is over the budget limit';
      }
      if (employee.isInactive) {
        errMessage += ' the employee is not active';
      }
    }
    err = {
      code: 403,
      message: errMessage
    };
    return valid ? Promise.resolve() : Promise.reject(err);
  }

  _createNewBudget(expenseType, employee, newId) {
    util.log(2, '_createNewBudget',
      `Creating a new budget ${newId} for expense type ${expenseType.id} for user ${employee.id}`
    );

    const newBudget = {
      id: newId,
      expenseTypeId: expenseType.id,
      userId: employee.id,
      reimbursedAmount: 0,
      pendingAmount: 0
    };
    if (expenseType.recurringFlag) {
      // TBD - duplicated from employee routes
      const dates = this._getBudgetDates(employee.hireDate);
      newBudget.fiscalStartDate = dates.startDate.format('YYYY-MM-DD');
      newBudget.fiscalEndDate = dates.endDate.format('YYYY-MM-DD');
    } else {
      newBudget.fiscalStartDate = expenseType.startDate;
      newBudget.fiscalEndDate = expenseType.endDate;
    }
    return this.budgetDynamo.addToDB(newBudget).then(() => newBudget);
  }

  _decideIfBudgetExists(budget, expense, expenseType) {
    util.log(3, '_decideIfBudgetExists', 'Determining if budget exists');

    //if the budget does exist, add the cost of this expense to the pending balance of that budget
    if (budget) {
      budget = this._addExpenseToBudget(expense, budget);
      return this.budgetDynamo.updateEntryInDB(budget);
    } else {
      let newBudget = {
        id: this._getUUID(),
        expenseTypeId: expense.expenseTypeId,
        userId: expense.userId,
        reimbursedAmount: 0,
        pendingAmount: 0,
        fiscalStartDate: expenseType.startDate,
        fiscalEndDate: expenseType.endDate
      };
      newBudget = this._addExpenseToBudget(expense, newBudget);
      return this.budgetDynamo.addToDB(newBudget);
    }
  }

  async _delete(id) {
    util.log(1, '_delete', `Attempting to delete expense ${id}`);

    let expense, budget, expenseType, rawBudgets, budgets;

    try {
      expense = new Expense(await this.expenseDynamo.findObjectInDB(id));
      rawBudgets = await this.budgetDynamo.queryWithTwoIndexesInDB(expense.userId, expense.expenseTypeId);
      budgets = [];
      _.forEach(rawBudgets, budget => budgets.push(new Budget(budget)));

      expenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(expense.expenseTypeId));
      budget = new Budget(this._findBudgetWithMatchingRange(budgets, expense.purchaseDate));
    } catch (err) {
      util.error('_delete', `Error code: ${err.code}`);

      throw err;
    }
    return this._removeFromBudget(budget, expense, expenseType)
      .then(() => this.expenseDynamo.removeFromDB(id))
      .catch(err => {
        throw err;
      });
  }

  _findBudgetWithMatchingRange(budgets, purchaseDate) {
    util.log(3, '_findBudgetWithMatchingRange', `Finding budget for purchase date ${purchaseDate}`);

    let validBudgets = _.find(budgets, budget => {
      return this._checkExpenseDate(purchaseDate, budget.fiscalStartDate, budget.fiscalEndDate);
    });

    if (validBudgets) {
      return validBudgets;
    } else {
      let err = {
        code: 403,
        message: 'Purchase Date is out of your anniversary budget range'
      };
      throw err;
    }
  }

  async _getBudgetData(budgets, expenseType, employee, expense) {
    util.log(2, '_getBudgetData',
      `Getting budget data for expense ${expense.id} with expense type ${expenseType.id} for user ${employee.id}`
    );

    if (_.isEmpty(budgets)) {
      return await this._createNewBudget(expenseType, employee, this._getUUID());
    } else {
      return await this._findBudgetWithMatchingRange(budgets, expense.purchaseDate);
    }
  }

  // TBD - duplicated from employee routes
  _getBudgetDates(hireDate) {
    util.log(3, '_getBudgetDates', `Getting budget dates from hire date ${hireDate}`);

    let currentYear = moment().year();
    let anniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
    let anniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
    const anniversaryComparisonDate = moment([currentYear, anniversaryMonth, anniversaryDay]);
    let startYear = anniversaryComparisonDate.isSameOrBefore(moment(), 'day') ? currentYear : currentYear - 1;
    let startDate = moment([startYear, anniversaryMonth, anniversaryDay]);
    let endDate = moment([startYear + 1, anniversaryMonth, anniversaryDay ]).subtract(1, 'days');

    return {
      startDate,
      endDate
    };
  }

  async _getCurrentBudgetData(budgets, expenseType, employee) {
    util.log(3, '_getCurrentBudgetData',
      `Getting current budget data for expense type ${expenseType.id} for user ${employee.id}`
    );

    if (_.isEmpty(budgets)) {
      return await this._createNewBudget(expenseType, employee, this._getUUID());
    } else {
      if (expenseType.recurringFlag) {
        return await this._findBudgetWithMatchingRange(budgets, moment().format(IsoFormat));
      } else {
        return budgets[0];
      }
    }
  }

  /*
   * Return a mapped array of overdrafts for the employee budgets
   */
  async _getEmployeeBudgetOverdrafts(budgets, employeeId, expenseType) {
    util.log(3, '_getEmployeeBudgetOverdrafts',
      `Getting overdrafts for user ${employeeId} for expense type ${expenseType.id}`
    );

    let overdrafts = [];
    for (let x = 0; x < budgets.length; x++) {
      let overdraft = await this._calcOverdraft(budgets[x], employeeId, expenseType);

      overdrafts.push(overdraft);
    }
    return overdrafts;
  }

  /*
   * Return the total cost of reimbursed expenses for an employee within a budget range
   */
  async _getEmployeeExpensesTotalReimbursedInBudget(employeeId, budget, expenseType) {
    util.log(3, '_getEmployeeExpensesTotalReimbursedInBudget',
      `Calculating total cost of reimbursed expenses for user ${employeeId} within budget ${budget.id}`,
      `for expense type ${expenseType}`
    );

    let expenses = await this.expenseDynamo.querySecondaryIndexInDB('userId-index', 'userId', employeeId);

    let filteredExpenses = _.filter(expenses, expense => {
      return this._isValidExpense(expense, budget, expenseType);
    });

    return _.sumBy(filteredExpenses, expense => {
      return expense.cost;
    });
  }

  _getUUID() {
    util.log(4, '_getUUID', 'Getting random uuid');

    return uuid();
  }

  _isEmpty(field) {
    util.log(4, '_isEmpty', 'Checking if field exists');
    return field == null || field.trim().length <= 0;
  }

  _isNotReimbursedPromise(expense) {
    util.log(3, '_isNotReimbursedPromise', `Checking if expense ${expense.id} is reimbursed`);

    let err = {
      code: 403,
      message: 'expense cannot perform action because it has already been reimbursed'
    };
    return this._isReimbursed(expense) ? Promise.reject(err) : Promise.resolve(true);
  }

  _isPurchaseWithinRange(expenseType, purchaseDate) {
    util.log(3, '_isPurchaseWithinRange',
      `Checking purchase date ${purchaseDate} is within range of expense type ${expenseType.id}`
    );

    if (expenseType.recurringFlag) {
      return true;
    } else if (expenseType.startDate && moment(purchaseDate).isBefore(moment(expenseType.startDate))) {
      throw {
        code: 403,
        message:
          `Purchase date must be between ${expenseType.startDate} and ${expenseType.endDate}. ` +
          'Select a later purchase date'
      };
    } else if (expenseType.endDate && moment(expenseType.endDate).isBefore(moment(purchaseDate))) {
      throw {
        code: 403,
        message:
          `Purchase date must be between ${expenseType.startDate} and ${expenseType.endDate}. ` +
          'Select an earlier purchase date'
      };
    } else {
      return true;
    }
  }

  _isReimbursed(expense) {
    util.log(3, '_isReimbursed', `Checking if expense ${expense.id} is reimbursed`);

    return !!expense.reimbursedDate && expense.reimbursedDate.trim().length > 0;
  }

  /*
   * return true if expense matches expense type, is reimbursed, and within budget range
   */
  _isValidExpense(expense, budget, expenseType) {
    util.log(4, '_isValidExpense',
      `Validating if expense ${expense.id} matches expenseType ${expenseType.id}, is reimbursed,`,
      `and within budget ${budget.id} range`
    );

    return (
      expense.expenseTypeId === expenseType.id &&
      this._isReimbursed(expense) &&
      this._checkExpenseDate(expense.purchaseDate, budget.fiscalStartDate, budget.fiscalEndDate)
    );
  }

  _performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType) {
    util.log(2, '_performBudgetUpdate', `Updating budget ${budget.id}`);

    if (!this._isReimbursed(oldExpense) && this._isReimbursed(newExpense)) {
      //if reimbursing an expense
      return this._reimburseExpense(oldExpense, newExpense, budget, budgets, expenseType);
    } else if (!this._isReimbursed(oldExpense) && !this._isReimbursed(newExpense)) {
      // if changing an unimbursed expense
      return this._unimbursedExpenseChange(oldExpense, newExpense, budget, budgets, expenseType);
    } else if (this._isReimbursed(oldExpense) && !this._isReimbursed(newExpense)) {
      // if unreimbursing an expense
      return this._unreimburseExpense(oldExpense, newExpense, budgets, expenseType);
    }
    return false;
  }

  async _reimburseExpense(oldExpense, newExpense, budget, budgets, expenseType) {
    util.log(1, '_reimburseExpense', `Attempting to reimburse expense ${oldExpense.id}`);

    budget.pendingAmount = this._subtractCost(budget.pendingAmount, oldExpense.cost); // remove pending from old budget

    // get new expense budget
    let newBudget = this._findBudgetWithMatchingRange(budgets, moment(newExpense.purchaseDate, IsoFormat));

    if (budget.id === newBudget.id) {
      newBudget = budget;
    } else {
      await this.budgetDynamo.updateEntryInDB(budget);
    }

    //add reimburse cost to new budget
    newBudget.reimbursedAmount = this._addCost(newBudget.reimbursedAmount, newExpense.cost);

    let dbPromise = await this.budgetDynamo.updateEntryInDB(newBudget);
    let purchaseIncremented = moment(newExpense.purchaseDate, IsoFormat).add(1, 'years'); // increase year by one

    // if over draft is allowed, carry over any overage
    if (expenseType.odFlag) {
      try {
        let nextYearsBudget = this._findBudgetWithMatchingRange(budgets, purchaseIncremented); // get next years budget
        let overage = this._calculateBudgetOverage(newBudget, expenseType); // calculate overdraft overage

        // transfer overage to next year if both exist
        while (nextYearsBudget && overage > 0) {
          // top off overdrafted budget
          newBudget.reimbursedAmount = this._subtractCost(newBudget.reimbursedAmount, overage);
          // move overage to next years budget
          nextYearsBudget.reimbursedAmount = this._addCost(nextYearsBudget.reimbursedAmount, overage);

          // update budgets on dynamodb
          dbPromise = await this.budgetDynamo
            .updateEntryInDB(newBudget)
            .then(this.budgetDynamo.updateEntryInDB(nextYearsBudget));

          // update to the next budget iteration
          newBudget = nextYearsBudget;
          purchaseIncremented.add(1, 'years'); // increment budget year
          nextYearsBudget = this._findBudgetWithMatchingRange(budgets, purchaseIncremented); // get next years budget
          overage = this._calculateBudgetOverage(newBudget, expenseType); // calculate overdraft overage
        }
        util.log(1, '_reimburseExpense', `Successfully reimbursed expense ${oldExpense.id}`);

        return dbPromise;
      } catch (e) {
        return dbPromise;
      }
    }
    util.log(1, '_reimburseExpense', `Successfully reimbursed expense ${oldExpense.id}`);

    return dbPromise;
  }

  _removeFromBudget(budget, expense, expenseType) {
    util.log(1, '_removeFromBudget', `Removing expense ${expense.id} from budget ${budget.id}`);

    budget.pendingAmount -= expense.cost;
    if (!budget.pendingAmount && !budget.reimbursedAmount && !expenseType.recurringFlag) {
      return this.budgetDynamo.removeFromDB(budget.id);
    } else {
      return this.budgetDynamo.updateEntryInDB(budget);
    }
  }

  /*
   * Return an array of sorted budgets by fiscal start date
   */
  _sortBudgets(budgets) {
    util.log(3, '_sortBudgets', 'Sorting budgets');

    return _.sortBy(budgets, [
      budget => {
        return moment(budget.fiscalStartDate, IsoFormat);
      }
    ]);
  }

  //returns number fixed at 2 decimal places after subtraction operation
  _subtractCost(subtractFrom, subtractWith) {
    util.log(4, '_subtractCost', 'subtracting two costs');

    let newValue = subtractFrom - subtractWith;
    newValue = Number(newValue);
    return Number(newValue.toFixed(2));
  }

  _unimbursedExpenseChange(oldExpense, newExpense, budget, budgets) {
    util.log(1, '_unimbursedExpenseChange', `Changing pending expense ${oldExpense.id}`);

    budget.pendingAmount -= oldExpense.cost; // remove old cost from old budget pending amount
    // get new expense budget
    let newBudget = this._findBudgetWithMatchingRange(budgets, moment(newExpense.purchaseDate, IsoFormat));
    if (budget.id !== newBudget.id) {
      // if the new expense is on a new budget
      newBudget.pendingAmount += newExpense.cost; // add new cost to new budget pending amount
      this.budgetDynamo.updateEntryInDB(newBudget);
    } else {
      budget.pendingAmount += newExpense.cost; // add new cost from same budget pending amount
    }
    return this.budgetDynamo.updateEntryInDB(budget); // update dynamo budget
  }

  /*
   * Unreimburse an expense
   */
  async _unreimburseExpense(oldExpense, newExpense, budgets, expenseType) {
    util.log(1, '_unreimburseExpense', `Unreimbursing expense ${oldExpense.id}`);

    // sort the budgets
    let sortedBudgets = this._sortBudgets(budgets);

    // get the sorted budget overdrafts
    let budgetOverdrafts = await this._getEmployeeBudgetOverdrafts(sortedBudgets, newExpense.userId, expenseType);
    budgetOverdrafts.unshift(0);

    // get the new expense budget
    let expenseBudget = await this._findBudgetWithMatchingRange(
      sortedBudgets,
      moment(newExpense.purchaseDate, IsoFormat)
    );

    let currBudgetIndex = 0;
    let acquiredOverdraft = 0;
    let performBudgetUpdate = false;
    let unimburse = Number(oldExpense.cost);
    let remaining = unimburse;
    let refund = 0;
    do {
      // calculate the accumulated overdraft
      acquiredOverdraft = Math.max(acquiredOverdraft += budgetOverdrafts[currBudgetIndex], 0);

      if (expenseBudget.id == sortedBudgets[currBudgetIndex].id) {
        // if reaching the unreimburse expense budget
        sortedBudgets[currBudgetIndex].pendingAmount += unimburse; // reset pending amount
        performBudgetUpdate = true; // signal budget updates
      }
      if (performBudgetUpdate) {
        // if should performing budget updates
        // get the reimbursed amount for the current budget
        let reimbursedAmnt = sortedBudgets[currBudgetIndex].reimbursedAmount;
        let totalReimbursedInBudget = await this._getEmployeeExpensesTotalReimbursedInBudget(
          newExpense.userId,
          sortedBudgets[currBudgetIndex],
          expenseType
        ); // get the total expenses in the budget
        // calculate how much to refund for current budget
        if (expenseBudget.id == sortedBudgets[currBudgetIndex].id) {
          refund =
            Math.max(reimbursedAmnt - (totalReimbursedInBudget - unimburse), 0) + remaining
              - (Math.max(acquiredOverdraft, 0) + unimburse);
        } else {
          refund = Math.max(reimbursedAmnt - totalReimbursedInBudget, 0) + remaining - Math.max(acquiredOverdraft, 0);
        }

        remaining -= refund; // subtract current refund from remaining refund

        // update budget
        sortedBudgets[currBudgetIndex].reimbursedAmount -= refund;
        await this.budgetDynamo.updateEntryInDB(sortedBudgets[currBudgetIndex]); // update budget in table
      }
      currBudgetIndex++; // continue to next budget
    } while (remaining > 0 && currBudgetIndex < sortedBudgets.length);
    util.log(1, '_unreimburseExpense', `Successfully unreimbursed expense ${oldExpense.id}`);

    return sortedBudgets;
  }

  async _update(id, data) {
    util.log(1, '_update', `Attempting to update expense ${id}`);

    let expenseType, oldExpenseType, budget, newExpense, employee, oldExpense, rawBudgets;
    var budgets = [];
    newExpense = new Expense(data);
    newExpense.id = id;
    oldExpense = new Expense(await this.expenseDynamo.findObjectInDB(id));
    employee = new Employee(await this.employeeDynamo.findObjectInDB(newExpense.userId));
    expenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(newExpense.expenseTypeId));

    if (expenseType.id !== oldExpense.expenseTypeId) {
      let unreimburseExpense = _.cloneDeep(oldExpense);
      unreimburseExpense.reimbursedDate = ' ';
      newExpense.id = uuid();
      if (!this._isEmpty(oldExpense.receipt)){
        this._changeBucket(oldExpense.userId, oldExpense.id, newExpense.id);
      }

      util.log(1, '_update', `Changing the expense type for ${oldExpense.id} from ${oldExpense.expenseTypeId}`,
        `to ${expenseType.id} with new id ${newExpense.id}`
      );

      try {
        oldExpenseType = new ExpenseType(await this.expenseTypeDynamo.findObjectInDB(oldExpense.expenseTypeId));
        if (oldExpenseType.isInactive && employee.employeeRole === 'user') {
          let err = {
            code: 403,
            message: 'Permission Denied. Users can not edit Expenses with an Inactive Expense Type'
          };
          throw err;
        }
        rawBudgets = await this.budgetDynamo.queryWithTwoIndexesInDB(oldExpense.userId, oldExpense.expenseTypeId);
        rawBudgets.forEach(function(e) {
          budgets.push(new Budget(e));
        });
      } catch (err) {
        util.error('_update', `Error code: ${err.code}`);

        throw err;
      }

      if (!expenseType.requiredFlag) {
        newExpense.receipt = ' ';
      }
      if (expenseType.categories.length <= 0) {
        newExpense.categories = ' ';
      }

      if (!this._isEmpty(oldExpense.reimbursedDate)) {
        return this._add(null, newExpense)
          .then(async (addedObject) =>  {
            await this._unreimburseExpense(oldExpense, unreimburseExpense, budgets, oldExpenseType);
            return addedObject;
          })
          .then(async (addedObject) => {
            await this._delete(oldExpense.id);
            return addedObject;
          })
          .catch(err => {
            throw err;
          });
      } else {
        return this._add(null, newExpense)
          .then(async (addedObject) => {
            await this._delete(oldExpense.id);
            return addedObject;
          })
          .catch(err => {
            throw err;
          });
      }

    } else {
      try {

        if (expenseType.isInactive && employee.employeeRole === 'user') {
          let err = {
            code: 403,
            message: 'Permission Denied. Users can not edit Expenses with an Inactive Expense Type'
          };
          throw err;
        }
        rawBudgets = await this.budgetDynamo.queryWithTwoIndexesInDB(newExpense.userId, newExpense.expenseTypeId);
        rawBudgets.forEach(function(e) {
          budgets.push(new Budget(e));
        });
        budget = new Budget(this._findBudgetWithMatchingRange(budgets, oldExpense.purchaseDate));
      } catch (err) {
        util.error('_update', `Error code: ${err.code}`);

        throw err;
      }

      return this.checkValidity(newExpense, expenseType, budget, employee, oldExpense)
        .then(() => this._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType))
        .then(() => this.expenseDynamo.updateEntryInDB(newExpense))
        .catch(err => {
          throw err;
        });
    }
  }
}
module.exports = ExpenseRoutes;
