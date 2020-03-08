const ExpenseRoutes = require('../../routes/expenseRoutes');

const Employee = require('../../models/employee');
const Expense = require('../../models/expense');
const ExpenseType = require('../../models/expenseType');
const Budget = require('../../models/budget');
//const IsoFormat = 'YYYY-MM-DD';
const moment = require('moment');

describe('expenseRoutes', () => {
  const uuid = 'uuid';
  const id = 'id';
  const purchaseDate = '{purchaseDate}';
  const reimbursedDate = '{reimbursedDate}';
  const cost = 0;
  const description = '{description}';
  const note = '{note}';
  const receipt = '{purchareceiptseDate}';
  const expenseTypeId = '{expenseTypeId}';
  const userId = '{userId}';
  const url = '{url}';
  const name = '{name}';
  const createdAt = '{createdAt}';
  const categories = '[categories]';
  const reimbursedAmount = 0;
  const pendingAmount = 0;
  const fiscalStartDate = '{fiscalStartDate}';
  const fiscalEndDate = '{fiscalEndDate}';
  let employee = {
    id: '{id}',
    firstName: '{firstName}',
    middleName: '{middleName}',
    lastName: '{lastName}',
    employeeNumber: 0,
    hireDate: '{hireDate}',
    expenseTypes: '[expenseTypes]',
    email: '{email}',
    employeeRole: '{employeeRole}',
    isInactive: '{isInactive}'
  };
  const expenseType = {
    id: '{id}',
    budgetName: '{budgetName}',
    budget: 0,
    odFlag: '{true}',
    description: description,
    startDate: '{startDate}',
    endDate: '{endDate}',
    recurringFlag: '{false}',
    isInactive: '{isInactive}',
    requiredFlag: '{requiredFlag}',
    categories: categories
  };

  const budget = {
    id,
    expenseTypeId,
    userId,
    reimbursedAmount,
    pendingAmount,
    fiscalStartDate,
    fiscalEndDate
  };

  let expenseDynamo, budgetDynamo, expenseTypeDynamo, employeeDynamo, expenseRoutes;

  beforeEach(() => {
    budgetDynamo = jasmine.createSpyObj('budgetDynamo', [
      'addToDB',
      'queryWithTwoIndexesInDB',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    expenseTypeDynamo = jasmine.createSpyObj('expenseTypeDynamo', ['findObjectInDB']);
    employeeDynamo = jasmine.createSpyObj('employeeDynamo', ['findObjectInDB']);
    expenseDynamo = jasmine.createSpyObj('expenseDynamo', [
      'addToDB',
      'findObjectInDB',
      'removeFromDB',
      'updateEntryInDB',
      'querySecondaryIndexInDB'
    ]);
    expenseRoutes = new ExpenseRoutes();
    expenseRoutes.budgetDynamo = budgetDynamo;
    expenseRoutes.expenseTypeDynamo = expenseTypeDynamo;
    expenseRoutes.employeeDynamo = employeeDynamo;
    expenseRoutes.expenseDynamo = expenseDynamo;
  });

  describe('_add', () => {
    let data, expectedExpense, localExpenseType, localEmployee;

    beforeEach(() => {
      data = { id, purchaseDate, reimbursedDate, cost, description, note, receipt, expenseTypeId, userId, url };
      expectedExpense = new Expense(data);
      localExpenseType = new ExpenseType(expenseType);
      expenseType.isInactive = false;
      localExpenseType.isInactive = false;
      localEmployee = new Employee(employee);
      employeeDynamo.findObjectInDB.and.returnValue(Promise.resolve(employee));
      expenseTypeDynamo.findObjectInDB.and.returnValue(Promise.resolve(expenseType));
      budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([budget]));
      expenseDynamo.addToDB.and.returnValue(expectedExpense);
      spyOn(expenseRoutes, '_isPurchaseWithinRange').and.returnValue(true);
      spyOn(expenseRoutes, '_getCurrentBudgetData').and.returnValue(budget);
      spyOn(expenseRoutes, '_decideIfBudgetExists').and.returnValue(Promise.resolve());
    });

    describe('when expense is not reimbursed', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, 'checkValidity').and.returnValue(Promise.resolve());
      });

      it('should return added object', done => {
        return expenseRoutes
          ._add(id, data)
          .then(createdExpense => {
            expect(createdExpense).toEqual(expectedExpense);
            done();
          })
          .catch(e => {
            console.warn(e);
            done(new Error('object rejected'));
          });
      }); // should return added object

      afterEach(() => {
        expect(expenseRoutes._isPurchaseWithinRange).toHaveBeenCalledWith(localExpenseType, purchaseDate);
        expect(expenseRoutes.checkValidity).toHaveBeenCalledWith(
          expectedExpense,
          localExpenseType,
          budget,
          localEmployee
        );
        expect(expenseRoutes._decideIfBudgetExists).toHaveBeenCalledWith(budget, expectedExpense, localExpenseType);
        expect(expenseDynamo.addToDB).toHaveBeenCalledWith(expectedExpense);
      });
    }); // when expense is not reimbursed

    describe('when expense is reimbursed', () => {

      beforeEach(() => {
        data.reimbursedDate = ' ';
        expectedExpense.reimbursedDate = ' ';
        spyOn(expenseRoutes, 'checkValidity').and.returnValue(Promise.resolve());
      });

      it('should return added object', done => {
        return expenseRoutes
          ._add(id, data)
          .then(createdExpense => {
            expect(createdExpense).toEqual(expectedExpense);
            done();
          })
          .catch(e => {
            console.warn(e);
            done(new Error('object rejected'));
          });
      }); // should return added object

      afterEach(() => {
        expect(expenseRoutes._isPurchaseWithinRange).toHaveBeenCalledWith(localExpenseType, purchaseDate);
        expect(expenseRoutes.checkValidity).toHaveBeenCalledWith(
          expectedExpense,
          localExpenseType,
          budget,
          localEmployee
        );
        expect(expenseRoutes._decideIfBudgetExists).toHaveBeenCalledWith(budget, expectedExpense, localExpenseType);
        expect(expenseDynamo.addToDB).toHaveBeenCalledWith(expectedExpense);
      });
    }); // when expense is reimbursed

    describe('when the expense type is inactive', () => {

      beforeEach(() => {
        expenseType.isInactive = true;
      });

      it('should throw an error', done => {
        expenseRoutes._add(id, data).catch( err => {
          expect(err).toEqual({
            code: 403,
            message: 'The Expense Type selected is Inactive. '
              + 'New Expenses can not be created with an Inactive Expense Type'
          });
          done();
        });
      }); // should return added object
    });

    describe('when invalid', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, 'checkValidity').and.returnValue(Promise.reject('error'));
      });

      it('should throw an error', done => {
        expenseRoutes._add(id, data).catch( err => {
          expect(err).toEqual('error');
          done();
        });
      }); // should throw an error
    }); // when invalid
  }); //_add

  describe('_addCost', () => {

    let addTo, addWith;

    describe('when two numbers round up', () => {

      beforeEach(() => {
        addTo = 1.1111;
        addWith = 2.23456;
      });

      it('should return the total with 2 deciaml percision', () => {
        expect(expenseRoutes._addCost(addTo, addWith)).toEqual(3.35);
      }); // should return the total with 2 deciaml percision
    }); // when two numbers round up

    describe('when two numbers round down', () => {

      beforeEach(() => {
        addTo = 1.1111;
        addWith = 2.232;
      });

      it('should return the total with 2 deciaml percision', () => {
        expect(expenseRoutes._addCost(addTo, addWith)).toEqual(3.34);
      }); // should return the total with 2 deciaml percision
    }); // when two numbers round down
  }); // _addCost

  describe('_addExpenseToBudget', () => {
    let expense, budget;

    beforeEach(() => {
      expense = {
        reimbursedDate: reimbursedDate,
        cost: 1
      };
      budget = {
        pendingAmount: 0,
        reimbursedAmount: 0
      };
    });

    describe('when there is no reimbursedDate ', () => {
      let expectedBudget;
      beforeEach(() => {
        expense.reimbursedDate = undefined;
        expectedBudget = {
          pendingAmount: 1,
          reimbursedAmount: 0
        };
      });
      it('should add the expense cost to the pendingAmount', done => {
        let result = expenseRoutes._addExpenseToBudget(expense, budget);
        expect(result).toEqual(expectedBudget);
        done();
      }); // should add the expense cost to the pendingAmount
    }); // when there is no reimbursedDate

    describe('when there is a reimbursedDate', () => {
      let expectedBudget;
      beforeEach(() => {
        expectedBudget = {
          pendingAmount: 0,
          reimbursedAmount: 1
        };
      });

      it('should add the expense cost to the reimbursedAmount', done => {
        let result = expenseRoutes._addExpenseToBudget(expense, budget);
        expect(result).toEqual(expectedBudget);
        done();
      }); // should add the expense cost to the reimbursedAmount
    }); // when there is a reimbursedDate
  }); // _addExpenseToBudget

  describe('_areExpenseTypesEqual', () => {
    let expense, oldExpense;
    describe('if both expenses exist', () => {
      beforeEach(() => {
        expense = { expenseTypeId: '{expenseTypeId#1}' };
        oldExpense = { expenseTypeId: '{expenseTypeId#2}' };
      });
      it('should compare the two expenseType Id\'s', done => {
        let result = expenseRoutes._areExpenseTypesEqual(expense, oldExpense);
        expect(result).toBe(false);
        done();
      }); // should compare the two expenseType Id's
    }); // if both expenses exis

    describe('if there is no old expense', () => {
      beforeEach(() => {
        expense = { expenseTypeId: '{expenseTypeId#1}' };
        oldExpense = undefined;
      });
      it('should return true when the oldExpense does not exist', done => {
        let result = expenseRoutes._areExpenseTypesEqual(expense, oldExpense);
        expect(result).toBe(true);
        done();
      }); // should return true when the oldExpense does not exist
    }); // if there is no old expense
  }); // _areExpenseTypesEqual

  describe('_calcOverdraft', () => {

    let budget, expenseType;

    beforeEach(() => {
      budget = { fiscalStartDate: '2000-01-01', fiscalEndDate: '2000-12-31' };
      expenseType = { id: 'expenseTypeID', budget: 100 };
    });

    describe('when there is overdraft', () => {

      beforeEach(() => { spyOn(expenseRoutes, '_getEmployeeExpensesTotalReimbursedInBudget').and.returnValue(150); });

      it('should return the overdraft amount', done => {
        expenseRoutes._calcOverdraft(budget, undefined, expenseType).then(odAmount => {
          expect(odAmount).toEqual(50);
          done();
        });
      }); // should return the overdraft amount
    }); // when there is overdraft

    describe('when there is no overdraft', () => {

      beforeEach(() => { spyOn(expenseRoutes, '_getEmployeeExpensesTotalReimbursedInBudget').and.returnValue(70); });

      it('should return a negative amount', done => {
        expenseRoutes._calcOverdraft(budget, undefined, expenseType).then(odAmount => {
          expect(odAmount).toBeLessThan(1);
          done();
        });
      }); // should return a negative amount
    }); // when there is no overdraft
  }); // _calcOverdraft

  describe('_calculateBudgetOverage', () => {

    let budget, expenseType;

    beforeEach(() => {
      budget = { reimbursedAmount: 10};
      expenseType = { budget: 2 };
    });

    it ('should return the budget overage', () => {
      expect(expenseRoutes._calculateBudgetOverage(budget, expenseType)).toEqual(8);
    }); // should return the overage
  }); // _calculateBudgetOverage

  describe('_checkBalance', () => {
    let expense, oldExpense, budget, expenseType;

    beforeEach(() => {
      expense = oldExpense = {
        cost: 0
      };
      expenseType = {
        budget: 0,
        odFlag: false
      };
      budget = {
        reimbursedAmount: 0,
        pendingAmount: 0
      };
    });
    describe('no budget exsits yet, but cost is valid', () => {
      beforeEach(() => {
        budget = undefined;
      });
      it('should return true', done => {
        let result = expenseRoutes._checkBalance(expense, expenseType, budget, oldExpense);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // no budget exsits yet, but cost is valid

    describe('no budget exists yet, the expense type is overdraftable and the cost is valid', () => {
      beforeEach(() => {
        expense.cost = 100;
        expenseType.budget = 51;
        expenseType.odFlag = true;
        budget = undefined;
      });
      it('should return true', done => {
        let result = expenseRoutes._checkBalance(expense, expenseType, budget, oldExpense);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // no budget exists yet, the expense type is overdraftable and the cost is valid

    describe('any other case where the budget is null', () => {
      beforeEach(() => {
        expense.cost = 100;
        expenseType.budget = 49;
        expenseType.odFlag = false;
        budget = undefined;
      });

      it('should return false', done => {
        let result = expenseRoutes._checkBalance(expense, expenseType, budget, oldExpense);
        expect(result).toBe(false);
        done();
      }); // should return false
    }); // any other case where the budget is null

    describe('sum is less than or equal to the budget', () => {
      beforeEach(() => {
        expense.cost = 0;
        expenseType.budget = 0;
      });
      it('should return true', done => {
        let result = expenseRoutes._checkBalance(expense, expenseType, budget, oldExpense);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // sum is less than or equal to the budget

    describe('expenseType allows overdrafting and sum is less than or equal to two times the budget', () => {
      beforeEach(() => {
        budget.pendingAmount = 2;
        expenseType.budget = 1;
        expenseType.odFlag = true;
      });
      it('should return true', done => {
        let result = expenseRoutes._checkBalance(expense, expenseType, budget, oldExpense);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // expenseType allows overdrafting and sum is less than or equal to two times the budget

    describe('when budget amount cannot cover the expense', () => {
      beforeEach(() => {
        expenseType.budget = -1;
        expenseType.odFlag = false;
      });
      it('should return false', done => {
        let result = expenseRoutes._checkBalance(expense, expenseType, budget, oldExpense);
        expect(result).toBe(false);
        done();
      }); // should return false
    }); // when budget amount cannot cover the expense

    describe('when old expense is undefiend', () => {

      it('should set the old cost to 0', () => {
        expect(expenseRoutes._checkBalance(expense, expenseType, budget, undefined)).toBe(true);
      }); // should set the old cost to 0
    }); // when old expense is undefined
  }); // _checkBalance

  describe('_checkExpenseDate', () => {
    let purchaseDate, stringStartDate, stringEndDate;

    describe('when the purchase date falls within the start and end dates', () => {
      beforeEach(() => {
        purchaseDate = '1996-08-15';
        stringStartDate = '1996-08-14';
        stringEndDate = '1996-08-16';
      });

      it('should return true', done => {
        let result = expenseRoutes._checkExpenseDate(purchaseDate, stringStartDate, stringEndDate);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // when the purchase date falls within the start and end dates

    describe('when the purchase date does not fall between the start and end dates', () => {
      beforeEach(() => {
        purchaseDate = '1997-08-15';
        stringStartDate = '1996-08-14';
        stringEndDate = '1996-08-16';
      });

      it('should return false', done => {
        let result = expenseRoutes._checkExpenseDate(purchaseDate, stringStartDate, stringEndDate);
        expect(result).toBe(false);
        done();
      }); // should return false
    }); // when the purchase date does not fall between the start and end dates
  }); // _checkExpenseDate

  describe('checkValidity', () => {
    let expectedErrorObject, expense, oldExpense, startDate, endDate;

    beforeEach(() => {
      expense = {
        purchaseDate: '{purchaseDate}'
      };
      oldExpense = 'oldExpense';
      startDate = '{startDate}';
      endDate = '{endDate}';
      expenseType.recurringFlag = false;
    });

    afterEach(() => {
      expect(expenseRoutes._checkBalance).toHaveBeenCalledWith(expense, expenseType, budget, oldExpense);
      expect(expenseRoutes._areExpenseTypesEqual).toHaveBeenCalledWith(expense, oldExpense);
    });

    describe('all checks are true', () => {
      let keptItsPromise;
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isInactive = false;
      });

      it('should return a resolved promise', done => {
        expenseRoutes
          .checkValidity(expense, expenseType, budget, employee, oldExpense)
          .then(() => {
            keptItsPromise = true;
            expect(keptItsPromise).toBe(true);
            done();
          })
          .catch(() => done(new Error('Promise should resolve')));
      }); // should return a resolved promise

      afterEach(() => {
        expect(expenseRoutes._checkExpenseDate).toHaveBeenCalledWith(expense.purchaseDate, startDate, endDate);
      });
    }); // all checks are true

    describe('expense is outside of the budget range', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(false);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isInactive = false;
        expectedErrorObject = {
          code: 403,
          message: `Expense is not valid because: the expense is outside the budget range, ${startDate} to ${endDate}`
        };
      });

      it('should return an error object with the right error message', done => {
        expenseRoutes
          .checkValidity(expense, expenseType, budget, employee, oldExpense)
          .then(() => {
            done(new Error('Promise should reject'));
          })
          .catch(returnedErrorObject => {
            expect(returnedErrorObject).toEqual(expectedErrorObject);
            done();
          });
      }); // should return an error object with the right error message

      afterEach(() => {
        expect(expenseRoutes._checkExpenseDate).toHaveBeenCalledWith(expense.purchaseDate, startDate, endDate);
      });
    }); // expense is outside of the expense type window

    describe('expense is over the budget limit', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(false);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isInactive = false;
        expectedErrorObject = {
          code: 403,
          message: 'Expense is not valid because: the expense is over the budget limit'
        };
      });

      it('should return an error object with the right error message', done => {
        expenseRoutes
          .checkValidity(expense, expenseType, budget, employee, oldExpense)
          .then(() => {
            done(new Error('Promise should reject'));
          })
          .catch(returnedErrorObject => {
            expect(returnedErrorObject).toEqual(expectedErrorObject);
            done();
          });
      }); // should return an error object with the right error message

      afterEach(() => {
        expect(expenseRoutes._checkExpenseDate).toHaveBeenCalledWith(expense.purchaseDate, startDate, endDate);
      });
    }); // expense is over the budget limit

    describe('expense type is not valid', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(false);
        employee.isInactive = false;
        expectedErrorObject = {
          code: 403,
          message: 'Expense is not valid because: the expense type is not valid'
        };
      });

      it('should return an error object with the right error message', done => {
        expenseRoutes
          .checkValidity(expense, expenseType, budget, employee, oldExpense)
          .then(() => {
            done(new Error('Promise should reject'));
          })
          .catch(returnedErrorObject => {
            expect(returnedErrorObject).toEqual(expectedErrorObject);
            done();
          });
      }); // should return an error object with the right error message

      afterEach(() => {
        expect(expenseRoutes._checkExpenseDate).toHaveBeenCalledWith(expense.purchaseDate, startDate, endDate);
      });
    }); // expense type is not valid

    describe('employee is not active', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isInactive = true;
        expectedErrorObject = {
          code: 403,
          message: 'Expense is not valid because: the employee is not active'
        };
      });

      it('should return an error object with the right error message', done => {
        expenseRoutes
          .checkValidity(expense, expenseType, budget, employee, oldExpense)
          .then(() => {
            done(new Error('Promise should reject'));
          })
          .catch(returnedErrorObject => {
            expect(returnedErrorObject).toEqual(expectedErrorObject);
            done();
          });
      }); // should return an error object with the right error message

      afterEach(() => {
        expect(expenseRoutes._checkExpenseDate).toHaveBeenCalledWith(expense.purchaseDate, startDate, endDate);
      });
    }); // employee is not active


    describe('recurring flag is true', () => {
      let keptItsPromise;

      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isInactive = false;
        expenseType.recurringFlag = true;
      });

      it('should return a resolved promise', done => {
        expenseRoutes
          .checkValidity(expense, expenseType, budget, employee, oldExpense)
          .then(() => {
            keptItsPromise = true;
            expect(keptItsPromise).toBe(true);
            done();
          })
          .catch(() => done(new Error('Promise should resolve')));
      }); // should return a resolved promise

      afterEach(() => {
        expect(expenseRoutes._checkExpenseDate)
          .toHaveBeenCalledWith(expense.purchaseDate, fiscalStartDate, fiscalEndDate);
      });
    }); // all checks are true

  }); // checkValidity

  describe('_createNewBudget', () => {
    let expenseType, employee, expectedBudget;

    beforeEach(() => {
      expectedBudget = {
        id: id,
        expenseTypeId: expenseTypeId,
        userId: userId,
        reimbursedAmount: 0,
        pendingAmount: 0
      };
      expenseType = {
        id: expenseTypeId,
        recurringFlag: false,
        startDate: '2019-07-01',
        endDate: '2019-07-31'
      };
      employee = {
        id: userId,
        hireDate: '2019-07-02'
      };
      budgetDynamo.addToDB.and.returnValue(Promise.resolve(expectedBudget));
    });

    afterEach(() => {
      expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
    });

    describe('when an expenseType is recurring', () => {
      beforeEach(() => {
        expenseType.recurringFlag = true;
        expectedBudget.fiscalStartDate = '2019-07-02';
        expectedBudget.fiscalEndDate = '2020-07-01';
        spyOn(expenseRoutes, '_getBudgetDates').and.returnValue({
          startDate: moment('2019-07-02'),
          endDate: moment('2020-07-01')
        });
      });

      it('should return the new budget ', async done => {
        let returnedObject = await expenseRoutes._createNewBudget(expenseType, employee, id);
        expect(returnedObject).toEqual(expectedBudget);
        done();
      }); // should return the new budget
    }); // when an expenseType is recurring

    describe('when an expenseType is not recurring', () => {
      beforeEach(() => {
        expectedBudget.fiscalStartDate = expenseType.startDate;
        expectedBudget.fiscalEndDate = expenseType.endDate;
      });

      it('should return the new budget with correct dates', async done => {
        let returnedObject = await expenseRoutes._createNewBudget(expenseType, employee, id);
        expect(returnedObject).toEqual(expectedBudget);
        done();
      }); // should return the new budget with correct dates
    }); // when an expenseType is not recurring
  }); // _createNewBudget

  describe('_decideIfBudgetExists', () => {
    let expectedBudget, expense;
    beforeEach(() => {
      expense = 'expense';
      expectedBudget = {
        id: uuid,
        expenseTypeId: expenseTypeId,
        userId: userId,
        reimbursedAmount: 0,
        pendingAmount: 0,
        fiscalStartDate: expenseType.startDate,
        fiscalEndDate: expenseType.endDate
      };
      spyOn(expenseRoutes, '_getUUID').and.returnValue(uuid);
    });

    describe('when the budget does exist', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_addExpenseToBudget').and.returnValue(budget);
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
      });
      afterEach(() => {
        expect(expenseRoutes._addExpenseToBudget).toHaveBeenCalledWith(expense, budget);
      });

      it('should call updateEntryInDB and return the budget', async done => {
        let result = await expenseRoutes._decideIfBudgetExists(budget, expense, expenseType);
        expect(result).toEqual(budget);
        expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(budget);
        done();
      }); // should call updateEntryInDB and return the budget
    }); // when the budget does exist

    describe('when the budget does not exist', () => {
      let budget;

      beforeEach(() => {
        expense = {
          expenseTypeId: expenseTypeId,
          userId: userId
        };
        spyOn(expenseRoutes, '_addExpenseToBudget').and.returnValue(expectedBudget);
        budgetDynamo.addToDB.and.returnValue(Promise.resolve(expectedBudget));
      });

      afterEach(() => {
        expect(expenseRoutes._addExpenseToBudget).toHaveBeenCalledWith(expense, expectedBudget);
      });

      it('should call addToDB and return a new budget', async done => {
        let result = await expenseRoutes._decideIfBudgetExists(budget, expense, expenseType);
        expect(result).toEqual(expectedBudget);
        expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
        done();
      }); // should call addToDB and return a new budget
    }); // when the budget does not exist
  }); // _decideIfBudgetExists

  describe('_delete', () => {
    let expense, expenseData, budgetData, budget;
    beforeEach(() => {
      expenseData = {
        id,
        purchaseDate,
        reimbursedDate,
        note,
        url,
        createdAt,
        receipt,
        cost,
        name,
        description,
        userId,
        expenseTypeId,
        categories
      };
      budgetData = {
        id,
        expenseTypeId,
        userId,
        reimbursedAmount,
        pendingAmount,
        fiscalStartDate,
        fiscalEndDate
      };

      expense = new Expense(expenseData);
      budget = new Budget(budgetData);

      expenseTypeDynamo.findObjectInDB.and.returnValue(Promise.resolve(expenseType));
      budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([budget]));
      expenseDynamo.removeFromDB.and.returnValue(expense);

      spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget);
      spyOn(expenseRoutes, '_removeFromBudget').and.returnValue(Promise.resolve());
    });



    describe('when successfully deleting an expense', () => {

      beforeEach(() => {
        expenseDynamo.findObjectInDB.and.returnValue(Promise.resolve(expense));
        spyOn(expenseRoutes, '_isNotReimbursedPromise').and.returnValue(Promise.resolve());
      });

      it('should return deleted object', done => {
        return expenseRoutes
          ._delete(id)
          .then(deletedExpense => {
            expect(deletedExpense).toEqual(expense);
            done();
          })
          .catch(() => {
            done(new Error('object rejected'));
          });
      }); // should return deleted object

      afterEach(() => {
        expect(expenseRoutes._isNotReimbursedPromise).toHaveBeenCalledWith(expense);
        expect(expenseRoutes._removeFromBudget).toHaveBeenCalledWith(budget, expense, new ExpenseType(expenseType));
        expect(expenseDynamo.removeFromDB).toHaveBeenCalledWith(id);
      });
    }); // when successfully deleting an expense

    describe('when cannot find budget to delete', () => {

      beforeEach(() => {
        expenseDynamo.findObjectInDB.and.returnValue(Promise.reject('error'));
        spyOn(expenseRoutes, '_isNotReimbursedPromise').and.returnValue(Promise.resolve());
      });

      it('should throw an error', () => {
        expenseRoutes._delete(id).catch( err => {
          expect(err).toEqual('error');
        });
      }); // should throw an error
    }); // when cannot find budget to delete

    describe('when expense is reimbursed', () => {

      let budgets;

      beforeEach(() => {
        budget.fiscalStartDate = '2000-01-01';
        budget.fiscalEndDate = '2000-12-31';
        budgets = [budget];
        expense.purchaseDate = '2000-01-01';
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(budgets);
        expenseDynamo.findObjectInDB.and.returnValue(Promise.resolve(expense));
        spyOn(expenseRoutes, '_isNotReimbursedPromise').and.returnValue(Promise.resolve());
      });

      it('should throw an error', () => {
        expenseRoutes._delete(id).catch( err => {
          expect(err).toEqual({
            code: 403,
            message: 'expense cannot perform action because it has already been reimbursed'
          });
        });
      }); // should throw an error
    }); // when expense is reimbursed
  }); // _delete

  describe('_findBudgetWithMatchingRange', () => {
    let budgets, budget, purchaseDate;

    beforeEach(() => {
      purchaseDate = '1970-12-01';
      budget = {
        fiscalStartDate: '1970-12-01',
        fiscalEndDate: '1970-12-31'
      };
      budgets = [budget];
    });
    describe('when valid budgets are found', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
      });

      it('should return the array of valid budgets', done => {
        let results = expenseRoutes._findBudgetWithMatchingRange(budgets, purchaseDate);
        expect(results).toEqual(budget);
        expect(expenseRoutes._checkExpenseDate).toHaveBeenCalledWith(
          purchaseDate,
          budget.fiscalStartDate,
          budget.fiscalEndDate
        );
        done();
      }); // should return the array of valid budgets
    }); // when validBudgets are found

    describe('when no valid budgets are found', () => {
      let expectedError;
      beforeEach(() => {
        expectedError = {
          code: 403,
          message: 'Purchase Date is out of your anniversary budget range'
        };
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(false);
      });

      it('should throw an error', done => {
        try {
          expenseRoutes._findBudgetWithMatchingRange(budgets, purchaseDate);
          done(new Error('_findBudgetWithMatchingRange should throw an error when no valid budgets are found'));
        } catch (thrownError) {
          expect(thrownError).toEqual(expectedError);
          expect(expenseRoutes._checkExpenseDate).toHaveBeenCalledWith(
            purchaseDate,
            budget.fiscalStartDate,
            budget.fiscalEndDate
          );
          done();
        }
      }); // should throw an error
    }); // when no valid budgets are found
  }); // _findBudgetWithMatchingRange

  describe('_getBudgetData', () => {
    let expense, budgets;

    describe('if the list of budgets contains a budget', () => {
      beforeEach(() => {
        budgets = [budget];
        expense = {
          purchaseDate: '{purchaseDate}'
        };
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budgets);
      });
      it('should call _findBudgetWithMatchingRange', async done => {
        expenseRoutes._getBudgetData(budgets, expenseType, employee, expense).then(budgetsInRange => {
          expect(budgetsInRange).toEqual(budgets);
          expect(expenseRoutes._findBudgetWithMatchingRange).toHaveBeenCalledWith(budgets, expense.purchaseDate);
          done();
        });
      }); // should call _findBudgetWithMatchingRange
    }); // if the list of budgets contains a budget

    describe('if budgets is empty', () => {
      beforeEach(() => {
        budgets = [];
        expense = {
          purchaseDate: '{purchaseDate}'
        };
        spyOn(expenseRoutes, '_createNewBudget').and.returnValue(Promise.resolve(['I\'m a new budget']));
        spyOn(expenseRoutes, '_getUUID').and.returnValue(uuid);
      });
      it('should call _createNewBudget', async done => {
        expenseRoutes._getBudgetData(budgets, expenseType, employee, expense).then(newBudgets => {
          expect(newBudgets).toEqual(['I\'m a new budget']);
          expect(expenseRoutes._createNewBudget).toHaveBeenCalledWith(expenseType, employee, uuid);
          done();
        });
      }); // should call _createNewBudget
    }); // if budgets is empty
  }); // _getBudgetData

  describe('_getBudgetDates', () => {
    let hireDate,
      expectedObj,
      expectedAnniversaryMonth,
      expectedAnniversaryDay,
      currentYear,
      expectedStartDate,
      expectedEndDate,
      anniversaryComparisonDate;

    describe('when anniversary date is the same day or before today', () => {

      beforeEach(() => {
        hireDate = moment([1970, moment().month(), moment().day()]);
        expectedAnniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
        expectedAnniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
        currentYear = moment().year();
        anniversaryComparisonDate = moment([currentYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
        spyOn(anniversaryComparisonDate, 'isSameOrBefore').and.returnValue(true);
        expectedStartDate = moment([currentYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
        expectedEndDate = moment([currentYear + 1, expectedAnniversaryMonth, expectedAnniversaryDay])
          .subtract(1, 'days');
        expectedObj = {
          startDate: expectedStartDate,
          endDate: expectedEndDate
        };
      });

      it('should return an object with a start and end date', done => {
        let returnedObj = expenseRoutes._getBudgetDates(hireDate);
        expect(returnedObj.startDate.format()).toEqual(expectedObj.startDate.format());
        expect(returnedObj.endDate.format()).toEqual(expectedObj.endDate.format());
        done();
      }); // should return an object with a start and end date
    }); // when anniversary date is the same day or before today

    describe('when anniversary date is after today', () => {

      beforeEach(() => {
        hireDate = moment().add(1, 'd');
        expectedAnniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
        expectedAnniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
        currentYear = moment().year();
        anniversaryComparisonDate = moment([currentYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
        spyOn(anniversaryComparisonDate, 'isSameOrBefore').and.returnValue(false);
        expectedStartDate = moment([currentYear - 1, expectedAnniversaryMonth, expectedAnniversaryDay]);
        expectedEndDate = moment([currentYear, expectedAnniversaryMonth, expectedAnniversaryDay - 1]);
        expectedObj = {
          startDate: expectedStartDate,
          endDate: expectedEndDate
        };
      });

      it('should return an object with a start and end date', done => {
        let returnedObj = expenseRoutes._getBudgetDates(hireDate);
        expect(returnedObj.startDate.format()).toEqual(expectedObj.startDate.format());
        expect(returnedObj.endDate.format()).toEqual(expectedObj.endDate.format());

        done();
      }); // should return an object with a start and end date
    }); // when anniversary date is after today
  }); // _getBudgetDates

  describe('_getCurrentBudgetData', () => {

    let budgets, expenseType, employee;

    describe('when budgets is empty', () => {

      beforeEach(() => {
        expenseType = {id: 'expenseTypeId'};
        employee = {id: 'employeeId'};
        spyOn(expenseRoutes, '_createNewBudget').and.returnValue(Promise.resolve('success'));
      });

      it('create a new budget', done => {
        expenseRoutes._getCurrentBudgetData(budgets, expenseType, employee).then(data => {
          expect(data).toEqual('success');
          done();
        });
      }); // find budget with matching range
    }); // when budgets is empty

    describe('when budgets is not empty', () => {

      beforeEach(() => {
        budgets = ['budget'];
        expenseType = {id: 'expenseTypeId'};
        employee = {id: 'employeeId'};
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(Promise.resolve('success'));
      });

      it('create a new budget', done => {
        expenseRoutes._getCurrentBudgetData(budgets, expenseType, employee).then(data => {
          expect(data).toEqual('success');
          done();
        });
      }); // find budget with matching range
    }); // when budgets is not empty
  }); // _getCurrentBudgetData

  describe('_getEmployeeBudgetOverdrafts', () => {

    let budget2000, budget2001, budget2002, budgets, expenseType;

    beforeEach(() => {
      budget2000 = { fiscalStartDate: '2000-01-01' };
      budget2001 = { fiscalStartDate: '2001-01-01' };
      budget2002 = { fiscalStartDate: '2002-01-01' };
      budgets = [budget2000, budget2001, budget2002];
    });

    describe('when budgets are overdrafted', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, '_calcOverdraft').and.returnValue(10);
      });

      it('should return an array of overdrafted amounts', done => {
        expenseRoutes._getEmployeeBudgetOverdrafts(budgets, undefined, expenseType)
          .then(overdrafts => {
            expect(overdrafts).toEqual([10, 10, 10]);
            done();
          });
      }); // should return an array of overdraft amounts
    }); // when budgets are overdrafted

    describe('when no budgets are overdrafted', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, '_calcOverdraft').and.returnValue(0);
      });

      it('should return an array of overdrafted amounts', done => {
        expenseRoutes._getEmployeeBudgetOverdrafts(budgets, undefined, expenseType)
          .then(overdrafts => {
            expect(overdrafts).toEqual([0, 0, 0]);
            done();
          });
      }); // should return an array of empty overdraft amounts
    }); // when no budgets are overdrafted
  }); // _getEmployeeBudgetOverdrafts

  describe('_getEmployeeExpensesTotalReimbursedInBudget', () => {

    let budget, expenseType, expense1, expense2, expense3, expense4, expense5, expenses;

    beforeEach(() => {
      budget = { fiscalStartDate: '2000-01-01', fiscalEndDate: '2000-12-31' };
      expenseType = { id: 'expenseTypeID' };
      expense1 = { expenseTypeId: 'expenseTypeID', purchaseDate: '2000-01-02', reimbursedDate: '2000-01-02', cost: 1 };
      expense2 = { expenseTypeId: 'expenseTypeID', purchaseDate: '2000-01-02', reimbursedDate: '2000-01-02', cost: 2 };
      expense3 = {
        expenseTypeId: 'expenseTypeIDDifferent',
        purchaseDate: '2000-01-02',
        reimbursedDate: '2000-01-02',
        cost: 3
      };
      expense4 = { expenseTypeId: 'expenseTypeID', purchaseDate: '2000-01-02', reimbursedDate: undefined, cost: 4 };
      expense5 = { expenseTypeId: 'expenseTypeID', purchaseDate: '2001-01-02', reimbursedDate: '2000-01-02', cost: 5 };
      expenses = [expense1, expense2, expense3, expense4, expense5];
      expenseDynamo.querySecondaryIndexInDB.and.returnValue(expenses);
    });

    describe('when mix of valid and invalid expenses', () => {

      it('should return the total cost of all valid expenses', done => {
        expenseRoutes._getEmployeeExpensesTotalReimbursedInBudget(undefined, budget, expenseType).then( cost => {
          expect(cost).toEqual(3);
          done();
        });
      }); // should return the total cost of all valid expenses
    }); // when mix of valid and invalid expensess
  }); // _getEmployeeExpensesTotalReimbursedInBudget

  describe('_getUUID', () => {
    it('to return a uuid', () => {
      expenseRoutes._getUUID();
      expect(expenseRoutes._getUUID()).not.toBe(undefined);
    }); // to return a uuid
  }); // _getUUID

  describe('_isNotReimbursedPromise', () => {

    let expense;

    beforeEach(() => {
      expense = {id: 'expenseId'};
    });

    describe('when reimbursed', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, '_isReimbursed').and.returnValue(true);
      });

      it('to return a rejected promise', () => {
        expenseRoutes._isNotReimbursedPromise(expense).catch( err => {
          expect(err).toEqual({
            code: 403,
            message: 'expense cannot perform action because it has already been reimbursed'
          });
        });
      }); // to return a rejected promise

    }); // when reimbursed

    describe('when not reimbursed', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, '_isReimbursed').and.returnValue(false);
      });

      it('to return a resolved promise', () => {
        expenseRoutes._isNotReimbursedPromise(expense).then(data => {
          expect(data).toBe(true);
        });
      }); // to return a resolved promise

    }); // when not reimbursed
  }); // _isReimbursedPromise

  describe('_isPurchaseWithinRange', () => {
    let expenseType, purchaseDate, expectedError;

    beforeEach(() => {
      expenseType = {
        recurringFlag: true,
        startDate: '1970-12-01',
        endDate: '1970-12-31'
      };
    });
    describe('when the expenseType is reccurring', () => {
      it('should return true', done => {
        let result = expenseRoutes._isPurchaseWithinRange(expenseType, purchaseDate);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // when the expenseType is reccurring

    describe('when the purchase date comes before the start date', () => {
      beforeEach(() => {
        purchaseDate = '1970-11-01';
        expenseType.recurringFlag = false;
        expectedError = {
          code: 403,
          message:
          `Purchase date must be between ${expenseType.startDate} and ${expenseType.endDate}. ` +
          'Select a later purchase date'
        };
      });
      it('should throw error object', done => {
        try {
          expenseRoutes._isPurchaseWithinRange(expenseType, purchaseDate);
          done(new Error('error should be thrown when purchase date is not in range'));
        } catch (thrownError) {
          expect(thrownError).toEqual(expectedError);
          done();
        }
      }); // should throw error object
    }); // when the purchase date comes before the start date

    describe('when the purchase date comes after the end date', () => {
      beforeEach(() => {
        purchaseDate = '1971-12-01';
        expenseType.recurringFlag = false;
        expectedError = {
          code: 403,
          message:
          `Purchase date must be between ${expenseType.startDate} and ${expenseType.endDate}. ` +
          'Select an earlier purchase date'
        };
      });
      it('should throw error object', done => {
        try {
          expenseRoutes._isPurchaseWithinRange(expenseType, purchaseDate);
          done(new Error('error should be thrown when purchase date is not in range'));
        } catch (thrownError) {
          expect(thrownError).toEqual(expectedError);
          done();
        }
      }); // should throw error object
    }); // when the purchase date comes after the end date

    describe('when the date falls between the start and end dates', () => {
      beforeEach(() => {
        purchaseDate = '1970-12-15';
        expenseType.recurringFlag = false;
      });
      it('should return true', done => {
        let result = expenseRoutes._isPurchaseWithinRange(expenseType, purchaseDate);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // when the date falls between the start and end dates
  }); // _isPurchaseWithinRange

  describe('_isReimbursed', () => {

    let expense;

    describe('when there is no reimbursedDate', () => {

      beforeEach(() => {
        expense = {
          reimbursedDate: undefined
        };
      });

      it('should return false', done => {
        let result = expenseRoutes._isReimbursed(expense);
        expect(result).toBe(false);
        done();
      }); // should return false
    }); // when there is no reimbursedDate

    describe('when the reimbursedDate is undefined', () => {

      beforeEach(() => {
        expense = {
          reimbursedDate: undefined
        };
      });

      it('should return false', done => {
        let result = expenseRoutes._isReimbursed(expense);
        expect(result).toBe(false);
        done();
      }); // should return false
    }); // when there is no reimbursedDate

    describe('when the reimbursedDate is blank spaced', () => {

      beforeEach(() => {
        expense = {
          reimbursedDate: ' '
        };
      });

      it('should return false', done => {
        let result = expenseRoutes._isReimbursed(expense);
        expect(result).toBe(false);
        done();
      }); // should return false
    }); // when there is no reimbursedDate

    describe('when there is a reimbursedDate', () => {

      beforeEach(() => {
        expense = {
          reimbursedDate: '2019-20-05'
        };
      });

      it('should return true', done => {
        let result = expenseRoutes._isReimbursed(expense);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // when there is a reimbursedDate
  }); // _isReimbursed

  describe('_isValidExpense', () => {

    let expense, expenseType, budget;

    beforeEach(() => {
      expense = { expenseTypeId: 'expenseTypeID', purchaseDate: '2000-01-02', reimbursedDate: '2000-01-02' };
      expenseType = { id: 'expenseTypeID' };
      budget = { fiscalStartDate: '2000-01-01', fiscalEndDate: '2000-12-31' };
    });

    describe('when expense matches expense type, is reimbursed, and within budget range', () => {

      it('should return true', () => {
        expect(expenseRoutes._isValidExpense(expense, budget, expenseType)).toBe(true);
      }); // should return true
    }); // when expense matches expense type, is reimbursed, and within budget range

    describe('when expense does not match expense type', () => {

      beforeEach(() => { expenseType = { id: 'expenseTypeIDDifferent' }; });

      it('should return false', () => {
        expect(expenseRoutes._isValidExpense(expense, budget, expenseType)).toBe(false);
      }); // should return false
    }); // when expense does not match expense type

    describe('when expense is not reimbursed', () => {

      beforeEach(() => { expense.reimbursedDate = undefined; });

      it('should return false', () => {
        expect(expenseRoutes._isValidExpense(expense, budget, expenseType)).toBe(false);
      }); // should return false
    }); // when expense is not reimbursed

    describe('when expense is not within budget range', () => {

      beforeEach(() => { expense.purchaseDate = '2001-01-01'; });

      it('should return false', () => {
        expect(expenseRoutes._isValidExpense(expense, budget, expenseType)).toBe(false);
      }); // should return false
    }); // when expense is not within budget range
  }); // _isValidExpense

  describe('_performBudgetUpdate', () => {
    let oldExpense, newExpense, budget, expectedBudget, budgets;
    beforeEach(() => {
      oldExpense = {
        purchaseDate: '2000-01-01',
        reimbursedDate: undefined,
        cost: 1,
      };
      newExpense = {
        purchaseDate: '2000-01-01',
        reimbursedDate: '2000-01-02',
        cost: 1,
      };
      budget = {
        reimbursedAmount: 0,
        pendingAmount: 1,
        fiscalStartDate: '2000-01-01',
        fiscalEndDate: '2000-12-31'
      };
      expectedBudget = {
        reimbursedAmount: 1,
        pendingAmount: 0,
        fiscalStartDate: '2000-01-01',
        fiscalEndDate: '2000-12-31'
      };
      budgets = [budget];
      expenseType.odFlag = false;
    });

    describe('when the old expense is not reimbursed and the new expense is reimbursed but costs are the same', () => {
      beforeEach(() => {
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
        spyOn(expenseRoutes, '_reimburseExpense').and.returnValue(Promise.resolve(expectedBudget));
      });

      it('should return the updated budget and call _reimburseExpense', done => {
        expenseRoutes
          ._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType)
          .then(returnedBudget => {
            expect(returnedBudget).toEqual(expectedBudget);
            done();
          });
      }); // should call _budgetUpdateForReimbursedExpense and updateEntryInDB
      afterEach(() => {
        expect(expenseRoutes._reimburseExpense).toHaveBeenCalledWith(
          oldExpense,
          newExpense,
          budget,
          budgets,
          expenseType
        );
      });
    }); // when the old expense is not reimbursed and the new expense is reimbursed but cost is the same

    describe('when the old expense is not reimbursed and the new expense is reimbursed and costs are different', () => {
      beforeEach(() => {
        newExpense.cost = 2;
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
        spyOn(expenseRoutes, '_reimburseExpense').and.returnValue(Promise.resolve(expectedBudget));
        expectedBudget.reimbursedAmount = 2;
      });
      it('should return a budget with updated budget amounts', done => {
        expenseRoutes
          ._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType)
          .then(returnedBudget => {
            expect(returnedBudget).toEqual(expectedBudget);
            done();
          });
      }); // should return a budget with updated budget amounts
      afterEach(() => {
        expect(expenseRoutes._reimburseExpense).toHaveBeenCalledWith(
          oldExpense,
          newExpense,
          budget,
          budgets,
          expenseType
        );
      });
    }); // when the old expense is not reimbursed and the new expense is reimbursed and costs are different

    describe('when both new and old expenses are not reimbursed and both costs are different', () => {
      beforeEach(() => {
        oldExpense.reimbursedDate = undefined;
        newExpense.reimbursedDate = undefined;
        newExpense.cost = 2;
        expectedBudget.pendingAmount = 2,
        expectedBudget.reimbursedAmount = 0;

        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
      });

      it('should return a budget with an updated pendingAmount', done => {
        expenseRoutes
          ._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType)
          .then(returnedBudget => {
            expect(returnedBudget).toEqual(expectedBudget);
            done();
          });
      }); // should return a budget with an updated pendingAmount
    }); // when both new and old expenses are reimbursed and both costs are different

    describe('when unreimbursing an expense', () => {

      let budgets;

      beforeEach(() => {
        oldExpense.reimbursedDate = '2000-01-01';
        newExpense.reimbursedDate = undefined;
        budgets = ['budget'];
        spyOn(expenseRoutes, '_unreimburseExpense').and.returnValue(budgets);
      });

      it('should return an array of updated sorted budgets', () => {
        expect(expenseRoutes
          ._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType))
          .toEqual(budgets);
      }); // should return an array of updated sorted budgets
    }); // when unreimbursing and expense

    describe('when attempting to change a reimbursed expense', () => {

      beforeEach(() => {
        oldExpense.reimbursedDate = '2000-01-01';
      });

      it('should return false', () => {
        expect(expenseRoutes._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType)).toBe(false);
      }); // should return false
    }); // when attempting to change a reimbursed expense
  }); // _performBudgetUpdate

  describe('_reimburseExpense', () => {

    let oldExpense, newExpense, budget, nextBudget, expectedBudget, budgets;

    beforeEach(() => {
      oldExpense = {
        purchaseDate: '2000-01-01',
        reimbursedDate: undefined,
        cost: 1,
      };
      newExpense = {
        purchaseDate: '2000-01-01',
        reimbursedDate: '2000-01-02',
        cost: 1,
      };
      budget = {
        id: 'budgetId',
        reimbursedAmount: 1,
        pendingAmount: 1,
        fiscalStartDate: '2000-01-01',
        fiscalEndDate: '2000-12-31'
      };
      nextBudget = {
        id: 'nextBudgetId',
        reimbursedAmount:0,
        pendingAmount: 0,
        fiscalStartDate: '2001-01-01',
        fiscalEndDate: '2002-12-31'
      };
      budgets = [budget, nextBudget];
      expenseType.odFlag = true;
      expenseType.budget = 1;
    });

    describe('when expense is in the same budget and overdraft flag is false', () => {

      beforeEach(() => {
        expenseType.odFlag = false;
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget);
      });

      it('should return the updated budget and call updateEntryInDB', done => {
        expenseRoutes
          ._reimburseExpense(oldExpense, newExpense, budget, budgets, expenseType)
          .then(returnedBudget => {
            expect(returnedBudget).toEqual(budget);
            done();
          });
      }); // should return the updated budget and call updateEntryInDB

      afterEach(() => {
        expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(budget);
      });

    }); // when expense is in the same budget and overdraft flag is false

    describe('when overdraft, od amount is greater than zero, and next year budget exists', () => {

      beforeEach(() => {
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
        expectedBudget = {
          id: 'budgetId',
          reimbursedAmount: 1,
          pendingAmount: 0,
          fiscalStartDate: '2000-01-01',
          fiscalEndDate: '2000-12-31'
        };
      });

      it('should call updateEntryInDB', done => {
        expenseRoutes._reimburseExpense(oldExpense, newExpense, budget, budgets, expenseType)
          .then(returnedBudget => {
            expect(returnedBudget).toEqual(expectedBudget);
            done();
          });
      }); // should call updateEntryInDB
    }); // when overdraft, od amount is greater than zero, and next year budget exist

    describe('when overdraft, od amount is greater than zero, and no future budget exists', () => {

      beforeEach(() => {
        expectedBudget = {
          id: 'budgetId',
          reimbursedAmount: 1,
          pendingAmount: 0,
          fiscalStartDate: '2000-01-01',
          fiscalEndDate: '2000-12-31'
        };
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedBudget));
      });

      it('should call updateEntryInDB', done => {
        expenseRoutes._reimburseExpense(oldExpense, newExpense, budget, budgets, expenseType)
          .then(returnedBudget => {
            expect(returnedBudget).toEqual(expectedBudget);
            done();
          });
      }); // should call updateEntryInDB
    }); // when overdraft, od amount is greater than zero, and no future budget exists

    describe('when the overdraft amount is zero or less and od flag is true', () => {

      let expectedBudget;

      beforeEach(() => {
        expectedBudget = {
          id: 'budgetId',
          reimbursedAmount: 2,
          pendingAmount: 0,
          fiscalStartDate: '2000-01-01',
          fiscalEndDate: '2000-12-31'
        };
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedBudget));
      });

      it('should preform a normal budget operation', done => {
        expenseRoutes._reimburseExpense(oldExpense, newExpense, budget, budgets, expenseType)
          .then(returnedBudget => {
            expect(returnedBudget).toEqual(expectedBudget);
            done();
          });
      }); // should preform a normal budget operation
    }); // when the overdraft amount is zero or less and od flag is true

    describe('when updated expense is not in the same budget', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(nextBudget);
        budgetDynamo.updateEntryInDB.and.returnValue(nextBudget);
      });

      it('should subtract from the current budget and add to the new budget', () => {
        expenseRoutes._reimburseExpense(oldExpense, newExpense, budget, budgets, expenseType).then( data => {
          expect(data).toEqual(nextBudget);
        });
      }); // should subtract from the current budget and add to the new budget
    }); // when updated expense is not in the same budget

    describe('when error updating overdraft budgets', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget);
        spyOn(expenseRoutes, '_calculateBudgetOverage').and.returnValue('undefined');
        budgetDynamo.updateEntryInDB.and.returnValue(budget);
      });

      it('should throw an error', () => {
        expenseRoutes._reimburseExpense(oldExpense, newExpense, budget, budgets, expenseType).catch( err => {
          expect(err).toEqual('there was an error');
        });
      }); // should throw an error
    }); // when error updating overdraft
  }); // _reimburseExpense

  describe('_removeFromBudget', () => {
    let expense, budget, expenseType;
    beforeEach(() => {
      expenseType = {
        recurringFlag: false
      };
      expense = {
        cost: 0
      };
      budget = {
        id: id,
        pendingAmount: 0,
        reimbursedAmount: 0
      };
    });
    describe('when the budget is empty and not recurring expenseType', () => {
      beforeEach(() => {
        budgetDynamo.removeFromDB.and.returnValue(Promise.resolve('removed-budget'));
      });
      it('should call removeFromDB and return the deleted budget', async done => {
        let result = await expenseRoutes._removeFromBudget(budget, expense, expenseType);
        expect(result).toEqual('removed-budget');
        expect(budgetDynamo.removeFromDB).toHaveBeenCalledWith(budget.id);
        done();
      }); // should call removeFromDB and return the deleted budget
    }); // when the budget is empty and not recurring expenseType

    describe('when the budget is not empty or the expenseType is recurring', () => {
      beforeEach(() => {
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve('updated-budget'));
        expenseType.recurringFlag = true;
      });
      it('should call updateEntryInDB and return the updated budget', async done => {
        let result = await expenseRoutes._removeFromBudget(budget, expense, expenseType);
        expect(result).toEqual('updated-budget');
        expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(budget);
        done();
      }); // should call updateEntryInDB and return the updated budget
    }); // when the budget is not empty or the expenseType is recurring
  }); // _removeFromBudget

  describe('_sortBudgets', () => {

    let budget2000, budget2001, budget2002, budgets;

    beforeEach(() => {
      budget2000 = { fiscalStartDate: '2000-01-01' };
      budget2001 = { fiscalStartDate: '2001-01-01' };
      budget2002 = { fiscalStartDate: '2002-01-01' };
      budgets = [budget2000, budget2001, budget2002];
    });

    describe('when budgets are in chronological order', () => {

      it('should be in chronological order', () => {
        expect(expenseRoutes._sortBudgets(budgets)).toEqual(budgets);
      }); // should be in chronological order
    }); // when budgets are in chronological order

    describe('when budgets are out of chronological order', () => {

      let mixBudgets;

      beforeEach(() => {
        mixBudgets = [budget2002, budget2000, budget2001];
      });

      it('should be in chronological order', () => {
        expect(expenseRoutes._sortBudgets(mixBudgets)).toEqual(budgets);
      }); // should be in chronological order
    }); // when budgets are out of chronological order
  }); // _sortBudgets

  describe('_subtractCost', () => {

    let subtractFrom, subtractWith;

    describe('when two numbers round up', () => {

      beforeEach(() => {
        subtractFrom = 2.23456;
        subtractWith = 1.1111;
      });

      it('should return the difference with 2 deciaml percision', () => {
        expect(expenseRoutes._subtractCost(subtractFrom, subtractWith)).toEqual(1.12);
      }); // should return the difference with 2 deciaml percision
    }); // when two numbers round up

    describe('when two numbers round down', () => {

      beforeEach(() => {
        subtractFrom = 2.239;
        subtractWith = 1.1111;
      });

      it('should return the difference with 2 deciaml percision', () => {
        expect(expenseRoutes._subtractCost(subtractFrom, subtractWith)).toEqual(1.13);
      }); // should return the difference with 2 deciaml percision
    }); // when two numbers round down
  }); // _subtractCost

  describe('_unimbursedExpenseChange', () => {

    let oldExpense, newExpense, budget;

    beforeEach(() => {
      oldExpense = {
        cost: 5
      };
      newExpense = {
        cost: 10
      };
      budget = {
        id: 'budgetId',
        pendingAmount: 5
      };
    });

    describe('when new expense is in the same budget', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget);
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
      });

      it('should add the new cost to the orginal budget', () => {
        expenseRoutes._unimbursedExpenseChange(oldExpense, newExpense, budget, undefined).then( data => {
          expect(data.pendingAmount).toEqual(10);
        });
      }); // should add the new cost to the orginal budget
    }); // when new expense is in the same budget

    describe('when new expense is in a different budget', () => {

      beforeEach(() => {
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue({id: 'newBudgetId'});
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
      });

      it('should add the new cost to the new budget, not the original', () => {
        expenseRoutes._unimbursedExpenseChange(oldExpense, newExpense, budget, undefined).then( data => {
          expect(data.pendingAmount).toEqual(0);
        });
      }); // should add the new cost to the new budget, not the original
    }); // when new expense is in a different budget
  }); // _unimbursedExpenseChange

  describe('_unreimburseExpense', () => {

    let oldExpense, newExpense, expenseType, budgets, budget2000, budget2001, budget2002;

    beforeEach(() => {
      oldExpense = {
        userId: 'userId',
        purchaseDate: '2001-01-02',
        reimbursedDate: '2001-01-02',
        cost: 5,
      };
      newExpense = {
        userId: 'userId',
        purchaseDate: '2001-01-02',
        reimbursedDate: undefined,
        cost: 5,
      };
      expenseType = {
        id: 'expenseTypeId',
        budget: 10,
        odFlag: true,
      };
      budget2000 = {
        id: 'budget2000Id',
        reimbursedAmount: 10,
        pendingAmount: 9,
        fiscalStartDate: '2000-01-01',
        fiscalEndDate: '2000-12-31'
      };
      budget2001 = {
        id: 'budget2001Id',
        reimbursedAmount:8,
        pendingAmount: 2,
        fiscalStartDate: '2001-01-01',
        fiscalEndDate: '2001-12-31'
      };
      budget2002 = {
        id: 'budget2002Id',
        reimbursedAmount:0,
        pendingAmount: 0,
        fiscalStartDate: '2002-01-01',
        fiscalEndDate: '2002-12-31'
      };
    });

    describe('when full expense is within a single budget', () => {

      let expectedBudget2001;

      beforeEach(() => {
        budgets = [budget2000, budget2001, budget2002];
        expectedBudget2001 = {
          id: 'budget2001Id',
          reimbursedAmount:3,
          pendingAmount: 7,
          fiscalStartDate: '2001-01-01',
          fiscalEndDate: '2001-12-31'
        };
        budget2001.reimbursedAmount = 8;
        spyOn(expenseRoutes, '_getEmployeeBudgetOverdrafts').and.returnValue([0, 3, 0]);
        spyOn(expenseRoutes, '_getEmployeeExpensesTotalReimbursedInBudget')
          .withArgs('userId', budget2001, expenseType).and.returnValue(8);
      });

      it('should update a single budget', done => {
        expenseRoutes._unreimburseExpense(oldExpense, newExpense, budgets, expenseType).then( () => {
          expect(budgets[1]).toEqual(expectedBudget2001);
          done();
        });
      }); // should update a single budget
    }); // when full expense is within a single budget

    describe('when expense is rolled back a budget', () => {

      let expectedBudget2001, expectedBudget2002;

      beforeEach(() => {
        budget2001.reimbursedAmount = 10;
        budget2002.reimbursedAmount = 3;
        budgets = [budget2000, budget2001, budget2002];
        expectedBudget2001 = {
          id: 'budget2001Id',
          reimbursedAmount:8,
          pendingAmount: 7,
          fiscalStartDate: '2001-01-01',
          fiscalEndDate: '2001-12-31'
        };
        expectedBudget2002 = {
          id: 'budget2002Id',
          reimbursedAmount:0,
          pendingAmount: 0,
          fiscalStartDate: '2002-01-01',
          fiscalEndDate: '2002-12-31'
        };
        //budget2001.reimbursedAmount = 13;
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget2001);
        spyOn(expenseRoutes, '_getEmployeeBudgetOverdrafts').and.returnValue([0, 3, 0]);
        spyOn(expenseRoutes, '_getEmployeeExpensesTotalReimbursedInBudget')
          .withArgs('userId', budget2001, expenseType).and.returnValue(13)
          .withArgs('userId', budget2002, expenseType).and.returnValue(0);
      });

      it('should update the expense budget and the carry over budget', done => {
        expenseRoutes._unreimburseExpense(oldExpense, newExpense, budgets, expenseType).then( () => {
          expect(budgets[1]).toEqual(expectedBudget2001);
          expect(budgets[2]).toEqual(expectedBudget2002);
          done();
        });
      }); // should update the expense budget and the carry over budget
    }); // when expense is rolled back a budget

    describe('when expense is rolled back two budgets both overdrafted', () => {

      let expectedBudget2000, expectedBudget2001, expectedBudget2002;

      beforeEach(() => {
        budget2001.reimbursedAmount = 10;
        budget2002.reimbursedAmount = 6;
        oldExpense.purchaseDate = '2000-01-02';
        newExpense.purchaseDate = '2000-01-02';
        budgets = [budget2000, budget2001, budget2002];
        expectedBudget2000 = {
          id: 'budget2000Id',
          reimbursedAmount:8,
          pendingAmount: 14,
          fiscalStartDate: '2000-01-01',
          fiscalEndDate: '2000-12-31'
        };
        expectedBudget2001 = {
          id: 'budget2001Id',
          reimbursedAmount:10,
          pendingAmount: 2,
          fiscalStartDate: '2001-01-01',
          fiscalEndDate: '2001-12-31'
        };
        expectedBudget2002 = {
          id: 'budget2002Id',
          reimbursedAmount:3,
          pendingAmount: 0,
          fiscalStartDate: '2002-01-01',
          fiscalEndDate: '2002-12-31'
        };
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget2000);
        spyOn(expenseRoutes, '_getEmployeeBudgetOverdrafts').and.returnValue([3, 1, 0]);
        spyOn(expenseRoutes, '_getEmployeeExpensesTotalReimbursedInBudget')
          .withArgs('userId', budget2000, expenseType).and.returnValue(13)
          .withArgs('userId', budget2001, expenseType).and.returnValue(11)
          .withArgs('userId', budget2002, expenseType).and.returnValue(2);

      });

      it('should update the expense budgets and the carry over budgets', done => {
        expenseRoutes._unreimburseExpense(oldExpense, newExpense, budgets, expenseType).then( () => {
          expect(budgets[0]).toEqual(expectedBudget2000);
          expect(budgets[1]).toEqual(expectedBudget2001);
          expect(budgets[2]).toEqual(expectedBudget2002);
          done();
        });
      }); // should update the expense budgets and the carry over budgets
    }); // when expense is rolled back two budgets both overdrafted

    describe('when expense is rolled back two budgets with no middle overdraft', () => {

      let expectedBudget2000, expectedBudget2001, expectedBudget2002;

      beforeEach(() => {
        budget2000.pendingAmount = 0;
        budget2001.reimbursedAmount = 10;
        budget2002.reimbursedAmount = 5;
        oldExpense.cost= 12;
        oldExpense.purchaseDate = '2000-01-02';
        newExpense.cost= 12;
        newExpense.purchaseDate = '2000-01-02';
        budgets = [budget2000, budget2001, budget2002];
        expectedBudget2000 = {
          id: 'budget2000Id',
          reimbursedAmount:0,
          pendingAmount: 12,
          fiscalStartDate: '2000-01-01',
          fiscalEndDate: '2000-12-31'
        };
        expectedBudget2001 = {
          id: 'budget2001Id',
          reimbursedAmount:10,
          pendingAmount: 2,
          fiscalStartDate: '2001-01-01',
          fiscalEndDate: '2001-12-31'
        };
        expectedBudget2002 = {
          id: 'budget2002Id',
          reimbursedAmount: 0,
          pendingAmount: 0,
          fiscalStartDate: '2002-01-01',
          fiscalEndDate: '2002-12-31'
        };
        spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget2000);
        spyOn(expenseRoutes, '_getEmployeeBudgetOverdrafts').and.returnValue([2, 0, -10]);
        spyOn(expenseRoutes, '_getEmployeeExpensesTotalReimbursedInBudget')
          .withArgs('userId', budget2000, expenseType).and.returnValue(12)
          .withArgs('userId', budget2001, expenseType).and.returnValue(10)
          .withArgs('userId', budget2002, expenseType).and.returnValue(0);
      });

      it('should update the expense budgets and the carry over budgets', done => {
        expenseRoutes._unreimburseExpense(oldExpense, newExpense, budgets, expenseType).then( () => {
          expect(budgets[0]).toEqual(expectedBudget2000);
          expect(budgets[1]).toEqual(expectedBudget2001);
          expect(budgets[2]).toEqual(expectedBudget2002);
          done();
        });
      }); // should update the expense budgets and the carry over budgets
    }); // when expense is rolled back two budgets with no middle overdraft
  }); // _unreimburseExpense

  describe('_update', () => {
    let expenseData, localExpenseType, newExpense, oldExpense, budgets;
    beforeEach(() => {
      expenseData = {
        id,
        purchaseDate,
        reimbursedDate,
        note,
        url,
        createdAt,
        receipt,
        cost,
        name,
        description,
        userId,
        expenseTypeId,
        categories
      };
      newExpense = new Expense(expenseData);
      oldExpense = new Expense(expenseData);
      budgets = [new Budget(budget)];

      expenseDynamo.findObjectInDB.and.returnValue(Promise.resolve(expenseData));
      employeeDynamo.findObjectInDB.and.returnValue(Promise.resolve(employee));

      budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgets));
      spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget);
    });

    describe('when expenseTypes match', () => {
      beforeEach(() => {
        expenseType.id = '{expenseTypeId}';
        localExpenseType = new ExpenseType(expenseType);
        expenseTypeDynamo.findObjectInDB.and.returnValue(Promise.resolve(expenseType));

        expenseDynamo.updateEntryInDB.and.returnValue(newExpense);
        //spyOn(expenseRoutes, '_isReimbursed').and.returnValue(Promise.resolve());
        spyOn(expenseRoutes, '_performBudgetUpdate').and.returnValue(Promise.resolve());
        spyOn(expenseRoutes, 'checkValidity').and.returnValue(Promise.resolve());
      });

      afterEach(() => {
        expect(expenseRoutes.checkValidity).toHaveBeenCalledWith(
          newExpense,
          localExpenseType,
          new Budget(budget),
          new Employee(employee),
          oldExpense
        );

        //expect(expenseRoutes._isReimbursed).toHaveBeenCalledWith(oldExpense);
        expect(expenseRoutes._performBudgetUpdate).toHaveBeenCalledWith(
          oldExpense,
          newExpense,
          new Budget(budget),
          budgets,
          localExpenseType
        );
        expect(expenseDynamo.updateEntryInDB).toHaveBeenCalledWith(newExpense);
      });

      it('should return the updated expense', done => {
        return expenseRoutes
          ._update(id, expenseData)
          .then(updatedExpense => {
            expect(updatedExpense).toEqual(newExpense);
            done();
          })
          .catch(err => {
            console.warn(err);
            done(new Error('object rejected'));
          });
      });
    }); // when expenseTypes match

    describe('when expenseTypes do not match', () => {
      let expectedError;
      beforeEach(() => {
        expectedError = {
          code: 403,
          message: 'Submitted Expense\'s expenseTypeId doesn\'t match with one in the database.'
        };
        expenseType.id = '{notTheSameexpenseTypeId}';
        localExpenseType = new ExpenseType(expenseType);
        expenseTypeDynamo.findObjectInDB.and.returnValue(Promise.resolve(expenseType));
      });

      it('should throw an error', done => {
        return expenseRoutes
          ._update(id, expenseData)
          .then(() => {
            done(new Error('object recived - error expected'));
          })
          .catch(err => {
            expect(err).toEqual(expectedError);
            done();
          });
      });
    }); // when expenseTypes do not match

    describe('when expense type is inactive and employee is user', () => {

      beforeEach(() => {
        expenseType.id = '{expenseTypeId}';
        employee.employeeRole = 'user';
        expenseTypeDynamo.findObjectInDB.and.returnValue(Promise.resolve( {isInactive: true} ));
      });

      it('should throw an error', () => {
        expenseRoutes._update(id, expenseData).catch(err => {
          expect(err).toEqual({
            code: 403,
            message: 'Permission Denied. Users can not edit Expenses with an Inactive Expense Type'
          });
        });
      }); // should throw an error
    }); // when expense type is inactive and employee is user

    describe('when update entry in database fails', () => {

      beforeEach(() => {
        expenseType.id = '{expenseTypeId}';
        localExpenseType = new ExpenseType(expenseType);
        expenseTypeDynamo.findObjectInDB.and.returnValue(Promise.resolve(expenseType));
        expenseDynamo.updateEntryInDB.and.returnValue(Promise.reject('there was an error'));
        spyOn(expenseRoutes, '_performBudgetUpdate').and.returnValue(Promise.resolve());
        spyOn(expenseRoutes, 'checkValidity').and.returnValue(Promise.resolve());
      });

      it('should throw an error', done => {
        expenseRoutes._update(id, expenseData).catch( err => {
          expect(err).toEqual('there was an error');
          done();
        });
      }); // should throw an error
    }); // when update entry in database fails
  }); //_update
}); //expenseRoutes
