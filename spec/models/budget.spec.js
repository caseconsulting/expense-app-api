const Budget = require('../../models/budget');

describe('budget', () => {

  const ID = '{id}';
  const REIMBURSED_AMOUNT = 0;
  const PENDING_AMOUNT = 0;
  const FISCAL_START_DATE = '{fiscalStartDate}';
  const FISCAL_END_DATE = '{fiscalEndDate}';
  const AMOUNT = 0;

  const BUDGET_DATA = {
    id: ID,
    expenseTypeId: ID,
    employeeId: ID,
    reimbursedAmount: REIMBURSED_AMOUNT,
    pendingAmount: PENDING_AMOUNT,
    fiscalStartDate: FISCAL_START_DATE,
    fiscalEndDate: FISCAL_END_DATE,
    amount: AMOUNT
  };

  let budget;

  beforeEach(() => {
    budget = new Budget(BUDGET_DATA);
  });

  describe('constructor', () => {

    let localBudgetData;

    beforeEach(() => {
      localBudgetData = {
        id: ID,
        expenseTypeId: ID,
        employeeId: ID,
        reimbursedAmount: REIMBURSED_AMOUNT,
        pendingAmount: PENDING_AMOUNT,
        fiscalStartDate: FISCAL_START_DATE,
        fiscalEndDate: FISCAL_END_DATE,
        amount: AMOUNT,
        invalid: '{invalid}'
      };
      budget = new Budget(localBudgetData);
    });

    it('should populate required and optional values only', () => {
      expect(budget).toEqual(
        new Budget({
          id: ID,
          expenseTypeId: ID,
          employeeId: ID,
          reimbursedAmount: REIMBURSED_AMOUNT,
          pendingAmount: PENDING_AMOUNT,
          fiscalStartDate: FISCAL_START_DATE,
          fiscalEndDate: FISCAL_END_DATE,
          amount: AMOUNT
        })
      );
    }); // should populate required and optional values only
  }); // constructor

  describe('isDateInRange', () => {

    let dateStr;

    beforeEach(() => {
      budget.fiscalStartDate = '2000-08-18';
      budget.fiscalEndDate = '2002-08-18';
    });

    describe('when date is same as fiscal start date', () => {

      beforeEach(() => {
        dateStr = '2000-08-18';
      });

      it('should return true', () => {
        expect(budget.isDateInRange(dateStr)).toBe(true);
      }); // should return true
    }); // when date is same as fiscal start date

    describe('when date is same as fiscal end date', () => {

      beforeEach(() => {
        dateStr = '2002-08-18';
      });

      it('should return true', () => {
        expect(budget.isDateInRange(dateStr)).toBe(true);
      }); // should return true
    }); // when date is same as fiscal end date

    describe('when date is between fiscal start date and fiscal end date', () => {

      beforeEach(() => {
        dateStr = '2001-08-18';
      });

      it('should return true', () => {
        expect(budget.isDateInRange(dateStr)).toBe(true);
      }); // should return true
    }); // when date is between fiscal start date and fiscal end date

    describe('when date is before fiscal start date', () => {

      beforeEach(() => {
        dateStr = '1999-08-18';
      });

      it('should return false', () => {
        expect(budget.isDateInRange(dateStr)).toBe(false);
      }); // should return false
    }); // when date is before fiscal start date

    describe('when date is after fiscal end date', () => {

      beforeEach(() => {
        dateStr = '2003-08-18';
      });

      it('should return false', () => {
        expect(budget.isDateInRange(dateStr)).toBe(false);
      }); // should return false
    }); // when date is after fiscal end date
  }); // isDateInRange

  describe('_isEmpty', () => {

    describe('when value is undefined', () => {

      it('should return true', () => {
        expect(budget._isEmpty(undefined)).toBe(true);
      }); // should return true
    }); // when value is undefined

    describe('when value is null', () => {

      it('should return true', () => {
        expect(budget._isEmpty(null)).toBe(true);
      }); // should return true
    }); // when value is null

    describe('when value is a space character', () => {

      it('should return true', () => {
        expect(budget._isEmpty(' ')).toBe(true);
      }); // should return true
    }); // when value is a space character

    describe('when value is not empty', () => {

      it('should return false', () => {
        expect(budget._isEmpty('value')).toBe(false);
      }); // should return false
    }); // when value is not empty
  }); // _isEmpty
}); // budget
