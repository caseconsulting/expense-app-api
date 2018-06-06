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
        hireDate: '{hireDate}'
      };
      databaseModify.updateEntryInDB.and.returnValue(
        {
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          empId: '{empId}',
          hireDate: '{hireDate}',
          expenseTypes: []
        }
      );
    });
    it('should add expense to employee if they dont have it already',()=>{
      let returnVal = expenseRoutes.createNewBalance(databaseModify, employee);
      expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(employee);
      expect(returnVal).toEqual(Object.defineProperty(employee, 'expenseTypes',{ value:[], writable:false }));
    });
  }); // createNewBalance
  xdescribe('validateCostToBudget',()=>{
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
        employeeJson.findObjectInDB.and.returnValue(Promise.resolve(employee));
        expenseTypeJson.findObjectInDB.and.returnValue(Promise.resolve(expenseType));
        spyOn(expenseRoutes,'createNewBalance');
        spyOn(expenseRoutes,'performBudgetOperation');
      });
      it('should return employee from DB',(done)=>{
        expenseRoutes.validateCostToBudget(expenseTypeId, userId, cost).then(()=>{
          expect(expenseTypeJson.findObjectInDB).toHaveBeenCalledWith(expenseTypeId);
          expect(employeeJson.findObjectInDB).toHaveBeenCalledWith(userId);
          expect(expenseRoutes.createNewBalance).toHaveBeenCalledWith(employeeJson, employee);
          expect(expenseRoutes.performBudgetOperation)
            .toHaveBeenCalledWith(employeeJson, employee, expenseType, cost);
          done();
        });

      });
    }); // promise resolves
    describe('promise rejects',()=>{
      beforeEach(()=>{

      });
    }); // promise rejects

  }); // validateCostToBudget

  xdescribe('deleteCostFromBudget', () => {
    let employeeBalance, employee, userId, err;
    describe('promise resolves', () => {
      beforeEach(() => {
        employeeJson.findObjectInDB.and.returnValue(employee);
        employeeJson.updateEntryInDB.and.returnValue(employee);
        userId = 'userId';
        cost = 100;
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
      });
      describe('if employee expense id is found', () => {
        it('should return the updated entry from the DB', done => {
          expenseRoutes.deleteCostFromBudget(expenseTypeId, userId, cost).then(() => {
            expect(expenseRoutes.employeeJson.findObjectInDB).toHaveBeenCalledWith(userId);
            done();
          });
        });


      }); //if employee expense id is found
      describe('if there is no employee balance', () => {

      }); //if there is employee balance
    }); //promise resolves
    describe('promise rejects', () => {

    }); //promise rejects
  }); //deleteCostFromBudget
});
