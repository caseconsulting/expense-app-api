const _ = require('lodash');
const { S3Client, CopyObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const Budget = require(process.env.AWS ? 'budget' : '../models/budget');
const Crud = require(process.env.AWS ? 'crudRoutes' : './crudRoutes');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Employee = require(process.env.AWS ? 'employee' : '../models/employee');
const Expense = require(process.env.AWS ? 'expense' : '../models/expense');
const ExpenseType = require(process.env.AWS ? 'expenseType' : '../models/expenseType');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');
const utils = require(process.env.AWS ? 'utils' : '../js/utils');

const ISOFORMAT = 'YYYY-MM-DD';
const logger = new Logger('expenseRoutes');

const STAGE = process.env.STAGE;
let prodFormat = STAGE == 'prod' ? 'consulting-' : '';
const BUCKET = `case-${prodFormat}expense-app-attachments-${STAGE}`;
const s3Client = new S3Client({ params: { Bucket: BUCKET }, region: 'us-east-1', apiVersion: '2006-03-01' });

class ExpenseRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new DatabaseModify('expenses');
    this.s3Client = s3Client;
  } // constructor

  /**
   * Helper to validate expenses with a monthlyLimit, eg used in _validateAdd and _validateUpdate.
   *
   * @param oldExpense old version of expense (optional, set to undefined if this is not an update)
   * @param expense expense to validate
   * @param employee employee attached to expense
   * @param expenseType type of expense
   *
   * @return true if expense if valid concerning monthlyLimit, else false
   */
  async _monthlyLimitValidate(oldExpense, expense, employee, expenseType) {
    // exit early if no monthlyLimit
    if (!expenseType.monthlyLimit) return { monthlyLimitValid: true, leftoverBudget: undefined };
    // get all expenses and add up ones from expense's createdAt month
    let expenses = await this.databaseModify.queryWithTwoIndexesInDB(employee.id, expenseType.id);
    let sum = 0;
    for (let e of expenses) {
      let [start, end] = [dateUtils.startOf(e.createdAt, 'month'), dateUtils.endOf(e.createdAt, 'month')];
      if (dateUtils.isBetween(e.createdAt, start, end, '[]')) sum += e.cost;
    }
    // return whether or not the monthly limit is valid, and the leftover budget
    let leftoverBudget = Number(expenseType.monthlyLimit) - sum - (oldExpense?.cost ?? 0);
    let round = (n) => Math.round(n * 100) / 100;
    let monthlyLimitValid = round(expense.cost) <= round(leftoverBudget);
    return { monthlyLimitValid, leftoverBudget };
  } // _monthlyLimitvalidate

  /**
   * Adds expense cost to budget. Returns the budget if successfully added the expense cost, otherwise returns error.
   *
   * @param expense - Expense to add to budget
   * @param employee - Employee of expense TODO: figure out if this should be removed?
   * @param expenseType - ExpenseType of expense
   * @param budget - Budget to add expense to
   * @return Budget - budget with added expense
   */
  async _addToBudget(expense, employee, expenseType, budget) {
    // log method
    logger.log(2, '_addToBudget', `Attempting to add expense ${expense.id} to budget ${budget.id}`);
    // compute method
    try {
      if (!this._isValidCostChange(undefined, expense, expenseType, budget)) {
        // total exceeds max amount allowed for budget
        throw {
          code: 403,
          message: 'Expense is over the budget limit.'
        };
      } else {
        let updatedBudget = _.cloneDeep(budget);
        if (expense.isReimbursed()) {
          // if expense is reimbursed, update the budgets reimbursed amount
          logger.log(2, '_addToBudget', `Adding $${expense.cost} to reimbursed amount ($${budget.reimbursedAmount})`);

          updatedBudget.reimbursedAmount += expense.cost;
        } else {
          // if expense is not reimbursed, update the budgets pending amount
          logger.log(2, '_addToBudget', `Adding $${expense.cost} to pending amount ($${budget.pendingAmount})`);

          updatedBudget.pendingAmount += expense.cost;
        }

        let dataUpdated = await this.budgetDynamo.updateEntryInDB(updatedBudget);
        // log success
        logger.log(2, '_addToBudget', `Successfully added expense ${expense.id} to budget ${dataUpdated.id}`);

        // return updated budget
        return dataUpdated;
      }
    } catch (err) {
      // log error
      logger.log(2, '_addToBudget', `Failed to add expense ${expense.id} to budget ${budget.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _addToBudget

  /**
   * Change the path name for the most recent receipt object in the aws s3 bucket.
   *
   * @param employeeId - employee id of receipt
   * @param oldExpenseId - old expense id
   * @param newExpenseId - new expense id
   */
  async _changeBucket(employeeId, oldExpenseId, newExpenseId) {
    // log method
    logger.log(2, '_changeBucket', `Attempting to copy S3 bucket from ${oldExpenseId} to ${newExpenseId}`);

    // compute method
    let listParams = {
      Bucket: BUCKET,
      Prefix: `${employeeId}/${oldExpenseId}`
    };

    // set up curry function
    let curryCopy = _.curry(this._copyFunction);
    let copySetUp = curryCopy(this.s3Client, this._copyFunctionLog, employeeId, oldExpenseId, newExpenseId);

    // list the objects in the current bucket and execute copy curry function
    const command = new ListObjectsV2Command(listParams);
    await this.s3Client
      .send(command)
      .then(async (data) => await copySetUp(null, data))
      .catch(async (err) => await copySetUp(err, null));
  } // _changeBucket

  /**
   *  Copies a file from one s3 bucket to another.
   *
   * @param s3Client - the s3 sdk client to the buckets
   * @param copyFunctionLog - function to log status
   * @param employeeId - employee id of receipt
   * @param oldExpenseId - old expense id
   * @param newExpenseId - new expense id
   * @param err - s3 listObjectsV2 error
   * @param data - s3 listObjectsV2 data
   * @return Promise - rejected promise if error exists
   */
  async _copyFunction(s3Client, copyFunctionLog, employeeId, oldExpenseId, newExpenseId, err, data) {
    // log method
    logger.log(
      3,
      '_changeBucket',
      `Attempting to copy S3 file from ${employeeId}/${oldExpenseId} to ${employeeId}/${newExpenseId}`
    );

    // compute method
    if (err) {
      // if err exists, return err
      logger.log(3, '_changeBucket', `Failed to copy S3 bucket from ${oldExpenseId} to ${newExpenseId}`);
      return Promise.reject(err);
    }

    if (data.Contents.length) {
      // if there is a file in the bucket to copy
      let mostRecentFile; // get the most recent file in the s3 bucket
      _.forEach(data.Contents, (file) => {
        if (!mostRecentFile || dateUtils.isAfter(file.LastModified, mostRecentFile.LastModified)) {
          mostRecentFile = file;
        }
      });

      // set up aws copy params
      let params = {
        Bucket: BUCKET,
        CopySource: BUCKET + '/' + mostRecentFile.Key,
        Key: mostRecentFile.Key.replace(oldExpenseId, newExpenseId)
      };

      // copy the file from old s3 bucket to new s3 bucket
      const command = new CopyObjectCommand(params);
      await s3Client
        .send(command)
        .then(async () => await copyFunctionLog())
        .catch(async (err) => await copyFunctionLog(err));
    } else {
      // no files in bucket to copy
      logger.log(2, '_changeBucket', `No S3 bucket content to copy from ${employeeId}/${oldExpenseId}`);
    }
  } // _copyFunction

  /**
   * Logs the status of copy function. Returns a rejected promise is the status has an error.
   *
   * @param error - copy function error
   * @return Promise - rejected promise if error exists
   */
  async _copyFunctionLog(error) {
    if (error) {
      logger.log(3, '_changeBucket', 'Failed to copy S3 file');
      return Promise.reject(error);
    } else {
      logger.log(3, '_changeBucket', 'Successfully copied S3 file');
      logger.log(2, '_changeBucket', 'Successfully copied S3 bucket');
    }
  } // _copyFunctionLog

  /**
   * Create an expense and update budgets. Returns the expense created.
   *
   * @param data - data of expense
   * @return Expense - expense created
   */
  async _create(data) {
    // log method
    logger.log(
      2,
      '_create',
      `Preparing to create expense ${data.id} for expense type ${data.expenseTypeId} for employee ${data.employeeId}`
    );

    // compute method
    try {
      let expense = new Expense(data);
      let [employee, expenseType, tags] = await Promise.all([
        new Employee(await this.employeeDynamo.getEntry(expense.employeeId)),
        this.expenseTypeDynamo.getEntry(expense.expenseTypeId),
        this.tagDynamo.getAllEntriesInDB()
      ]);
      expenseType.categories = _.map(expenseType.categories, (category) => {
        return JSON.parse(category);
      });
      expenseType = new ExpenseType(expenseType);

      await Promise.all([
        await this._validateExpense(expense, employee, expenseType),
        await this._validateAdd(expense, employee, expenseType)
      ]);

      let budget;

      try {
        budget = await this._findBudget(employee.id, expenseType.id, expense.purchaseDate); // find budget
      } catch (err) {
        budget = await this.createNewBudget(employee, expenseType, null, tags); // create budget
      }

      await this._addToBudget(expense, null, expenseType, budget); // add expense to budget

      if (expenseType.to || expense.category?.to) {
        await this._emailNotification(employee, expense, expenseType);
      }

      // log success
      logger.log(
        2,
        '_create',
        `Successfully prepared to create expense ${data.id} for expense type ${data.expenseTypeId} for employee`,
        `${data.employeeId}`
      );

      // return created expense
      return expense;
    } catch (err) {
      // log error
      logger.log(
        2,
        '_create',
        `Failed to prepare create for expense ${data.id} for expense type ${data.expenseTypeId} for employee`,
        `${data.employeeId}`
      );

      // return rejected promise
      return Promise.reject(err);
    }
  } // _create

  /**
   * Delete an expense. Returns the expense deleted.
   *
   * @param id - id of expense
   * @return Expense - expense deleted
   */
  async _delete(id) {
    // log method
    logger.log(2, '_delete', `Preparing to delete expense ${id}`);

    try {
      let expense = new Expense(await this.databaseModify.getEntry(id));
      let employee = new Employee(await this.employeeDynamo.getEntry(expense.employeeId));
      let expenseType = await this.expenseTypeDynamo.getEntry(expense.expenseTypeId);
      expenseType.categories = _.map(expenseType.categories, (category) => {
        return JSON.parse(category);
      });
      expenseType = new ExpenseType(expenseType);

      await this._validateDelete(expense); // validate delete
      await this._updateBudgets(expense, undefined, employee, expenseType); // update budgets

      // log success
      logger.log(
        2,
        '_delete',
        `Successfully prepared to delete expense ${expense.id} for expense type ${expense.expenseTypeId} for`,
        `employee ${expense.employeeId}`
      );

      // return expense deleted
      return expense;
    } catch (err) {
      // log error
      logger.log(2, '_delete', `Failed to prepare delete for expense ${id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _delete

  /**
   * Find a budget for a given date. Returns the budget if found, otherwise returns an error.
   *
   * @param employeeId - Budget employee id
   * @param expenseTypeId - Budget expense type id
   * @param date - Date to find budget for
   * @return Budget - budget for expense
   */
  async _findBudget(employeeId, expenseTypeId, date) {
    // log method
    logger.log(
      4,
      '_findBudget',
      `Attempting to find current budget for employee ${employeeId} with expense type ${expenseTypeId}`
    );

    // compute method
    try {
      // get all budgets
      let budgetsData = await this.budgetDynamo.queryWithTwoIndexesInDB(employeeId, expenseTypeId);
      let budgets = _.map(budgetsData, (budgetData) => {
        return new Budget(budgetData);
      });

      // find buget with given date
      let budget = _.find(budgets, (currBudget) => {
        return currBudget.isDateInRange(date);
      });

      if (!budget) {
        // throw error if budget not found
        let err = {
          code: 404,
          message: 'Budget was not found.'
        };
        throw err;
      }

      // log success
      logger.log(4, '_findBudget', `Successfully found budget ${budget.id}`);

      // return budget
      return budget;
    } catch (err) {
      // log error
      logger.log(
        4,
        '_findBudget',
        `Failed to find budget for employee ${employeeId} with expense type ${expenseTypeId}`
      );

      // return rejected promise
      return Promise.reject(err);
    }
  } // _findBudget

  /**
   * Checks if an expense reimbursed date is the only attribute changed. Returns a resolved promise with true if all
   * attributes, other than the reimbursed date, is the same.
   *
   * @param oldExpense - old Expense being updated from
   * @param newExpense - new Expense being updated to
   * @return Promise(Boolean) - expense is only being reimbursed
   */
  _isOnlyReimburseDateChange(oldExpense, newExpense) {
    // log method
    logger.log(
      4,
      '_isOnlyReimburseDateChange',
      `Checking if reimbursed date for expense ${oldExpense.id} is only attribute changed`
    );

    // compute method
    let oldExp = _.cloneDeep(oldExpense);
    let newExp = _.cloneDeep(newExpense);
    delete oldExp.reimbursedDate;
    delete newExp.reimbursedDate;
    let result = _.isEqual(oldExp, newExp);

    // log result
    if (result) {
      logger.log(
        4,
        '_isOnlyReimburseDateChange',
        `Reimbursed date for expense ${oldExpense.id} is the only attribute changed`
      );
    } else {
      logger.log(
        4,
        '_isOnlyReimburseDateChange',
        `Reimbursed date for expense ${oldExpense.id} is not the only attribute changed`
      );
    }

    // return result
    return result;
  } // _isOnlyReimburseDateChange

  _isOnlyRejectingExpenses(oldExpense, newExpense) {
    let oldRejections = oldExpense.rejections;
    let newRejections = newExpense.rejections;
    return (
      oldRejections?.softRejections?.reasons?.length !== newRejections?.softRejections?.reasons?.length ||
      oldRejections?.hardRejections?.reasons?.length !== newRejections?.hardRejections?.reasons?.length
    );
  }

  /**
   * Checks if a cost change is valid. Returns true if the cost is below the budget limit, otherwise returns false.
   *
   * @param oldExpense - expense cost to subtract
   * @param newExpense - expense cost to add
   * @param expenseType - expense type of expense
   * @param budget - budget of expense
   * @return Boolean - cost change is valid
   */
  _isValidCostChange(oldExpense, newExpense, expenseType, budget) {
    // log method
    logger.log(4, '_isValidCostChange', `Checking if changing cost for budget ${budget.id} is valid`);

    // compute method
    let oldCost = oldExpense ? oldExpense.cost : 0;
    let legacyCarryover = budget.legacyCarryover || 0;
    // set the max amount that can be added to budget
    // overdraft x2 allowed if expense type allows overdraft and employee is full time
    let maxAmount;
    // ensure budget amount is correct
    let budgetAmountCorrect = budget.amount == expenseType.budget;
    for (let i = 0; !budgetAmountCorrect && expenseType.tagBudgets && i < expenseType.tagBudgets.length; i++) {
      budgetAmountCorrect = budget.amount == expenseType.tagBudgets[i].budget;
    }
    if (budgetAmountCorrect && expenseType.odFlag) {
      // budget is full time and od allowed
      maxAmount = budget.amount * 2 + legacyCarryover;
    } else {
      // budget is not full time or od is not allowed
      maxAmount = budget.amount + legacyCarryover;
    }
    let total = budget.pendingAmount + budget.reimbursedAmount - oldCost + newExpense.cost;

    let result = total <= maxAmount;

    // log result
    if (result) {
      logger.log(
        4,
        '_isValidCostChange',
        `Changing cost from ${oldCost} to ${newExpense.cost} for budget ${budget.id} is valid`
      );
    } else {
      logger.log(
        4,
        '_isValidCostChange',
        `Changing cost from ${oldCost} to ${newExpense.cost} for budget ${budget.id} is invalid`
      );
    }

    // return result
    return result;
  } // _isValidCostChange

  /**
   * Log the update type. Changing pending/reimbursed expense, reimbursing, or unreimbursing.
   *
   * @param oldExpense - old expense updated from
   * @param newExpense - new expense updated to
   */
  _logUpdateType(oldExpense, newExpense) {
    if (oldExpense.expenseTypeId == newExpense.expenseTypeId) {
      // updated the same expense
      if (!oldExpense.isReimbursed() && !newExpense.isReimbursed()) {
        // changing a pending expense
        logger.log(2, '_logUpdate', `Changed pending expense ${oldExpense.id}`);
      } else if (!oldExpense.isReimbursed() && newExpense.isReimbursed()) {
        // reimbursing an expense
        logger.log(2, '_logUpdate', `Reimbursed expense ${oldExpense.id}`);
      } else if (oldExpense.isReimbursed() && !newExpense.isReimbursed()) {
        // unreimbursing an expense
        logger.log(2, '_logUpdate', `Unreimbursed expense ${oldExpense.id}`);
      } else {
        // changing a reimbursed expense
        logger.log(2, '_logUpdate', `Changed reimbursed expense ${oldExpense.id}`);
      }
    } else {
      // deleted and created a new expense
      if (!oldExpense.isReimbursed() && !newExpense.isReimbursed()) {
        // changing a pending expense
        logger.log(2, '_logUpdate', `Changed pending expense ${oldExpense.id} to ${newExpense.id}`);
      } else if (!oldExpense.isReimbursed() && newExpense.isReimbursed()) {
        // reimbursing an expense
        logger.log(2, '_logUpdate', `Reimbursed expense ${oldExpense.id} to ${newExpense.id}`);
      } else if (oldExpense.isReimbursed() && !newExpense.isReimbursed()) {
        // unreimbursing an expense
        logger.log(2, '_logUpdate', `Unreimbursed expense ${oldExpense.id} to ${newExpense.id}`);
      } else {
        // changing a reimbursed expense
        logger.log(2, '_logUpdate', 'AN ERROR SHOULD HAVE BEEN THROWN IN VALIDATE UPDATE');
      }
    }
  } // _logUpdateType

  /**
   * Reads an expense from the database. Returns the expense read.
   *
   * @param data - parameters of expense
   * @return Expense - expense read
   */
  async _read(data) {
    // log method
    logger.log(2, '_read', `Attempting to read expense ${data.id}`);

    // compute method
    try {
      let expense = new Expense(await this.databaseModify.getEntry(data.id)); // read from database
      // log success
      logger.log(2, '_read', `Successfully read expense ${data.id}`);

      // return expense
      return expense;
    } catch (err) {
      // log error
      logger.log(2, '_read', `Failed to read expense ${data.id}`);

      // return error
      return Promise.reject(err);
    }
  } // _read

  /**
   * Reads all expenses from the database. Returns all expenses.
   *
   * @return Array - all expenses
   */
  async _readAll() {
    // log method
    logger.log(2, '_readAll', 'Attempting to read all expenses');

    // compute method
    try {
      let expensesData = await this.databaseModify.getAllEntriesInDB();
      let expenses = _.map(expensesData, (expense) => {
        return new Expense(expense);
      });

      // log success
      logger.log(2, '_readAll', 'Successfully read all expenses');

      // return all expenses
      return expenses;
    } catch (err) {
      // log error
      logger.log(2, '_readAll', 'Failed to read all expenses');

      // return error
      return Promise.reject(err);
    }
  } // _readAll

  /**
   * Sorts array of budgets by fiscal start date. Returns sorted budgets.
   *
   * @param budgets - Array of budgets
   * @return Array - sorted Budgets Array
   */
  _sortBudgets(budgets) {
    logger.log(5, '_sortBudgets', 'Sorting budgets');

    return _.sortBy(budgets, [
      (budget) => {
        return budget.fiscalStartDate;
      }
    ]);
  } // _sortBudgets

  /**
   * Update expense and budgets. Returns the expense updated.
   *
   * @param req - the update request
   * @return Expense - expense updated
   */
  async _update(req) {
    let data = req.body;
    // log method
    logger.log(2, '_update', `Preparing to update expense ${data.id} for employee ${data.employeeId}`);

    // compute method
    try {
      let isProd = STAGE === 'prod';
      let oldExpense = new Expense(await this.databaseModify.getEntry(data.id));
      let newExpense = new Expense(data);
      let employee = new Employee(await this.employeeDynamo.getEntry(newExpense.employeeId));
      let expenseType = await this.expenseTypeDynamo.getEntry(newExpense.expenseTypeId);
      expenseType.categories = _.map(expenseType.categories, (category) => {
        return JSON.parse(category);
      });
      expenseType = new ExpenseType(expenseType);
      if (oldExpense.expenseTypeId == newExpense.expenseTypeId) {
        // expense types are the same
        let onlyReimbursing = this._isOnlyReimburseDateChange(oldExpense, newExpense); // check if only reimbursing
        let onlyRejecting = this._isOnlyRejectingExpenses(oldExpense, newExpense);
        if (onlyReimbursing) {
          // only need to validate date change
          if (dateUtils.isBefore(newExpense.reimbursedDate, newExpense.purchaseDate, 'd')) {
            throw {
              code: 403,
              message: 'Reimbursed date must be after purchase date.'
            };
          }
        } else {
          // changing expense
          await this._validateExpense(newExpense, employee, expenseType); // validate expense
          await this._validateUpdate(oldExpense, newExpense, employee, expenseType); // validate update
        }
        await this._updateBudgets(oldExpense, newExpense, employee, expenseType); // update budgets

        if (onlyRejecting && (isProd || (!isProd && req.employee.id === newExpense.employeeId))) {
          // send email to rejected user, if env is dev/test, users making rejections can only send emails to themselves
          this._emailRejectedUser(employee, newExpense, expenseType.name);
        }

        // log success
        logger.log(
          2,
          '_update',
          `Successfully prepared to update expense ${oldExpense.id} for expense type ${expenseType.id} for`,
          `employee ${employee.id}`
        );

        // log update
        this._logUpdateType(oldExpense, newExpense);

        // return expense updated
        return newExpense;
      } else {
        // expense types are different
        // generate a new expense id
        newExpense.id = this.getUUID();
        let oldExpenseType = await this.expenseTypeDynamo.getEntry(oldExpense.expenseTypeId);
        oldExpenseType.categories = _.map(oldExpenseType.categories, (category) => {
          return JSON.parse(category);
        });
        oldExpenseType = new ExpenseType(oldExpenseType);

        if (!expenseType.requireReceipt) {
          // clear receipt if the new expense type does not require a receipt
          delete newExpense.receipt;
        } else {
          if (oldExpense.hasReceipt()) {
            // change the bucket/path of the receipt from the old expense id to the new expense id
            this._changeBucket(oldExpense.employeeId, oldExpense.id, newExpense.id);
          }
        }

        if (expenseType.categories.length <= 0) {
          // clear category if the new expense type does not have categories
          delete newExpense.category;
        }

        let objectCreated = await this._create(newExpense); // create expense
        let objectValidated = await this._validateInputs(objectCreated); // validate inputs
        await this.databaseModify.addToDB(objectValidated); // add object to database
        await this._updateBudgets(oldExpense, undefined, employee, oldExpenseType);
        await this.databaseModify.removeFromDB(oldExpense.id); // remove old expense from database

        // log success
        logger.log(
          2,
          '_update',
          `Successfully prepared to update old expense ${oldExpense.id} to new expense ${newExpense.id} for`,
          `expense type ${expenseType.id} for employee ${employee.id}`
        );

        this._logUpdateType(oldExpense, newExpense);

        // return expense updated
        return newExpense;
      }
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for expense ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

  /**
   * Updates budgets when changing an expense. Updates all budgets affected by carry over and deletes a budget if the
   * budget does not have any pending or reimbursed expenses.
   *
   * @param oldExpense - Expense being removed from budgets
   * @param newExpense - Expense being added to budgets
   * @param employee - Employee of budgets to remove from
   * @param expenseType - Expense Type of budgets to remove from
   * @return Array - Array of Budgets for the Employee Expense Type
   */
  async _updateBudgets(oldExpense, newExpense, employee, expenseType) {
    // log method
    logger.log(2, '_updateBudgets', `Attempting to update budgets for expense ${oldExpense.id}`);

    // compute method
    try {
      // get all expenses with matching expense type and employee
      let expensesData = await this.databaseModify.queryWithTwoIndexesInDB(employee.id, expenseType.id);
      let expenses = _.map(expensesData, (expenseData) => {
        return new Expense(expenseData);
      });

      // remove matching old expense
      _.remove(expenses, (exp) => {
        return _.isEqual(exp, oldExpense) || exp?.rejections?.hardRejections?.reasons?.length >= 1;
      });

      let expense = newExpense ? newExpense : oldExpense;
      if (newExpense && !(newExpense?.rejections?.hardRejections?.reasons?.length >= 1)) {
        expenses.push(newExpense);
      }

      // get all budgets with matching expense type and employee
      let budgetsData = await this.budgetDynamo.queryWithTwoIndexesInDB(employee.id, expenseType.id);
      let budgets = _.map(budgetsData, (budgetData) => {
        return new Budget(budgetData);
      });

      // sort budgets
      let sortedBudgets = this._sortBudgets(budgets);

      // get the budget index of the expense
      let expBudgetIndex = _.findIndex(sortedBudgets, (budget) => {
        return budget.isDateInRange(expense.purchaseDate);
      });

      if (expBudgetIndex == -1) {
        // log error
        logger.log(
          2,
          '_updateBudgets',
          `Failed to find budget for expense ${expense.id} from list of budgets with employee ${employee.id} and`,
          `expense type ${expense.id}`
        );

        let err = {
          code: 304,
          message: `Failed to find budget for expense ${expense.id}.`
        };

        // throw error
        throw err;
      }

      // create mapping of pending/reimbursed for each budget
      let mapExpToBud = [];
      _.forEach(sortedBudgets, () => {
        mapExpToBud.push({
          pendingAmount: 0,
          reimbursedAmount: 0
        });
      });

      // populate mapping of pending/reimbursed for each budget
      _.forEach(expenses, (exp) => {
        // find the sorted budget index for the expense
        let budgetIndex = _.findIndex(sortedBudgets, (budget) => {
          return budget.isDateInRange(exp.purchaseDate);
        });

        // add expense cost to map
        if (exp.isReimbursed()) {
          // increment map index reimbursed amount if expense is reimbursed
          mapExpToBud[budgetIndex].reimbursedAmount += exp.cost;
        } else {
          // increment map index pending amount if expense is pending
          mapExpToBud[budgetIndex].pendingAmount += exp.cost;
        }
      });

      let i; // index of sorted budgets array
      let carryPending = 0; // current accumulated pending amount carry over
      let carryReimbursed = 0; // current accumulated reimbursed amount carry over

      // loop through budgets
      for (i = 0; i < sortedBudgets.length; i++) {
        // get current total pending and reimbursed amounts with carry
        let currPending = carryPending + mapExpToBud[i].pendingAmount;
        let currReimbursed = carryReimbursed + mapExpToBud[i].reimbursedAmount;

        // update carry over accumulators
        if (
          expenseType.budget == sortedBudgets[i].amount &&
          currPending + currReimbursed > sortedBudgets[i].amount &&
          expenseType.recurringFlag &&
          !_.isEqual(sortedBudgets[i].fiscalStartDate, this.getBudgetDates(employee.hireDate).startDate)
        ) {
          // set carry over accumulators if budget is full time, needs to carry costs, and isn't the latest budget
          if (
            i == sortedBudgets.length - 1 ||
            !dateUtils.isSame(
              dateUtils.add(sortedBudgets[i].fiscalEndDate, 1, 'day', ISOFORMAT),
              sortedBudgets[i + 1].fiscalStartDate
            )
          ) {
            // create a new budget if a sequential recurring budget does not exist
            logger.log(
              3,
              '_updateBudgets',
              `Attempting to create a new budget starting on ${dateUtils.add(
                sortedBudgets[i].fiscalEndDate,
                1,
                'day',
                ISOFORMAT
              )}`
            );

            let newBudgetData = await this.createNewBudget(
              employee,
              expenseType,
              dateUtils.add(sortedBudgets[i].fiscalEndDate, 1, 'day', ISOFORMAT)
            );
            let newBudget = new Budget(newBudgetData);
            sortedBudgets.splice(i + 1, 0, newBudget);
            mapExpToBud.splice(i + 1, 0, {
              pendingAmount: 0,
              reimbursedAmount: 0
            });

            logger.log(3, '_updateBudgets', `Successfully created new budget ${newBudget.id}`);
          }
          carryReimbursed = Math.max(currReimbursed - sortedBudgets[i].amount, 0);
          carryPending = Math.max(currPending + currReimbursed - carryReimbursed - sortedBudgets[i].amount, 0);
        } else {
          // clear carry over accumulators if budget is not full time or does not need to carry costs
          carryPending = 0;
          carryReimbursed = 0;
        }

        if (i >= expBudgetIndex) {
          // updated budget if passed expense budget
          sortedBudgets[i].pendingAmount = currPending - carryPending;
          sortedBudgets[i].reimbursedAmount = currReimbursed - carryReimbursed;

          if (currPending + currReimbursed == 0 && expenses.length == 0) {
            // delete the current budget if it is empty
            logger.log(3, '_updateBudgets', `Attempting to delete budget ${sortedBudgets[i].id}`);

            try {
              await this.budgetDynamo.removeFromDB(sortedBudgets[i].id);
              logger.log(3, '_updateBudgets', `Successfully deleted budget ${sortedBudgets[i].id}`);
            } catch (err) {
              logger.log(3, '_updateBudgets', `Failed delete budget ${sortedBudgets[i].id}`);
              throw err;
            }

            // remove budget from sorted budgets
            sortedBudgets.splice(i, 1);
            mapExpToBud.splice(i, 1);

            // decrement the sorted budgets loop index
            i--;
          } else {
            // update the current budget if it is not empty
            logger.log(3, '_updateBudgets', `Attempting to update budget ${sortedBudgets[i].id}`);

            try {
              await this.budgetDynamo.updateEntryInDB(sortedBudgets[i]);
              logger.log(3, '_updateBudgets', `Successfully updated budget ${sortedBudgets[i].id}`);
            } catch (err) {
              logger.log(3, '_updateBudgets', `Failed update budget ${sortedBudgets[i].id}`);
              throw err;
            }
          }
        }
      }
      // log success
      logger.log(2, '_updateBudgets', `Successfully updated budgets for expense ${expense.id}`);

      // return updated sorted budgets
      return sortedBudgets;
    } catch (err) {
      // log error
      let expense = newExpense ? newExpense : oldExpense;
      logger.log(2, '_updateBudgets', `Failed to update budgets for expense ${expense.id}`);

      let error = {
        code: 404,
        message: 'Error updating budgets.'
      };

      // return rejected promise
      return Promise.reject(error);
    }
  } // _updateBudgets

  /**
   * Emails payroll of the exchange for training hours expense details submitted.
   *
   * @param {Object} employee - The employee object of the submitted expense
   * @param {Object} expense - The submitted expense object
   * @param {Object} expenseType - The expense type object
   */
  async _emailNotification(employee, expense, expenseType) {
    logger.log(
      2,
      '_emailNotification',
      `Preparing to email payroll for training exchange expense submitted by employee ${expense.employeeId}`
    );
    let source = process.env.APP_COMPANY_EMAIL_ADDRESS;
    let toAddress = expenseType.to || expense.category?.to;
    logger.log(2, '_emailNotification', `toAddress: ${toAddress}`);
    if (source && toAddress) {
      toAddress = Array.isArray(toAddress) ? toAddress : [toAddress];
      logger.log(2, '_emailNotification', `toAddress: ${toAddress}`);
      let subject = 'New exchange for training hours expense submitted';
      let body = `${employee.nickname || employee.firstName} ${
        employee.lastName
      } submitted an expense to exchange their training budget for training hours\n
        Expense details:
        Cost: $${expense.cost}
        Description: ${expense.description}
        Note: ${expense.note || 'None'}
        URL: ${expense.url || 'None'}
        Category: ${expense.category}
        Created: ${expense.createdAt}`;
      logger.log(
        2,
        '_emailNotification',
        `Sending email to payroll from training exchange expense submitted by employee ${expense.employeeId}`,
        `${employee.employeeId}`
      );
      let ccAddress = expenseType.cc || expense.category?.cc;
      if (ccAddress) {
        ccAddress = Array.isArray(ccAddress) ? ccAddress : [ccAddress];
      }
      let bccAddress = expenseType.bcc || expense.category?.bcc;
      if (bccAddress) {
        bccAddress = Array.isArray(bccAddress) ? bccAddress : [bccAddress];
      }
      let replyToAddress = expenseType.replyTo || expense.category?.replyTo;
      if (replyToAddress) {
        replyToAddress = Array.isArray(replyToAddress) ? replyToAddress : [replyToAddress];
      }
      logger.log(2, '_emailNotification', `ccAddress: ${ccAddress}`);
      logger.log(2, '_emailNotification', `bccAddress: ${bccAddress}`);
      logger.log(2, '_emailNotification', `replyToAddress: ${replyToAddress}`);
      utils.sendEmail(source, toAddress, subject, body, {
        ccAddresses: ccAddress || [],
        bccAddresses: bccAddress || [],
        replyToAddresses: replyToAddress || []
      });
    }
  }

  _emailRejectedUser(employee, expense, expenseTypeName) {
    let source = process.env.APP_COMPANY_PAYROLL_ADDRESS;
    let userAddress = employee.email;
    if (source && userAddress) {
      let hardRejections = expense?.rejections?.hardRejections;
      let softRejections = expense?.rejections?.softRejections;
      let isHardRejected = hardRejections?.reasons?.length > 0;
      let toAddress = [userAddress];
      let subject = 'Your expense submitted on the Portal has been rejected';
      let body = `Rejection reason: ${
        isHardRejected
          ? hardRejections.reasons[hardRejections.reasons.length - 1] || 'No reason provided'
          : softRejections.reasons[softRejections.reasons.length - 1] || 'No reason provided'
      }
        ${!isHardRejected ? '\nPlease make revisions by editing the expense on the Portal, then resubmit.\n' : ''}`;
      body += `\nExpense details:
        Expense type: ${expenseTypeName}
        Cost: $${expense.cost}
        Description: ${expense.description}
        Note: ${expense.note || 'None'}
        Created On: ${expense.createdAt}
        URL: ${expense.url || 'None'}`;
      logger.log(2, '_emailRejectedUser', `Sending expense rejection email to user ${employee.id}`);
      utils.sendEmail(source, toAddress, subject, body, {
        ccAddresses: ['cvincent@consulwithcase.com'],
        bccAddresses: ['abendele@consultwithcase.com'],
        replyToAddresses: ['cvincent@consulwithcase.com']
      });
    } else {
      logger.log(
        2,
        '_emailRejectedUser',
        `NOT sending expense rejection email to user ${employee.id} since source or userAdress is invalid`
      );
    }
  }

  /**
   * Validate that an expense can be added. Returns the expense if the expense being added is in the current annual
   * budget.
   *
   * @param expense - Expense to be added
   * @param employee - Employee of expense
   * @param expenseType - Expense Type of expense
   * @return Expense - validated expense
   */
  async _validateAdd(expense, employee, expenseType) {
    // log method
    logger.log(3, '_validateAdd', `Validating add for expense ${expense.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating expense.'
      };

      // validate recurring expense is in the current annual budget
      if (expenseType.recurringFlag) {
        let dates = this.getBudgetDates(employee.hireDate);
        if (!dateUtils.isBetween(expense.purchaseDate, dates.startDate, dates.endDate, 'd', '[]')) {
          // log error
          logger.log(
            3,
            '_validateAdd',
            `Purchase date ${expense.purchaseDate} is out of current annual budget range`,
            `${dates.startDate} to ${dates.endDate}`
          );

          // throw error
          const ERRFORMAT = 'MM/DD/YYYY';
          err.message =
            'Purchase date must be in current annual budget range from ' +
            `${dateUtils.format(dates.startDate, ISOFORMAT, ERRFORMAT)} to ${dateUtils.format(
              dates.endDate,
              ISOFORMAT,
              ERRFORMAT
            )}.`;
          throw err;
        }
      }

      // validate that the expense is within a monthlyLimit, if set
      let { monthlyLimitValid, leftoverBudget } = await this._monthlyLimitValidate(
        undefined,
        expense,
        employee,
        expenseType
      );
      if (!monthlyLimitValid) {
        console.log('F');
        err.message =
          'Expense cost of $' +
          expense.cost +
          ' exceeds monthly limit. Monthly limit remaining is $' +
          leftoverBudget.toFixed(2) +
          '.';
        logger.log(3, '_validateAdd', err.message);
        throw err;
      }

      // log success
      logger.log(3, '_validateAdd', `Successfully validated add for expense ${expense.id}`);

      // return expense on success
      return Promise.resolve(expense);
    } catch (err) {
      // log error
      logger.log(3, '_validateAdd', `Failed to validate add for expense ${expense.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateAdd

  /**
   * Validate that an expense can be deleted. Returns the expense if the expense to be deleted is successfully
   * validated, otherwise returns an error.
   *
   * @param expense - Expense to validate delete
   * @return Expense - validated expense
   */
  async _validateDelete(expense) {
    // log method
    logger.log(3, '_validateDelete', `Validating delete for expense ${expense.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating delete for expense.'
      };

      // validate expense is not reimbursed
      if (expense.isReimbursed()) {
        // log error
        logger.log(3, '_validateDelete', `Expense ${expense.id} is reimbursed`);

        // throw error
        err.message = 'Cannot delete a reimbursed expense.';
        throw err;
      }

      // log success
      logger.log(3, '_validateDelete', `Successfully validated delete for expense ${expense.id}`);

      // return expense on success
      return expense;
    } catch (err) {
      // log error
      logger.log(3, '_validateDelete', `Failed to validate delete for expense ${expense.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateDelete

  /**
   * Validate that an expense is valid. Returns the expense if the expense is successfully validated, otherwise returns
   * an error.
   *
   * @param expense - Expense object to be validated
   * @param employee - Employee of expense
   * @param expenseType - Expense Type of expense
   * @return Expense - validated expense
   */
  _validateExpense(expense, employee, expenseType) {
    // log method
    logger.log(3, '_validateExpense', `Validating expense ${expense.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating expense.'
      };

      // validate reimburse date is after purchase date
      if (dateUtils.isBefore(expense.reimbursedDate, expense.purchaseDate, 'd')) {
        // log error
        logger.log(
          3,
          '_validateExpense',
          `Reimbursed date ${expense.reimbursedDate} is before purchase date ${expense.purchaseDate}`
        );

        // throw error
        err.message = 'Reimbursed date must be after purchase date.';
        throw err;
      }

      // validate expense type is active
      if (expenseType.isInactive) {
        // log error
        logger.log(3, '_validateExpense', `Expense type ${expenseType.id} is inactive`);

        // throw error
        err.message = `Expense type ${expenseType.name} is not active.`;
        throw err;
      }

      // validate receipt exists if required by expense type
      if (expenseType.requireReceipt && !expense.hasReceipt()) {
        if (!(expenseType.name === 'Training' && expense.category === 'Exchange for training hours')) {
          // log error
          logger.log(3, '_validateExpense', `Expense ${expense.id} is missing a receipt`);

          // throw error
          err.message = `Receipt is required for expense type ${expenseType.name}.`;
          throw err;
        }
      }

      // validate expense purchase date is in expense type range
      if (!expenseType.isDateInRange(expense.purchaseDate)) {
        // log error
        logger.log(3, '_validateExpense', `Expense purchase date ${expense.purchaseDate} is out of expense type range`);

        // throw error
        err.message =
          `Purchase date is out of ${expenseType.name} range ${expenseType.startDate} to` + ` ${expenseType.endDate}.`;
        throw err;
      }

      // validate employee is active
      if (employee.isInactive()) {
        // log error
        logger.log(3, '_validateExpense', `Employee ${employee.id} is inactive`);

        // throw error
        err.message = `Employee ${employee.fullName()} is inactive.`;
        throw err;
      }

      // validate employee has access to expense type
      if (!this.hasAccess(employee, expenseType)) {
        // log error
        logger.log(
          3,
          '_validateExpense',
          `Employee ${employee.id} does not have access to expense type ${expenseType.id}`
        );

        // throw error
        err.message = `Employee ${employee.fullName()} does not have access to ${expenseType.name}.`;
        throw err;
      }

      // log success
      logger.log(3, '_validateExpense', `Successfully validated expense ${expense.id}`);

      // return expense on success
      return Promise.resolve(expense);
    } catch (err) {
      // log error
      logger.log(3, '_validateExpense', `Failed to validate expense ${expense.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateExpense

  /**
   * Validates that an expense can be updated. Return the expense if the expense being updated is valid.
   *
   * @param oldExpense - Expense being updated from
   * @param newExpense - Expense being updated to
   * @param employee - Employee of expense
   * @param expenseType - Expense Type of expense
   * @return Expense - validated expense
   */
  async _validateUpdate(oldExpense, newExpense, employee, expenseType) {
    // log method
    logger.log(3, '_validateUpdate', `Validating update for expense ${oldExpense.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating expense.'
      };

      // validate expense id
      if (oldExpense.id != newExpense.id) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `Old expense id ${oldExpense.id} does not match new expense id ${newExpense.id}`
        );

        // throw error
        err.message = 'Error validating expense IDs.';
        throw err;
      }

      // validate old expense employee id
      if (oldExpense.employeeId != employee.id) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `Old expense employee ${oldExpense.employeeId} does not match employee ${employee.id}`
        );

        // throw error
        err.message = `Error validating current expense for employee ${employee.fullName()}.`;
        throw err;
      }

      // validate new expense employee id
      if (newExpense.employeeId != employee.id) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `New expense employee ${oldExpense.employeeId} does not match employee ${employee.id}`
        );

        // throw error
        err.message = `Error validating new expense for employee ${employee.fullName()}.`;
        throw err;
      }

      // validate new expense expense type id
      if (newExpense.expenseTypeId != expenseType.id) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `New expense expense type ${oldExpense.expenseTypeId} does not match expense type ${expenseType.id}`
        );

        // throw error
        err.message = `Error validating new expense for expense type ${expenseType.name}.`;
        throw err;
      }

      let oldBudget = await this._findBudget(oldExpense.employeeId, oldExpense.expenseTypeId, oldExpense.purchaseDate);

      // validate change cost
      if (oldExpense.cost != newExpense.cost) {
        // validate reimbursed expense cost is not being changed
        if (oldExpense.isReimbursed() && newExpense.isReimbursed()) {
          // log error
          logger.log(3, '_validateUpdate', 'Cannot change cost of reimbursed expense');

          // throw error
          err.message = 'Cannot change cost of reimbursed expenses.';
          throw err;
        }

        // validate expense is in todays budget
        let todaysBudget = await this._findBudget(
          oldExpense.employeeId,
          oldExpense.expenseTypeId,
          dateUtils.getTodaysDate()
        );

        if (!_.isEqual(oldBudget, todaysBudget)) {
          // log error
          logger.log(
            3,
            '_validateUpdate',
            `Cannot change cost of expenses outside of current annual budget from ${todaysBudget.fiscalStartDate} to`,
            `${todaysBudget.fiscalEndDate}`
          );

          // throw error
          err.message =
            'Cannot change cost of expenses outside of current annual budget from' +
            ` ${todaysBudget.fiscalStartDate} to ${todaysBudget.fiscalEndDate}.`;
          throw err;
        } else {
          if (!this._isValidCostChange(oldExpense, newExpense, expenseType, todaysBudget)) {
            // log error
            logger.log(3, '_validateUpdate', `New expense $${newExpense.cost} exceeds the budget limit`);

            // throw error
            err.message = 'Expense is over the budget limit.';
            throw err;
          }
        }
      }

      // validate expenses are in same budget
      let newBudget = await this._findBudget(newExpense.employeeId, newExpense.expenseTypeId, newExpense.purchaseDate);

      if (!_.isEqual(oldBudget, newBudget)) {
        // log error
        logger.log(
          3,
          '_validateUpdate',
          `New expense purchased on ${newExpense.purchaseDate} is not in the same budget as old expense between`,
          `${oldBudget.fiscalStartDate} and ${oldBudget.fiscalEndDate}`
        );

        // throw error
        err.message =
          'Cannot change cost of expenses outside of current annual budget from' +
          ` ${oldBudget.fiscalStartDate} to ${oldBudget.fiscalEndDate}.`;
        throw err;
      }

      // validate that the expense is within a monthlyLimit, if set
      let { monthlyLimitValid, leftoverBudget } = await this._monthlyLimitValidate(
        oldExpense,
        newExpense,
        employee,
        expenseType
      );
      if (!monthlyLimitValid) {
        err.message =
          'Expense cost of $' +
          newExpense.cost +
          ' exceeds monthly limit. Monthly limit remaining is $' +
          leftoverBudget.toFixed(2) +
          '.';
        logger.log(3, '_validateAdd', err.message);
        throw err;
      }

      // log success
      logger.log(3, '_validateUpdate', `Successfully validated update for expense ${oldExpense.id}`);

      // return new expense on success
      return newExpense;
    } catch (err) {
      // log error
      logger.log(3, '_validateUpdate', `Failed to validate update for expense ${oldExpense.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate
} // ExpenseRoutes

module.exports = ExpenseRoutes;
