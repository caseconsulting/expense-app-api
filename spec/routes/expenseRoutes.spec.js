const uuid = require('uuid/v4');
const ExpenseRoutes = require('../../routes/expenseRoutes');
const _ = require('lodash');
describe('expenseRoutes', () => {
  let databaseModify, expenseRoutes;
  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB', 'updateEntryInDB']);
    expenseRoutes = new ExpenseRoutes(databaseModify, uuid());
    // employeeDynamo = jasmine.createSpyObj('expenseRoutes.', ['findObjectInDB','updateEntryInDB']);
    // expenseTypeDynamo = jasmine.createSpyObj('expenseTypeDynamo', ['findObjectInDB']);
  });

  describe('_add', () => {
    let newExpense, uuid;
    beforeEach(() => {
      spyOn(expenseRoutes, 'validateCostToBudget').and.returnValue(Promise.resolve());
      uuid = 'uuid';
      newExpense = {
        expenseId: '{expenseId}',
        purchaseDate: '{purchaseDate}',
        reimbursedDate: '{reimbursedDate}',
        cost: '{cost}',
        description: '{description}',
        note: '{note}',
        receipt: '{receipt}',
        expenseTypeId: '{expenseTypeId}',
        userId: '{userId}',
        createdAt: '{createdAt}'
      };
    });
    it('should take in an expense', done => {
      return expenseRoutes._add(uuid, newExpense).then(created => {
        expect(created).toEqual({
          id: 'uuid',
          purchaseDate: '{purchaseDate}',
          reimbursedDate: '{reimbursedDate}',
          cost: '{cost}',
          description: '{description}',
          note: '{note}',
          receipt: '{receipt}',
          expenseTypeId: '{expenseTypeId}',
          userId: '{userId}',
          createdAt: '{createdAt}'
        });
        done();
      });
    });
  }); //_add
  describe('_update', () => {
    let newExpense, id;
    beforeEach(() => {
      id = '{id}';
      newExpense = {
        expenseId: '{expenseId}',
        purchaseDate: '{purchaseDate}',
        reimbursedDate: '{reimbursedDate}',
        cost: '{cost}',
        description: '{description}',
        note: '{note}',
        receipt: '{receipt}',
        expenseTypeId: '{expenseTypeId}',
        userId: '{userId}',
        createdAt: '{createdAt}'
      };
      databaseModify.findObjectInDB.and.returnValue(Promise.resolve(newExpense));
      spyOn(expenseRoutes, 'deleteCostFromBudget').and.returnValue(Promise.resolve());
      spyOn(expenseRoutes, 'validateCostToBudget').and.returnValue(Promise.resolve());
    });
    it('should update an expense', () => {
      return expenseRoutes._update(id, newExpense).then(updated => {
        expect(expenseRoutes.deleteCostFromBudget).toHaveBeenCalledWith(
          newExpense.expenseTypeId,
          newExpense.userId,
          newExpense.cost
        );
        expect(expenseRoutes.validateCostToBudget).toHaveBeenCalledWith(
          newExpense.expenseTypeId,
          newExpense.userId,
          newExpense.cost
        );
        expect(updated).toEqual({
          id: '{id}',
          purchaseDate: '{purchaseDate}',
          reimbursedDate: '{reimbursedDate}',
          cost: '{cost}',
          description: '{description}',
          note: '{note}',
          receipt: '{receipt}',
          expenseTypeId: '{expenseTypeId}',
          userId: '{userId}',
          createdAt: '{createdAt}'
        });
      });
    });
  }); //_update

  describe('validateCostToBudget', () => {
    let expenseType, employee, expenseTypeId, cost, userId;

    beforeEach(() => {
      userId = 'userId';
      cost = 'cost';
      expenseTypeId = 'expenseTypeId';
      employee = {
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
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

  describe('deleteCostFromBudget', () => {
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
          empId: '{empId}',
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

  describe('_findExpense', () => {
    let employee, expenseTypeId, cost;
    describe('promise resolves', () => {
      beforeEach(() => {
        cost = 200;
        expenseTypeId = 'expenseTypeId';
        employee = {
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          empId: '{empId}',
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
        expect(expenseRoutes.employeeDynamo.updateEntryInDB).toHaveBeenCalledWith(
          {
            firstName: '{firstName}',
            middleName: '{middleName}',
            lastName: '{lastName}',
            empId: '{empId}',
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
        expect(()=>{
          expenseRoutes._findExpense(expenseTypeId, cost, employee);
        }).toThrow({
          code: 404,
          message: 'Expense not found'
        });
      }); //should throw an error
    }); //when expenseType not found
  }); //_findExpense,


  describe('_isCoveredByOverdraft', () => {
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

  describe('_isPartiallyCoveredByOverdraftIfYoureReadingThisThenIAmVerySorry', () => {
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

  describe('_addPartialCoverageByOverdraftBlessYourSoulChild', () => {
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
    describe('if the expense is not partially covered', () => {
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

  describe('_isCovered', () => {
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
  describe('_initializeNewBudget', () => {
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

  describe('_addToOverdraftCoverage', () => {
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
  describe('_appPartialCoverage', () => {
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

  describe('_addToBudget', () => {
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

  describe('performBudgetOperation', () => {
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
