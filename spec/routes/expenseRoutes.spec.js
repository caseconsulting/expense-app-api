const uuid = require('uuid/v4');
const ExpenseRoutes = require('../../routes/expenseRoutes');

describe('expenseRoutes', () => {
  let databaseModify, expenseRoutes, employeeJson, expenseTypeJson;
  beforeEach(()=>{
    databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB','updateEntryInDB']);
    expenseRoutes = new ExpenseRoutes(databaseModify, uuid());
    // employeeJson = jasmine.createSpyObj('expenseRoutes.', ['findObjectInDB','updateEntryInDB']);
    // expenseTypeJson = jasmine.createSpyObj('expenseTypeJson', ['findObjectInDB']);
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

  describe('createNewBalance',()=>{
    let employee;
    beforeEach(()=>{
      employee ={
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
        hireDate: '{hireDate}',
        expenseTypes:undefined
      };
      spyOn(expenseRoutes.employeeJson, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('should add expense to employee if they dont have it already',(done)=>{
      expenseRoutes.createNewBalance(employee).then(() => {
        expect(expenseRoutes.employeeJson.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });
    });
  }); // createNewBalance

  describe('validateCostToBudget',() => {
    let expenseType, employee, expenseTypeId, cost, userId;

    beforeEach(()=>{
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
    describe('promise resolves',() => {
      beforeEach(() => {
        spyOn(expenseRoutes.expenseTypeJson,'findObjectInDB').and.returnValue(Promise.resolve(expenseType));
        spyOn(expenseRoutes.employeeJson,'findObjectInDB').and.returnValue(Promise.resolve(employee));
        spyOn(expenseRoutes,'createNewBalance').and.returnValue(Promise.resolve());
        spyOn(expenseRoutes,'performBudgetOperation').and.returnValue(Promise.resolve());
      });
      it('should return employee from DB',(done) => {
        expenseRoutes.validateCostToBudget(expenseTypeId, userId, cost).then(() => {
          expect(expenseRoutes.employeeJson.findObjectInDB).toHaveBeenCalledWith(userId);
          expect(expenseRoutes.createNewBalance).toHaveBeenCalledWith(employee);
          expect(expenseRoutes.performBudgetOperation)
            .toHaveBeenCalledWith(employee, expenseType, cost);
          done();
        });
      });
      it('should call expenseTypeJson findObjectInDB',() => {
        expenseRoutes.validateCostToBudget(expenseTypeId, userId, cost);
        expect(expenseRoutes.expenseTypeJson.findObjectInDB).toHaveBeenCalledWith(expenseTypeId);
      });
    }); // promise resolves
    describe('promise rejects',() => {
      beforeEach(() => {
        spyOn(expenseRoutes.expenseTypeJson,'findObjectInDB').and.returnValue(Promise.reject('error'));
      });

      it('should return the error from Promise',(done)=>{
        expenseRoutes.validateCostToBudget(expenseTypeId,userId,cost).catch((err)=>{
          expect(err).toEqual('error');
          done();
        });
      });

    }); // promise rejects

  }); // validateCostToBudget

  describe('deleteCostFromBudget', () => {
    let employee, userId,expenseTypeId,cost;
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
          expenseTypes: [{
            id:'expenseTypeId',
            balance:'1000'
          }]
        };
        spyOn(expenseRoutes.employeeJson, 'findObjectInDB').and.returnValue(Promise.resolve(employee));
        spyOn(expenseRoutes, '_findExpense');

      });
      it('should call _findExpense',done=>{
        expenseRoutes.deleteCostFromBudget(expenseTypeId,userId,cost).then(()=>{
          expect(expenseRoutes._findExpense).toHaveBeenCalledWith(expenseTypeId,cost,employee);
          done();
        });
      }); //if there is employee balance
    }); //promise resolves
    describe('promise rejects', () => {
      let err;
      beforeEach(()=>{
        err = 'err';
        spyOn(expenseRoutes.employeeJson, 'findObjectInDB').and.returnValue(Promise.reject('err'));
      });
      it('should throw an error', () => {
        expenseRoutes.deleteCostFromBudget(expenseTypeId,userId,cost).catch((caughtErr)=>{
          expect(caughtErr).toEqual(err);
        });
      });
    }); //promise rejects
  }); //deleteCostFromBudget

  describe('_isCoveredByOverdraft', () => {
    let expenseType, employeeBalance;

    describe('if covered by covered by overdraft', () => {
      beforeEach(() => {
        employeeBalance= 1500;
        expenseType = {
          budget:1000,
          odFlag:true
        };
      });
      it('should return true',()=>{
        expect(expenseRoutes._isCoveredByOverdraft(expenseType,employeeBalance)).toEqual(true);
      });
    }); //if covered by covered by overdraft
    describe('if not covered by overdraft', () => {
      beforeEach(() => {
        employeeBalance= 1500;
        expenseType = {
          budget:1000,
          odFlag:false
        };
      });
      it('should return false ', () => {
        expect(expenseRoutes._isCoveredByOverdraft(expenseType, employeeBalance)).toEqual(false);
      });
    }); //if not covered by overdraft
  }); //_isCoveredByOverdraft

  describe('_isPartiallyCovered', () => {
    let expenseType, employee, budgetPosition, remaining, employeeBalance;
    describe('if the expense is paritally covered', () => {
      beforeEach(() => {
        expenseType = {
          budget: 1000,
          odFlag: false,

        };
        employee = {
          expenseTypes:[{
            balance:3000
          }]
        };
        budgetPosition = 0;
        remaining = -50;
        employeeBalance = 1500;
      });
      it('should return true',()=>{
        expect(expenseRoutes._);
      });
    }); //should return return
    describe('if the expense is not partially covered', () => {
      beforeEach(() => {
        expenseType = {
          budget: 1000,
          odFlag: false,

        };
        employee = {
          expenseTypes:[{
            balance:3000
          }]
        };
        budgetPosition = 0;
        remaining = 100;
        employeeBalance = 1500;
      });
      it('should return false', () => {
        expect(expenseRoutes._isPartiallyCovered(expenseType, employee, budgetPosition, remaining, employeeBalance))
          .toEqual(false);
      });
    }); //if the expense is not partially covered
  });

  describe('_isCovered', () => {
    let expenseType, employeeBalance;
    describe('if the expense is covered', () => {
      beforeEach(() => {
        expenseType  = {
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
        expenseType  = {
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
      employee = {expenseTypes: []};
      cost = 'cost';
      spyOn(expenseRoutes.employeeJson, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('should return a promise', (done) => {
      expenseRoutes._initializeNewBudget(expenseType, employee, cost).then(() => {
        expect(expenseRoutes.employeeJson.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });

    });
  }); //_initializeNewBudget

  describe('_addToOverdraftCoverage', () => {
    let employee, budgetPosition, employeeBalance;
    beforeEach(() => {
      employee = {
        expenseTypes: [{
          balance: 'balance'
        }]
      };
      employeeBalance = 200;
      budgetPosition = 0;
      spyOn(expenseRoutes.employeeJson, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('should return promise',(done)=>{
      expenseRoutes._addToOverdraftCoverage(employee, budgetPosition, employeeBalance).then(() => {
        expect(expenseRoutes.employeeJson.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });

    });
  }); //_addToOverdraftCoverage
  describe('_appPartialCoverage',()=>{
    let employee, budgetPosition, expenseType, remaining;
    beforeEach(()=>{
      employee = {
        expenseTypes: [
          {
            balance:'balance',
            owedAmount:'owedAmount'
          }
        ]};
      budgetPosition = 0;
      expenseType = {
        budget:'budget'
      };
      remaining = 200;
      spyOn(expenseRoutes.employeeJson, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('should return a promise',(done)=>{
      expenseRoutes._addPartialCoverage(employee, expenseType, budgetPosition, remaining).then(() => {
        expect(expenseRoutes.employeeJson.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });
    });//should return a promise
  }); // _appPartialCoverage


  describe('_addToBudget', () => {
    let employee, budgetPosition, employeeBalance;
    beforeEach(() => {
      employeeBalance = 0;
      employee = {
        expenseTypes: [{
          balance: 'balance'
        }],
        owedAmount: 0
      };
      budgetPosition = 0;
      spyOn(expenseRoutes.employeeJson, 'updateEntryInDB').and.returnValue(Promise.resolve());
    });
    it('it should return a promise', done => {
      expenseRoutes._addToBudget(employee, budgetPosition, employeeBalance).then(() => {
        expect(expenseRoutes.employeeJson.updateEntryInDB).toHaveBeenCalledWith(employee);
        done();
      });
    }); //it should return a promise
  }); //_addToBudget

});
