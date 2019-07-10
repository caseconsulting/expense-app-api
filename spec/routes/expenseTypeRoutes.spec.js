const ExpenseTypeRoutes = require('../../routes/expenseTypeRoutes');
const ExpenseType = require('../../models/expenseType');

xdescribe('expenseTypeRoutes', () => {
  const id = 'id';
  const budgetName = 'budgetName';
  const budget = 1000;
  const odFlag = true;
  const description = 'description';
  const startDate = '2019-05-14';
  const endDate = '2019-05-16';
  const recurringFlag = false;

  let expenseTypeDynamo, expenseTypeRoutes;

  beforeEach(() => {
    expenseTypeRoutes = new ExpenseTypeRoutes();
    expenseTypeDynamo = jasmine.createSpyObj('expenseTypeDynamo', ['addToDB', 'updateEntryInDB']);
    expenseTypeRoutes.expenseTypeDynamo = expenseTypeDynamo;
  });

  describe('_add', () => {
    let expectedExpenseType, data;

    beforeEach(() => {
      data = { budgetName, budget, odFlag, description, startDate, endDate, recurringFlag };
      expectedExpenseType = new ExpenseType(data);

      spyOn(expenseTypeRoutes, '_checkFields').and.returnValue(Promise.resolve());
      spyOn(expenseTypeRoutes, '_checkDates').and.returnValue(Promise.resolve());
      expenseTypeDynamo.addToDB.and.returnValue(Promise.resolve(expectedExpenseType));
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

  describe('_update', () => {
    let expenseType, updatedExpenseType;

    beforeEach(() => {
      expenseType = {
        budgetName,
        budget,
        odFlag,
        description,
        startDate,
        endDate,
        recurringFlag
      };
      updatedExpenseType = _.merge({}, expenseType, { id });

      spyOn(expenseTypeRoutes, '_checkFields').and.returnValue(Promise.resolve());
      spyOn(expenseTypeRoutes, '_checkDates').and.returnValue(Promise.resolve());
    });

    afterEach(() => {
      expect(expenseTypeRoutes._checkFields).toHaveBeenCalledWith(updatedExpenseType);
      expect(expenseTypeRoutes._checkDates).toHaveBeenCalledWith(startDate, endDate, recurringFlag);
    });

    describe('when DynamoDB is successful', () => {
      beforeEach(() => {
        expenseTypeDynamo.updateEntryInDB.and.returnValue(Promise.resolve(updatedExpenseType));
      });

      it('should return updated object', done => {
        return expenseTypeRoutes._update(id, expenseType).then(result => {
          expect(result).toEqual(updatedExpenseType);
          done();
        });
      });
    }); // when DynamoDB is successful

    describe('when DynamoDB throws an error', () => {
      let expectedErr;

      beforeEach(() => {
        expectedErr = 'error from DynamoDB';
        expenseTypeDynamo.updateEntryInDB.and.returnValue(Promise.reject(expectedErr));
      });

      it('should throw the error', done => {
        return expenseTypeRoutes._update(id, expenseType).catch(err => {
          expect(err).toEqual(expectedErr);
          done();
        });
      });
    }); // when DynamoDB update throws an error
  }); // _update
}); // employeeRoutes
