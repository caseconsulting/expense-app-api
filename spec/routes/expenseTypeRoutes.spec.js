const Budget = require('../../models/budget');
const Employee = require('../../models/employee');
const Expense = require('../../models/expense');
const ExpenseTypeRoutes = require('../../routes/expenseTypeRoutes');
const ExpenseType = require('../../models/expenseType');
const moment = require('moment');
const _ = require('lodash');

describe('expenseTypeRoutes', () => {

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
  const CATEGORY = '{category}';

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

  let expenseTypeRoutes, budgetDynamo, databaseModify, employeeDynamo, expenseDynamo;

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
    expenseDynamo = jasmine.createSpyObj('expenseDynamo', [
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

    expenseTypeRoutes = new ExpenseTypeRoutes();
    expenseTypeRoutes.budgetDynamo = budgetDynamo;
    expenseTypeRoutes.databaseModify = databaseModify;
    expenseTypeRoutes.employeeDynamo = employeeDynamo;
    expenseTypeRoutes.expenseDynamo = expenseDynamo;
  });

  describe('_create', () => {

    let data;

    beforeEach(() => {
      data = _.cloneDeep(EXPENSE_TYPE_DATA);
    });

    describe('when successfully creates an expense type', () => {

      let expenseType;

      beforeEach(() => {
        expenseType = new ExpenseType(EXPENSE_TYPE_DATA);

        spyOn(expenseTypeRoutes, '_validateExpenseType').and.returnValue(Promise.resolve(expenseType));
      });

      it('should return the expense type created', done => {
        expenseTypeRoutes._create(data)
          .then(expenseTypeCreated => {
            expect(expenseTypeCreated).toEqual(expenseType);
            expect(expenseTypeRoutes._validateExpenseType).toHaveBeenCalledWith(expenseType);
            done();
          });
      }); // should return the expense type created
    }); // when successfully creates an expense type

    describe('when fails to validate expense type', () => {

      let err, expenseType;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Failed to validate expense type.'
        };

        expenseType = new ExpenseType(EXPENSE_TYPE_DATA);

        spyOn(expenseTypeRoutes, '_validateExpenseType').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        expenseTypeRoutes._create(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(expenseTypeRoutes._validateExpenseType).toHaveBeenCalledWith(expenseType);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate expense type
  }); // _create

  describe('_delete', () => {

    describe('when successfully deletes an expense type', () => {

      let expenseType;

      beforeEach(() => {
        expenseType = new ExpenseType(EXPENSE_TYPE_DATA);

        databaseModify.getEntry.and.returnValue(Promise.resolve(EXPENSE_TYPE_DATA));
        spyOn(expenseTypeRoutes, '_validateDelete').and.returnValue(Promise.resolve(expenseType));
      });

      it('should return the expense type deleted', done => {
        expenseTypeRoutes._delete(ID)
          .then(data => {
            expect(data).toEqual(expenseType);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeRoutes._validateDelete).toHaveBeenCalledWith(expenseType);
            done();
          });
      }); // should return the expense type deleted
    }); // when successfully deletes an expense type

    describe('when fails to find expense type', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find expense type.'
        };

        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        expenseTypeRoutes._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find expense type

    describe('when fails to validate delete', () => {

      let err, expenseType;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Failed to validate delete.'
        };

        expenseType = new ExpenseType(EXPENSE_TYPE_DATA);

        databaseModify.getEntry.and.returnValue(Promise.resolve(EXPENSE_TYPE_DATA));
        spyOn(expenseTypeRoutes, '_validateDelete').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        expenseTypeRoutes._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeRoutes._validateDelete).toHaveBeenCalledWith(expenseType);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate expense type
  }); // _delete

  describe('_read', () => {

    describe('when successfully reads expense type', () => {

      let expenseType;

      beforeEach(() => {
        expenseType = new ExpenseType(EXPENSE_TYPE_DATA);

        databaseModify.getEntry.and.returnValue(Promise.resolve(EXPENSE_TYPE_DATA));
      });

      it('should return the expense type read', done => {
        expenseTypeRoutes._read(EXPENSE_TYPE_DATA)
          .then(data => {
            expect(data).toEqual(expenseType);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return the expense type read
    }); // when successfully reads expense type

    describe('when fails to read expense type', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find expense type.'
        };

        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        expenseTypeRoutes._read(EXPENSE_TYPE_DATA)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when successfully reads expense type
  }); // _read

  describe('_update', () => {

    let data, oldExpenseType, newExpenseType;

    beforeEach(() => {
      data = _.cloneDeep(EXPENSE_TYPE_DATA);
      oldExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      newExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);
    });

    describe('when successfully updates an expense type', () => {

      describe('and expense type name is the same', () => {

        beforeEach(() => {
          databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpenseType));
          spyOn(expenseTypeRoutes, '_validateExpenseType').and.returnValue(Promise.resolve(newExpenseType));
          spyOn(expenseTypeRoutes, '_validateUpdate').and.returnValue(Promise.resolve(newExpenseType));
          spyOn(expenseTypeRoutes, '_validateDates').and.returnValue(Promise.resolve(newExpenseType));
          spyOn(expenseTypeRoutes, '_updateBudgets').and.returnValue(Promise.resolve([]));
        });

        it('should return the expense type updated', done => {
          expenseTypeRoutes._update(data)
            .then(updatedExpenseType => {
              expect(updatedExpenseType).toEqual(newExpenseType);
              expect(expenseTypeRoutes._validateExpenseType).toHaveBeenCalledWith(newExpenseType);
              expect(expenseTypeRoutes._validateUpdate).toHaveBeenCalledWith(oldExpenseType, newExpenseType);
              expect(expenseTypeRoutes._validateDates).toHaveBeenCalledWith(newExpenseType);
              expect(expenseTypeRoutes._updateBudgets).toHaveBeenCalledWith(oldExpenseType, newExpenseType);
              done();
            });
        }); // should return the expense type updated
      }); // and expense type name is the same

      describe('and expense type name is changed', () => {

        beforeEach(() => {
          oldExpenseType.budgetName = 'OTHER_NAME';
          databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpenseType));
          spyOn(expenseTypeRoutes, '_validateExpenseType').and.returnValue(Promise.resolve(newExpenseType));
          spyOn(expenseTypeRoutes, '_validateUpdate').and.returnValue(Promise.resolve(newExpenseType));
          spyOn(expenseTypeRoutes, '_validateDates').and.returnValue(Promise.resolve(newExpenseType));
          spyOn(expenseTypeRoutes, '_updateBudgets').and.returnValue(Promise.resolve([]));
        });

        it('should return the expense type updated', done => {
          expenseTypeRoutes._update(data)
            .then(updatedExpenseType => {
              expect(updatedExpenseType).toEqual(newExpenseType);
              expect(expenseTypeRoutes._validateExpenseType).toHaveBeenCalledWith(newExpenseType);
              expect(expenseTypeRoutes._validateUpdate).toHaveBeenCalledWith(oldExpenseType, newExpenseType);
              expect(expenseTypeRoutes._validateDates).toHaveBeenCalledWith(newExpenseType);
              expect(expenseTypeRoutes._updateBudgets).toHaveBeenCalledWith(oldExpenseType, newExpenseType);
              done();
            });
        }); // should return the expense type updated
      }); // and expense type name is changed
    }); // when successfully updates an expense type

    describe('when fails to find old expense type', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find old expense type'
        };

        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        expenseTypeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find old expense type

    describe('when fails to validate expense type', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to validate expense type'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpenseType));
        spyOn(expenseTypeRoutes, '_validateExpenseType').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        expenseTypeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeRoutes._validateExpenseType).toHaveBeenCalledWith(newExpenseType);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to validate expense type

    describe('when fails to validate update', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to validate update'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpenseType));
        spyOn(expenseTypeRoutes, '_validateExpenseType').and.returnValue(Promise.resolve(newExpenseType));
        spyOn(expenseTypeRoutes, '_validateUpdate').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        expenseTypeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeRoutes._validateExpenseType).toHaveBeenCalledWith(newExpenseType);
            expect(expenseTypeRoutes._validateUpdate).toHaveBeenCalledWith(oldExpenseType, newExpenseType);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to validate update

    describe('when fails to validate dates', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to validate dates'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpenseType));
        spyOn(expenseTypeRoutes, '_validateExpenseType').and.returnValue(Promise.resolve(newExpenseType));
        spyOn(expenseTypeRoutes, '_validateUpdate').and.returnValue(Promise.resolve(newExpenseType));
        spyOn(expenseTypeRoutes, '_validateDates').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        expenseTypeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeRoutes._validateExpenseType).toHaveBeenCalledWith(newExpenseType);
            expect(expenseTypeRoutes._validateUpdate).toHaveBeenCalledWith(oldExpenseType, newExpenseType);
            expect(expenseTypeRoutes._validateDates).toHaveBeenCalledWith(newExpenseType);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to validate dates

    describe('when fails to update budgets', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to update budgets'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(oldExpenseType));
        spyOn(expenseTypeRoutes, '_validateExpenseType').and.returnValue(Promise.resolve(newExpenseType));
        spyOn(expenseTypeRoutes, '_validateUpdate').and.returnValue(Promise.resolve(newExpenseType));
        spyOn(expenseTypeRoutes, '_validateDates').and.returnValue(Promise.resolve(newExpenseType));
        spyOn(expenseTypeRoutes, '_updateBudgets').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        expenseTypeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseTypeRoutes._validateExpenseType).toHaveBeenCalledWith(newExpenseType);
            expect(expenseTypeRoutes._validateUpdate).toHaveBeenCalledWith(oldExpenseType, newExpenseType);
            expect(expenseTypeRoutes._validateDates).toHaveBeenCalledWith(newExpenseType);
            expect(expenseTypeRoutes._updateBudgets).toHaveBeenCalledWith(oldExpenseType, newExpenseType);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to update budgets
  }); // _update

  describe('_updateBudgets', () => {

    let oldExpenseType, newExpenseType, today;

    beforeEach(() => {
      today = moment();

      oldExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      newExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);

      oldExpenseType.recurringFlag = true;
      oldExpenseType.startDate = _.cloneDeep(today).format(ISOFORMAT);
      oldExpenseType.endDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
      oldExpenseType.budget = 100;
      oldExpenseType.accessibleBy = 'ALL';

      newExpenseType.recurringFlag = true;
      newExpenseType.startDate = _.cloneDeep(today).format(ISOFORMAT);
      newExpenseType.endDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
      newExpenseType.budget = 100;
      newExpenseType.accessibleBy = 'ALL';
    });

    describe('when start date, end date, budgets, and accessible by are the same', () => {

      it('should return an empty array', done => {
        expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
          .then(data => {
            expect(data).toEqual([]);
            done();
          });
      }); // should return an empty array
    }); // when start date, end date, budgets, and accessible by are the same

    describe('when start date is different', () => {

      let budget1, budget2, budgets, expectedBudget1, expectedBudget2, expectedBudgets;

      beforeEach(() => {
        newExpenseType.startDate = _.cloneDeep(today).subtract(1, 'd').format(ISOFORMAT);

        budget1 = new Budget(BUDGET_DATA);
        budget2 = new Budget(BUDGET_DATA);

        expectedBudget1 = new Budget(BUDGET_DATA);
        expectedBudget2 = new Budget(BUDGET_DATA);

        expectedBudget1.fiscalStartDate = _.cloneDeep(today).subtract(1, 'd').format(ISOFORMAT);
        expectedBudget2.fiscalStartDate = _.cloneDeep(today).subtract(1, 'd').format(ISOFORMAT);

        budgets = [budget1, budget2];
        expectedBudgets = [expectedBudget1, expectedBudget2];
      });

      describe('and successfully updates budgets', () => {

        beforeEach(() => {
          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          budgetDynamo.updateEntryInDB.and.returnValues(
            Promise.resolve(expectedBudget1),
            Promise.resolve(expectedBudget2)
          );
        });

        it('should return the array of updated budgets', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(data => {
              expect(data).toEqual(expectedBudgets);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalled();
              done();
            });
        }); // should return the array of updated budgets
      }); // and successfully updates budgets

      describe('and fails to get budgets', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get budgets.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to get budgets

      describe('and fails to update budget in database', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to update entry in database.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalled();
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to update budget in database
    }); // when start date is different

    describe('when end date is different', () => {

      let budget1, budget2, budgets, expectedBudget1, expectedBudget2, expectedBudgets;

      beforeEach(() => {
        newExpenseType.endDate = _.cloneDeep(today).add(1, 'y').format(ISOFORMAT);

        budget1 = new Budget(BUDGET_DATA);
        budget2 = new Budget(BUDGET_DATA);

        expectedBudget1 = new Budget(BUDGET_DATA);
        expectedBudget2 = new Budget(BUDGET_DATA);

        expectedBudget1.fiscalEndDate = _.cloneDeep(today).add(1, 'y').format(ISOFORMAT);
        expectedBudget2.fiscalEndDate = _.cloneDeep(today).add(1, 'y').format(ISOFORMAT);

        budgets = [budget1, budget2];
        expectedBudgets = [expectedBudget1, expectedBudget2];
      });

      describe('and successfully updates budgets', () => {

        beforeEach(() => {
          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          budgetDynamo.updateEntryInDB.and.returnValues(
            Promise.resolve(expectedBudget1),
            Promise.resolve(expectedBudget2)
          );
        });

        it('should return the array of updated budgets', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(data => {
              expect(data).toEqual(expectedBudgets);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalled();
              done();
            });
        }); // should return the array of updated budgets
      }); // and successfully updates budgets

      describe('and fails to get budgets', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get budgets.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to get budgets

      describe('and fails to update budget in database', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to update entry in database.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalled();
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to update budget in database
    }); // when end date is different

    describe('when budget is different', () => {

      let budget1, budget2, budget3, budgets;
      let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudgets;
      let employee1, employee2, employees;

      beforeEach(() => {
        newExpenseType.budget = 10;

        employee1 = new Employee(EMPLOYEE_DATA);
        employee2 = new Employee(EMPLOYEE_DATA);

        budget1 = new Budget(BUDGET_DATA);
        budget2 = new Budget(BUDGET_DATA);
        budget3 = new Budget(BUDGET_DATA);

        expectedBudget1 = new Budget(BUDGET_DATA);
        expectedBudget2 = new Budget(BUDGET_DATA);
        expectedBudget3 = new Budget(BUDGET_DATA);

        employee1.id = 'employee1_id';
        employee1.workStatus = 50;

        employee2.id = 'employee2_id';
        employee2.workStatus = 100;

        budget1.employeeId = 'employee1_id';
        budget1.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
        budget1.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
        budget1.amount = 50;

        budget2.employeeId = 'employee1_id';
        budget2.fiscalStartDate = _.cloneDeep(today).subtract(5, 'y').format(ISOFORMAT);
        budget2.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(5, 'y').subtract(1, 'd').format(ISOFORMAT);
        budget2.amount = 50;

        budget3.employeeId = 'employee2_id';
        budget3.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
        budget3.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
        budget3.amount = 0;

        employees = [employee1, employee2];
        budgets = [budget1, budget2, budget3];
        expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3];
      });

      describe('and successfully updates budgets', () => {

        beforeEach(() => {
          budgetDynamo.querySecondaryIndexInDB.and.returnValue(budgets);
          employeeDynamo.getAllEntriesInDB.and.returnValue(employees);
          budgetDynamo.updateEntryInDB.and.returnValues(
            Promise.resolve(expectedBudget1),
            Promise.resolve(expectedBudget2),
            Promise.resolve(expectedBudget3)
          );
        });

        describe('and expense type is recurring', () => {

          beforeEach(() => {
            expectedBudget1.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
            expectedBudget1.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget1.employeeId = 'employee1_id';
            expectedBudget1.amount = 5;

            expectedBudget2.fiscalStartDate = _.cloneDeep(today).subtract(5, 'y').format(ISOFORMAT);
            expectedBudget2.fiscalEndDate =
              _.cloneDeep(today).add(1, 'y').subtract(5, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget2.employeeId = 'employee1_id';
            expectedBudget2.amount = 50;

            expectedBudget3.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
            expectedBudget3.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget3.employeeId = 'employee2_id';
            expectedBudget3.amount = 10;
          });

          it('should return the array of updated budgets', done => {
            expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
              .then(data => {
                expect(data).toEqual(expectedBudgets);
                expect(budgetDynamo.querySecondaryIndexInDB)
                  .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
                expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
                expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledTimes(3);
                done();
              });
          }); // should return the array of updated budgets
        }); // and expense type is recurring

        describe('and expense type is not recurring', () => {

          beforeEach(() => {
            oldExpenseType.recurringFlag = false;
            oldExpenseType.startDate = ' ';
            oldExpenseType.endDate = ' ';
            newExpenseType.recurringFlag = false;
            newExpenseType.startDate = ' ';
            newExpenseType.endDate = ' ';

            expectedBudget1.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
            expectedBudget1.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget1.employeeId = 'employee1_id';
            expectedBudget1.amount = 5;

            expectedBudget2.fiscalStartDate = _.cloneDeep(today).subtract(5, 'y').format(ISOFORMAT);
            expectedBudget2.fiscalEndDate =
              _.cloneDeep(today).add(1, 'y').subtract(5, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget2.employeeId = 'employee1_id';
            expectedBudget2.amount = 5;

            expectedBudget3.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
            expectedBudget3.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget3.employeeId = 'employee2_id';
            expectedBudget3.amount = 10;
          });

          it('should return the array of updated budgets', done => {
            expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
              .then(data => {
                expect(data).toEqual(expectedBudgets);
                expect(budgetDynamo.querySecondaryIndexInDB)
                  .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
                expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
                expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledTimes(3);
                done();
              });
          }); // should return the array of updated budgets
        }); // and expense type is not recurring
      }); // and successfully updates budgets

      describe('and fails to get budgets', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get budgets.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to get budgets

      describe('and fails to get employees', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employees.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to get employees

      describe('and fails to update budget in database', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to update entry in database.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(budgets);
          employeeDynamo.getAllEntriesInDB.and.returnValue(employees);
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalled();
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to update budget in database'
    }); // when budget is different

    describe('when accessible by is different', () => {

      let budget1, budget2, budget3, budgets;
      let expectedBudget1, expectedBudget2, expectedBudget3, expectedBudgets;
      let employee1, employee2, employees;

      beforeEach(() => {
        newExpenseType.accessibleBy = 'FULL TIME';

        employee1 = new Employee(EMPLOYEE_DATA);
        employee2 = new Employee(EMPLOYEE_DATA);

        budget1 = new Budget(BUDGET_DATA);
        budget2 = new Budget(BUDGET_DATA);
        budget3 = new Budget(BUDGET_DATA);

        expectedBudget1 = new Budget(BUDGET_DATA);
        expectedBudget2 = new Budget(BUDGET_DATA);
        expectedBudget3 = new Budget(BUDGET_DATA);

        employee1.id = 'employee1_id';
        employee1.workStatus = 50;

        employee2.id = 'employee2_id';
        employee2.workStatus = 100;

        budget1.employeeId = 'employee1_id';
        budget1.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
        budget1.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
        budget1.amount = 50;

        budget2.employeeId = 'employee1_id';
        budget2.fiscalStartDate = _.cloneDeep(today).subtract(5, 'y').format(ISOFORMAT);
        budget2.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(5, 'y').subtract(1, 'd').format(ISOFORMAT);
        budget2.amount = 50;

        budget3.employeeId = 'employee2_id';
        budget3.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
        budget3.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
        budget3.amount = 0;

        employees = [employee1, employee2];
        budgets = [budget1, budget2, budget3];
        expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3];
      });

      describe('and successfully updates budgets', () => {

        beforeEach(() => {
          budgetDynamo.querySecondaryIndexInDB.and.returnValue(budgets);
          employeeDynamo.getAllEntriesInDB.and.returnValue(employees);
          budgetDynamo.updateEntryInDB.and.returnValues(
            Promise.resolve(expectedBudget1),
            Promise.resolve(expectedBudget2),
            Promise.resolve(expectedBudget3)
          );
        });

        describe('and expense type is recurring', () => {

          beforeEach(() => {
            expectedBudget1.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
            expectedBudget1.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget1.employeeId = 'employee1_id';
            expectedBudget1.amount = 0;

            expectedBudget2.fiscalStartDate = _.cloneDeep(today).subtract(5, 'y').format(ISOFORMAT);
            expectedBudget2.fiscalEndDate =
              _.cloneDeep(today).add(1, 'y').subtract(5, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget2.employeeId = 'employee1_id';
            expectedBudget2.amount = 50;

            expectedBudget3.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
            expectedBudget3.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget3.employeeId = 'employee2_id';
            expectedBudget3.amount = 100;
          });

          it('should return the array of updated budgets', done => {
            expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
              .then(data => {
                expect(data).toEqual(expectedBudgets);
                expect(budgetDynamo.querySecondaryIndexInDB)
                  .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
                expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
                expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledTimes(3);
                done();
              });
          }); // should return the array of updated budgets
        }); // and expense type is recurring

        describe('and expense type is not recurring', () => {

          beforeEach(() => {
            oldExpenseType.recurringFlag = false;
            oldExpenseType.startDate = ' ';
            oldExpenseType.endDate = ' ';
            newExpenseType.recurringFlag = false;
            newExpenseType.startDate = ' ';
            newExpenseType.endDate = ' ';

            expectedBudget1.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
            expectedBudget1.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget1.employeeId = 'employee1_id';
            expectedBudget1.amount = 0;

            expectedBudget2.fiscalStartDate = _.cloneDeep(today).subtract(5, 'y').format(ISOFORMAT);
            expectedBudget2.fiscalEndDate =
              _.cloneDeep(today).add(1, 'y').subtract(5, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget2.employeeId = 'employee1_id';
            expectedBudget2.amount = 0;

            expectedBudget3.fiscalStartDate = _.cloneDeep(today).format(ISOFORMAT);
            expectedBudget3.fiscalEndDate = _.cloneDeep(today).add(1, 'y').subtract(1, 'd').format(ISOFORMAT);
            expectedBudget3.employeeId = 'employee2_id';
            expectedBudget3.amount = 100;
          });

          it('should return the array of updated budgets', done => {
            expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
              .then(data => {
                expect(data).toEqual(expectedBudgets);
                expect(budgetDynamo.querySecondaryIndexInDB)
                  .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
                expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
                expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledTimes(3);
                done();
              });
          }); // should return the array of updated budgets
        }); // and expense type is not recurring
      }); // and successfully updates budgets

      describe('and fails to get budgets', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get budgets.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to get budgets

      describe('and fails to get employees', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employees.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to get employees

      describe('and fails to update budget in database', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to update entry in database.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(budgets);
          employeeDynamo.getAllEntriesInDB.and.returnValue(employees);
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          expenseTypeRoutes._updateBudgets(oldExpenseType, newExpenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalled();
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to update budget in database'
    }); // when budget is different
  }); // _updateBudgets

  describe('_validateDates', () => {

    let expenseType, expense1, expense2, expense3, expenses;

    beforeEach(() => {
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      expense1 = new Expense(EXPENSE_DATA);
      expense2 = new Expense(EXPENSE_DATA);
      expense3 = new Expense(EXPENSE_DATA);

      expense1.purchaseDate = '2001-08-19';
      expense2.purchaseDate = '2002-08-18';
      expense3.purchaseDate = '2001-08-18';
      expenses = [expense1, expense2, expense3];
    });

    describe('when expense type is not recurring', () => {

      beforeEach(() => {
        expenseType.recurringFlag = true;
      });

      it('should return the validated expense type', done => {
        expenseTypeRoutes._validateDates(expenseType)
          .then(data => {
            expect(data).toEqual(expenseType);
            done();
          });
      }); // should return the validated expense type
    }); // when expense type is not recurring

    describe('when expense type is not recurring', () => {

      beforeEach(() => {
        expenseType.recurringFlag = false;
        expenseType.startDate = '2001-08-18';
        expenseType.endDate = '2002-08-18';
      });

      describe('and successfully validates dates', () => {

        describe('and there are no expenses', () => {

          beforeEach(() => {
            expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([]));
          });

          it('should return the validated expense type', done => {
            expenseTypeRoutes._validateDates(expenseType)
              .then(data => {
                expect(data).toEqual(expenseType);
                done();
              });
          }); // should return the validated expense type
        }); // and there are no expenses

        describe('and there are expenses', () => {

          beforeEach(() => {
            expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(expenses));
          });

          it('should return the validated expense type', done => {
            expenseTypeRoutes._validateDates(expenseType)
              .then(data => {
                expect(data).toEqual(expenseType);
                done();
              });
          }); // should return the validated expense type
        }); // and there are expenses
      }); // and successfully validates dates

      describe('and fails to get expenses', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get expenses.'
          };

          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should throw a 404 rejected promise', done => {
          expenseTypeRoutes._validateDates(expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(expenseDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              done();
            });
        }); // should throw a 404 rejected promise
      }); // and fails to get expenses

      describe('and start date is after first expense purchase date', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Start date must be before 2001-08-19.'
          };

          expenseType.startDate = '2002-08-18';
          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(expenses));
        });

        it('should throw a 403 rejected promise', done => {
          expenseTypeRoutes._validateDates(expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(expenseDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              done();
            });
        }); // should throw a 403 rejected promise
      }); // and start date is after first expense purchase date

      describe('and end date is before the last expense purchase date', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'End date must be after 2002-08-17.'
          };

          expenseType.endDate = '2001-08-18';
          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(expenses));
        });

        it('should throw a 403 rejected promise', done => {
          expenseTypeRoutes._validateDates(expenseType)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(expenseDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
              done();
            });
        }); // should throw a 403 rejected promise
      }); // and end date is before the last expense purchase date
    }); // when expense type is not recurring
  }); // _validateDates

  describe('_validateDelete', () => {

    let expenseType;

    beforeEach(() => {
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
    });

    describe('when there are no expenses for the expense type', () => {

      beforeEach(() => {
        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([]));
      });

      it('should return the validated expense type', () => {
        expenseTypeRoutes._validateDelete(expenseType)
          .then(data => {
            expect(data).toEqual(expenseType);
          });
      }); // should return the validated expense type
    }); // when there are no expenses fosr the expense type

    describe('when fails to get expenses', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expenses.'
        };

        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        expenseTypeRoutes._validateDelete(expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(expenseDynamo.querySecondaryIndexInDB)
              .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get expenses

    describe('when there are expenses for the expense type', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Cannot delete an expense type with expenses.'
        };

        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([new Expense(EXPENSE_DATA)]));
      });

      it('should return a 403 rejected promise', done => {
        expenseTypeRoutes._validateDelete(expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(expenseDynamo.querySecondaryIndexInDB)
              .toHaveBeenCalledWith('expenseTypeId-index', 'expenseTypeId', ID);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when there are expenses for the expense type
  }); // _validateDelete

  describe('_validateExpenseType', () => {

    let expenseType;

    beforeEach(() => {
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
    });

    describe('when id is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid expense type id.'
        };

        expenseType.id = ' ';
      });

      it('should return a 403 rejected promise', () => {
        expenseTypeRoutes._validateExpenseType(expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when id is missing

    describe('when budgetName is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid expense type budget name.'
        };

        expenseType.budgetName = ' ';
      });

      it('should return a 403 rejected promise', () => {
        expenseTypeRoutes._validateExpenseType(expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when budgetName is missing

    describe('when budget is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid expense type budget.'
        };

        expenseType.budget = ' ';
      });

      it('should return a 403 rejected promise', () => {
        expenseTypeRoutes._validateExpenseType(expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when budget is missing

    describe('when description is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid expense type description.'
        };

        expenseType.description = ' ';
      });

      it('should return a 403 rejected promise', () => {
        expenseTypeRoutes._validateExpenseType(expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when description is missing

    describe('when accessibleBy is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid expense type accessible by.'
        };

        expenseType.accessibleBy = ' ';
      });

      it('should return a 403 rejected promise', () => {
        expenseTypeRoutes._validateExpenseType(expenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when accessibleBy is missing

    describe('when expense type is recurring', () => {

      beforeEach(() => {
        expenseType.recurringFlag = true;
      });

      it('should return the validated expense type', () => {
        expenseTypeRoutes._validateExpenseType(expenseType)
          .then(data => {
            expect(data).toEqual(expenseType);
          });
      }); // should return the validated expense type
    }); // when expense type is recurring

    describe('when expense type is non recurring', () => {

      beforeEach(() => {
        expenseType.recurringFlag = false;
      });

      describe('and successfully validates expense type', () => {

        beforeEach(() => {
          expenseType.startDate = '2000-08-18';
          expenseType.endDate = '2001-08-18';
        });

        it('should return the validated expense type', () => {
          expenseTypeRoutes._validateExpenseType(expenseType)
            .then(data => {
              expect(data).toEqual(expenseType);
            });
        }); // should return the validated expense type
      }); // and successfully validates expense type

      describe('and start date is missing', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Start date required for non recurring expense type.'
          };

          expenseType.startDate = ' ';
        });

        it('should return a 403 rejected promise', () => {
          expenseTypeRoutes._validateExpenseType(expenseType)
            .then(() => {
              fail('expected error to have been thrown');
            })
            .catch(error => {
              expect(error).toEqual(err);
            });
        }); // should return a 403 rejected promise
      }); // and start date is missing

      describe('and end date is missing', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'End date required for non recurring expense type.'
          };

          expenseType.endDate = ' ';
        });

        it('should return a 403 rejected promise', () => {
          expenseTypeRoutes._validateExpenseType(expenseType)
            .then(() => {
              fail('expected error to have been thrown');
            })
            .catch(error => {
              expect(error).toEqual(err);
            });
        }); // should return a 403 rejected promise
      }); // and end date is missing

      describe('and end date is before start date', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'End date must be after start date.'
          };

          expenseType.startDate = '2001-08-18';
          expenseType.endDate = '2000-08-18';
        });

        it('should return a 403 rejected promise', () => {
          expenseTypeRoutes._validateExpenseType(expenseType)
            .then(() => {
              fail('expected error to have been thrown');
            })
            .catch(error => {
              expect(error).toEqual(err);
            });
        }); // should return a 403 rejected promise
      }); // and end date is before start date
    }); // when expense type is non recurring
  }); // _validateExpenseType

  describe('_validateUpdate', () => {

    let oldExpenseType, newExpenseType;

    beforeEach(() => {
      oldExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      newExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);
    });

    describe('when successfully validates update', () => {

      it('should return the new expense type', () => {
        expenseTypeRoutes._validateUpdate(oldExpenseType, newExpenseType)
          .then(data => {
            expect(data).toEqual(newExpenseType);
          });
      });
    }); // when successfully validates update

    describe('when old expense type id does not match the new expense type id', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating expense type IDs.'
        };

        newExpenseType.id = 'OTHER_ID';
      });

      it('should return a 403 rejected promise', () => {
        expenseTypeRoutes._validateUpdate(oldExpenseType, newExpenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when old expense type id does not match the new expense type id

    describe('when overdraft flag is changed', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Cannot change expense type overdraft flag.'
        };

        oldExpenseType.odFlag = false;
        newExpenseType.odFlag = true;
      });

      it('should return a 403 rejected promise', () => {
        expenseTypeRoutes._validateUpdate(oldExpenseType, newExpenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when overdraft flag is changed

    describe('when recurring flag is changed', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Cannot change expense type recurring flag.'
        };

        oldExpenseType.recurringFlag = false;
        newExpenseType.recurringFlag = true;
      });

      it('should return a 403 rejected promise', () => {
        expenseTypeRoutes._validateUpdate(oldExpenseType, newExpenseType)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
          });
      }); // should return a 403 rejected promise
    }); // when recurring flag is changed
  }); // _validateUpdate
}); //expenseRoutes
