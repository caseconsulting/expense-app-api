const ExpenseTypeRoutes = require('../../routes/expenseTypeRoutes');
const ExpenseType = require('../../models/expenseType');

describe('expenseTypeRoutes', () => {
  const id = 'id';
  const budgetName = 'budgetName';
  const budget = 1000;
  const odFlag = true;
  const description = 'description';
  const startDate = '2019-05-14';
  const endDate = '2019-05-16';
  const recurringFlag = false;

  let expenseTypeDynamo, expenseTypeRoutes, databaseModify, expenseData;

  beforeEach(() => {
    expenseTypeRoutes = new ExpenseTypeRoutes();
    expenseTypeDynamo = jasmine.createSpyObj('expenseTypeDynamo', ['addToDB', 'updateEntryInDB']);
    databaseModify = jasmine.createSpyObj('databaseModify', [
      'removeFromDB',
    ]);
    expenseData = jasmine.createSpyObj('expenseData', ['querySecondaryIndexInDB']);
    expenseTypeRoutes.expenseTypeDynamo = expenseTypeDynamo;
    expenseTypeRoutes.databaseModify = databaseModify;
    expenseTypeRoutes.expenseData = expenseData;
  });

  describe('_add', () => {
    let expectedExpenseType, data;

    beforeEach(() => {
      data = { id, budgetName, budget, odFlag, description, startDate, endDate, recurringFlag };
      expectedExpenseType = new ExpenseType(data);

      spyOn(expenseTypeRoutes, '_checkFields').and.returnValue(Promise.resolve());
      spyOn(expenseTypeRoutes, '_checkDates').and.returnValue(Promise.resolve());
      expenseTypeDynamo.addToDB.and.returnValue(Promise.resolve(expectedExpenseType));
    });
    afterEach(() => {
      expect(expenseTypeRoutes._checkFields).toHaveBeenCalledWith(expectedExpenseType);
      expect(expenseTypeRoutes._checkDates).toHaveBeenCalledWith(startDate, endDate, recurringFlag, id);
    });
    describe('when addToDB is successful', () => {
      it('should return added object', done => {
        return expenseTypeRoutes._add(id, data).then(result => {
          expect(result).toEqual(expectedExpenseType);
          done();
        });
      });
    }); // when DynamoDB is successful

    describe('when addToDB fails', () => {
      let expectedErr;
      beforeEach(() => {
        expectedErr = 'error from DynamoDB';
        expenseTypeDynamo.addToDB.and.returnValue(Promise.reject(expectedErr));
      });

      it('should throw the error', done => {
        return expenseTypeRoutes._add(id, data).catch(err => {
          expect(err).toEqual(expectedErr);
          done();
        });
      });
    }); // when DynamoDB throws an error
  }); // _add

  describe('_checkDates', () => {
    let startDate, endDate, recurringFlag, keptItsPromise;

    describe('if valid date range is given', () => {
      beforeEach(() => {
        startDate = '1970-12-01';
        endDate = '1970-12-31';
        recurringFlag = false;
        keptItsPromise = false;
      });

      it('should return a resolved promise', done => {
        expenseTypeRoutes
          ._checkDates(startDate, endDate, recurringFlag)
          .then(() => {
            keptItsPromise = true;
            expect(keptItsPromise).toBe(true);
            done();
          })
          .catch(() => done(new Error('Promise should resolve')));
      }); // should return a resolved promise
    }); // if valid date range is given

    describe('if an invalid range is given', () => {
      let expectedErr;
      beforeEach(() => {
        expectedErr = {
          code: 403,
          message: 'The dates are invalid.'
        };
        startDate = '2019-12-31';
        endDate = '1970-12-31';
        recurringFlag = false;
        keptItsPromise = false;
      });
      it('should return a promise rejection', done => {
        expenseTypeRoutes
          ._checkDates(startDate, endDate, recurringFlag)
          .then(() => done(new Error('Promise should reject')))
          .catch(err => {
            keptItsPromise = true;
            expect(err).toEqual(expectedErr);
            done();
          });
      }); // should return a promise rejection
    }); // if an invalid range is given

    describe('if recurring flag is undefined and startDate is undefined', () => {

      beforeEach(() => {
        endDate = '1970-12-31';
        keptItsPromise = false;
      });

      it('should return a resolved promise', done => {
        expenseTypeRoutes
          ._checkDates(undefined, endDate, undefined)
          .catch( err => {
            expect(err).toEqual({
              code: 403,
              message: 'The dates are invalid.'
            });
            done();
          });
      }); // should return a resolved promise
    }); // if recurring flag is undefined and startDate is undefined

    describe('if recurring flag is undefined and endDate is undefined', () => {

      beforeEach(() => {
        startDate = '1970-12-01';
        keptItsPromise = false;
      });

      it('should return a resolved promise', done => {
        expenseTypeRoutes
          ._checkDates(startDate, undefined, undefined)
          .catch( err => {
            expect(err).toEqual({
              code: 403,
              message: 'The dates are invalid.'
            });
            done();
          });
      }); // should return a resolved promise
    }); // if recurring flag is undefined and startDate is undefined
  }); // _checkDates

  describe('_checkFields', () => {
    let expenseType;

    describe('if a vaild expense type is given', () => {
      let keptItsPromise;
      beforeEach(() => {
        expenseType = { id, budgetName, budget, odFlag, description, startDate, endDate, recurringFlag };
        keptItsPromise = false;
      });

      it('should return a resolved promise', done => {
        expenseTypeRoutes
          ._checkFields(expenseType)
          .then(() => {
            keptItsPromise = true;
            expect(keptItsPromise).toBe(true);
            done();
          })
          .catch(() => done(new Error('Promise should resolve')));
      }); // should return a resolved promise
    }); // if a vaild expense type is given
    describe('if a misformed expense type object is given', () => {
      let expectedErr;
      beforeEach(() => {
        expectedErr = {
          code: 403,
          message: 'One of the required fields is empty.'
        };
        expenseType = { budgetName, budget, odFlag, description, startDate, endDate, recurringFlag };
      });
      it('should return a promise rejection', done => {
        expenseTypeRoutes
          ._checkFields(expenseType)
          .then(() => done(new Error('Promise should reject')))
          .catch(err => {
            expect(err).toEqual(expectedErr);
            done();
          });
      }); // should return a promise rejection
    }); // if a misformed expense type object is given
  }); // _checkFields

  describe('_delete', () => {

    let expenseTypeData;

    beforeEach(() => {
      expenseTypeData = {
        id: 'expensetypeID',
        budgetName: ' ',
        odFlag: false,
        endDate: ' ',
        budget: 'NaN',
        requiredFlag: true,
        recurringFlag: false,
        isInactive: false,
        startDate: ' ',
        description: ' ',
        categories: []
      };
    });

    describe('when there are no expenses with this expense type', () => {

      beforeEach(() => {
        expenseData.querySecondaryIndexInDB.and.returnValue([]);
        databaseModify.removeFromDB.and.returnValue(expenseTypeData);
      });

      it('should delete the expense type', () => {
        expenseTypeRoutes._delete('expenseTypeId').then( data => {
          expect(data).toEqual(new ExpenseType(expenseTypeData));
        });
      }); // should delete the expense type
    }); // when there are no expenses with this expense type

    describe('when expenses exist for this expense type', () => {

      beforeEach(() => {
        expenseData.querySecondaryIndexInDB.and.returnValue(['some-random-expense']);
      });

      it('should delete the expense type', () => {
        expenseTypeRoutes._delete('expenseTypeId').catch( err => {
          expect(err).toEqual({
            code: 403,
            message: 'Expense Type can not be deleted if they have expenses'
          });
        });
      }); // should delete the expense type
    }); // when expenses exist for this expense type
  }); // _delete

  describe('_update', () => {
    let expectedExpenseType, data;

    beforeEach(() => {
      data = {
        id,
        budgetName,
        budget,
        odFlag,
        description,
        startDate,
        endDate,
        recurringFlag
      };
      expectedExpenseType = new ExpenseType(data);

      spyOn(expenseTypeRoutes, '_checkFields').and.returnValue(Promise.resolve());
      spyOn(expenseTypeRoutes, '_checkDates').and.returnValue(Promise.resolve());
    });

    afterEach(() => {
      expect(expenseTypeRoutes._checkFields).toHaveBeenCalledWith(expectedExpenseType);
      expect(expenseTypeRoutes._checkDates).toHaveBeenCalledWith(startDate, endDate, recurringFlag, id);
    });

    describe('when updateEntryInDB is successful', () => {
      beforeEach(() => {
        expenseTypeDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedExpenseType));
      });

      it('should return updated object', done => {
        return expenseTypeRoutes._update(id, data).then(result => {
          expect(result).toEqual(expectedExpenseType);
          done();
        });
      });
    }); // when DynamoDB is successful

    describe('when updateEntryInDB fails', () => {
      let expectedErr;

      beforeEach(() => {
        expectedErr = 'error from DynamoDB';
        spyOn(expenseTypeRoutes, '_updateBudgets').and.returnValue(Promise.resolve());
        expenseTypeDynamo.updateEntryInDB.and.returnValue(Promise.reject(expectedErr));
      });

      it('should throw the error', done => {
        return expenseTypeRoutes._update(id, data).catch(err => {
          expect(err).toEqual(expectedErr);
          done();
        });
      });
    }); // when DynamoDB update throws an error
  }); // _update
}); // employeeRoutes
