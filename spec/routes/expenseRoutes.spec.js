const ExpenseRoutes = require('../../routes/expenseRoutes');

const Employee = require('../../models/employee');
const Expense = require('../../models/expense');
const ExpenseType = require('../../models/expenseType');
const moment = require('moment');

describe('expenseRoutes', () => {
  const uuid = 'uuid';
  const id = 'id';
  const purchaseDate = '{purchaseDate}';
  const reimbursedDate = '{reimbursedDate}';
  const cost = '{cost}';
  const description = '{description}';
  const note = '{note}';
  const receipt = '{purchareceiptseDate}';
  const expenseTypeId = '{expenseTypeId}';
  const userId = '{userId}';
  const url = '{url}';
  const budget = '{budget}';
  const employee = {
    id: '{id}',
    firstName: '{firstName}',
    middleName: '{middleName}',
    lastName: '{lastName}',
    empId: '{empId}',
    hireDate: '{hireDate}',
    expenseTypes: '[expenseTypes]',
    email: '{email}',
    employeeRole: '{employeeRole}',
    isActive: '{isActive}'
  };
  const expenseType = {
    id: '{id}',
    budgetName: '{budgetName}',
    budget: '{1000}',
    odFlag: '{true}',
    description: '{description}',
    startDate: '{startDate}',
    endDate: '{endDate}',
    recurringFlag: '{false}'
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
      'updateEntryInDB'
    ]);
    expenseRoutes = new ExpenseRoutes();
    expenseRoutes.budgetDynamo = budgetDynamo;
    expenseRoutes.expenseTypeDynamo = expenseTypeDynamo;
    expenseRoutes.employeeDynamo = employeeDynamo;
    expenseRoutes.expenseDynamo = expenseDynamo;
    spyOn(expenseRoutes, 'getUUID').and.returnValue(uuid);
  });


  describe('_delete', () => {
    let expense;
    beforeEach(() => {
      expense = { id, purchaseDate, reimbursedDate, cost, description, note, receipt, expenseTypeId, userId, url };

      expenseDynamo.findObjectInDB.and.returnValue(Promise.resolve(expense));
      expenseTypeDynamo.findObjectInDB.and.returnValue(Promise.resolve(expenseType));
      budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([budget]));
      expenseDynamo.removeFromDB.and.returnValue(expense);

      spyOn(expenseRoutes, '_findBudgetWithMatchingRange').and.returnValue(budget);
      spyOn(expenseRoutes, '_isReimbursed').and.returnValue(Promise.resolve());
      spyOn(expenseRoutes, '_removeFromBudget').and.returnValue(Promise.resolve());
    });

    afterEach(() => {
      expect(expenseRoutes._isReimbursed).toHaveBeenCalledWith(expense);
      expect(expenseRoutes._removeFromBudget).toHaveBeenCalledWith(budget, expense, expenseType);
      expect(expenseDynamo.removeFromDB).toHaveBeenCalledWith(id);
    });

    it('should return deleted object', done => {
      return expenseRoutes._delete(id).then(deletedExpense => {
        expect(deletedExpense).toEqual(expense);
        done();
      }).catch(err =>{ 
        console.warn(err);
        done(new Error('object rejected'));
      });
    });
  }); // _delete

  describe('_add', () => {
    let data, expectedExpense, localExpenseType, localEmployee;

    beforeEach(() => {
      data = { id, purchaseDate, reimbursedDate, cost, description, note, receipt, expenseTypeId, userId, url };
      expectedExpense = new Expense(data);
      localExpenseType = new ExpenseType(expenseType);
      localEmployee = new Employee(employee);
      employeeDynamo.findObjectInDB.and.returnValue(Promise.resolve(employee));
      expenseTypeDynamo.findObjectInDB.and.returnValue(Promise.resolve(expenseType));
      budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([budget]));
      expenseDynamo.addToDB.and.returnValue(expectedExpense);
      spyOn(expenseRoutes, '_isPurchaseWithinRange').and.returnValue(true);
      spyOn(expenseRoutes, '_getBudgetData').and.returnValue(budget);
      spyOn(expenseRoutes, 'checkValidity').and.returnValue(Promise.resolve());
      spyOn(expenseRoutes, '_decideIfBudgetExists').and.returnValue(Promise.resolve());
    });

    afterEach(() => {
      expect(expenseRoutes._isPurchaseWithinRange).toHaveBeenCalledWith(localExpenseType, purchaseDate);
      expect(expenseRoutes.checkValidity)
        .toHaveBeenCalledWith(expectedExpense, localExpenseType, budget, localEmployee);
      expect(expenseRoutes._decideIfBudgetExists).toHaveBeenCalledWith(budget, expectedExpense, localExpenseType);
      expect(expenseDynamo.addToDB).toHaveBeenCalledWith(expectedExpense);
    });

    it('should return added object', done => {
      return expenseRoutes
        ._add(id, data)
        .then(createdExpense => {
          expect(createdExpense).toEqual(expectedExpense);
          done();
        })
        .catch(err => {
          console.warn(err);
          done(new Error('object rejected'));
        });
    });
  }); //_add

  describe('_update', () => {
    let data, localExpenseType, newExpense, oldExpense, budgets;
    beforeEach(() => {
      data = { id, purchaseDate, reimbursedDate, cost, description, note, receipt, expenseTypeId, userId, url };
      newExpense = new Expense(data);
      oldExpense = new Expense(data);
      budgets = [budget];

      expenseDynamo.findObjectInDB.and.returnValue(Promise.resolve(data));
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
        spyOn(expenseRoutes, '_isReimbursed').and.returnValue(Promise.resolve());
        spyOn(expenseRoutes, '_performBudgetUpdate').and.returnValue(Promise.resolve());
        spyOn(expenseRoutes, 'checkValidity').and.returnValue(Promise.resolve());
      });

      afterEach(() => {
        expect(expenseRoutes.checkValidity).toHaveBeenCalledWith(
          newExpense,
          localExpenseType,
          budget,
          employee,
          oldExpense
        );

        expect(expenseRoutes._isReimbursed).toHaveBeenCalledWith(oldExpense);
        expect(expenseRoutes._performBudgetUpdate).toHaveBeenCalledWith(
          oldExpense,
          newExpense,
          budget,
          budgets,
          localExpenseType
        );
        expect(expenseDynamo.updateEntryInDB).toHaveBeenCalledWith(newExpense);
      });

      it('should return the updated expense', done => {
        return expenseRoutes
          ._update(id, data)
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
          ._update(id, data)
          .then(() => {
            done(new Error('object recived - error expected'));
          })
          .catch(err => {
            expect(err).toEqual(expectedError);
            done();
          });
      });
    }); // when expenseTypes do not match
  }); //_update

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

  describe('checkValidity', () => {
    let expectedErrorObject, expense, oldExpense, startDate, endDate;

    beforeEach(() => {
      expense = {
        purchaseDate:'{purchaseDate}'
      };
      oldExpense = 'oldExpense';
      startDate = '{startDate}';
      endDate = '{endDate}';
      expenseType.recurringFlag = false;
    });
    
    afterEach(() => {
      expect(expenseRoutes._checkExpenseDate).toHaveBeenCalledWith(expense.purchaseDate, startDate, endDate);
      expect(expenseRoutes._checkBalance).toHaveBeenCalledWith(expense, expenseType, budget, oldExpense);
      expect(expenseRoutes._areExpenseTypesEqual).toHaveBeenCalledWith(expense, oldExpense);
    });

    describe('all checks are true', () => {
      let keptItsPromise;
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isActive = true;
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
    }); // all checks are true

    describe('expense is outside of the expense type window', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(false);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isActive = true;
        expectedErrorObject = {
          code: 403,
          message: 'Expense is not valid because: the expense is outside of the expense type window'
        };
      });

      it('should return an error object with the right error message', done => {
        expenseRoutes
          .checkValidity(expense, expenseType, budget, employee, oldExpense)
          .then(() => {
            done(new Error('Promise should reject'));
          })
          .catch((returnedErrorObject) =>{
            expect(returnedErrorObject).toEqual(expectedErrorObject);
            done();
          });
      }); // should return an error object with the right error message
    }); // expense is outside of the expense type window

    describe('expense is over the budget limit', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(false);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isActive = true;
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
          .catch((returnedErrorObject) =>{
            expect(returnedErrorObject).toEqual(expectedErrorObject);
            done();
          });
      }); // should return an error object with the right error message
    }); // expense is over the budget limit

    describe('expense type is not valid', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(false);
        employee.isActive = true;
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
    }); // expense type is not valid

    describe('employee is not active', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(true);
        spyOn(expenseRoutes, '_checkBalance').and.returnValue(true);
        spyOn(expenseRoutes, '_areExpenseTypesEqual').and.returnValue(true);
        employee.isActive = false;
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
    }); // employee is not active

  }); // checkValidity
}); //expenseRoutes
