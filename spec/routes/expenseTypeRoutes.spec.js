const uuid = require('uuid/v4');
const ExpenseTypeRoutes = require('../../routes/expenseTypeRoutes');

describe('expenseTypeRoutes', () => {
  let databaseModify, expenseTypeRoutes;
  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB']);
    expenseTypeRoutes = new ExpenseTypeRoutes(databaseModify, uuid());
  });

  fdescribe('_add', () => {
    let newExpense, uuid;
    beforeEach(() => {
      uuid = 'uuid';
      newExpenseType = {
        id: uuid,
        budgetName: 'name',
        description: 'description',
        budget: 100,
        odFlag: true
      };
    });
    it('should take in object types', done => {
      return expenseTypeRoutes._add(uuid, newExpenseType).then(expenseType => {
        expect(expenseType).toEqual(newExpenseType);
        done();
      });
    });
  }); // _add

  fdescribe('_update', () => {
    let expectedExpenseType, id;
    beforeEach(() => {
      id = 'id';
      expectedExpenseType = {
        budgetName: 'new name',
        budget: 1000,
        odFlag: false,
        description: 'new description'
      };
    });
    describe('when object is found in databaseModify', () => {
      beforeEach(() => {
        databaseModify.findObjectInDB.and.returnValue(Promise.resolve());
      });
      it('should take in object types', done => {
        return expenseTypeRoutes._update(id, expectedExpenseType).then(newExpenseType => {
          expect(newExpenseType).toEqual({
            id: 'id',
            budgetName: 'new name',
            budget: 1000,
            odFlag: false,
            description: 'new description'
          });
          done();
        });
      });
    }); //when object is found in databaseModify
    describe('when databaseModify throws an error', () => {
      let expectedErr;
      beforeEach(() => {
        expectedErr = 'error in databaseModify';
        databaseModify.findObjectInDB.and.returnValue(Promise.reject(expectedErr));
      });
      it('should throw the error', () => {
        return expenseTypeRoutes._update(id, expectedExpenseType).catch(err => {
          expect(err).toEqual(expectedErr);
        });
      });
    }); //when databaseModify throws an error
  }); // _update
}); // employeeRoutes
