const ExpenseRoutes = require('../../routes/expenseRoutes');

const _ = require('lodash');

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
    startDate: '{2019-05-14}',
    endDate: '{2019-05-16}',
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

  xdescribe('validateCostToBudget', () => {
    let expenseType, employee, expenseTypeId, cost, userId;

    beforeEach(() => {
      userId = 'userId';
      cost = 'cost';
      expenseTypeId = 'expenseTypeId';
      employee = {
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        employeeNumber: '{employeeNumber}',
        hireDate: '{hireDate}',
        expenseTypes: []
      };
      expenseType = 'expenseType';
    });
    describe('promise resolves', () => {
      beforeEach(() => {
        spyOn(expenseRoutes.expenseTypeDynamo, 'findObjectInDB').and.returnValue(Promise.resolve(expenseType));
        spyOn(expenseRoutes.employeeDynamo, 'findObjectInDB').and.returnValue(Promise.resolve(employee));
        spyOn(expenseRoutes, 'createNewBalance').and.returnValue(Promise.resolve());
        spyOn(expenseRoutes, 'performBudgetOperation').and.returnValue(Promise.resolve());
      });
      it('should return employee from DB', done => {
        expenseRoutes.validateCostToBudget(expenseTypeId, userId, cost).then(() => {
          expect(expenseRoutes.employeeDynamo.findObjectInDB).toHaveBeenCalledWith(userId);
          expect(expenseRoutes.createNewBalance).toHaveBeenCalledWith(employee);
          expect(expenseRoutes.performBudgetOperation).toHaveBeenCalledWith(employee, expenseType, cost);
          done();
        });
      });
      it('should call expenseTypeDynamo findObjectInDB', () => {
        expenseRoutes.validateCostToBudget(expenseTypeId, userId, cost);
        expect(expenseRoutes.expenseTypeDynamo.findObjectInDB).toHaveBeenCalledWith(expenseTypeId);
      });
    }); // promise resolves
    describe('promise rejects', () => {
      beforeEach(() => {
        spyOn(expenseRoutes.expenseTypeDynamo, 'findObjectInDB').and.returnValue(Promise.reject('error'));
      });

      it('should return the error from Promise', done => {
        expenseRoutes.validateCostToBudget(expenseTypeId, userId, cost).catch(err => {
          expect(err).toEqual('error');
          done();
        });
      });
    }); // promise rejects
  }); // validateCostToBudget

  xdescribe('deleteCostFromBudget', () => {
    let employee, userId, expenseTypeId, cost;
    describe('promise resolves', () => {
      beforeEach(() => {
        userId = 'userId';
        cost = 'cost';
        expenseTypeId = 'expenseTypeId';
        employee = {
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          employeeNumber: '{employeeNumber}',
          hireDate: '{hireDate}',
          expenseTypes: [
            {
              id: 'expenseTypeId',
              balance: '1000'
            }
          ]
        };
        spyOn(expenseRoutes.employeeDynamo, 'findObjectInDB').and.returnValue(Promise.resolve(employee));
        spyOn(expenseRoutes, '_findExpense');
      });
      it('should call _findExpense', () => {
        expenseRoutes.deleteCostFromBudget(expenseTypeId, userId, cost).then(() => {
          expect(expenseRoutes._findExpense).toHaveBeenCalledWith(expenseTypeId, cost, employee);
        });
      }); //if there is employee balance
    }); //promise resolves
    describe('promise rejects', () => {
      let err;
      beforeEach(() => {
        err = 'err';
        spyOn(expenseRoutes.employeeDynamo, 'findObjectInDB').and.returnValue(Promise.reject('err'));
      });
      it('should throw an error', () => {
        expenseRoutes.deleteCostFromBudget(expenseTypeId, userId, cost).catch(caughtErr => {
          expect(caughtErr).toEqual(err);
        });
      });
    }); //promise rejects
  }); //deleteCostFromBudget

  xdescribe('_findExpense', () => {
    let employee, expenseTypeId, cost;
    describe('promise resolves', () => {
      beforeEach(() => {
        cost = 200;
        expenseTypeId = 'expenseTypeId';
        employee = {
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          employeeNumber: '{employeeNumber}',
          hireDate: '{hireDate}',
          expenseTypes: [
            {
              id: 'expenseTypeId',
              balance: 1000,
              owedAmount: 500
            }
          ]
        };
        spyOn(_, 'findIndex').and.returnValue(0);
        spyOn(expenseRoutes.employeeDynamo, 'updateEntryInDB').and.returnValue(Promise.resolve(employee));
      });

      it('should return the location of the expense type', () => {
        expenseRoutes._findExpense(expenseTypeId, cost, employee);
        expect(expenseRoutes.employeeDynamo.updateEntryInDB).toHaveBeenCalledWith({
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          employeeNumber: '{employeeNumber}',
          hireDate: '{hireDate}',
          expenseTypes: [
            {
              id: 'expenseTypeId',
              balance: 1000,
              owedAmount: 300
            }
          ]
        });
      }); //should return the location of the expense type
    }); //promise resolves
    describe('when expenseType not found', () => {
      beforeEach(() => {
        spyOn(_, 'findIndex').and.returnValue(-1);
      });
      it('should throw an error', () => {
        expect(() => {
          expenseRoutes._findExpense(expenseTypeId, cost, employee);
        }).toThrow({
          code: 404,
          message: 'Expense not found'
        });
      }); //should throw an error
    }); //when expenseType not found
  }); //_findExpense,

  xdescribe('_isCoveredByOverdraft', () => {
    let expenseType, employeeBalance;

    describe('if covered by covered by overdraft', () => {
      beforeEach(() => {
        employeeBalance = 1500;
        expenseType = {
          budget: 1000,
          odFlag: true
        };
      });
      it('should return true', () => {
        expect(expenseRoutes._isCoveredByOverdraft(expenseType, employeeBalance)).toEqual(true);
      });
    }); //if covered by covered by overdraft
    describe('if not covered by overdraft', () => {
      beforeEach(() => {
        employeeBalance = 1500;
        expenseType = {
          budget: 1000,
          odFlag: false
        };
      });
      it('should return false ', () => {
        expect(expenseRoutes._isCoveredByOverdraft(expenseType, employeeBalance)).toEqual(false);
      });
    }); //if not covered by overdraft
  }); //_isCoveredByOverdraft

  xdescribe('_isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry', () => {
    let expenseType, employeeBalance;

    describe('if partially covered by overdraft', () => {
      beforeEach(() => {
        employeeBalance = 5500;
        expenseType = {
          budget: 2000,
          odFlag: true
        };
      });
      it('should return true', () => {
        expect(
          expenseRoutes._isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry(expenseType, employeeBalance)
        ).toEqual(true);
      });
    }); //if covered by covered by overdraft
    describe('if not covered by overdraft', () => {
      beforeEach(() => {
        employeeBalance = 5500;
        expenseType = {
          budget: 2000,
          odFlag: false
        };
      });
      it('should return false ', () => {
        expect(
          expenseRoutes._isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry(expenseType, employeeBalance)
        ).toEqual(false);
      });
    }); //if not covered by overdraft
  }); //_isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry

  xdescribe('_addPartialCoverageByOverdraftBlessYourSoulChild', () => {
    let employee, budgetPosition, expenseType, cost;
    beforeEach(() => {
      employee = {
        expenseTypes: [
          {
            balance: 'balance',
            owedAmount: 'owedAmount'
          }
        ]
      };
      budgetPosition = 0;
      expenseType = {
        budget: 'budget'
      };
      cost = 2500;
      spyOn(expenseRoutes.employeeDynamo, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('should return a promise', done => {
      expenseRoutes
        ._addPartialCoverageByOverdraftBlessYourSoulChild(employee, expenseType, budgetPosition, cost)
        .then(() => {
          expect(expenseRoutes.employeeDynamo.updateEntryInDB).toHaveBeenCalledWith(employee);
          done();
        });
    }); //should return a promise
  }); // _addPartialCoverageByOverdraftBlessYourSoulChild

  describe('_isPartiallyCovered', () => {
    let expenseType, employee, budgetPosition, remaining, employeeBalance;
    describe('if the expense is paritally covered', () => {
      beforeEach(() => {
        expenseType = {
          budget: 1000,
          odFlag: false
        };
        employee = {
          expenseTypes: [
            {
              balance: 3000
            }
          ]
        };
        budgetPosition = 0;
        remaining = -50;
        employeeBalance = 1500;
      });
      it('should return true', () => {
        expect(expenseRoutes._);
      });
    }); //should return return

    xdescribe('if the expense is not partially covered', () => {
      beforeEach(() => {
        expenseType = {
          budget: 1000,
          odFlag: false
        };
        employee = {
          expenseTypes: [
            {
              balance: 3000
            }
          ]
        };
        budgetPosition = 0;
        remaining = 100;
        employeeBalance = 1500;
      });
      it('should return false', () => {
        expect(
          expenseRoutes._isPartiallyCovered(expenseType, employee, budgetPosition, remaining, employeeBalance)
        ).toEqual(false);
      });
    }); //if the expense is not partially covered
  });

  xdescribe('_isCovered', () => {
    let expenseType, employeeBalance;
    describe('if the expense is covered', () => {
      beforeEach(() => {
        expenseType = {
          budget: 1000
        };
        employeeBalance = 500;
      });
      it('should return true', () => {
        expect(expenseRoutes._isCovered(expenseType, employeeBalance)).toEqual(true);
      });
    }); //if the expense is covered
    describe('if the expense is not covered', () => {
      beforeEach(() => {
        expenseType = {
          budget: 500
        };
        employeeBalance = 1000;
      });
      it('should return false', () => {
        expect(expenseRoutes._isCovered(expenseType, employeeBalance)).toEqual(false);
      });
    }); //if the expense is not covered
  }); //_isCovered

  xdescribe('_initializeNewBudget', () => {
    let expenseType, employee, cost;
    beforeEach(() => {
      expenseType = 'expenseType';
      employee = { expenseTypes: [] };
      cost = 'cost';
      spyOn(expenseRoutes.employeeDynamo, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('should return a promise', done => {
      expenseRoutes._initializeNewBudget(expenseType, employee, cost).then(() => {
        expect(expenseRoutes.employeeDynamo.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });
    });
  }); //_initializeNewBudget

  xdescribe('_addToOverdraftCoverage', () => {
    let employee, budgetPosition, employeeBalance;
    beforeEach(() => {
      employee = {
        expenseTypes: [
          {
            balance: 'balance'
          }
        ]
      };
      employeeBalance = 200;
      budgetPosition = 0;
      spyOn(expenseRoutes.employeeDynamo, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('should return promise', done => {
      expenseRoutes._addToOverdraftCoverage(employee, budgetPosition, employeeBalance).then(() => {
        expect(expenseRoutes.employeeDynamo.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });
    });
  }); //_addToOverdraftCoverage

  xdescribe('_appPartialCoverage', () => {
    let employee, budgetPosition, expenseType, remaining;
    beforeEach(() => {
      employee = {
        expenseTypes: [
          {
            balance: 'balance',
            owedAmount: 'owedAmount'
          }
        ]
      };
      budgetPosition = 0;
      expenseType = {
        budget: 'budget'
      };
      remaining = 200;
      spyOn(expenseRoutes.employeeDynamo, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('should return a promise', done => {
      expenseRoutes._addPartialCoverage(employee, expenseType, budgetPosition, remaining).then(() => {
        expect(expenseRoutes.employeeDynamo.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });
    }); //should return a promise
  }); // _appPartialCoverage

  xdescribe('_addToBudget', () => {
    let employee, budgetPosition, employeeBalance;
    beforeEach(() => {
      employeeBalance = 0;
      employee = {
        expenseTypes: [
          {
            balance: 'balance'
          }
        ],
        owedAmount: 0
      };
      budgetPosition = 0;
      spyOn(expenseRoutes.employeeDynamo, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('it should return a promise', done => {
      expenseRoutes._addToBudget(employee, budgetPosition, employeeBalance).then(() => {
        expect(expenseRoutes.employeeDynamo.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });
    }); //it should return a promise
  }); //_addToBudget

  xdescribe('performBudgetOperation', () => {
    let employee, expenseType, cost, budgetPosition, employeeBalance, remaining, expectedErr;
    beforeEach(() => {
      employeeBalance = 0;
      employee = {
        expenseTypes: [
          {
            id: 'id',
            balance: 0
          }
        ],
        owedAmount: 0
      };
      expenseType = {
        id: 'id',
        budget: 1
      };
      cost = 1;
      budgetPosition = 0;
      remaining = 0;
      expectedErr = {
        code: 406,
        message: `expense over budget limit: ${Math.abs(remaining)}`
      };
    });
    describe('findIndex is called', () => {
      beforeEach(() => spyOn(_, 'findIndex').and.returnValue(0));
      it('should return an id', () => {
        expenseRoutes.performBudgetOperation(employee, expenseType, cost);
        expect(_.findIndex).toHaveBeenCalledWith(employee.expenseTypes, jasmine.any(Function));
      });
    }); // findIndex is called
    describe('no employee balance', () => {
      beforeEach(() => {
        spyOn(_, 'findIndex').and.returnValue(-1);
        spyOn(expenseRoutes, '_initializeNewBudget').and.returnValue(Promise.resolve());
      });

      it('should call _initializeNewBudget', done => {
        expenseRoutes.performBudgetOperation(employee, expenseType, cost).then(() => {
          expect(expenseRoutes._initializeNewBudget).toHaveBeenCalledWith(expenseType, employee, cost);
          done();
        });
      });
    }); //no employee employeeBalance
    describe('_isCoveredByOverdraft returns true', () => {
      beforeEach(() => {
        spyOn(_, 'findIndex').and.returnValue(0);
        spyOn(expenseRoutes, '_isCoveredByOverdraft').and.returnValue(true);
        spyOn(expenseRoutes, '_addToOverdraftCoverage').and.returnValue(Promise.resolve());
      });

      it('should call _addToOverdraftCoverage', done => {
        expenseRoutes.performBudgetOperation(employee, expenseType, cost).then(() => {
          expect(expenseRoutes._isCoveredByOverdraft).toHaveBeenCalledWith(expenseType, employeeBalance + cost);
          expect(expenseRoutes._addToOverdraftCoverage).toHaveBeenCalledWith(
            employee,
            budgetPosition,
            employeeBalance + cost
          );
          done();
        });
      });
    }); //no employee employeeBalance

    describe('_isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry returns true', () => {
      beforeEach(() => {
        spyOn(_, 'findIndex').and.returnValue(0);
        spyOn(expenseRoutes, '_isCoveredByOverdraft').and.returnValue(false);
        spyOn(expenseRoutes, '_isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry').and.returnValue(true);
        spyOn(expenseRoutes, '_addPartialCoverageByOverdraftBlessYourSoulChild').and.returnValue(Promise.resolve());
      });

      it('should call _isPartiallyCovered', done => {
        expenseRoutes.performBudgetOperation(employee, expenseType, cost).then(() => {
          expect(expenseRoutes._isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry).toHaveBeenCalledWith(
            expenseType,
            employeeBalance + cost
          );
          expect(expenseRoutes._addPartialCoverageByOverdraftBlessYourSoulChild).toHaveBeenCalledWith(
            employee,
            expenseType,
            budgetPosition,
            cost
          );
          done();
        });
      });
    }); //no employee employeeBalance

    describe('_isPartiallyCovered returns true', () => {
      beforeEach(() => {
        spyOn(_, 'findIndex').and.returnValue(0);
        spyOn(expenseRoutes, '_isCoveredByOverdraft').and.returnValue(false);
        spyOn(expenseRoutes, '_isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry').and.returnValue(false);
        spyOn(expenseRoutes, '_isPartiallyCovered').and.returnValue(true);
        spyOn(expenseRoutes, '_addPartialCoverage').and.returnValue(Promise.resolve());
      });

      it('should call _isPartiallyCovered', done => {
        expenseRoutes.performBudgetOperation(employee, expenseType, cost).then(() => {
          expect(expenseRoutes._isPartiallyCovered).toHaveBeenCalledWith(
            expenseType,
            employee,
            budgetPosition,
            remaining,
            employeeBalance + cost
          );
          expect(expenseRoutes._addPartialCoverage).toHaveBeenCalledWith(
            employee,
            expenseType,
            budgetPosition,
            remaining
          );
          done();
        });
      });
    }); //no employee employeeBalance

    describe('_isCovered returns true', () => {
      beforeEach(() => {
        spyOn(_, 'findIndex').and.returnValue(0);
        spyOn(expenseRoutes, '_isCoveredByOverdraft').and.returnValue(false);
        spyOn(expenseRoutes, '_isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry').and.returnValue(false);
        spyOn(expenseRoutes, '_isPartiallyCovered').and.returnValue(false);
        spyOn(expenseRoutes, '_isCovered').and.returnValue(true);
        spyOn(expenseRoutes, '_addToBudget').and.returnValue(Promise.resolve());
      });

      it('should call _addToBudget', done => {
        expenseRoutes.performBudgetOperation(employee, expenseType, cost).then(() => {
          expect(expenseRoutes._isCovered).toHaveBeenCalledWith(expenseType, employeeBalance + cost);
          expect(expenseRoutes._addToBudget).toHaveBeenCalledWith(employee, budgetPosition, employeeBalance + cost);
          done();
        });
      });
    }); //no employee employeeBalance

    describe('else', () => {
      beforeEach(() => {
        spyOn(_, 'findIndex').and.returnValue(0);
        spyOn(expenseRoutes, '_isCoveredByOverdraft').and.returnValue(false);
        spyOn(expenseRoutes, '_isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry').and.returnValue(false);
        spyOn(expenseRoutes, '_isPartiallyCovered').and.returnValue(false);
        spyOn(expenseRoutes, '_isCovered').and.returnValue(false);
      });

      it('should call throw a rejected promise', done => {
        expenseRoutes.performBudgetOperation(employee, expenseType, cost).catch(err => {
          expect(err).toEqual(expectedErr);
          done();
        });
      });
    }); //no employee employeeBalance
  }); // performBudgetOperation
});
