const chronos = require('../chronos');
// const _ = require('lodash');
// const uuid = require('uuid/v4');

// const AWS = require('aws-sdk-mock');

describe('chronos', () => {

  // let budgetDynamo, expenseTypeDynamo;

  // beforeEach(() => {
  //   budgetDynamo = jasmine.createSpyObj('budgetDynamo', [
  //     'addToDB',
  //     'querySecondaryIndexInDB'
  //   ]);
  //   expenseTypeDynamo = jasmine.createSpyObj('budgetDynamo', [
  //     'getAllEntriesInDB'
  //   ]);
  // });


  describe('_makeNewBudget', () => {

    let oldBudget, expenseType, expectedBudget;

    beforeEach(() => {
      oldBudget = {
        id: 'uuid',
        expenseTypeId: 'expenseTypeId',
        userId: 'userId',
        fiscalStartDate: '2020-03-02',
        fiscalEndDate: '2021-03-01',
        reimbursedAmount: 5
      };
      expenseType = {
        budget: 10
      };
      expectedBudget = {
        expenseTypeId: 'expenseTypeId',
        userId: 'userId',
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
        expect(newBudget.userId).toEqual(expectedBudget.userId);
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
        expect(newBudget.userId).toEqual(expectedBudget.userId);
        expect(newBudget.fiscalStartDate).toEqual(expectedBudget.fiscalStartDate);
        expect(newBudget.fiscalEndDate).toEqual(expectedBudget.fiscalEndDate);
        expect(newBudget.reimbursedAmount).toEqual(expectedBudget.reimbursedAmount);
        expect(newBudget.pendingAmount).toEqual(expectedBudget.pendingAmount);
      }); // should return a new budget with a reimbursed amount of 5
    }); // when there is overage
  }); // _makeNewBudget

  describe('_getExpenseType', () => {

    let expenseTypes, expectedExpenseType;

    beforeEach(() => {
      expenseTypes = [ { id: 'id' }, { id: 'id-2'} ];
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

  describe('asyncForEach', () => {

    let array, foo;

    beforeEach(() => {
      array = [1, 2, 3];
      foo = {
        callback: function(value) {
          return value * 2;
        }
      };
      spyOn(foo, 'callback');
    });

    it('should call the callback function on the array', () => {
      chronos.asyncForEach(array, foo.callback);
    }); // should call the callback function on the array

    afterEach(() => {
      expect(foo.callback).toHaveBeenCalled();
    });

  }); // asyncForEach

  describe('start', () => {
    //
    //  how to mock or spy on budgetDynamo/expenseTypeDynamo to return a specific value in start?
    //
  }); // start

}); // chronos
