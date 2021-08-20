const Budget = require('../../models/budget');
const Employee = require('../../models/employee');
const Expense = require('../../models/expense');
const ExpenseRoutes = require('../../routes/expenseRoutes');
const ExpenseType = require('../../models/expenseType');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');
const _ = require('lodash');

describe('expenseRoutes', () => {
  const ISOFORMAT = 'YYYY-MM-DD';

  const ID = '{id}';
  const DESCRIPTION = '{description}';

  const FIRST_NAME = '{firstName}';
  const MIDDLE_NAME = '{middleName}';
  const LAST_NAME = '{lastName}';
  const EMPLOYEE_NUMBER = 0;
  const HIRE_DATE = '{hireDate}';
  const EMAIL = '{email}';
  const EMPLOYEE_ROLE = '{employeeRole}';
  const WORK_STATUS = 0;

  const REIMBURSED_AMOUNT = 0;
  const PENDING_AMOUNT = 0;
  const FISCAL_START_DATE = '{fiscalStartDate}';
  const FISCAL_END_DATE = '{fiscalEndDate}';
  const AMOUNT = 0;

  const PURCHASE_DATE = '{purchaseDate}';
  const REIMBURSED_DATE = '{reimbursedDate}';
  const NOTE = '{note}';
  const URL = '{url}';
  const CREATED_AT = '{createdAt}';
  const RECEIPT = '{receipt}';
  const COST = 0;
  const CATEGORY = '{"name": "categoryName", "showOnFeed": false}';

  const NAME = '{name}';
  const BUDGET = 0;
  const START_DATE = '{startDate}';
  const END_DATE = '{endDate}';
  const OD_FLAG = '{odFlag}';
  const REQUIRED_FLAG = '{requiredFlag}';
  const RECURRING_FLAG = '{recurringFlag}';
  const IS_INACTIVE = '{isInactive}';
  const ACCESSIBLE_BY = '{accessibleBy}';
  const CATEGORIES = [];

  const EMPLOYEE_DATA = {
    id: ID,
    firstName: FIRST_NAME,
    middleName: MIDDLE_NAME,
    lastName: LAST_NAME,
    employeeNumber: EMPLOYEE_NUMBER,
    hireDate: HIRE_DATE,
    email: EMAIL,
    employeeRole: EMPLOYEE_ROLE,
    workStatus: WORK_STATUS
  };

  const BUDGET_DATA = {
    id: ID,
    expenseTypeId: ID,
    employeeId: ID,
    reimbursedAmount: REIMBURSED_AMOUNT,
    pendingAmount: PENDING_AMOUNT,
    fiscalStartDate: FISCAL_START_DATE,
    fiscalEndDate: FISCAL_END_DATE,
    amount: AMOUNT
  };

  const EXPENSE_DATA = {
    id: ID,
    purchaseDate: PURCHASE_DATE,
    reimbursedDate: REIMBURSED_DATE,
    note: NOTE,
    url: URL,
    createdAt: CREATED_AT,
    receipt: RECEIPT,
    cost: COST,
    description: DESCRIPTION,
    employeeId: ID,
    expenseTypeId: ID,
    category: CATEGORY
  };

  const EXPENSE_TYPE_DATA = {
    id: ID,
    budgetName: NAME,
    budget: BUDGET,
    startDate: START_DATE,
    endDate: END_DATE,
    odFlag: OD_FLAG,
    requiredFlag: REQUIRED_FLAG,
    recurringFlag: RECURRING_FLAG,
    isInactive: IS_INACTIVE,
    description: DESCRIPTION,
    categories: CATEGORIES,
    accessibleBy: ACCESSIBLE_BY
  };

  let expenseRoutes, budgetDynamo, databaseModify, employeeDynamo, expenseTypeDynamo, s3;

  beforeEach(() => {
    budgetDynamo = jasmine.createSpyObj('budgetDynamo', [
      'addToDB',
      'getAllEntriesInDB',
      'getEntry',
      'getEntryUrl',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      '_readFromDB',
      '_readFromDBUrl',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    databaseModify = jasmine.createSpyObj('databaseModify', [
      'addToDB',
      'getAllEntriesInDB',
      'getEntry',
      'getEntryUrl',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      '_readFromDB',
      '_readFromDBUrl',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    employeeDynamo = jasmine.createSpyObj('employeeDynamo', [
      'addToDB',
      'getAllEntriesInDB',
      'getEntry',
      'getEntryUrl',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      '_readFromDB',
      '_readFromDBUrl',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    expenseTypeDynamo = jasmine.createSpyObj('expenseTypeDynamo', [
      'addToDB',
      'getAllEntriesInDB',
      'getEntry',
      'getEntryUrl',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      '_readFromDB',
      '_readFromDBUrl',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    s3 = jasmine.createSpyObj('s3', ['listObjectsV2', 'copyObject']);

    expenseRoutes = new ExpenseRoutes();
    expenseRoutes.budgetDynamo = budgetDynamo;
    expenseRoutes.databaseModify = databaseModify;
    expenseRoutes.employeeDynamo = employeeDynamo;
    expenseRoutes.expenseTypeDynamo = expenseTypeDynamo;
    expenseRoutes.s3 = s3;
  });

  describe('_addToBudget', () => {
    let budget, employee, expense, expenseType;

    beforeEach(() => {
      budget = new Budget(BUDGET_DATA);
      employee = new Employee(EMPLOYEE_DATA);
      expense = new Expense(EXPENSE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      budget.amount = 10;
      budget.pendingAmount = 1;
      budget.reimbursedAmount = 1;
      expenseType.odFlag = false;
      expenseType.budget = 10;
    });

    describe('when successfully adding an expense to budget', () => {
      let expectedBudget;

      beforeEach(() => {
        expense.cost = 2;
        expectedBudget = _.cloneDeep(budget);
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedBudget));
      });

      describe('and expense is reimbursed', () => {
        beforeEach(() => {
          expense.reimbursedDate = '2000-08-18';
          expectedBudget.reimbursedAmount = 3;
        });

        it('should update and return the expected budget', (done) => {
          expenseRoutes._addToBudget(expense, employee, expenseType, budget).then((data) => {
            expect(data).toEqual(expectedBudget);
            expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(expectedBudget);
            done();
          });
        }); // should update and return the expected budget
      }); // and expense is reimbursed

      describe('and expense is pending', () => {
        beforeEach(() => {
          delete expense.reimbursedDate;
          expectedBudget.pendingAmount = 3;
        });

        it('should update and return the expected budget', () => {
          expenseRoutes._addToBudget(expense, employee, expenseType, budget).then((data) => {
            expect(data).toEqual(expectedBudget);
            expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(expectedBudget);
          });
        }); // should update and return the expected budget
      }); // and expense is pending
    }); // when successfully adding an expense to budget

    describe('when adding an expense exceeds budget limit', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Expense is over the budget limit.'
        };
        expense.cost = 10;
      });

      it('should return a 403 rejected promise', (done) => {
        expenseRoutes
          ._addToBudget(expense, employee, expenseType, budget)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when adding an expense exceeds budget limit

    describe('when fails to update entry in database', () => {
      let err, expectedBudget;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to update entry in database.'
        };
        expense.cost = 2;
        expectedBudget = _.cloneDeep(budget);
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedBudget));
        expense.reimbursedDate = '2000-08-18';
        expectedBudget.reimbursedAmount = 3;
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._addToBudget(expense, employee, expenseType, budget)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(expectedBudget);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to update entry in database
  }); // _addToBudget

  describe('_changeBucket', () => {
    let employeeId, oldExpenseId, newExpenseId;

    beforeEach(() => {
      employeeId = ID;
      oldExpenseId = 'oldId';
      newExpenseId = 'newId';
    });

    afterEach(() => {
      expect(s3.listObjectsV2).toHaveBeenCalled();
    });

    it('should call listObjectsV2', (done) => {
      expenseRoutes._changeBucket(employeeId, oldExpenseId, newExpenseId);
      done();
    }); // should call listObjectsV2
  }); // _changeBucket

  describe('_copyFunction', () => {
    let employeeId, oldExpenseId, newExpenseId, data;

    beforeEach(() => {
      employeeId = 'Employee_ID';
      oldExpenseId = 'Old_ID';
      newExpenseId = 'New_ID';
    });

    describe('when passed data', () => {
      describe('and does not contain any files', () => {
        beforeEach(() => {
          data = {
            Contents: []
          };
        });

        afterEach(() => {
          expect(s3.copyObject).toHaveBeenCalledTimes(0);
        });

        it('should not copy any files', (done) => {
          expenseRoutes._copyFunction(
            s3,
            expenseRoutes._copyFunctionLog,
            employeeId,
            oldExpenseId,
            newExpenseId,
            undefined,
            data
          );
          done();
        }); // should not copy any files
      }); // and does not contain any files

      describe('and contains two files', () => {
        describe('and the second file is the most recent', () => {
          let file1, file2, expectedParams;

          beforeEach(() => {
            file1 = {
              LastModified: '2009-10-12T17:50:30.000Z',
              Key: 'Old_ID/file1_id'
            };
            file2 = {
              LastModified: '2009-10-14T17:50:30.000Z',
              Key: 'Old_ID/file2_id'
            };

            expectedParams = {
              Bucket: 'case-consulting-expense-app-attachments-dev',
              CopySource: 'case-consulting-expense-app-attachments-dev/Old_ID/file2_id',
              Key: 'New_ID/file2_id'
            };
            data = {
              Contents: [file1, file2]
            };
          });

          afterEach(() => {
            expect(s3.copyObject).toHaveBeenCalledTimes(1);
            expect(s3.copyObject).toHaveBeenCalledWith(expectedParams, jasmine.any(Function));
          });

          it('should copy the most recent file', (done) => {
            expenseRoutes._copyFunction(
              s3,
              expenseRoutes._copyFunctionLog,
              employeeId,
              oldExpenseId,
              newExpenseId,
              undefined,
              data
            );
            done();
          }); // should copy the most recent file
        }); // and the second file is the most recent

        describe('and the first file is the most recent', () => {
          let file1, file2, expectedParams;

          beforeEach(() => {
            file1 = {
              LastModified: '2009-10-12T17:50:30.000Z',
              Key: 'Old_ID/file1_id'
            };
            file2 = {
              LastModified: '2009-10-10T17:50:30.000Z',
              Key: 'Old_ID/file2_id'
            };

            expectedParams = {
              Bucket: 'case-consulting-expense-app-attachments-dev',
              CopySource: 'case-consulting-expense-app-attachments-dev/Old_ID/file1_id',
              Key: 'New_ID/file1_id'
            };
            data = {
              Contents: [file1, file2]
            };
          });

          afterEach(() => {
            expect(s3.copyObject).toHaveBeenCalledTimes(1);
            expect(s3.copyObject).toHaveBeenCalledWith(expectedParams, jasmine.any(Function));
          });

          it('should copy the most recent file', (done) => {
            expenseRoutes._copyFunction(
              s3,
              expenseRoutes._copyFunctionLog,
              employeeId,
              oldExpenseId,
              newExpenseId,
              undefined,
              data
            );
            done();
          }); // should copy the most recent file
        }); // and the first file is the most recent
      }); // and contains two files
    }); // when passed data

    describe('when passed an error', () => {
      let err;

      beforeEach(() => {
        err = 'Error getting bucket data.';
      });

      it('should return an error', (done) => {
        expenseRoutes
          ._copyFunction(s3, expenseRoutes._copyFunctionLog, employeeId, oldExpenseId, newExpenseId, err, undefined)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return an error
    }); // when passed an error
  }); // _copyFunction

  describe('_copyFunctionLog', () => {
    beforeEach(() => {
      console.log = jasmine.createSpy('log');
    });

    afterEach(() => {
      expect(console.log).toHaveBeenCalled();
    });

    describe('when there is an error', () => {
      it('should log and return error', (done) => {
        expenseRoutes
          ._copyFunctionLog('error')
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual('error');
            done();
          });
      }); // should log and return error
    }); // when there is an error

    describe('when there is no error', () => {
      it('should log', (done) => {
        expenseRoutes._copyFunctionLog();
        done();
      }); // should log
    }); // when there is no error
  }); // _copyFunctionLog

  describe('_create', () => {
    let expense, employee, expenseType, budget, expectedBudget;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expense = new Expense(EXPENSE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      budget = new Budget(BUDGET_DATA);
      employee.workStatus = 100;
      delete expense.reimbursedDate;
      expense.purchaseDate = '2000-08-18';
      expense.cost = 2;
      expenseType.recurringFlag = false;
      expenseType.startDate = '2000-08-01';
      expenseType.endDate = '2000-09-01';
      expenseType.isInactive = false;
      expenseType.requiredFlag = false;
      expenseType.accessibleBy = ['Intern', 'FullTime', 'PartTime'];
      expenseType.odFlag = false;
      expenseType.budget = 10;
      budget.fiscalStartDate = '2000-08-01';
      budget.fiscalEndDate = '2000-09-01';
      budget.amount = 10;
      budget.pendingAmount = 1;
      budget.reimbursedAmount = 1;
      expectedBudget = _.cloneDeep(budget);
      expectedBudget.pendingAmount = 3;
    });

    describe('when successfully creates an expense', () => {
      beforeEach(() => {
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([budget]));
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedBudget));
      });

      it('should return the created expense and update a budget', (done) => {
        expenseRoutes._create(expense).then((data) => {
          expect(data).toEqual(expense);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
          expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(expectedBudget);
          done();
        });
      }); // should return the created expense and update a budget
    }); // when successfully creates an expense

    describe('when fails to find a budget', () => {
      describe('and successfully creates a new budget', () => {
        let createdBudget;

        beforeEach(() => {
          createdBudget = new Budget({
            id: ID,
            expenseTypeId: ID,
            employeeId: ID,
            reimbursedAmount: 0,
            pendingAmount: 0,
            fiscalStartDate: '2000-08-01',
            fiscalEndDate: '2000-09-01',
            amount: 10
          });
          expectedBudget = _.cloneDeep(createdBudget);
          expectedBudget.pendingAmount = 2;
          employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
          expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
          budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([]));
          spyOn(expenseRoutes, 'getUUID').and.returnValue(ID);
          budgetDynamo.addToDB.and.returnValue(Promise.resolve(createdBudget));
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedBudget));
        });

        it('should return the created expense and update a budget', (done) => {
          expenseRoutes._create(expense).then((data) => {
            expect(data).toEqual(expense);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(expenseRoutes.getUUID).toHaveBeenCalled();
            expect(budgetDynamo.addToDB).toHaveBeenCalledWith(createdBudget);
            expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(expectedBudget);
            done();
          });
        }); // should return the created expense and update a budget
      }); // and successfully creates a new budget

      describe('and fails to create a new budget', () => {
        let err, createdBudget;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to create a new budget in database.'
          };
          createdBudget = new Budget({
            id: ID,
            expenseTypeId: ID,
            employeeId: ID,
            reimbursedAmount: 0,
            pendingAmount: 0,
            fiscalStartDate: '2000-08-01',
            fiscalEndDate: '2000-09-01',
            amount: 10
          });
          employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
          expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
          budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([]));
          spyOn(expenseRoutes, 'getUUID').and.returnValue(ID);
          budgetDynamo.addToDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', (done) => {
          expenseRoutes
            ._create(expense)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
              expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
              expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
              expect(expenseRoutes.getUUID).toHaveBeenCalled();
              expect(budgetDynamo.addToDB).toHaveBeenCalledWith(createdBudget);
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to create a new budget
    }); // when fails to find a budget

    describe('when fails to find employee from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get employee from database.'
        };
        employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._create(expense)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find employee from database

    describe('when fails to find expense type from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense type from database.'
        };
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._create(expense)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find expense type from database

    describe('when fails to validate expense (reimbursed date before purchase date)', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Reimbursed date must be after purchase date.'
        };
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        expense.reimbursedDate = '2000-08-17';
        expense.purchaseDate = '2000-08-18';
      });

      it('should return a 403 rejected promise', (done) => {
        expenseRoutes
          ._create(expense)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate expense (reimbursed date before purchase date)

    describe('when fails to validate add', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Purchase date must be in current annual budget range from 01/01/2021 to 12/31/2021.'
        };
        employee.hireDate = '2000-01-01';
        delete expense.reimbursedDate;
        expense.purchaseDate = '2000-01-01';
        expenseType.recurringFlag = true;
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
      });

      it('should return a 403 rejected promise', (done) => {
        expenseRoutes
          ._create(expense)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate add

    describe('when fails to add expense to budget', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Expense is over the budget limit.'
        };
        expense.cost = 100;
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([budget]));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._create(expense)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to add expense to budget
  }); // _create

  describe('_delete', () => {
    let employee, expense, expenseType, expenseData, otherExpenseData, expensesData;
    let budgetData, budgetsData, expectedBudget;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expense = new Expense(EXPENSE_DATA);
      expense.purchaseDate = '2000-08-18';
      delete expense.reimbursedDate;
      expense.cost = 1;
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType.recurringFlag = false;
      expenseData = _.cloneDeep(EXPENSE_DATA);
      expenseData.purchaseDate = '2000-08-18';
      delete expenseData.reimbursedDate;
      expenseData.cost = 1;
      otherExpenseData = _.cloneDeep(EXPENSE_DATA);
      otherExpenseData.purchaseDate = '2000-08-18';
      delete otherExpenseData.reimbursedDate;
      otherExpenseData.cost = 2;
      expensesData = [expenseData, otherExpenseData];

      budgetData = _.cloneDeep(BUDGET_DATA);
      budgetData.pendingAmount = 3;
      budgetData.fiscalStartDate = '2000-08-18';
      budgetData.fiscalEndDate = '2001-08-17';
      budgetsData = [budgetData];

      expectedBudget = new Budget(budgetData);
      expectedBudget.pendingAmount = 2;
    });

    describe('when successfully deletes an expense', () => {
      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedBudget));
      });

      it('should remove the expense and update the budget', (done) => {
        expenseRoutes._delete(ID).then((data) => {
          expect(data).toEqual(expense);
          expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
          expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
          expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(expectedBudget);
          done();
        });
      }); // should remove the expense and update the budget
    }); // when successfully deletes an expense

    describe('when fails to find expense from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense from database.'
        };
        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find expense from database

    describe('when fails to find employee from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get employee from database.'
        };
        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
        employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find employee from database

    describe('when fails to find expense type from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense type from database.'
        };
        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find expense type from database

    describe('when fails to validate delete for expense (reimbursed)', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Cannot delete a reimbursed expense.'
        };
        expense.reimbursedDate = '2000-08-18';
        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
      });

      it('should return a 403 rejected promise', (done) => {
        expenseRoutes
          ._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate delete for expense (reimbursed)

    describe('when fails to get expenses', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        databaseModify.queryWithTwoIndexesInDB.and.throwError(err);
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get expenses

    describe('when fails to get budgets', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.throwError(err);
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get budgets

    describe('when fails to find budget for expense', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([]));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find budget for expense

    describe('when fails to update budget', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
        budgetDynamo.updateEntryInDB.and.throwError(err);
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(expectedBudget);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to update budget
  }); // _delete

  describe('_findBudget', () => {
    let expense, employee, expenseType, budget1, budget2, budget3, budgets;

    beforeEach(() => {
      expense = new Expense(EXPENSE_DATA);
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      expense.purchaseDate = '2001-08-18';
      budget1 = new Budget(BUDGET_DATA);
      budget1.fiscalStartDate = '2000-08-18';
      budget1.fiscalEndDate = '2001-08-17';
      budget2 = new Budget(BUDGET_DATA);
      budget2.fiscalStartDate = '2001-08-18';
      budget2.fiscalEndDate = '2002-08-17';
      budget3 = new Budget(BUDGET_DATA);
      budget3.fiscalStartDate = '2002-08-18';
      budget3.fiscalEndDate = '2003-08-17';
      budgets = [budget1, budget2, budget3];
      expense.purchaseDate = '2001-08-19';
    });

    describe('when budget exists', () => {
      beforeEach(() => {
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgets));
      });

      it('should return the second existing budget', (done) => {
        expenseRoutes._findBudget(employee.id, expenseType.id, expense.purchaseDate).then((data) => {
          expect(data).toEqual(budget2);
          expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
          done();
        });
      }); // should return the second existing budget
    }); // when budget exists

    describe('when budget does not exist', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Budget was not found.'
        };
        expense.purchaseDate = '1000-08-18';
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgets));
      });

      it('should return a 403 rejected promise', (done) => {
        expenseRoutes
          ._findBudget(employee.id, expenseType.id, expense.purchaseDate)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when budget does not exist

    describe('when fails to query from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get query from database.'
        };
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._findBudget(employee.id, expenseType.id, expense.purchaseDate)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to query from database
  }); // _findBudget

  describe('_isOnlyReimburseDateChange', () => {
    let oldExpense, newExpense;

    beforeEach(() => {
      oldExpense = new Expense(EXPENSE_DATA);
      newExpense = new Expense(EXPENSE_DATA);
    });

    describe('when the expense is not changed', () => {
      it('should return true', () => {
        expect(expenseRoutes._isOnlyReimburseDateChange(oldExpense, newExpense)).toBe(true);
      }); // should return true
    }); // when the expense is not changed

    describe('when only the expense reimbursed date is changed', () => {
      beforeEach(() => {
        delete oldExpense.reimbursedDate;
        newExpense.reimbursedDate = '2000-08-18';
      });

      it('should return true', () => {
        expect(expenseRoutes._isOnlyReimburseDateChange(oldExpense, newExpense)).toBe(true);
      }); // should return true
    }); // when only the expense reimbursed date is changed

    describe('when expense is being changed', () => {
      beforeEach(() => {
        delete oldExpense.reimbursedDate;
        oldExpense.description = 'old description';
        newExpense.reimbursedDate = '2000-08-18';
        newExpense.description = 'new description';
      });

      it('should return false', () => {
        expect(expenseRoutes._isOnlyReimburseDateChange(oldExpense, newExpense)).toBe(false);
      }); // should return false
    }); // when expense is being changed
  }); // _isOnlyReimburseDateChange

  describe('_isValidCostChange', () => {
    let oldExpense, newExpense, expenseType, budget;

    beforeEach(() => {
      oldExpense = new Expense(EXPENSE_DATA);
      newExpense = new Expense(EXPENSE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      budget = new Budget(BUDGET_DATA);
      expenseType.budget = 100;
    });

    describe('when there is not an old expense,', () => {
      describe('overdraft is allowed,', () => {
        beforeEach(() => {
          expenseType.odFlag = true;
          budget.amount = 100;
        });

        describe('and not over budget', () => {
          beforeEach(() => {
            newExpense.cost = 200;
          });

          it('should return true', () => {
            expect(expenseRoutes._isValidCostChange(undefined, newExpense, expenseType, budget)).toBe(true);
          }); // should return true
        }); // and not over budget

        describe('and over budget', () => {
          beforeEach(() => {
            newExpense.cost = 201;
          });

          it('should return false', () => {
            expect(expenseRoutes._isValidCostChange(undefined, newExpense, expenseType, budget)).toBe(false);
          }); // should return false
        }); // and over budget
      }); // overdraft is allowed,

      describe('overdraft is not alllowed', () => {
        describe('because employee is not full time,', () => {
          beforeEach(() => {
            budget.amount = 50;
          });

          describe('and not over budget', () => {
            beforeEach(() => {
              newExpense.cost = 50;
            });

            it('should return true', () => {
              expect(expenseRoutes._isValidCostChange(undefined, newExpense, expenseType, budget)).toBe(true);
            }); // should return true
          }); // and not over budget

          describe('and over budget', () => {
            beforeEach(() => {
              newExpense.cost = 51;
            });

            it('should return false', () => {
              expect(expenseRoutes._isValidCostChange(undefined, newExpense, expenseType, budget)).toBe(false);
            }); // should return false
          }); // and over budget
        }); // because employee is not full time,

        describe('because expense type does not permit,', () => {
          beforeEach(() => {
            expenseType.odFlag = false;
            budget.amount = 100;
          });

          describe('and not over budget', () => {
            beforeEach(() => {
              newExpense.cost = 100;
            });

            it('should return true', () => {
              expect(expenseRoutes._isValidCostChange(undefined, newExpense, expenseType, budget)).toBe(true);
            }); // should return true
          }); // and not over budget

          describe('and over budget', () => {
            beforeEach(() => {
              newExpense.cost = 101;
            });

            it('should return false', () => {
              expect(expenseRoutes._isValidCostChange(undefined, newExpense, expenseType, budget)).toBe(false);
            }); // should return false
          }); // and over budget
        }); // because expense type does not permit,
      }); // overdraft is not allowed
    }); // when there is not an old expense,

    describe('when there is an old expense', () => {
      beforeEach(() => {
        oldExpense.cost = 10;
        budget.reimbursedAmount = 10;
      });

      describe('overdraft is allowed,', () => {
        beforeEach(() => {
          expenseType.odFlag = true;
          budget.amount = 100;
        });

        describe('and not over budget', () => {
          beforeEach(() => {
            newExpense.cost = 200;
          });

          it('should return true', () => {
            expect(expenseRoutes._isValidCostChange(oldExpense, newExpense, expenseType, budget)).toBe(true);
          }); // should return true
        }); // and not over budget

        describe('and over budget', () => {
          beforeEach(() => {
            newExpense.cost = 201;
          });

          it('should return false', () => {
            expect(expenseRoutes._isValidCostChange(oldExpense, newExpense, expenseType, budget)).toBe(false);
          }); // should return false
        }); // and over budget
      }); // overdraft is allowed,

      describe('overdraft is not alllowed', () => {
        describe('because employee is not full time,', () => {
          beforeEach(() => {
            budget.amount = 50;
          });

          describe('and not over budget', () => {
            beforeEach(() => {
              newExpense.cost = 50;
            });

            it('should return true', () => {
              expect(expenseRoutes._isValidCostChange(oldExpense, newExpense, expenseType, budget)).toBe(true);
            }); // should return true
          }); // and not over budget

          describe('and over budget', () => {
            beforeEach(() => {
              newExpense.cost = 51;
            });

            it('should return false', () => {
              expect(expenseRoutes._isValidCostChange(oldExpense, newExpense, expenseType, budget)).toBe(false);
            }); // should return false
          }); // and over budget
        }); // because employee is not full time,

        describe('because expense type does not permit,', () => {
          beforeEach(() => {
            expenseType.odFlag = false;
            budget.amount = 100;
          });

          describe('and not over budget', () => {
            beforeEach(() => {
              newExpense.cost = 100;
            });

            it('should return true', () => {
              expect(expenseRoutes._isValidCostChange(oldExpense, newExpense, expenseType, budget)).toBe(true);
            }); // should return true
          }); // and not over budget

          describe('and over budget', () => {
            beforeEach(() => {
              newExpense.cost = 101;
            });

            it('should return false', () => {
              expect(expenseRoutes._isValidCostChange(oldExpense, newExpense, expenseType, budget)).toBe(false);
            }); // should return false
          }); // and over budget
        }); // because expense type does not permit,
      }); // overdraft is not allowed
    }); // when there is an old expense
  }); // _isValidCostChange

  describe('_logUpdateType', () => {
    let oldExpense, newExpense;

    beforeEach(() => {
      oldExpense = new Expense(EXPENSE_DATA);
      newExpense = new Expense(EXPENSE_DATA);
      console.log = jasmine.createSpy('log');
    });

    afterEach(() => {
      expect(console.log).toHaveBeenCalled();
    });

    describe('when expense types are the same', () => {
      describe('and changing a pending expense', () => {
        beforeEach(() => {
          delete oldExpense.reimbursedDate;
          delete newExpense.reimbursedDate;
        });

        it('should log', () => {
          expenseRoutes._logUpdateType(oldExpense, newExpense);
        }); // should log
      }); // when changing a pending expense

      describe('and reimbursing an expense', () => {
        beforeEach(() => {
          delete oldExpense.reimbursedDate;
          newExpense.reimbursedDate = '2000-08-18';
        });

        it('should log', () => {
          expenseRoutes._logUpdateType(oldExpense, newExpense);
        }); // should log
      }); // when reimbursing an expense

      describe('and unreimbursing an expense', () => {
        beforeEach(() => {
          oldExpense.reimbursedDate = '2000-08-18';
          delete newExpense.reimbursedDate;
        });

        it('should log', () => {
          expenseRoutes._logUpdateType(oldExpense, newExpense);
        }); // should log
      }); // when unreimbursing an expense

      describe('and changing a reimbursed expense', () => {
        beforeEach(() => {
          oldExpense.reimbursedDate = '2000-08-18';
          newExpense.reimbursedDate = '2000-08-18';
        });

        it('should log', () => {
          expenseRoutes._logUpdateType(oldExpense, newExpense);
        }); // should log
      }); // when changing a reimbursed expense
    }); // when expense types are the same

    describe('when expense types are different', () => {
      beforeEach(() => {
        oldExpense.expenseTypeId = 'different';
        newExpense.expenseTypeId = 'other';
      });

      describe('and changing a pending expense', () => {
        beforeEach(() => {
          delete oldExpense.reimbursedDate;
          delete newExpense.reimbursedDate;
        });

        it('should log', () => {
          expenseRoutes._logUpdateType(oldExpense, newExpense);
        }); // should log
      }); // when changing a pending expense

      describe('and reimbursing an expense', () => {
        beforeEach(() => {
          delete oldExpense.reimbursedDate;
          newExpense.reimbursedDate = '2000-08-18';
        });

        it('should log', () => {
          expenseRoutes._logUpdateType(oldExpense, newExpense);
        }); // should log
      }); // when reimbursing an expense

      describe('and unreimbursing an expense', () => {
        beforeEach(() => {
          oldExpense.reimbursedDate = '2000-08-18';
          delete newExpense.reimbursedDate;
        });

        it('should log', () => {
          expenseRoutes._logUpdateType(oldExpense, newExpense);
        }); // should log
      }); // when unreimbursing an expense

      describe('and changing a reimbursed expense', () => {
        beforeEach(() => {
          oldExpense.reimbursedDate = '2000-08-18';
          newExpense.reimbursedDate = '2000-08-18';
        });

        it('should log', () => {
          expenseRoutes._logUpdateType(oldExpense, newExpense);
        }); // should log
      }); // when changing a reimbursed expense
    }); // when expense types are different
  }); // _logUpdateType

  describe('_read', () => {
    let expense;

    beforeEach(() => {
      expense = new Expense(EXPENSE_DATA);
    });

    describe('when successfully reads expense from database', () => {
      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(expense));
      });

      it('should return the read expense', (done) => {
        expenseRoutes._read(EXPENSE_DATA).then((data) => {
          expect(data).toEqual(expense);
          expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
          done();
        });
      }); // should return the read expense
    }); // when successfully reads expense from database

    describe('when fails to read expense from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entry from database.'
        };
        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._read(EXPENSE_DATA)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read expense from database
  }); // _read

  describe('_sortBudgets', () => {
    let budget1, budget2, budget3, budgets, expectedBudgets;

    beforeEach(() => {
      budget1 = new Budget(BUDGET_DATA);
      budget2 = new Budget(BUDGET_DATA);
      budget3 = new Budget(BUDGET_DATA);
      budget1.fiscalStartDate = '2001-08-18';
      budget2.fiscalStartDate = '2002-08-18';
      budget3.fiscalStartDate = '2000-08-18';
      budgets = [budget1, budget2, budget3];
      expectedBudgets = [budget3, budget1, budget2];
    });

    it('should return the budgets sorted by date', () => {
      expect(expenseRoutes._sortBudgets(budgets)).toEqual(expectedBudgets);
    }); // should return the budgets sorted by date
  }); // _sortBudgets

  describe('_update', () => {
    let oldExpense, oldExpenseData, newExpense, newExpenseData, employee, expenseType, oldBudget, newBudget;

    beforeEach(() => {
      oldExpense = new Expense(EXPENSE_DATA);
      newExpense = new Expense(EXPENSE_DATA);
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      oldBudget = new Budget(BUDGET_DATA);
      newBudget = new Budget(BUDGET_DATA);
      oldExpenseData = _.cloneDeep(EXPENSE_DATA);
      newExpenseData = _.cloneDeep(EXPENSE_DATA);

      oldExpense.cost = 5;
      delete oldExpense.reimbursedDate;
      oldExpense.purchaseDate = '2000-08-18';

      newExpense.cost = 5;
      newExpense.reimbursedDate = '2000-08-18';
      newExpense.purchaseDate = '2000-08-18';

      oldExpenseData.cost = 5;
      delete oldExpenseData.reimbursedDate;
      oldExpenseData.purchaseDate = '2000-08-18';

      newExpenseData.cost = 5;
      newExpenseData.reimbursedDate = '2000-08-18';
      newExpenseData.purchaseDate = '2000-08-18';

      expenseType.isInactive = false;
      expenseType.requiredFlag = false;
      expenseType.recurringFlag = false;
      expenseType.startDate = '2000-08-18';
      expenseType.endDate = '2001-08-17';
      expenseType.accessibleBy = ['Intern', 'FullTime', 'PartTime'];
      employee.workStatus = 100;
      oldBudget.pendingAmount = 5;
      oldBudget.fiscalStartDate = '2000-08-18';
      oldBudget.fiscalEndDate = '2001-08-17';
      newBudget.reimbursedAmount = 5;
      newBudget.fiscalStartDate = '2000-08-18';
      newBudget.fiscalEndDate = '2001-08-17';
      spyOn(expenseRoutes, '_validateExpense').and.callThrough();
      spyOn(expenseRoutes, '_validateUpdate').and.callThrough();
    });

    describe('when fails to find old Expense', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense from database.'
        };
        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._update(newExpenseData)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // 'when fails to find old Expense

    describe('when fails to find Employee', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get employee from database.'
        };
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpense));
        employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._update(newExpenseData)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find Employee

    describe('when fails to find new Expense Type', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense type from database.'
        };
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._update(newExpenseData)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find new Expense Type

    describe('when expense types are the same,', () => {
      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
      });

      describe('expense is only being reimbursed,', () => {
        describe('and successfully updating expense', () => {
          beforeEach(() => {
            databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([oldExpenseData]));
            budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([oldBudget]));
            budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(newBudget));
          });

          it('should return the expense updated and update budgets', (done) => {
            expenseRoutes._update(newExpenseData).then((data) => {
              expect(data).toEqual(newExpense);
              expect(databaseModify.getEntry).toHaveBeenCalledWith(newExpenseData.id);
              expect(employeeDynamo.getEntry).toHaveBeenCalledWith(newExpense.employeeId);
              expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(newExpense.expenseTypeId);
              expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
              expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(newBudget);
              expect(expenseRoutes._validateExpense).toHaveBeenCalledTimes(0);
              expect(expenseRoutes._validateExpense).toHaveBeenCalledTimes(0);
              done();
            });
          }); // should return the expense updated and update budgets
        }); // and successfully updating expense

        describe('and reimbursed date is before purchase date', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 403,
              message: 'Reimbursed date must be after purchase date.'
            };
            newExpenseData.reimbursedDate = '2000-08-17';
            newExpense.reimbursedDate = '2000-08-17';
          });

          it('should return a 403 rejected promise', (done) => {
            expenseRoutes
              ._update(newExpenseData)
              .then(() => {
                fail('expected error to have been thrown');
                done();
              })
              .catch((error) => {
                expect(error).toEqual(err);
                expect(databaseModify.getEntry).toHaveBeenCalledWith(newExpenseData.id);
                expect(employeeDynamo.getEntry).toHaveBeenCalledWith(newExpense.employeeId);
                expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(newExpense.expenseTypeId);
                done();
              });
          }); // should return a 403 rejected promise
        }); // and reimbursed date is before purchase date

        describe('and fails to update budgets', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 404,
              message: 'Error updating budgets.'
            };
            databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.reject(err));
          });

          it('should return a 404 rejected promise', (done) => {
            expenseRoutes
              ._update(newExpenseData)
              .then(() => {
                fail('expected error to have been thrown');
                done();
              })
              .catch((error) => {
                expect(error).toEqual(err);
                done();
              });
          }); // should return a 404 rejected promise
        }); // and fails to update budgets
      }); // expense is only being reimbursed,

      describe('expense is being changed', () => {
        beforeEach(() => {
          oldExpenseData.description = 'different';
          oldExpense.description = 'different';
          newExpenseData.description = 'other';
          newExpense.description = 'other';
        });

        describe('and successfully updating expense', () => {
          beforeEach(() => {
            spyOn(expenseRoutes, '_findBudget').and.returnValue(Promise.resolve(oldBudget));
            databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([oldExpenseData]));
            budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([oldBudget]));
            budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(newBudget));
          });

          it('should return the expense updated and update budgets', (done) => {
            expenseRoutes._update(newExpenseData).then((data) => {
              expect(data).toEqual(newExpense);
              expect(expenseRoutes._validateExpense).toHaveBeenCalled();
              expect(expenseRoutes._validateExpense).toHaveBeenCalled();
              done();
            });
          }); // should return the expense updated and update budgets
        }); // and successfully updating expense
      }); // expense is being changed,
    }); // when expense types are the same,

    describe('when expense types are different', () => {
      let oldExpenseType;

      beforeEach(() => {
        newExpenseData.expenseTypeId = 'other';
        newExpense.expenseTypeId = 'other';
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpense));
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        oldExpenseType = _.cloneDeep(expenseType);
        expenseTypeDynamo.getEntry.and.returnValues(Promise.resolve(expenseType), Promise.resolve(oldExpenseType));
        spyOn(expenseRoutes, 'getUUID').and.returnValue(ID);
      });

      describe('and successfully updating expense', () => {
        beforeEach(() => {
          databaseModify.addToDB.and.returnValue(Promise.resolve(newExpense));
          databaseModify.removeFromDB.and.returnValue(Promise.resolve(oldExpense));
          spyOn(expenseRoutes, '_create').and.returnValue(Promise.resolve(newExpense));
          spyOn(expenseRoutes, '_validateInputs').and.returnValue(Promise.resolve(newExpense));
          spyOn(expenseRoutes, '_updateBudgets').and.returnValue(Promise.resolve());
          spyOn(expenseRoutes, '_logUpdateType').and.callThrough();
          spyOn(expenseRoutes, '_changeBucket');
        });

        afterEach(() => {
          expect(expenseRoutes._logUpdateType).toHaveBeenCalled();
        });

        describe('that requires a receipt,', () => {
          beforeEach(() => {
            expenseType.requiredFlag = true;
            oldExpenseType.requiredFlag = true;
          });

          describe('the old has a receipt,', () => {
            beforeEach(() => {
              oldExpense.receipt = RECEIPT;
            });

            describe('and requires a category', () => {
              beforeEach(() => {
                expenseType.categories = [CATEGORY];
                oldExpenseType.categories = [CATEGORY];
              });

              it('should create a new expense and delete the old', (done) => {
                expenseRoutes._update(newExpenseData).then((data) => {
                  expect(data).toEqual(newExpense);
                  expect(expenseRoutes._changeBucket).toHaveBeenCalledWith(
                    oldExpense.employeeId,
                    oldExpense.id,
                    newExpense.id
                  );
                  expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                  expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                  expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                  expect(expenseRoutes._updateBudgets).toHaveBeenCalledWith(
                    oldExpense,
                    undefined,
                    employee,
                    expenseType
                  );
                  expect(databaseModify.removeFromDB).toHaveBeenCalledWith(oldExpense.id);
                  done();
                });
              }); // should create a new expense an delete the old
            }); // and requires a category

            describe('and does not require a category', () => {
              beforeEach(() => {
                expenseType.categories = CATEGORIES;
                delete newExpense.category;
              });

              it('should create a new expense and delete the old', (done) => {
                expenseRoutes._update(newExpenseData).then((data) => {
                  expect(data).toEqual(newExpense);
                  expect(expenseRoutes._changeBucket).toHaveBeenCalledWith(
                    oldExpense.employeeId,
                    oldExpense.id,
                    newExpense.id
                  );
                  expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                  expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                  expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                  expect(expenseRoutes._updateBudgets).toHaveBeenCalledWith(
                    oldExpense,
                    undefined,
                    employee,
                    expenseType
                  );
                  expect(databaseModify.removeFromDB).toHaveBeenCalledWith(oldExpense.id);
                  done();
                });
              }); // should create a new expense an delete the old
            }); // and does not require a category
          }); // the old has a receipt,

          describe('the old does not have a receipt,', () => {
            beforeEach(() => {
              delete oldExpense.receipt;
            });

            describe('and requires a category', () => {
              beforeEach(() => {
                expenseType.categories = [CATEGORY];
                oldExpenseType.categories = [CATEGORY];
              });

              it('should create a new expense and delete the old', (done) => {
                expenseRoutes._update(newExpenseData).then((data) => {
                  expect(data).toEqual(newExpense);
                  expect(expenseRoutes._changeBucket).toHaveBeenCalledTimes(0);
                  expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                  expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                  expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                  expect(expenseRoutes._updateBudgets).toHaveBeenCalledWith(
                    oldExpense,
                    undefined,
                    employee,
                    expenseType
                  );
                  expect(databaseModify.removeFromDB).toHaveBeenCalledWith(oldExpense.id);
                  done();
                });
              }); // should create a new expense an delete the old
            }); // and requires a category

            describe('and does not require a category', () => {
              beforeEach(() => {
                expenseType.categories = CATEGORIES;
                oldExpenseType.categories = CATEGORIES;
                delete newExpense.category;
              });

              it('should create a new expense and delete the old', (done) => {
                expenseRoutes._update(newExpenseData).then((data) => {
                  expect(data).toEqual(newExpense);
                  expect(expenseRoutes._changeBucket).toHaveBeenCalledTimes(0);
                  expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                  expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                  expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                  expect(expenseRoutes._updateBudgets).toHaveBeenCalledWith(
                    oldExpense,
                    undefined,
                    employee,
                    expenseType
                  );
                  expect(databaseModify.removeFromDB).toHaveBeenCalledWith(oldExpense.id);
                  done();
                });
              }); // should create a new expense an delete the old
            }); // and does not require a category
          }); // the old does not have a receipt,
        }); // that requires a receipt,

        describe('that does not require a receipt', () => {
          beforeEach(() => {
            expenseType.requiredFlag = false;
            oldExpenseType.requiredFlag = false;
            delete newExpense.receipt;
          });

          describe('and requires a category', () => {
            beforeEach(() => {
              expenseType.categories = [CATEGORY];
              oldExpenseType.categories = [CATEGORY];
            });

            it('should create a new expense and delete the old', (done) => {
              expenseRoutes._update(newExpenseData).then((data) => {
                expect(data).toEqual(newExpense);
                expect(expenseRoutes._changeBucket).toHaveBeenCalledTimes(0);
                expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._updateBudgets).toHaveBeenCalledWith(oldExpense, 
                  undefined, employee, expenseType);
                expect(databaseModify.removeFromDB).toHaveBeenCalledWith(oldExpense.id);
                done();
              });
            }); // should create a new expense an delete the old
          }); // and requires a category

          describe('and does not require a category', () => {
            beforeEach(() => {
              expenseType.categories = CATEGORIES;
              delete newExpense.category;
            });

            it('should create a new expense and delete the old', (done) => {
              expenseRoutes._update(newExpenseData).then((data) => {
                expect(data).toEqual(newExpense);
                expect(expenseRoutes._changeBucket).toHaveBeenCalledTimes(0);
                expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._updateBudgets).toHaveBeenCalledWith(oldExpense, 
                  undefined, employee, expenseType);
                expect(databaseModify.removeFromDB).toHaveBeenCalledWith(oldExpense.id);
                done();
              });
            }); // should create a new expense an delete the old
          }); // and does not require a category
        }); // that does not require a receipt
      }); // and successfully updating expense

      describe('and fails to', () => {
        beforeEach(() => {
          expenseType.requiredFlag = false;
          delete newExpense.receipt;
          expenseType.categories = CATEGORIES;
          delete newExpense.category;
        });

        describe('create new expense', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 404,
              message: 'Failed to create new expense.'
            };
            spyOn(expenseRoutes, '_create').and.returnValue(Promise.reject(err));
          });

          it('should return a 404 rejected promise', (done) => {
            expenseRoutes
              ._update(newExpenseData)
              .then(() => {
                fail('expected error to have been thrown');
                done();
              })
              .catch((error) => {
                expect(error).toEqual(err);
                expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                done();
              });
          }); // should return a 404 rejected promise
        }); // create new expense

        describe('validate inputs', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 403,
              message: 'Failed to validate inputs.'
            };
            spyOn(expenseRoutes, '_create').and.returnValue(Promise.resolve(newExpense));
            spyOn(expenseRoutes, '_validateInputs').and.returnValue(Promise.reject(err));
          });

          it('should return a 403 rejected promise', (done) => {
            expenseRoutes
              ._update(newExpenseData)
              .then(() => {
                fail('expected error to have been thrown');
                done();
              })
              .catch((error) => {
                expect(error).toEqual(err);
                expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                done();
              });
          }); // should return a 403 rejected promise
        }); // validate inputs

        describe('add new expense to database', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 404,
              message: 'Failed to add new expense to database.'
            };
            databaseModify.addToDB.and.returnValue(Promise.reject(err));
            spyOn(expenseRoutes, '_create').and.returnValue(Promise.resolve(newExpense));
            spyOn(expenseRoutes, '_validateInputs').and.returnValue(Promise.resolve(newExpense));
          });

          it('should return a 404 rejected promise', (done) => {
            expenseRoutes
              ._update(newExpenseData)
              .then(() => {
                fail('expected error to have been thrown');
                done();
              })
              .catch((error) => {
                expect(error).toEqual(err);
                expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                done();
              });
          }); // should return a 404 rejected promise
        }); // add new expense to database

        describe('update budgets', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 404,
              message: 'Failed to update budgets.'
            };
            databaseModify.addToDB.and.returnValue(Promise.resolve(newExpense));
            spyOn(expenseRoutes, '_create').and.returnValue(Promise.resolve(newExpense));
            spyOn(expenseRoutes, '_validateInputs').and.returnValue(Promise.resolve(newExpense));
            spyOn(expenseRoutes, '_updateBudgets').and.returnValue(Promise.reject(err));
          });

          it('should return a 404 rejected promise', (done) => {
            expenseRoutes
              ._update(newExpenseData)
              .then(() => {
                fail('expected error to have been thrown');
                done();
              })
              .catch((error) => {
                expect(error).toEqual(err);
                expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._updateBudgets).toHaveBeenCalledWith(oldExpense, 
                  undefined, employee, expenseType);
                done();
              });
          }); // should return a 404 rejected promise
        }); // update budgets

        describe('remove old expense from database', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 404,
              message: 'Failed to remove old expense from database.'
            };
            databaseModify.addToDB.and.returnValue(Promise.resolve(newExpense));
            databaseModify.removeFromDB.and.returnValue(Promise.reject(err));
            spyOn(expenseRoutes, '_create').and.returnValue(Promise.resolve(newExpense));
            spyOn(expenseRoutes, '_validateInputs').and.returnValue(Promise.resolve(newExpense));
            spyOn(expenseRoutes, '_updateBudgets').and.returnValue(Promise.resolve());
          });

          it('should return a 404 rejected promise', (done) => {
            expenseRoutes
              ._update(newExpenseData)
              .then(() => {
                fail('expected error to have been thrown');
                done();
              })
              .catch((error) => {
                expect(error).toEqual(err);
                expect(expenseRoutes._create).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._validateInputs).toHaveBeenCalledWith(newExpense);
                expect(databaseModify.addToDB).toHaveBeenCalledWith(newExpense);
                expect(expenseRoutes._updateBudgets).toHaveBeenCalledWith(oldExpense, 
                  undefined, employee, expenseType);
                expect(databaseModify.removeFromDB).toHaveBeenCalledWith(oldExpense.id);
                done();
              });
          }); // should return a 404 rejected promise
        }); // remove old expense from database
      }); // and fails to
    }); // when expense types are different
  }); // _update

  describe('_updateBudgets', () => {
    let oldExpense, newExpense, employee, expenseType, expensesData, budgetsData;

    beforeEach(() => {
      oldExpense = new Expense(EXPENSE_DATA);
      newExpense = new Expense(EXPENSE_DATA);
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType.budget = 100;
    });

    describe('when successfully removing an expense', () => {
      // describe('and expense is carried over the first 3 budgets', () => {
      //   let expense1, expense2, expense3, expense4, expense5, expense6;
      //   let budget1, budget2, budget3, budget4;
      //   let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudget4, expectedBudgets;

      //   beforeEach(() => {
      //     expense1 = _.cloneDeep(EXPENSE_DATA);
      //     expense1.purchaseDate = '2000-08-18';
      //     expense1.cost = 10;
      //     delete expense1.reimbursedDate;

      //     expense2 = _.cloneDeep(EXPENSE_DATA);
      //     expense2.purchaseDate = '2000-08-18';
      //     expense2.cost = 90;
      //     delete expense2.reimbursedDate;

      //     expense3 = _.cloneDeep(EXPENSE_DATA);
      //     expense3.purchaseDate = '2000-08-18';
      //     expense3.cost = 50;
      //     expense3.reimbursedDate = '2000-08-18';

      //     expense4 = _.cloneDeep(EXPENSE_DATA);
      //     expense4.purchaseDate = '2001-08-18';
      //     expense4.cost = 20;
      //     expense4.reimbursedDate = '2001-08-18';

      //     expense5 = _.cloneDeep(EXPENSE_DATA);
      //     expense5.purchaseDate = '2001-08-18';
      //     expense5.cost = 60;
      //     expense5.reimbursedDate = '2001-08-18';

      //     expense6 = _.cloneDeep(EXPENSE_DATA);
      //     expense6.purchaseDate = '2003-08-18';
      //     expense6.cost = 80;
      //     delete expense6.reimbursedDate;

      //     budget1 = _.cloneDeep(BUDGET_DATA);
      //     budget1.fiscalStartDate = '2000-08-18';
      //     budget1.fiscalEndDate = '2001-08-17';
      //     budget1.amount = 100;
      //     budget1.pendingAmount = 50;
      //     budget1.reimbursedAmount = 50;

      //     budget2 = _.cloneDeep(BUDGET_DATA);
      //     budget2.fiscalStartDate = '2001-08-18';
      //     budget2.fiscalEndDate = '2002-08-17';
      //     budget2.amount = 100;
      //     budget2.pendingAmount = 20;
      //     budget2.reimbursedAmount = 80;

      //     budget3 = _.cloneDeep(BUDGET_DATA);
      //     budget3.fiscalStartDate = '2002-08-18';
      //     budget3.fiscalEndDate = '2003-08-17';
      //     budget3.amount = 100;
      //     budget3.pendingAmount = 30;
      //     budget3.reimbursedAmount = 0;

      //     budget4 = _.cloneDeep(BUDGET_DATA);
      //     budget4.fiscalStartDate = '2003-08-18';
      //     budget4.fiscalEndDate = '2004-08-17';
      //     budget4.amount = 100;
      //     budget4.pendingAmount = 80;
      //     budget4.reimbursedAmount = 0;

      //     expectedBudget1 = new Budget(BUDGET_DATA);
      //     expectedBudget1.fiscalStartDate = '2000-08-18';
      //     expectedBudget1.fiscalEndDate = '2001-08-17';
      //     expectedBudget1.amount = 100;
      //     expectedBudget1.pendingAmount = 10;
      //     expectedBudget1.reimbursedAmount = 50;

      //     expectedBudget2 = new Budget(BUDGET_DATA);
      //     expectedBudget2.fiscalStartDate = '2001-08-18';
      //     expectedBudget2.fiscalEndDate = '2002-08-17';
      //     expectedBudget2.amount = 100;
      //     expectedBudget2.pendingAmount = 0;
      //     expectedBudget2.reimbursedAmount = 80;

      //     expectedBudget3 = new Budget(BUDGET_DATA);
      //     expectedBudget3.fiscalStartDate = '2002-08-18';
      //     expectedBudget3.fiscalEndDate = '2003-08-17';
      //     expectedBudget3.amount = 100;
      //     expectedBudget3.pendingAmount = 0;
      //     expectedBudget3.reimbursedAmount = 0;

      //     expectedBudget4 = new Budget(BUDGET_DATA);
      //     expectedBudget4.fiscalStartDate = '2003-08-18';
      //     expectedBudget4.fiscalEndDate = '2004-08-17';
      //     expectedBudget4.amount = 100;
      //     expectedBudget4.pendingAmount = 80;
      //     expectedBudget4.reimbursedAmount = 0;

      //     expensesData = [expense1, expense2, expense3, expense4, expense5, expense6];
      //     budgetsData = [budget1, budget2, budget3, budget4];
      //     expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget4];

      //     oldExpense = new Expense(expense2);

      //     databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
      //     budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
      //     budgetDynamo.removeFromDB.and.returnValues(Promise.resolve(expectedBudget3));
      //     budgetDynamo.updateEntryInDB.and.returnValues(
      //       Promise.resolve(expectedBudget1),
      //       Promise.resolve(expectedBudget2),
      //       Promise.resolve(expectedBudget4)
      //     );
      //   });

      //   it('should update and return the expected budgets', (done) => {
      //     expenseRoutes._updateBudgets(oldExpense, undefined, employee, expenseType).then((data) => {
      //       expect(data).toEqual(expectedBudgets);
      //       done();
      //     });
      //   }); // should update and return the expected budgets
      // }); // and expense is carried over 3 budgets

      describe('and expense is carried over the last 2 budgets', () => {
        let expense1, expense2, expense3, expense4, expense5, expense6;
        let budget1, budget2, budget3, budget4;
        let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudget4, expectedBudgets;

        beforeEach(() => {
          expense1 = _.cloneDeep(EXPENSE_DATA);
          expense1.purchaseDate = '2000-08-18';
          expense1.cost = 90;
          delete expense1.reimbursedDate;

          expense2 = _.cloneDeep(EXPENSE_DATA);
          expense2.purchaseDate = '2000-08-18';
          expense2.cost = 50;
          expense2.reimbursedDate = '2000-08-18';

          expense3 = _.cloneDeep(EXPENSE_DATA);
          expense3.purchaseDate = '2001-08-18';
          expense3.cost = 20;
          expense3.reimbursedDate = '2001-08-18';

          expense4 = _.cloneDeep(EXPENSE_DATA);
          expense4.purchaseDate = '2002-08-18';
          expense4.cost = 20;
          delete expense4.reimbursedDate;

          expense5 = _.cloneDeep(EXPENSE_DATA);
          expense5.purchaseDate = '2002-08-18';
          expense5.cost = 90;
          expense5.reimbursedDate = '2002-08-18';

          expense6 = _.cloneDeep(EXPENSE_DATA);
          expense6.purchaseDate = '2003-08-18';
          expense6.cost = 10;
          expense6.reimbursedDate = '2003-08-18';

          budget1 = _.cloneDeep(BUDGET_DATA);
          budget1.fiscalStartDate = '2000-08-18';
          budget1.fiscalEndDate = '2001-08-17';
          budget1.amount = 100;
          budget1.pendingAmount = 50;
          budget1.reimbursedAmount = 50;

          budget2 = _.cloneDeep(BUDGET_DATA);
          budget2.fiscalStartDate = '2001-08-18';
          budget2.fiscalEndDate = '2002-08-17';
          budget2.amount = 100;
          budget2.pendingAmount = 40;
          budget2.reimbursedAmount = 20;

          budget3 = _.cloneDeep(BUDGET_DATA);
          budget3.fiscalStartDate = '2002-08-18';
          budget3.fiscalEndDate = '2003-08-17';
          budget3.amount = 100;
          budget3.pendingAmount = 10;
          budget3.reimbursedAmount = 90;

          budget4 = _.cloneDeep(BUDGET_DATA);
          budget4.fiscalStartDate = '2003-08-18';
          budget4.fiscalEndDate = '2004-08-17';
          budget4.amount = 100;
          budget4.pendingAmount = 10;
          budget4.reimbursedAmount = 10;

          expectedBudget1 = new Budget(BUDGET_DATA);
          expectedBudget1.fiscalStartDate = '2000-08-18';
          expectedBudget1.fiscalEndDate = '2001-08-17';
          expectedBudget1.amount = 100;
          expectedBudget1.pendingAmount = 50;
          expectedBudget1.reimbursedAmount = 50;

          expectedBudget2 = new Budget(BUDGET_DATA);
          expectedBudget2.fiscalStartDate = '2001-08-18';
          expectedBudget2.fiscalEndDate = '2002-08-17';
          expectedBudget2.amount = 100;
          expectedBudget2.pendingAmount = 40;
          expectedBudget2.reimbursedAmount = 20;

          expectedBudget3 = new Budget(BUDGET_DATA);
          expectedBudget3.fiscalStartDate = '2002-08-18';
          expectedBudget3.fiscalEndDate = '2003-08-17';
          expectedBudget3.amount = 100;
          expectedBudget3.pendingAmount = 0;
          expectedBudget3.reimbursedAmount = 90;

          expectedBudget4 = new Budget(BUDGET_DATA);
          expectedBudget4.fiscalStartDate = '2003-08-18';
          expectedBudget4.fiscalEndDate = '2004-08-17';
          expectedBudget4.amount = 100;
          expectedBudget4.pendingAmount = 0;
          expectedBudget4.reimbursedAmount = 10;

          expensesData = [expense1, expense2, expense3, expense4, expense5, expense6];
          budgetsData = [budget1, budget2, budget3, budget4];
          expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3, expectedBudget4];

          oldExpense = new Expense(expense4);

          databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
          budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
          budgetDynamo.updateEntryInDB.and.returnValues(
            Promise.resolve(expectedBudget1),
            Promise.resolve(expectedBudget2),
            Promise.resolve(expectedBudget3),
            Promise.resolve(expectedBudget4)
          );
        });

        it('should update and return the expected budgets', (done) => {
          expenseRoutes._updateBudgets(oldExpense, undefined, employee, expenseType).then((data) => {
            expect(data).toEqual(expectedBudgets);
            done();
          });
        }); // should update and return the expected budgets
      }); // and expense is carried over the last 2 budgets

      // describe('and expense is a part of a part time budget', () => {
      //   let expense1, expense2, expense3;
      //   let budget1, budget2, budget3;
      //   let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudgets;

      //   beforeEach(() => {
      //     expense1 = _.cloneDeep(EXPENSE_DATA);
      //     expense1.purchaseDate = '2000-08-18';
      //     expense1.cost = 20;
      //     delete expense1.reimbursedDate;

      //     expense2 = _.cloneDeep(EXPENSE_DATA);
      //     expense2.purchaseDate = '2001-08-18';
      //     expense2.cost = 50;
      //     delete expense2.reimbursedDate;

      //     expense3 = _.cloneDeep(EXPENSE_DATA);
      //     expense3.purchaseDate = '2002-08-18';
      //     expense3.cost = 20;
      //     delete expense3.reimbursedDate;

      //     budget1 = _.cloneDeep(BUDGET_DATA);
      //     budget1.fiscalStartDate = '2000-08-18';
      //     budget1.fiscalEndDate = '2001-08-17';
      //     budget1.amount = 100;
      //     budget1.pendingAmount = 20;
      //     budget1.reimbursedAmount = 0;

      //     budget2 = _.cloneDeep(BUDGET_DATA);
      //     budget2.fiscalStartDate = '2001-08-18';
      //     budget2.fiscalEndDate = '2002-08-17';
      //     budget2.amount = 100;
      //     budget2.pendingAmount = 50;
      //     budget2.reimbursedAmount = 0;

      //     budget3 = _.cloneDeep(BUDGET_DATA);
      //     budget3.fiscalStartDate = '2002-08-18';
      //     budget3.fiscalEndDate = '2003-08-17';
      //     budget3.amount = 100;
      //     budget3.pendingAmount = 20;
      //     budget3.reimbursedAmount = 0;

      //     expectedBudget1 = new Budget(BUDGET_DATA);
      //     expectedBudget1.fiscalStartDate = '2000-08-18';
      //     expectedBudget1.fiscalEndDate = '2001-08-17';
      //     expectedBudget1.amount = 100;
      //     expectedBudget1.pendingAmount = 20;
      //     expectedBudget1.reimbursedAmount = 0;

      //     expectedBudget2 = new Budget(BUDGET_DATA);
      //     expectedBudget2.fiscalStartDate = '2001-08-18';
      //     expectedBudget2.fiscalEndDate = '2002-08-17';
      //     expectedBudget2.amount = 100;
      //     expectedBudget2.pendingAmount = 0;
      //     expectedBudget2.reimbursedAmount = 0;

      //     expectedBudget3 = new Budget(BUDGET_DATA);
      //     expectedBudget3.fiscalStartDate = '2002-08-18';
      //     expectedBudget3.fiscalEndDate = '2003-08-17';
      //     expectedBudget3.amount = 100;
      //     expectedBudget3.pendingAmount = 20;
      //     expectedBudget3.reimbursedAmount = 0;

      //     expensesData = [expense1, expense2, expense3];
      //     budgetsData = [budget1, budget2, budget3];
      //     expectedBudgets = [expectedBudget1, expectedBudget3];

      //     oldExpense = new Expense(expense2);

      //     databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
      //     budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
      //     budgetDynamo.removeFromDB.and.returnValues(Promise.resolve(expectedBudget2));
      //     budgetDynamo.updateEntryInDB.and.returnValues(
      //       Promise.resolve(expectedBudget1),
      //       Promise.resolve(expectedBudget3)
      //     );
      //   });

      //   it('should update and return the expected budgets', (done) => {
      //     expenseRoutes._updateBudgets(oldExpense, undefined, employee, expenseType).then((data) => {
      //       expect(data).toEqual(expectedBudgets);
      //       done();
      //     });
      //   }); // should update and return the expected budgets
      // }); // and expense is a part of a part time budget

      describe('and expense is the only expense', () => {
        let expense1, budget1, expectedBudget1, expectedBudgets;

        beforeEach(() => {
          expense1 = _.cloneDeep(EXPENSE_DATA);
          expense1.purchaseDate = '2000-08-18';
          expense1.cost = 20;
          delete expense1.reimbursedDate;

          budget1 = _.cloneDeep(BUDGET_DATA);
          budget1.fiscalStartDate = '2000-08-18';
          budget1.fiscalEndDate = '2001-08-17';
          budget1.amount = 100;
          budget1.pendingAmount = 20;
          budget1.reimbursedAmount = 0;

          expectedBudget1 = new Budget(BUDGET_DATA);
          expectedBudget1.fiscalStartDate = '2000-08-18';
          expectedBudget1.fiscalEndDate = '2001-08-17';
          expectedBudget1.amount = 100;
          expectedBudget1.pendingAmount = 0;
          expectedBudget1.reimbursedAmount = 0;

          expensesData = [expense1];
          budgetsData = [budget1];
          expectedBudgets = [];

          oldExpense = new Expense(expense1);

          databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
          budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
          budgetDynamo.removeFromDB.and.returnValues(Promise.resolve(expectedBudget1));
        });

        it('should update and return the expected budgets', (done) => {
          expenseRoutes._updateBudgets(oldExpense, undefined, employee, expenseType).then((data) => {
            expect(data).toEqual(expectedBudgets);
            done();
          });
        }); // should update and return the expected budgets
      }); // and expense is the only expense in the current budget
    }); // when removing an expense

    // describe('when successfully changing cost of a pending expense', () => {
    //   describe('and expense is increased and carried over the first 3 budgets', () => {
    //     let expense1, expense2, expense3, expense4;
    //     let budget1, budget2, budget3, budget4;
    //     let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudget4, expectedBudgets;

    //     beforeEach(() => {
    //       expense1 = _.cloneDeep(EXPENSE_DATA);
    //       expense1.purchaseDate = '2000-08-18';
    //       expense1.cost = 70;
    //       delete expense1.reimbursedDate;

    //       expense2 = _.cloneDeep(EXPENSE_DATA);
    //       expense2.purchaseDate = '2000-08-18';
    //       expense2.cost = 60;
    //       expense2.reimbursedDate = '2000-08-18';

    //       expense3 = _.cloneDeep(EXPENSE_DATA);
    //       expense3.purchaseDate = '2001-08-18';
    //       expense3.cost = 80;
    //       expense3.reimbursedDate = '2001-08-18';

    //       expense4 = _.cloneDeep(EXPENSE_DATA);
    //       expense4.purchaseDate = '2003-08-18';
    //       expense4.cost = 20;
    //       expense4.reimbursedDate = '2003-08-18';

    //       budget1 = _.cloneDeep(BUDGET_DATA);
    //       budget1.fiscalStartDate = '2000-08-18';
    //       budget1.fiscalEndDate = '2001-08-17';
    //       budget1.amount = 100;
    //       budget1.pendingAmount = 40;
    //       budget1.reimbursedAmount = 60;

    //       budget2 = _.cloneDeep(BUDGET_DATA);
    //       budget2.fiscalStartDate = '2001-08-18';
    //       budget2.fiscalEndDate = '2002-08-17';
    //       budget2.amount = 100;
    //       budget2.pendingAmount = 20;
    //       budget2.reimbursedAmount = 80;

    //       budget3 = _.cloneDeep(BUDGET_DATA);
    //       budget3.fiscalStartDate = '2002-08-18';
    //       budget3.fiscalEndDate = '2003-08-17';
    //       budget3.amount = 100;
    //       budget3.pendingAmount = 10;
    //       budget3.reimbursedAmount = 0;

    //       budget4 = _.cloneDeep(BUDGET_DATA);
    //       budget4.fiscalStartDate = '2003-08-18';
    //       budget4.fiscalEndDate = '2004-08-17';
    //       budget4.amount = 100;
    //       budget4.pendingAmount = 0;
    //       budget4.reimbursedAmount = 20;

    //       expectedBudget1 = new Budget(BUDGET_DATA);
    //       expectedBudget1.fiscalStartDate = '2000-08-18';
    //       expectedBudget1.fiscalEndDate = '2001-08-17';
    //       expectedBudget1.amount = 100;
    //       expectedBudget1.pendingAmount = 40;
    //       expectedBudget1.reimbursedAmount = 60;

    //       expectedBudget2 = new Budget(BUDGET_DATA);
    //       expectedBudget2.fiscalStartDate = '2001-08-18';
    //       expectedBudget2.fiscalEndDate = '2002-08-17';
    //       expectedBudget2.amount = 100;
    //       expectedBudget2.pendingAmount = 20;
    //       expectedBudget2.reimbursedAmount = 80;

    //       expectedBudget3 = new Budget(BUDGET_DATA);
    //       expectedBudget3.fiscalStartDate = '2002-08-18';
    //       expectedBudget3.fiscalEndDate = '2003-08-17';
    //       expectedBudget3.amount = 100;
    //       expectedBudget3.pendingAmount = 20;
    //       expectedBudget3.reimbursedAmount = 0;

    //       expectedBudget4 = new Budget(BUDGET_DATA);
    //       expectedBudget4.fiscalStartDate = '2003-08-18';
    //       expectedBudget4.fiscalEndDate = '2004-08-17';
    //       expectedBudget4.amount = 100;
    //       expectedBudget4.pendingAmount = 0;
    //       expectedBudget4.reimbursedAmount = 20;

    //       expensesData = [expense1, expense2, expense3, expense4];
    //       budgetsData = [budget1, budget2, budget3, budget4];
    //       expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3, expectedBudget4];

    //       oldExpense = new Expense(expense1);
    //       newExpense = new Expense(expense1);
    //       newExpense.cost = 80;

    //       databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
    //       budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
    //       budgetDynamo.updateEntryInDB.and.returnValues(
    //         Promise.resolve(expectedBudget1),
    //         Promise.resolve(expectedBudget2),
    //         Promise.resolve(expectedBudget3),
    //         Promise.resolve(expectedBudget4)
    //       );
    //     });

    //     it('should update and return the expected budgets', (done) => {
    //       expenseRoutes._updateBudgets(oldExpense, newExpense, employee, expenseType).then((data) => {
    //         expect(data).toEqual(expectedBudgets);
    //         done();
    //       });
    //     }); // should update and return the expected budgets
    //   }); // and expense is increased and carried over the first 3 budgets

    //   describe('and expense is decreased and carried over the first 3 budgets', () => {
    //     let expense1, expense2, expense3, expense4;
    //     let budget1, budget2, budget3, budget4;
    //     let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudget4, expectedBudgets;

    //     beforeEach(() => {
    //       expense1 = _.cloneDeep(EXPENSE_DATA);
    //       expense1.purchaseDate = '2000-08-18';
    //       expense1.cost = 70;
    //       delete expense1.reimbursedDate;

    //       expense2 = _.cloneDeep(EXPENSE_DATA);
    //       expense2.purchaseDate = '2000-08-18';
    //       expense2.cost = 60;
    //       expense2.reimbursedDate = '2000-08-18';

    //       expense3 = _.cloneDeep(EXPENSE_DATA);
    //       expense3.purchaseDate = '2001-08-18';
    //       expense3.cost = 80;
    //       expense3.reimbursedDate = '2001-08-18';

    //       expense4 = _.cloneDeep(EXPENSE_DATA);
    //       expense4.purchaseDate = '2003-08-18';
    //       expense4.cost = 20;
    //       expense4.reimbursedDate = '2003-08-18';

    //       budget1 = _.cloneDeep(BUDGET_DATA);
    //       budget1.fiscalStartDate = '2000-08-18';
    //       budget1.fiscalEndDate = '2001-08-17';
    //       budget1.amount = 100;
    //       budget1.pendingAmount = 40;
    //       budget1.reimbursedAmount = 60;

    //       budget2 = _.cloneDeep(BUDGET_DATA);
    //       budget2.fiscalStartDate = '2001-08-18';
    //       budget2.fiscalEndDate = '2002-08-17';
    //       budget2.amount = 100;
    //       budget2.pendingAmount = 20;
    //       budget2.reimbursedAmount = 80;

    //       budget3 = _.cloneDeep(BUDGET_DATA);
    //       budget3.fiscalStartDate = '2002-08-18';
    //       budget3.fiscalEndDate = '2003-08-17';
    //       budget3.amount = 100;
    //       budget3.pendingAmount = 10;
    //       budget3.reimbursedAmount = 0;

    //       budget4 = _.cloneDeep(BUDGET_DATA);
    //       budget4.fiscalStartDate = '2003-08-18';
    //       budget4.fiscalEndDate = '2004-08-17';
    //       budget4.amount = 100;
    //       budget4.pendingAmount = 0;
    //       budget4.reimbursedAmount = 20;

    //       expectedBudget1 = new Budget(BUDGET_DATA);
    //       expectedBudget1.fiscalStartDate = '2000-08-18';
    //       expectedBudget1.fiscalEndDate = '2001-08-17';
    //       expectedBudget1.amount = 100;
    //       expectedBudget1.pendingAmount = 10;
    //       expectedBudget1.reimbursedAmount = 60;

    //       expectedBudget2 = new Budget(BUDGET_DATA);
    //       expectedBudget2.fiscalStartDate = '2001-08-18';
    //       expectedBudget2.fiscalEndDate = '2002-08-17';
    //       expectedBudget2.amount = 100;
    //       expectedBudget2.pendingAmount = 0;
    //       expectedBudget2.reimbursedAmount = 80;

    //       expectedBudget3 = new Budget(BUDGET_DATA);
    //       expectedBudget3.fiscalStartDate = '2002-08-18';
    //       expectedBudget3.fiscalEndDate = '2003-08-17';
    //       expectedBudget3.amount = 100;
    //       expectedBudget3.pendingAmount = 0;
    //       expectedBudget3.reimbursedAmount = 0;

    //       expectedBudget4 = new Budget(BUDGET_DATA);
    //       expectedBudget4.fiscalStartDate = '2003-08-18';
    //       expectedBudget4.fiscalEndDate = '2004-08-17';
    //       expectedBudget4.amount = 100;
    //       expectedBudget4.pendingAmount = 0;
    //       expectedBudget4.reimbursedAmount = 20;

    //       expensesData = [expense1, expense2, expense3, expense4];
    //       budgetsData = [budget1, budget2, budget3, budget4];
    //       expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget4];

    //       oldExpense = new Expense(expense1);
    //       newExpense = new Expense(expense1);
    //       newExpense.cost = 10;

    //       databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
    //       budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
    //       budgetDynamo.removeFromDB.and.returnValues(Promise.resolve(expectedBudget3));
    //       budgetDynamo.updateEntryInDB.and.returnValues(
    //         Promise.resolve(expectedBudget1),
    //         Promise.resolve(expectedBudget2),
    //         Promise.resolve(expectedBudget4)
    //       );
    //     });

    //     it('should update and return the expected budgets', (done) => {
    //       expenseRoutes._updateBudgets(oldExpense, newExpense, employee, expenseType).then((data) => {
    //         expect(data).toEqual(expectedBudgets);
    //         done();
    //       });
    //     }); // should update and return the expected budgets
    //   }); // and expense is decreased and carried over the first 3 budgets

    //   describe('and expense is increased and current budget has overage', () => {
    //     let expense1, expense2, expense3, expense4;
    //     let budget1, budget2;
    //     let expectedBudget1, expectedBudget2, expectedBudgets;

    //     beforeEach(() => {
    //       expense1 = _.cloneDeep(EXPENSE_DATA);
    //       expense1.purchaseDate = moment().subtract(1, 'y').format(ISOFORMAT);
    //       expense1.cost = 20;
    //       delete expense1.reimbursedDate;

    //       expense2 = _.cloneDeep(EXPENSE_DATA);
    //       expense2.purchaseDate = moment().subtract(1, 'y').format(ISOFORMAT);
    //       expense2.cost = 80;
    //       expense2.reimbursedDate = moment().subtract(1, 'y').format(ISOFORMAT);

    //       expense3 = _.cloneDeep(EXPENSE_DATA);
    //       expense3.purchaseDate = moment().format(ISOFORMAT);
    //       expense3.cost = 90;
    //       delete expense3.reimbursedDate;

    //       expense4 = _.cloneDeep(EXPENSE_DATA);
    //       expense4.purchaseDate = moment().format(ISOFORMAT);
    //       expense4.cost = 10;
    //       expense4.reimbursedDate = moment().format(ISOFORMAT);

    //       budget1 = _.cloneDeep(BUDGET_DATA);
    //       budget1.fiscalStartDate = moment().subtract(1, 'y').format(ISOFORMAT);
    //       budget1.fiscalEndDate = moment().subtract(1, 'd').format(ISOFORMAT);
    //       budget1.amount = 100;
    //       budget1.pendingAmount = 20;
    //       budget1.reimbursedAmount = 80;

    //       budget2 = _.cloneDeep(BUDGET_DATA);
    //       budget2.fiscalStartDate = moment().format(ISOFORMAT);
    //       budget2.fiscalEndDate = moment().add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
    //       budget2.amount = 100;
    //       budget2.pendingAmount = 90;
    //       budget2.reimbursedAmount = 10;

    //       expectedBudget1 = new Budget(BUDGET_DATA);
    //       expectedBudget1.fiscalStartDate = moment().subtract(1, 'y').format(ISOFORMAT);
    //       expectedBudget1.fiscalEndDate = moment().subtract(1, 'd').format(ISOFORMAT);
    //       expectedBudget1.amount = 100;
    //       expectedBudget1.pendingAmount = 20;
    //       expectedBudget1.reimbursedAmount = 80;

    //       expectedBudget2 = new Budget(BUDGET_DATA);
    //       expectedBudget2.fiscalStartDate = moment().format(ISOFORMAT);
    //       expectedBudget2.fiscalEndDate = moment().add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
    //       expectedBudget2.amount = 100;
    //       expectedBudget2.pendingAmount = 120;
    //       expectedBudget2.reimbursedAmount = 10;

    //       expensesData = [expense1, expense2, expense3, expense4];
    //       budgetsData = [budget1, budget2];
    //       expectedBudgets = [expectedBudget1, expectedBudget2];

    //       oldExpense = new Expense(expense1);
    //       newExpense = new Expense(expense1);
    //       newExpense.cost = 50;
    //       employee.hireDate = moment().subtract(1, 'y').format(ISOFORMAT);

    //       databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
    //       budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
    //       budgetDynamo.updateEntryInDB.and.returnValues(
    //         Promise.resolve(expectedBudget1),
    //         Promise.resolve(expectedBudget2)
    //       );
    //     });

    //     it('should update and return the expected budgets', (done) => {
    //       expenseRoutes._updateBudgets(oldExpense, newExpense, employee, expenseType).then((data) => {
    //         expect(data).toEqual(expectedBudgets);
    //         done();
    //       });
    //     }); // should update and return the expected budgets
    //   }); // and expense is decreased and carried over the first 3 budgets

    //   describe('and creates a new budget for carry over', () => {
    //     let expense1;
    //     let budget1, budget2;
    //     let expectedBudget1, expectedBudget2, expectedBudgets;

    //     beforeEach(() => {
    //       expense1 = _.cloneDeep(EXPENSE_DATA);
    //       expense1.purchaseDate = '2000-08-18';
    //       expense1.cost = 90;
    //       delete expense1.reimbursedDate;

    //       budget1 = _.cloneDeep(BUDGET_DATA);
    //       budget1.fiscalStartDate = '2000-08-18';
    //       budget1.fiscalEndDate = '2001-08-17';
    //       budget1.amount = 100;
    //       budget1.pendingAmount = 90;
    //       budget1.reimbursedAmount = 0;

    //       budget2 = _.cloneDeep(BUDGET_DATA);
    //       budget2.fiscalStartDate = '2001-08-18';
    //       budget2.fiscalEndDate = '2002-08-17';
    //       budget2.amount = 100;
    //       budget2.pendingAmount = 0;
    //       budget2.reimbursedAmount = 0;

    //       expectedBudget1 = new Budget(BUDGET_DATA);
    //       expectedBudget1.fiscalStartDate = '2000-08-18';
    //       expectedBudget1.fiscalEndDate = '2001-08-17';
    //       expectedBudget1.amount = 100;
    //       expectedBudget1.pendingAmount = 100;
    //       expectedBudget1.reimbursedAmount = 0;

    //       expectedBudget2 = new Budget(BUDGET_DATA);
    //       expectedBudget2.fiscalStartDate = '2001-08-18';
    //       expectedBudget2.fiscalEndDate = '2002-08-17';
    //       expectedBudget2.amount = 100;
    //       expectedBudget2.pendingAmount = 10;
    //       expectedBudget2.reimbursedAmount = 0;

    //       expensesData = [expense1];
    //       budgetsData = [budget1];
    //       expectedBudgets = [expectedBudget1, expectedBudget2];

    //       oldExpense = new Expense(expense1);
    //       newExpense = new Expense(expense1);
    //       newExpense.cost = 110;

    //       databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
    //       budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
    //       spyOn(expenseRoutes, 'createNewBudget').and.returnValue(budget2);
    //       budgetDynamo.updateEntryInDB.and.returnValues(
    //         Promise.resolve(expectedBudget1),
    //         Promise.resolve(expectedBudget2)
    //       );
    //     });

    //     it('should update and return the expected budgets', (done) => {
    //       expenseRoutes._updateBudgets(oldExpense, newExpense, employee, expenseType).then((data) => {
    //         expect(data).toEqual(expectedBudgets);
    //         done();
    //       });
    //     }); // should update and return the expected budgets
    //   }); // and creates a new budget for carry over
    // }); // when successfully changing cost of a pending expense

    // describe('when successfully reimbursing an expense', () => {
    //   describe('and expense is between a carry over', () => {
    //     let expense1, expense2, expense3, expense4, expense5, expense6;
    //     let budget1, budget2, budget3, budget4;
    //     let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudget4, expectedBudgets;

    //     beforeEach(() => {
    //       expense1 = _.cloneDeep(EXPENSE_DATA);
    //       expense1.purchaseDate = '2000-08-18';
    //       expense1.cost = 10;
    //       delete expense1.reimbursedDate;

    //       expense2 = _.cloneDeep(EXPENSE_DATA);
    //       expense2.purchaseDate = '2000-08-18';
    //       expense2.cost = 90;
    //       delete expense2.reimbursedDate;

    //       expense3 = _.cloneDeep(EXPENSE_DATA);
    //       expense3.purchaseDate = '2000-08-18';
    //       expense3.cost = 50;
    //       expense3.reimbursedDate = '2000-08-18';

    //       expense4 = _.cloneDeep(EXPENSE_DATA);
    //       expense4.purchaseDate = '2001-08-18';
    //       expense4.cost = 20;
    //       expense4.reimbursedDate = '2001-08-18';

    //       expense5 = _.cloneDeep(EXPENSE_DATA);
    //       expense5.purchaseDate = '2001-08-18';
    //       expense5.cost = 60;
    //       expense5.reimbursedDate = '2001-08-18';

    //       expense6 = _.cloneDeep(EXPENSE_DATA);
    //       expense6.purchaseDate = '2003-08-18';
    //       expense6.cost = 80;
    //       delete expense6.reimbursedDate;

    //       budget1 = _.cloneDeep(BUDGET_DATA);
    //       budget1.fiscalStartDate = '2000-08-18';
    //       budget1.fiscalEndDate = '2001-08-17';
    //       budget1.amount = 100;
    //       budget1.pendingAmount = 50;
    //       budget1.reimbursedAmount = 50;

    //       budget2 = _.cloneDeep(BUDGET_DATA);
    //       budget2.fiscalStartDate = '2001-08-18';
    //       budget2.fiscalEndDate = '2002-08-17';
    //       budget2.amount = 100;
    //       budget2.pendingAmount = 20;
    //       budget2.reimbursedAmount = 80;

    //       budget3 = _.cloneDeep(BUDGET_DATA);
    //       budget3.fiscalStartDate = '2002-08-18';
    //       budget3.fiscalEndDate = '2003-08-17';
    //       budget3.amount = 100;
    //       budget3.pendingAmount = 30;
    //       budget3.reimbursedAmount = 0;

    //       budget4 = _.cloneDeep(BUDGET_DATA);
    //       budget4.fiscalStartDate = '2003-08-18';
    //       budget4.fiscalEndDate = '2004-08-17';
    //       budget4.amount = 100;
    //       budget4.pendingAmount = 80;
    //       budget4.reimbursedAmount = 0;

    //       expectedBudget1 = new Budget(BUDGET_DATA);
    //       expectedBudget1.fiscalStartDate = '2000-08-18';
    //       expectedBudget1.fiscalEndDate = '2001-08-17';
    //       expectedBudget1.amount = 100;
    //       expectedBudget1.pendingAmount = 10;
    //       expectedBudget1.reimbursedAmount = 50;

    //       expectedBudget2 = new Budget(BUDGET_DATA);
    //       expectedBudget2.fiscalStartDate = '2001-08-18';
    //       expectedBudget2.fiscalEndDate = '2002-08-17';
    //       expectedBudget2.amount = 100;
    //       expectedBudget2.pendingAmount = 0;
    //       expectedBudget2.reimbursedAmount = 80;

    //       expectedBudget3 = new Budget(BUDGET_DATA);
    //       expectedBudget3.fiscalStartDate = '2002-08-18';
    //       expectedBudget3.fiscalEndDate = '2003-08-17';
    //       expectedBudget3.amount = 100;
    //       expectedBudget3.pendingAmount = 0;
    //       expectedBudget3.reimbursedAmount = 0;

    //       expectedBudget4 = new Budget(BUDGET_DATA);
    //       expectedBudget4.fiscalStartDate = '2003-08-18';
    //       expectedBudget4.fiscalEndDate = '2004-08-17';
    //       expectedBudget4.amount = 100;
    //       expectedBudget4.pendingAmount = 80;
    //       expectedBudget4.reimbursedAmount = 0;

    //       expensesData = [expense1, expense2, expense3, expense4, expense5, expense6];
    //       budgetsData = [budget1, budget2, budget3, budget4];
    //       expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget4];

    //       oldExpense = new Expense(expense2);

    //       databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
    //       budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
    //       budgetDynamo.removeFromDB.and.returnValues(Promise.resolve(expectedBudget3));
    //       budgetDynamo.updateEntryInDB.and.returnValues(
    //         Promise.resolve(expectedBudget1),
    //         Promise.resolve(expectedBudget2),
    //         Promise.resolve(expectedBudget4)
    //       );
    //     });

    //     it('should update and return the expected budgets', (done) => {
    //       expenseRoutes._updateBudgets(oldExpense, undefined, employee, expenseType).then((data) => {
    //         expect(data).toEqual(expectedBudgets);
    //         done();
    //       });
    //     }); // should update and return the expected budgets
    //   }); // and expense is carried over 3 budgets

    //   describe('and expense is carried over the last 2 budgets', () => {
    //     let expense1, expense2, expense3, expense4, expense5, expense6;
    //     let budget1, budget2, budget3;
    //     let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudgets;

    //     beforeEach(() => {
    //       expense1 = _.cloneDeep(EXPENSE_DATA);
    //       expense1.purchaseDate = '2000-08-18';
    //       expense1.cost = 140;
    //       delete expense1.reimbursedDate;

    //       expense2 = _.cloneDeep(EXPENSE_DATA);
    //       expense2.purchaseDate = '2000-08-18';
    //       expense2.cost = 20;
    //       expense2.reimbursedDate = '2000-08-18';

    //       expense3 = _.cloneDeep(EXPENSE_DATA);
    //       expense3.purchaseDate = '2001-08-18';
    //       expense3.cost = 20;
    //       delete expense3.reimbursedDate;

    //       expense4 = _.cloneDeep(EXPENSE_DATA);
    //       expense4.purchaseDate = '2001-08-18';
    //       expense4.cost = 70;
    //       expense4.reimbursedDate = '2001-08-18';

    //       expense5 = _.cloneDeep(EXPENSE_DATA);
    //       expense5.purchaseDate = '2002-08-18';
    //       expense5.cost = 10;
    //       delete expense5.reimbursedDate;

    //       expense6 = _.cloneDeep(EXPENSE_DATA);
    //       expense6.purchaseDate = '2002-08-18';
    //       expense6.cost = 20;
    //       expense6.reimbursedDate = '2002-08-18';

    //       budget1 = _.cloneDeep(BUDGET_DATA);
    //       budget1.fiscalStartDate = '2000-08-18';
    //       budget1.fiscalEndDate = '2001-08-17';
    //       budget1.amount = 100;
    //       budget1.pendingAmount = 80;
    //       budget1.reimbursedAmount = 20;

    //       budget2 = _.cloneDeep(BUDGET_DATA);
    //       budget2.fiscalStartDate = '2001-08-18';
    //       budget2.fiscalEndDate = '2002-08-17';
    //       budget2.amount = 100;
    //       budget2.pendingAmount = 30;
    //       budget2.reimbursedAmount = 70;

    //       budget3 = _.cloneDeep(BUDGET_DATA);
    //       budget3.fiscalStartDate = '2002-08-18';
    //       budget3.fiscalEndDate = '2003-08-17';
    //       budget3.amount = 100;
    //       budget3.pendingAmount = 60;
    //       budget3.reimbursedAmount = 20;

    //       expectedBudget1 = new Budget(BUDGET_DATA);
    //       expectedBudget1.fiscalStartDate = '2000-08-18';
    //       expectedBudget1.fiscalEndDate = '2001-08-17';
    //       expectedBudget1.amount = 100;
    //       expectedBudget1.pendingAmount = 80;
    //       expectedBudget1.reimbursedAmount = 20;

    //       expectedBudget2 = new Budget(BUDGET_DATA);
    //       expectedBudget2.fiscalStartDate = '2001-08-18';
    //       expectedBudget2.fiscalEndDate = '2002-08-17';
    //       expectedBudget2.amount = 100;
    //       expectedBudget2.pendingAmount = 10;
    //       expectedBudget2.reimbursedAmount = 90;

    //       expectedBudget3 = new Budget(BUDGET_DATA);
    //       expectedBudget3.fiscalStartDate = '2002-08-18';
    //       expectedBudget3.fiscalEndDate = '2003-08-17';
    //       expectedBudget3.amount = 100;
    //       expectedBudget3.pendingAmount = 60;
    //       expectedBudget3.reimbursedAmount = 20;

    //       expensesData = [expense1, expense2, expense3, expense4, expense5, expense6];
    //       budgetsData = [budget1, budget2, budget3];
    //       expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3];

    //       oldExpense = new Expense(expense3);
    //       newExpense = new Expense(expense3);
    //       newExpense.reimbursedDate = '2001-08-18';

    //       databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
    //       budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
    //       budgetDynamo.updateEntryInDB.and.returnValues(
    //         Promise.resolve(expectedBudget1),
    //         Promise.resolve(expectedBudget2),
    //         Promise.resolve(expectedBudget3)
    //       );
    //     });

    //     it('should update and return the expected budgets', (done) => {
    //       expenseRoutes._updateBudgets(oldExpense, newExpense, employee, expenseType).then((data) => {
    //         expect(data).toEqual(expectedBudgets);
    //         done();
    //       });
    //     }); // should update and return the expected budgets
    //   }); // and expense is between a carry over

    //   describe('and expense is carried over 3 budgets', () => {
    //     let expense1, expense2, expense3, expense4, expense5, expense6;
    //     let budget1, budget2, budget3;
    //     let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudgets;

    //     beforeEach(() => {
    //       expense1 = _.cloneDeep(EXPENSE_DATA);
    //       expense1.purchaseDate = '2000-08-18';
    //       expense1.cost = 140;
    //       delete expense1.reimbursedDate;

    //       expense2 = _.cloneDeep(EXPENSE_DATA);
    //       expense2.purchaseDate = '2000-08-18';
    //       expense2.cost = 20;
    //       expense2.reimbursedDate = '2000-08-18';

    //       expense3 = _.cloneDeep(EXPENSE_DATA);
    //       expense3.purchaseDate = '2001-08-18';
    //       expense3.cost = 20;
    //       delete expense3.reimbursedDate;

    //       expense4 = _.cloneDeep(EXPENSE_DATA);
    //       expense4.purchaseDate = '2001-08-18';
    //       expense4.cost = 70;
    //       expense4.reimbursedDate = '2001-08-18';

    //       expense5 = _.cloneDeep(EXPENSE_DATA);
    //       expense5.purchaseDate = '2002-08-18';
    //       expense5.cost = 10;
    //       delete expense5.reimbursedDate;

    //       expense6 = _.cloneDeep(EXPENSE_DATA);
    //       expense6.purchaseDate = '2002-08-18';
    //       expense6.cost = 20;
    //       expense6.reimbursedDate = '2002-08-18';

    //       budget1 = _.cloneDeep(BUDGET_DATA);
    //       budget1.fiscalStartDate = '2000-08-18';
    //       budget1.fiscalEndDate = '2001-08-17';
    //       budget1.amount = 100;
    //       budget1.pendingAmount = 80;
    //       budget1.reimbursedAmount = 20;

    //       budget2 = _.cloneDeep(BUDGET_DATA);
    //       budget2.fiscalStartDate = '2001-08-18';
    //       budget2.fiscalEndDate = '2002-08-17';
    //       budget2.amount = 100;
    //       budget2.pendingAmount = 30;
    //       budget2.reimbursedAmount = 70;

    //       budget3 = _.cloneDeep(BUDGET_DATA);
    //       budget3.fiscalStartDate = '2002-08-18';
    //       budget3.fiscalEndDate = '2003-08-17';
    //       budget3.amount = 100;
    //       budget3.pendingAmount = 60;
    //       budget3.reimbursedAmount = 20;

    //       expectedBudget1 = new Budget(BUDGET_DATA);
    //       expectedBudget1.fiscalStartDate = '2000-08-18';
    //       expectedBudget1.fiscalEndDate = '2001-08-17';
    //       expectedBudget1.amount = 100;
    //       expectedBudget1.pendingAmount = 0;
    //       expectedBudget1.reimbursedAmount = 100;

    //       expectedBudget2 = new Budget(BUDGET_DATA);
    //       expectedBudget2.fiscalStartDate = '2001-08-18';
    //       expectedBudget2.fiscalEndDate = '2002-08-17';
    //       expectedBudget2.amount = 100;
    //       expectedBudget2.pendingAmount = 0;
    //       expectedBudget2.reimbursedAmount = 100;

    //       expectedBudget3 = new Budget(BUDGET_DATA);
    //       expectedBudget3.fiscalStartDate = '2002-08-18';
    //       expectedBudget3.fiscalEndDate = '2003-08-17';
    //       expectedBudget3.amount = 100;
    //       expectedBudget3.pendingAmount = 30;
    //       expectedBudget3.reimbursedAmount = 50;

    //       expensesData = [expense1, expense2, expense3, expense4, expense5, expense6];
    //       budgetsData = [budget1, budget2, budget3];
    //       expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3];

    //       oldExpense = new Expense(expense1);
    //       newExpense = new Expense(expense1);
    //       newExpense.reimbursedDate = '2000-08-18';

    //       databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
    //       budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
    //       budgetDynamo.updateEntryInDB.and.returnValues(
    //         Promise.resolve(expectedBudget1),
    //         Promise.resolve(expectedBudget2),
    //         Promise.resolve(expectedBudget3)
    //       );
    //     });

    //     it('should update and return the expected budgets', (done) => {
    //       expenseRoutes._updateBudgets(oldExpense, newExpense, employee, expenseType).then((data) => {
    //         expect(data).toEqual(expectedBudgets);
    //         done();
    //       });
    //     }); // should update and return the expected budget\
    //   }); // and expense is carried over 3 budgets
    // }); // when successfully reimbursing an expense

    describe('when successfully unreimbursing an expense', () => {
      describe('and expense is between a carry over', () => {
        let expense1, expense2, expense3, expense4, expense5, expense6;
        let budget1, budget2, budget3;
        let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudgets;

        beforeEach(() => {
          expense1 = _.cloneDeep(EXPENSE_DATA);
          expense1.purchaseDate = '2000-08-18';
          expense1.cost = 100;
          delete expense1.reimbursedDate;

          expense2 = _.cloneDeep(EXPENSE_DATA);
          expense2.purchaseDate = '2000-08-18';
          expense2.cost = 20;
          expense2.reimbursedDate = '2000-08-18';

          expense3 = _.cloneDeep(EXPENSE_DATA);
          expense3.purchaseDate = '2001-08-18';
          expense3.cost = 10;
          delete expense3.reimbursedDate;

          expense4 = _.cloneDeep(EXPENSE_DATA);
          expense4.purchaseDate = '2001-08-18';
          expense4.cost = 70;
          expense4.reimbursedDate = '2001-08-18';

          expense5 = _.cloneDeep(EXPENSE_DATA);
          expense5.purchaseDate = '2002-08-18';
          expense5.cost = 60;
          delete expense5.reimbursedDate;

          expense6 = _.cloneDeep(EXPENSE_DATA);
          expense6.purchaseDate = '2002-08-18';
          expense6.cost = 20;
          expense6.reimbursedDate = '2002-08-18';

          budget1 = _.cloneDeep(BUDGET_DATA);
          budget1.fiscalStartDate = '2000-08-18';
          budget1.fiscalEndDate = '2001-08-17';
          budget1.amount = 100;
          budget1.pendingAmount = 80;
          budget1.reimbursedAmount = 20;

          budget2 = _.cloneDeep(BUDGET_DATA);
          budget2.fiscalStartDate = '2001-08-18';
          budget2.fiscalEndDate = '2002-08-17';
          budget2.amount = 100;
          budget2.pendingAmount = 30;
          budget2.reimbursedAmount = 70;

          budget3 = _.cloneDeep(BUDGET_DATA);
          budget3.fiscalStartDate = '2002-08-18';
          budget3.fiscalEndDate = '2003-08-17';
          budget3.amount = 100;
          budget3.pendingAmount = 60;
          budget3.reimbursedAmount = 20;

          expectedBudget1 = new Budget(BUDGET_DATA);
          expectedBudget1.fiscalStartDate = '2000-08-18';
          expectedBudget1.fiscalEndDate = '2001-08-17';
          expectedBudget1.amount = 100;
          expectedBudget1.pendingAmount = 80;
          expectedBudget1.reimbursedAmount = 20;

          expectedBudget2 = new Budget(BUDGET_DATA);
          expectedBudget2.fiscalStartDate = '2001-08-18';
          expectedBudget2.fiscalEndDate = '2002-08-17';
          expectedBudget2.amount = 100;
          expectedBudget2.pendingAmount = 100;
          expectedBudget2.reimbursedAmount = 0;

          expectedBudget3 = new Budget(BUDGET_DATA);
          expectedBudget3.fiscalStartDate = '2002-08-18';
          expectedBudget3.fiscalEndDate = '2003-08-17';
          expectedBudget3.amount = 100;
          expectedBudget3.pendingAmount = 60;
          expectedBudget3.reimbursedAmount = 20;

          expensesData = [expense1, expense2, expense3, expense4, expense5, expense6];
          budgetsData = [budget1, budget2, budget3];
          expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3];

          oldExpense = new Expense(expense4);
          newExpense = new Expense(expense4);
          delete newExpense.reimbursedDate;

          databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
          budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
          budgetDynamo.updateEntryInDB.and.returnValues(
            Promise.resolve(expectedBudget1),
            Promise.resolve(expectedBudget2),
            Promise.resolve(expectedBudget3)
          );
        });

        it('should update and return the expected budgets', (done) => {
          expenseRoutes._updateBudgets(oldExpense, newExpense, employee, expenseType).then((data) => {
            expect(data).toEqual(expectedBudgets);
            done();
          });
        }); // should update and return the expected budgets
      }); // and expense is between a carry over

      describe('and expense is carried over 3 budgets', () => {
        let expense1, expense2, expense3, expense4, expense5, expense6;
        let budget1, budget2, budget3;
        let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudgets;

        beforeEach(() => {
          expense1 = _.cloneDeep(EXPENSE_DATA);
          expense1.purchaseDate = '2000-08-18';
          expense1.cost = 20;
          delete expense1.reimbursedDate;

          expense2 = _.cloneDeep(EXPENSE_DATA);
          expense2.purchaseDate = '2000-08-18';
          expense2.cost = 60;
          expense2.reimbursedDate = '2000-08-18';

          expense3 = _.cloneDeep(EXPENSE_DATA);
          expense3.purchaseDate = '2000-08-18';
          expense3.cost = 80;
          expense3.reimbursedDate = '2000-08-18';

          expense4 = _.cloneDeep(EXPENSE_DATA);
          expense4.purchaseDate = '2001-08-18';
          expense4.cost = 10;
          delete expense4.reimbursedDate;

          expense5 = _.cloneDeep(EXPENSE_DATA);
          expense5.purchaseDate = '2001-08-18';
          expense5.cost = 80;
          expense5.reimbursedDate = '2001-08-18';

          expense6 = _.cloneDeep(EXPENSE_DATA);
          expense6.purchaseDate = '2002-08-18';
          expense6.cost = 10;
          expense6.reimbursedDate = '2002-08-18';

          budget1 = _.cloneDeep(BUDGET_DATA);
          budget1.fiscalStartDate = '2000-08-18';
          budget1.fiscalEndDate = '2001-08-17';
          budget1.amount = 100;
          budget1.pendingAmount = 0;
          budget1.reimbursedAmount = 100;

          budget2 = _.cloneDeep(BUDGET_DATA);
          budget2.fiscalStartDate = '2001-08-18';
          budget2.fiscalEndDate = '2002-08-17';
          budget2.amount = 100;
          budget2.pendingAmount = 0;
          budget2.reimbursedAmount = 100;

          budget3 = _.cloneDeep(BUDGET_DATA);
          budget3.fiscalStartDate = '2002-08-18';
          budget3.fiscalEndDate = '2003-08-17';
          budget3.amount = 100;
          budget3.pendingAmount = 30;
          budget3.reimbursedAmount = 30;

          expectedBudget1 = new Budget(BUDGET_DATA);
          expectedBudget1.fiscalStartDate = '2000-08-18';
          expectedBudget1.fiscalEndDate = '2001-08-17';
          expectedBudget1.amount = 100;
          expectedBudget1.pendingAmount = 40;
          expectedBudget1.reimbursedAmount = 60;

          expectedBudget2 = new Budget(BUDGET_DATA);
          expectedBudget2.fiscalStartDate = '2001-08-18';
          expectedBudget2.fiscalEndDate = '2002-08-17';
          expectedBudget2.amount = 100;
          expectedBudget2.pendingAmount = 20;
          expectedBudget2.reimbursedAmount = 80;

          expectedBudget3 = new Budget(BUDGET_DATA);
          expectedBudget3.fiscalStartDate = '2002-08-18';
          expectedBudget3.fiscalEndDate = '2003-08-17';
          expectedBudget3.amount = 100;
          expectedBudget3.pendingAmount = 50;
          expectedBudget3.reimbursedAmount = 10;

          expensesData = [expense1, expense2, expense3, expense4, expense5, expense6];
          budgetsData = [budget1, budget2, budget3];
          expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3];

          oldExpense = new Expense(expense3);
          newExpense = new Expense(expense3);
          delete newExpense.reimbursedDate;

          databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
          budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
          budgetDynamo.updateEntryInDB.and.returnValues(
            Promise.resolve(expectedBudget1),
            Promise.resolve(expectedBudget2),
            Promise.resolve(expectedBudget3)
          );
        });

        it('should update and return the expected budgets', (done) => {
          expenseRoutes._updateBudgets(oldExpense, newExpense, employee, expenseType).then((data) => {
            expect(data).toEqual(expectedBudgets);
            done();
          });
        }); // should update and return the expected budget\
      }); // and expense is carried over 3 budgets
    }); // when successfully unreimbursing an expense

    describe('when fails to get expenses', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };
        oldExpense = new Expense(EXPENSE_DATA);
        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._updateBudgets(oldExpense, undefined, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get expenses

    describe('when fails to get budgets', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };
        expensesData = [];
        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._updateBudgets(oldExpense, undefined, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get budgets

    describe('when expense is not in a budget', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };
        expensesData = [];
        budgetsData = [];
        oldExpense = new Expense(EXPENSE_DATA);
        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._updateBudgets(oldExpense, undefined, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when expense is not in a budget

    describe('when fails to create a new budget', () => {
      let err, expense1, budget1;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };

        expense1 = _.cloneDeep(EXPENSE_DATA);
        expense1.purchaseDate = '2000-08-18';
        expense1.cost = 20;
        delete expense1.reimbursedDate;

        budget1 = _.cloneDeep(BUDGET_DATA);
        budget1.fiscalStartDate = '2000-08-18';
        budget1.fiscalEndDate = '2001-08-17';
        budget1.amount = 100;
        budget1.pendingAmount = 20;
        budget1.reimbursedAmount = 0;

        expensesData = [expense1];
        budgetsData = [budget1];

        oldExpense = new Expense(expense1);
        newExpense = new Expense(expense1);
        newExpense.cost = 180;

        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
        spyOn(expenseRoutes, 'createNewBudget').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._updateBudgets(oldExpense, newExpense, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(expenseRoutes.createNewBudget).toHaveBeenCalledWith(employee, expenseType, '2001-08-18');
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to create a new budget

    describe('when fails to remove budget from database', () => {
      let err, expense1, budget1;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };

        expense1 = _.cloneDeep(EXPENSE_DATA);
        expense1.purchaseDate = '2000-08-18';
        expense1.cost = 20;
        expense1.reimbursedDate = '2000-08-18';

        budget1 = _.cloneDeep(BUDGET_DATA);
        budget1.fiscalStartDate = '2000-08-18';
        budget1.fiscalEndDate = '2001-08-17';
        budget1.amount = 100;
        budget1.pendingAmount = 0;
        budget1.reimbursedAmount = 20;

        expensesData = [expense1];
        budgetsData = [budget1];

        oldExpense = new Expense(expense1);

        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
        budgetDynamo.removeFromDB.and.returnValues(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._updateBudgets(oldExpense, undefined, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to remove budget from database

    describe('when fails to update budget in database', () => {
      let err, expense1, budget1, expectedBudget1;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Error updating budgets.'
        };

        expense1 = _.cloneDeep(EXPENSE_DATA);
        expense1.purchaseDate = '2000-08-18';
        expense1.cost = 20;
        expense1.reimbursedDate = '2000-08-18';

        budget1 = _.cloneDeep(BUDGET_DATA);
        budget1.fiscalStartDate = '2000-08-18';
        budget1.fiscalEndDate = '2001-08-17';
        budget1.amount = 100;
        budget1.pendingAmount = 0;
        budget1.reimbursedAmount = 20;

        expectedBudget1 = _.cloneDeep(BUDGET_DATA);
        expectedBudget1.fiscalStartDate = '2000-08-18';
        expectedBudget1.fiscalEndDate = '2001-08-17';
        expectedBudget1.amount = 100;
        expectedBudget1.pendingAmount = 0;
        expectedBudget1.reimbursedAmount = 10;

        expensesData = [expense1];
        budgetsData = [budget1];

        oldExpense = new Expense(expense1);
        newExpense = new Expense(expense1);
        newExpense.cost = 10;

        databaseModify.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(expensesData));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
        budgetDynamo.updateEntryInDB.and.returnValues(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        expenseRoutes
          ._updateBudgets(oldExpense, newExpense, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to update budget in database
  }); // _updateBudgets

  describe('_validateAdd', () => {
    let expense, employee, expenseType;

    beforeEach(() => {
      expense = new Expense(EXPENSE_DATA);
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      employee.hireDate = '2000-08-18';
    });

    describe('when recurring', () => {
      beforeEach(() => {
        expenseType.recurringFlag = true;
      });

      describe('and is in current budget', () => {
        beforeEach(() => {
          expense.purchaseDate = moment().format(ISOFORMAT);
        });

        it('should return the validated expense', () => {
          expenseRoutes._validateAdd(expense, employee, expenseType).then((data) => {
            expect(data).toEqual(expense);
          });
        }); // should return the validated expense
      }); // and is in current budget

      describe('and is not in current budget', () => {
        let err, dates;

        beforeEach(() => {
          dates = expenseRoutes.getBudgetDates(employee.hireDate);
          const ERRFORMAT = 'MM/DD/YYYY';
          err = {
            code: 403,
            message:
              'Purchase date must be in current annual budget range from ' +
              `${dates.startDate.format(ERRFORMAT)} to ${dates.endDate.format(ERRFORMAT)}.`
          };
          expense.purchaseDate = '2000-08-18';
        });

        it('should return a 403 rejected promise', () => {
          expenseRoutes
            ._validateAdd(expense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
            })
            .catch((error) => {
              expect(error).toEqual(err);
            });
        }); // should return a 403 rejected promise
      }); // and is not in current budget
    }); // when recurring

    describe('when not recurring', () => {
      beforeEach(() => {
        expenseType.recurringFlag = false;
      });

      it('should return the validated expense', () => {
        expenseRoutes._validateAdd(expense, employee, expenseType).then((data) => {
          expect(data).toEqual(expense);
        });
      }); // should return the validated expense
    }); // when not recurring
  }); // _validateAdd

  describe('_validateDelete', () => {
    let expense = new Expense(EXPENSE_DATA);

    describe('when the expense is not reimbursed', () => {
      beforeEach(() => {
        delete expense.reimbursedDate;
      });

      it('should return the validated expense', () => {
        expenseRoutes._validateDelete(expense).then((data) => {
          expect(data).toEqual(expense);
        });
      }); // should return the validated expense
    }); // when the expense is not reimbursed

    describe('when expense is reimbursed', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Cannot delete a reimbursed expense.'
        };
        expense.reimbursedDate = '2000-08-18';
      });

      it('should return a 403 rejected promise', () => {
        expenseRoutes
          ._validateDelete(expense)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch((error) => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when expense is reimbursed
  }); // _validateDelete

  describe('_validateExpense', () => {
    let expense, employee, expenseType;

    beforeEach(() => {
      expense = new Expense(EXPENSE_DATA);
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      delete expense.reimbursedDate;
      expenseType.isInactive = false;
      expenseType.recurringFlag = true;
      employee.workStatus = 100;
      expenseType.accessibleBy = ['FullTime', 'PartTime', 'Intern'];
      expenseType.requiredFlag = true;
      expense.receipt = RECEIPT;
    });

    describe('when successfully validates expense', () => {
      describe('and receipt required', () => {
        beforeEach(() => {
          expenseType.requiredFlag = true;
          expense.receipt = RECEIPT;
        });

        it('should return the validated expense', () => {
          expenseRoutes._validateExpense(expense, employee, expenseType).then((data) => {
            expect(data).toEqual(expense);
          });
        }); // should return the validated expense
      }); // and receipt required

      describe('and receipt not required', () => {
        beforeEach(() => {
          expenseType.requiredFlag = false;
        });

        it('should return the validated expense', () => {
          expenseRoutes._validateExpense(expense, employee, expenseType).then((data) => {
            expect(data).toEqual(expense);
          });
        }); // should return the validated expense
      }); // and receipt not required
    }); // when successfully validates expense

    describe('when reimbursed date is before purchase date', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Reimbursed date must be after purchase date.'
        };
        expense.reimbursedDate = '2000-08-17';
        expense.purchaseDate = '2000-08-18';
      });

      it('should return a 403 rejected promise', () => {
        expenseRoutes
          ._validateExpense(expense, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch((error) => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when reimbursed date is before purchase date

    describe('when expense type is inactive', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: `Expense type ${NAME} is not active.`
        };
        expenseType.isInactive = true;
      });

      it('should return a 403 rejected promise', () => {
        expenseRoutes
          ._validateExpense(expense, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch((error) => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when expense type is inactive

    describe('when expense type requires a receipt but the expense does not have a receipt', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: `Receipt is required for expense type ${NAME}.`
        };
        expenseType.requiredFlag = true;
        delete expense.receipt;
      });

      it('should return a 403 rejected promise', () => {
        expenseRoutes
          ._validateExpense(expense, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch((error) => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when expense type requires a receipt but the expense does not have a receipt

    describe('when expense purchase date is out of expense type range', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: `Purchase date is out of ${NAME} range 2000-08-19 to 2000-08-20.`
        };
        expense.purchaseDate = '2000-08-18';
        expenseType.recurringFlag = false;
        expenseType.startDate = '2000-08-19';
        expenseType.endDate = '2000-08-20';
      });

      it('should return a 403 rejected promise', () => {
        expenseRoutes
          ._validateExpense(expense, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch((error) => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when expense purchase date is out of expense type range

    describe('when employee is inactive', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: `Employee ${FIRST_NAME} ${LAST_NAME} is inactive.`
        };
        employee.workStatus = 0;
      });

      it('should return a 403 rejected promise', () => {
        expenseRoutes
          ._validateExpense(expense, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch((error) => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when employee is inactive

    describe('when employee does not have access to expense type', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: `Employee ${FIRST_NAME} ${LAST_NAME} does not have access to ${NAME}.`
        };
        expenseType.accessibleBy = [];
      });

      it('should return a 403 rejected promise', () => {
        expenseRoutes
          ._validateExpense(expense, employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch((error) => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when employee does not have access to expense type
  }); // _validateExpense

  describe('_validateUpdate', () => {
    let oldExpense, newExpense, employee, expenseType, budget;

    beforeEach(() => {
      oldExpense = new Expense(EXPENSE_DATA);
      newExpense = new Expense(EXPENSE_DATA);
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      budget = new Budget(BUDGET_DATA);
    });

    describe('when validating an expense with a different cost', () => {
      beforeEach(() => {
        oldExpense.cost = 1;
        newExpense.cost = 2;
      });

      describe('and old expense id is different than the new expense id', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Error validating expense IDs.'
          };
          newExpense.id = 'OTHER_ID';
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and old expense id is different than the new expense id

      describe('and old expense employee id does not equal employee id', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: `Error validating current expense for employee ${FIRST_NAME} ${LAST_NAME}.`
          };
          oldExpense.employeeId = 'OTHER_ID';
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and old expense employee id does not equal employee id

      describe('and new expense employee id does not equal employee id', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: `Error validating new expense for employee ${FIRST_NAME} ${LAST_NAME}.`
          };
          newExpense.employeeId = 'OTHER_ID';
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and new expense employee id does not equal employee id

      describe('and new expense expense type id does not equal expense type id', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: `Error validating new expense for expense type ${NAME}.`
          };
          newExpense.expenseTypeId = 'OTHER_ID';
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and new expense expense type id does not equal expense type id

      describe('and fails to find old budget', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to find old budget.'
          };
          spyOn(expenseRoutes, '_findBudget').and.returnValue(Promise.reject(err));
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and fails to find old budget

      describe('and both old and new expense are reimbursed', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Cannot change cost of reimbursed expenses.'
          };
          oldExpense.reimbursedDate = '2000-08-18';
          newExpense.reimbursedDate = '2000-08-18';
          spyOn(expenseRoutes, '_findBudget').and.returnValue(Promise.resolve(budget));
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and both old and new expense are reimbursed

      describe('and fails to find todays budget', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to find todays budget.'
          };
          delete oldExpense.reimbursedDate;
          delete newExpense.reimbursedDate;
          spyOn(expenseRoutes, '_findBudget').and.returnValues(Promise.resolve(budget), Promise.reject(err));
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and fails to find todays budget

      describe('and old budget is not in todays budget', () => {
        let err, otherBudget;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Cannot change cost of expenses outside of current annual budget from 2001-08-18 to 2002-08-17.'
          };
          delete oldExpense.reimbursedDate;
          delete newExpense.reimbursedDate;
          otherBudget = new Budget(BUDGET_DATA);
          otherBudget.id = 'OTHER_ID';
          otherBudget.fiscalStartDate = '2001-08-18';
          otherBudget.fiscalEndDate = '2002-08-17';
          spyOn(expenseRoutes, '_findBudget').and.returnValues(Promise.resolve(budget), 
            Promise.resolve(otherBudget));
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and old budget is not in todays budget

      describe('and invalid cost change', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Expense is over the budget limit.'
          };
          delete oldExpense.reimbursedDate;
          delete newExpense.reimbursedDate;
          spyOn(expenseRoutes, '_findBudget').and.returnValues(Promise.resolve(budget), Promise.resolve(budget));
          spyOn(expenseRoutes, '_isValidCostChange').and.returnValue(false);
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and invalid cost change

      describe('and old and new expense are not in the same budget', () => {
        let err, otherBudget;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Cannot change cost of expenses outside of current annual budget from 2001-08-18 to 2002-08-17.'
          };
          delete oldExpense.reimbursedDate;
          delete newExpense.reimbursedDate;
          otherBudget = new Budget(BUDGET_DATA);
          otherBudget.id = 'OTHER_ID';
          oldExpense.fiscalStartDate = '2001-08-18';
          oldExpense.fiscalEndDate = '2002-08-17';
          spyOn(expenseRoutes, '_findBudget').and.returnValues(
            Promise.resolve(budget),
            Promise.resolve(budget),
            Promise.reject(err)
          );
          spyOn(expenseRoutes, '_isValidCostChange').and.returnValue(true);
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and old and new expense are not in the same budget

      describe('and validation is successful', () => {
        beforeEach(() => {
          delete oldExpense.reimbursedDate;
          delete newExpense.reimbursedDate;
          spyOn(expenseRoutes, '_findBudget').and.returnValue(Promise.resolve(budget));
          spyOn(expenseRoutes, '_isValidCostChange').and.returnValue(true);
        });

        it('should return the validated expense', (done) => {
          expenseRoutes._validateUpdate(oldExpense, newExpense, employee, expenseType).then((data) => {
            expect(data).toEqual(newExpense);
            done();
          });
        }); // should return the validated expense
      }); // and validation is successful
    }); // when validating an expense with a different cost

    describe('when validating an expense with the same cost', () => {
      beforeEach(() => {
        oldExpense.cost = '1';
        newExpense.cost = '1';
      });

      describe('and old expense id is different than the new expense id', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Error validating expense IDs.'
          };
          newExpense.id = 'OTHER_ID';
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and old expense id is different than the new expense id

      describe('and old expense employee id does not equal employee id', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: `Error validating current expense for employee ${FIRST_NAME} ${LAST_NAME}.`
          };
          oldExpense.employeeId = 'OTHER_ID';
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and old expense employee id does not equal employee id

      describe('and new expense employee id does not equal employee id', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: `Error validating new expense for employee ${FIRST_NAME} ${LAST_NAME}.`
          };
          newExpense.employeeId = 'OTHER_ID';
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and new expense employee id does not equal employee id

      describe('and new expense expense type id does not equal expense type id', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: `Error validating new expense for expense type ${NAME}.`
          };
          newExpense.expenseTypeId = 'OTHER_ID';
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and new expense expense type id does not equal expense type id

      describe('and fails to find old budget', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to find old budget.'
          };
          spyOn(expenseRoutes, '_findBudget').and.returnValue(Promise.reject(err));
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and fails to find old budget

      describe('and old and new expense are not in the same budget', () => {
        let err, otherBudget;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Cannot change cost of expenses outside of current annual budget from 2001-08-18 to 2002-08-17.'
          };
          delete oldExpense.reimbursedDate;
          delete newExpense.reimbursedDate;
          otherBudget = new Budget(BUDGET_DATA);
          otherBudget.id = 'OTHER_ID';
          budget.fiscalStartDate = '2001-08-18';
          budget.fiscalEndDate = '2002-08-17';
          spyOn(expenseRoutes, '_findBudget').and.returnValues(Promise.resolve(budget), 
            Promise.resolve(otherBudget));
        });

        it('should return a 403 rejected promise', (done) => {
          expenseRoutes
            ._validateUpdate(oldExpense, newExpense, employee, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 403 rejected promise
      }); // and old and new expense are not in the same budget

      describe('and validation is successful', () => {
        beforeEach(() => {
          spyOn(expenseRoutes, '_findBudget').and.returnValue(Promise.resolve(budget));
        });

        it('should return the validated expense', (done) => {
          expenseRoutes._validateUpdate(oldExpense, newExpense, employee, expenseType).then((data) => {
            expect(data).toEqual(newExpense);
            done();
          });
        }); // should return the validated expense
      }); // and validation is successful
    }); // when validating an expense with the same cost
  }); // _validateUpdate
}); //expenseRoutes
