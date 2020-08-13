const chronos = require('../chronos');

const Budget = require('../models/budget');
const moment = require('moment');

describe('chronos', () => {
  describe('_asyncForEach', () => {
    let counter, array;

    beforeEach(() => {
      array = [1, 2, 3, 4, 5];
      counter = 0;
    });

    it('should call the a number of times depending on the array size', () => {
      chronos._asyncForEach(array, (number) => {
        counter++;
        expect(counter).toEqual(number);
      });
    }); // should call the a number of times depending on the array size
  }); // _asyncForEach

  describe('_getExpenseType', () => {
    let expenseTypes, expectedExpenseType;

    beforeEach(() => {
      expenseTypes = [{ id: 'id' }, { id: 'id-2' }];
      expectedExpenseType = { id: 'id-2' };
    });

    describe('expense type id exists in expense types', () => {
      it('should return the expense type that has a matching id', () => {
        expect(chronos._getExpenseType(expenseTypes, 'id-2')).toEqual(expectedExpenseType);
      }); // should return the expense type that has a matching id
    }); // expense type id exists in expense types

    describe('expense type id is not in expense types', () => {
      it('should throw an error', () => {
        try {
          chronos._getExpenseType(expenseTypes, 'id-3');
          fail('but failed to throw error');
        } catch (thrownError) {
          expect(thrownError.message).toEqual('Expense Type does not exist');
        }
      }); // throw an error
    }); // expense type id is not in expense types
  }); // _getExpenseType

  describe('_makeNewBudget', () => {}); // _makeNewBudget

  describe('start', () => {
    let yesterday, budgetDynamo;

    beforeEach(() => {
      yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');

      budgetDynamo = jasmine.createSpyObj('budgetDynamo', ['querySecondaryIndexInDB']);
      spyOn(chronos, '_getAllExpenseTypes').and.returnValue(Promise.resolve([]));

      spyOn(chronos, '_asyncForEach');
    });

    afterEach(() => expect(chronos._getAllExpenseTypes).toHaveBeenCalledWith());

    describe('WHEN no budgets', () => {
      beforeEach(() => {
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([]));
        spyOn(chronos, '_budgetDynamo').and.returnValue(budgetDynamo);
      });

      afterEach(() => {
        expect(chronos._budgetDynamo).toHaveBeenCalledWith();
        expect(budgetDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
          'fiscalEndDate-index',
          'fiscalEndDate',
          yesterday
        );
        expect(chronos._asyncForEach).not.toHaveBeenCalled();
      });

      it('SHOULD return nothing', (done) => {
        return chronos.start().then((result) => {
          expect(result).toBeUndefined();
          done();
        });
      });
    }); // WHEN no budgets

    describe('WHEN budgets', () => {
      let budget;
      beforeEach(() => {
        budget = {
          id: 'id',
          expenseTypeId: 'expenseTypeId',
          employeeId: 'employeeId',
          reimbursedAmount: 0,
          pendingAmount: 0,
          fiscalStartDate: 'fiscalStartDate',
          fiscalEndDate: 'fiscalEndDate',
          amount: 2112
        };
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([budget]));
        spyOn(chronos, '_budgetDynamo').and.returnValue(budgetDynamo);
      });

      afterEach(() => {
        expect(chronos._budgetDynamo).toHaveBeenCalledWith();
        expect(budgetDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
          'fiscalEndDate-index',
          'fiscalEndDate',
          yesterday
        );
        expect(chronos._asyncForEach).toHaveBeenCalledWith([new Budget(budget)], jasmine.any(Function));
      });

      it('SHOULD return nothing', (done) => {
        return chronos.start().then((result) => {
          expect(result).toBeUndefined();
          done();
        });
      });
    }); // WHEN budgets
  }); // start
}); // chronos
