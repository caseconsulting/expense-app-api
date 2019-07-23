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

  describe('_getBudgetDates', () => {
    let hireDate,
      expectedObj,
      expectedAnniversaryMonth,
      expectedAnniversaryDay,
      currentYear,
      expectedStartDate,
      expectedEndDate,
      startYear,
      anniversaryComparisonDate;
      
    beforeEach(() => {
      hireDate = '1970-12-31';
      expectedAnniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
      expectedAnniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
      currentYear = moment().year();
      anniversaryComparisonDate = moment([currentYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
      startYear = anniversaryComparisonDate.isSameOrBefore(moment(), 'day') ? currentYear : currentYear - 1;
      expectedStartDate = moment([startYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
      expectedEndDate = moment([startYear + 1, expectedAnniversaryMonth, expectedAnniversaryDay-1]);

      expectedObj = {
        startDate: expectedStartDate,
        endDate: expectedEndDate
      };


    });

    it('should return an object with a start and end date', done => {
      let returnedObj = expenseRoutes._getBudgetDates(hireDate);
      expect(returnedObj).toEqual(expectedObj);
      done();
    }); // should return an object with a start and end date
  }); // _getBudgetDates

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
    let expectedBudget,expense;
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
      
      
      
    }); 

    describe('when the budget does exist', () => {
      beforeEach(() => {
        spyOn(expenseRoutes, '_addExpenseToBudget').and.returnValue(budget);
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
      });
      afterEach(()=>{
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

  describe('_isReimbursed', () => {
    let expense, keptItsPromise, expectedError;
    describe('when there is no reimbursedDate', () => {
      beforeEach(() => {
        expense = {
          reimbursedDate: undefined
        };
      });

      it('should return a resolved promise', done => {
        expenseRoutes._isReimbursed(expense).then(()=>{
          keptItsPromise = true;
          expect(keptItsPromise).toBe(true);
          done();
        }).catch(()=> done(new Error('Promise should resolve')));
      }); // should return a resolved promise
    }); // when there is no reimbursedDate

    describe('when there is a reimbursedDate', () => {
      beforeEach(() => {
        expense = {
          reimbursedDate: 'is exist'
        };
        expectedError = {
          code: 403,
          message: 'expense cannot perform action because it has already been reimbursed'
        };
      });

      it('should return an error', done => {
        expenseRoutes
          ._isReimbursed(expense)
          .then(() => done(new Error('Promise should reject')))
          .catch((err) =>{ 
            expect(err).toEqual(expectedError);
            done();
          });
      }); // should return an error
    }); // when there is a reimbursedDate
  }); // _isReimbursed

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
        id:id,
        pendingAmount: 0,
        reimbursedAmount: 0
      };
    });
    describe('when the budget is empty and not recurring expenseType', () => {
      beforeEach(() => {
        budgetDynamo.removeFromDB.and.returnValue(Promise.resolve('removed-budget'));
      });
      it('should call removeFromDB and return the deleted budget', async done => {
        let result = await expenseRoutes._removeFromBudget(budget,expense, expenseType);
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
          message: 'Purchase Date is before ' + expenseType.startDate
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
          message: 'Purchase Date is after ' + expenseType.endDate
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
        let results = expenseRoutes._findBudgetWithMatchingRange(budgets,purchaseDate);
        expect(results).toEqual(budget);
        expect(expenseRoutes._checkExpenseDate)
          .toHaveBeenCalledWith(purchaseDate, budget.fiscalStartDate,budget.fiscalEndDate);
        done();
      }); // should return the array of valid budgets
    }); // when validBudgets are found
  
    describe('when no valid budgets are found', () => {
      let expectedError;
      beforeEach(() => {
        expectedError = {
          code: 403,
          message: 'Purchase Date is out of range of the budget'
        };
        spyOn(expenseRoutes, '_checkExpenseDate').and.returnValue(false);
      });

      it('should throw an error', done => {
        try {
          expenseRoutes._findBudgetWithMatchingRange(budgets, purchaseDate);
          done(new Error('_findBudgetWithMatchingRange should throw an error when no valid budgets are found'));
        } catch (thrownError) {
          expect(thrownError).toEqual(expectedError);
          expect(expenseRoutes._checkExpenseDate)
            .toHaveBeenCalledWith(purchaseDate, budget.fiscalStartDate, budget.fiscalEndDate);
          done();
        }
      }); // should throw an error
    }); // when no valid budgets are found
  }); // _findBudgetWithMatchingRange

  describe('_calculateOverdraft', () => {
    let budget, expenseType;
    describe('when expenseType can be overdrafted and sum is less than the expenseTypes budget', () => {
      beforeEach(() => {
        budget = {
          reimbursedAmount: 0,
          pendingAmount: 2
        };
        expenseType = {
          odFlag: true,
          budget: 1
        };
      });

      it('should return the difference of sum and the expenseType budget', done => {
        let result = expenseRoutes._calculateOverdraft(budget, expenseType);
        expect(result).toEqual(1);
        done();
      }); // should return the difference of sum and the expenseType budget
    }); // when expenseType can be overdrafted and sum is less than the expenseTypes budget

    describe('when the expenseType is not overdraftable or the sum is less than the budget for the expenseType', () => {
      beforeEach(() => {
        budget = {
          reimbursedAmount: 0,
          pendingAmount: 1
        };
        expenseType = {
          odFlag: true,
          budget: 1
        };
      });

      it('should return zero', done => {
        let result = expenseRoutes._calculateOverdraft(budget, expenseType);
        expect(result).toEqual(0);
        done();
      }); // should return zero
    }); // when the expenseType is not overdraftable or the sum is less than the budget for the expenseType
  }); // _calculateOverdraft

  describe('_performBudgetUpdate', () => {
    let oldExpense, newExpense, budget, budgets;
    beforeEach(() => {
      oldExpense = {
        reimbursedDate: reimbursedDate,
        cost: 0
      };
      newExpense = {
        reimbursedDate: reimbursedDate,
        cost: 0
      };
      budget = {
        pendingAmount: 1,
        reimbursedAmount: 0
      };

    });
    
    afterEach(() => {
      expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(budget);
    });
    
    describe('when the old expense is unreimbursed and the new expense is reimbursed but cost is the same', () => {
      beforeEach(() => {
        oldExpense.reimbursedDate = undefined;
        budget = 'returned-budget-from-_budgetUpdateForReimbursedExpense';
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
        spyOn(expenseRoutes, '_budgetUpdateForReimbursedExpense').and.returnValue(budget);
      });

      afterEach(()=>{
        expect(expenseRoutes._budgetUpdateForReimbursedExpense).toHaveBeenCalledWith(
          oldExpense,
          newExpense,
          budget,
          budgets,
          expenseType
        );
      });
      it('should return the updated budget and call updateEntryInDB', done => {
        expenseRoutes._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType)
          .then((returnedBudget)=>{
            expect(returnedBudget).toEqual(budget);
            done();
          });
      }); // should call _budgetUpdateForReimbursedExpense and updateEntryInDB
    }); // when the old expense is unreimbursed and the new expense is reimbursed but cost is the same

    describe('when the old expense is unreimbursed and the new expense is reimbursed and costs are different', () => {
      let expectedBudget;
      beforeEach(() => {
        oldExpense.reimbursedDate = undefined;
        oldExpense.cost = 1;
        newExpense.cost = 1;
        expectedBudget = {
          pendingAmount: 0,
          reimbursedAmount: 1
        };
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
      });
      it('should return a budget with updated budget amounts', done => {
        expenseRoutes._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType)
          .then((returnedBudget)=>{
            expect(returnedBudget).toEqual(expectedBudget);
            done();
          });
      }); // should return a budget with updated budget amounts
    }); // when the old expense is unreimbursed and the new expense is reimbursed and costs are differen

    describe('when both new and old expenses are reimbursed and both costs are different', () => {
      let expectedBudget;
      beforeEach(() => {
        oldExpense.reimbursedDate = undefined;
        newExpense.reimbursedDate = undefined;
        oldExpense.cost = 1;
        newExpense.cost = 2;
        expectedBudget = {
          pendingAmount: 2,
          reimbursedAmount: 0
        };
        budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(budget));
      });

      it('should return a budget with an updated pendingAmount', done => {
        expenseRoutes._performBudgetUpdate(oldExpense, newExpense, budget, budgets, expenseType)
          .then(returnedBudget => {
            expect(returnedBudget).toEqual(expectedBudget);
            done();
          });
      }); // should return a budget with an updated pendingAmount
    }); // when both new and old expenses are reimbursed and both costs are different
  }); // _performBudgetUpdate

  describe('_budgetUpdateForReimbursedExpense', () => {
    let oldExpense, newExpense, budgets, budget;
    beforeEach(() => {
      spyOn(expenseRoutes,'_calculateOverdraft');
      budgets = ['budget'];
      oldExpense = 'oldExpense';
      newExpense = 'newExpense';
    });
    describe('when overdraft amount is greater than zero', () => {
      beforeEach(() => {
        budget = 'moved-purchase-to-next-year';
        expenseRoutes._calculateOverdraft.and.returnValue(1);
        spyOn(expenseRoutes, '_movePurchaseToNextBudgetYear').and.returnValue(budget);
      });
      
      afterEach(()=>{
        expect(expenseRoutes._movePurchaseToNextBudgetYear).toHaveBeenCalledWith(
          oldExpense,
          newExpense,
          budget,
          budgets,
          expenseType
        );
        expect(expenseRoutes._calculateOverdraft).toHaveBeenCalledWith(budget,expenseType);
      });
      it('should call _movePurchaseToNextYear', done => {
        let result = expenseRoutes
          ._budgetUpdateForReimbursedExpense(oldExpense, newExpense, budget, budgets, expenseType);
        expect(result).toEqual(budget);
        done();
      }); // should call _movePurchaseToNextYear
    }); // when overdraft amount is greater than zero
    describe('when the overdraft amount is zero or less', () => {
      let expectedBudget;
      beforeEach(() => {
        budget = {
          pendingAmount: 1,
          reimbursedAmount: 0
        };
        expectedBudget = {
          pendingAmount: 0,
          reimbursedAmount: 1
        };
        oldExpense = {
          cost: 1
        };
        newExpense = {
          cost: 1
        };
        expenseRoutes._calculateOverdraft.and.returnValue(-1);
      });
      it('should preform a normal budget operation', done => {
        let result = expenseRoutes
          ._budgetUpdateForReimbursedExpense(oldExpense, newExpense, budget, budgets, expenseType);
        expect(result).toEqual(expectedBudget);
        done();
      }); // should preform a normal budget operation
    }); // when the overdraft amount is zero or less
  }); // _budgetUpdateForReimbursedExpense 
}); //expenseRoutes
