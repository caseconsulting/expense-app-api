const ExpenseRoutes = require('../../routes/expenseRoutes');

// const _ = require('lodash');

const Employee = require('../../models/employee');
const Expense = require('../../models/expense');
const ExpenseType = require('../../models/expenseType');

describe('expenseRoutes', () => {
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
          expect(expenseRoutes._createNewBudget).toHaveBeenCalledWith(expenseType, employee);
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

  describe('_areExpenseTypesEqual', () => {
    let expense, oldExpense;
    describe('if both expenses exist', () => {
      beforeEach(() => {
        expense = { expenseTypeId: '{expenseTypeId#1}' };
        oldExpense = { expenseTypeId: '{expenseTypeId#2}' };
      });
      it('should compare the two expenseType Id\'s', done => {
        let result = expenseRoutes._areExpenseTypesEqual(expense,oldExpense);
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
        let result = expenseRoutes._areExpenseTypesEqual(expense,oldExpense);
        expect(result).toBe(true);
        done();
      }); // should return true when the oldExpense does not exist
    }); // if there is no old expense
  }); // _areExpenseTypesEqual 

  describe('_checkBalance', () => {
    let expense, oldExpense, budget,expenseType;

    beforeEach(() => {
      expense = oldExpense = {
        cost: 0
      };
      expenseType = {
        budget: 0,
        odFlag:false
      };
      budget = {
        reimbursedAmount: 0,
        pendingAmount: 0
      };
    });
    describe('no budget exsits yet, but cost is valid', () => {
      beforeEach(() => { budget = undefined; });
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
        let result = expenseRoutes._checkExpenseDate(purchaseDate,stringStartDate, stringEndDate);
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
}); //expenseRoutes
