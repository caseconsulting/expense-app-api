const chronos = require('../chronos');

describe('chronos', () => {

  describe('asyncForEach', () => {

    let counter, array;

    beforeEach(() => {
      array = [1, 2, 3, 4, 5];
      counter = 0;
    });

    it('should call the a number of times depending on the array size', () => {
      chronos.asyncForEach(array, number => {
        counter++;
        expect(counter).toEqual(number);
      });
    }); // should call the a number of times depending on the array size
  }); // asyncForEach

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

  describe('_makeNewBudget', () => {
    let oldBudget, expenseType, expectedBudget;

    beforeEach(() => {
      oldBudget = {
        id: 'uuid',
        expenseTypeId: 'expenseTypeId',
        employeeId: 'employeeId',
        fiscalStartDate: '2020-03-02',
        fiscalEndDate: '2021-03-01',
        reimbursedAmount: 5
      };
      expenseType = {
        budget: 10
      };
      expectedBudget = {
        expenseTypeId: 'expenseTypeId',
        employeeId: 'employeeId',
        fiscalStartDate: '2021-03-02',
        fiscalEndDate: '2022-03-01',
        reimbursedAmount: 0,
        pendingAmount: 0
      };
    });

    describe('when there is no overage', () => {
      it('should return a new budget with a reimbursed amount of 0', () => {
        let newBudget = chronos._makeNewBudget(oldBudget, expenseType);
        expect(newBudget.id).not.toBe(undefined);
        expect(newBudget.expenseTypeId).toEqual(expectedBudget.expenseTypeId);
        expect(newBudget.employeeId).toEqual(expectedBudget.employeeId);
        expect(newBudget.fiscalStartDate).toEqual(expectedBudget.fiscalStartDate);
        expect(newBudget.fiscalEndDate).toEqual(expectedBudget.fiscalEndDate);
        expect(newBudget.reimbursedAmount).toEqual(expectedBudget.reimbursedAmount);
        expect(newBudget.pendingAmount).toEqual(expectedBudget.pendingAmount);
      }); // should return a new budget with a reimbursed amount of 0
    }); // when there is no overage

    describe('when there is overage', () => {
      beforeEach(() => {
        oldBudget.reimbursedAmount = 15;
        expectedBudget.reimbursedAmount = 5;
      });

      it('should return a new budget with a reimbursed amount of 5', () => {
        let newBudget = chronos._makeNewBudget(oldBudget, expenseType);
        expect(newBudget.id).not.toBe(undefined);
        expect(newBudget.expenseTypeId).toEqual(expectedBudget.expenseTypeId);
        expect(newBudget.employeeId).toEqual(expectedBudget.employeeId);
        expect(newBudget.fiscalStartDate).toEqual(expectedBudget.fiscalStartDate);
        expect(newBudget.fiscalEndDate).toEqual(expectedBudget.fiscalEndDate);
        expect(newBudget.reimbursedAmount).toEqual(expectedBudget.reimbursedAmount);
        expect(newBudget.pendingAmount).toEqual(expectedBudget.pendingAmount);
      }); // should return a new budget with a reimbursed amount of 5
    }); // when there is overage
  }); // _makeNewBudget

  describe('start', () => {
    //
    //  how to mock or spy on budgetDynamo/expenseTypeDynamo to return a specific value in start?
    //
  }); // start
}); // chronos
