const ExpenseTypeRoutes = require('../../routes/expenseTypeRoutes');
const _ = require('lodash');

describe('expenseTypeRoutes', () => {
  const id = 'id';
  const budgetName = 'budgetName';
  const budget = 1000;
  const odFlag = true;
  const description = 'description';
  const startDate = '2019-05-14';
  const endDate = '2019-05-16';
  const recurringFlag = false;

  let databaseModify, expenseTypeRoutes;
  beforeEach(() => {
    expenseTypeRoutes = new ExpenseTypeRoutes();
    databaseModify = jasmine.createSpyObj('databaseModify', ['addToDB', 'updateEntryInDB']);
    spyOn(expenseTypeRoutes, 'databaseModify').and.returnValue(databaseModify);
  });

  describe('_add', () => {
    let expenseType, newExpenseType;
    beforeEach(() => {
      expenseType = { budgetName, budget, odFlag, description, startDate, endDate, recurringFlag };
      newExpenseType = _.merge({}, expenseType, { id });

      spyOn(expenseTypeRoutes, '_checkFields').and.returnValue(Promise.resolve());
      spyOn(expenseTypeRoutes, '_checkDates').and.returnValue(Promise.resolve());
      databaseModify.addToDB.and.returnValue(Promise.resolve(newExpenseType));
    });
    afterEach(() => {
      expect(expenseTypeRoutes._checkFields).toHaveBeenCalledWith(newExpenseType);
      expect(expenseTypeRoutes._checkDates).toHaveBeenCalledWith(startDate, endDate, recurringFlag);
    });
    it('should take in object types', done => {
      return expenseTypeRoutes._add(id, expenseType).then(result => {
        expect(result).toEqual(newExpenseType);
        done();
      });
    });
  }); // _add

  describe('_update', () => {
    let expenseType, updatedExpenseType;
    beforeEach(() => {
      expenseType = { budgetName, budget, odFlag, description, startDate, endDate, recurringFlag };
      updatedExpenseType = _.merge({}, expenseType, { id });

      spyOn(expenseTypeRoutes, '_checkFields').and.returnValue(Promise.resolve());
      spyOn(expenseTypeRoutes, '_checkDates').and.returnValue(Promise.resolve());
    });

    afterEach(() => {
      expect(expenseTypeRoutes._checkFields).toHaveBeenCalledWith(updatedExpenseType);
      expect(expenseTypeRoutes._checkDates).toHaveBeenCalledWith(startDate, endDate, recurringFlag);
    });

    describe('when object is found in databaseModify', () => {
      beforeEach(() => {
        databaseModify.updateEntryInDB.and.returnValue(Promise.resolve(updatedExpenseType));
      });
      it('should take in object types', done => {
        return expenseTypeRoutes._update(id, expenseType).then(result => {
          expect(result).toEqual(updatedExpenseType);
          done();
        });
      });
    }); // when object is found in databaseModify

    xdescribe('when databaseModify throws an error', () => {
      let expectedErr;
      beforeEach(() => {
        expectedErr = 'error in databaseModify';
        databaseModify.updateEntryInDB.and.returnValue(Promise.reject(expectedErr));
      });
      it('should throw the error', done => {
        return expenseTypeRoutes._update(id, expenseType).catch(err => {
          expect(err).toEqual(expectedErr);
          done();
        });
      });
    }); // when databaseModify throws an error
  }); // _update
}); // employeeRoutes
