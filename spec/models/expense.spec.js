const Expense = require('../../models/expense');

describe('expense', () => {

  const ID = '{id}';
  const PURCHASE_DATE = '{purchaseDate}';
  const REIMBURSED_DATE = '{reimbursedDate}';
  const NOTE = '{note}';
  const URL = '{url}';
  const CREATED_AT = '{createdAt}';
  const RECEIPT = '{receipt}';
  const COST = 0;
  const DESCRIPTION = '{description}';
  const CATEGORY = '{category}';
  const SHOW_ON_FEED = '{showOnFeed}';

  const EXPENSE_DATA = {
    id: ID,
    purchaseDate: PURCHASE_DATE,
    reimbursedDate: REIMBURSED_DATE,
    note: NOTE,
    url: URL,
    createdAt: CREATED_AT,
    receipt: RECEIPT,
    cost: COST,
    description: DESCRIPTION,
    employeeId: ID,
    expenseTypeId: ID,
    category: CATEGORY,
    showOnFeed: SHOW_ON_FEED
  };

  let expense;

  beforeEach(() => {
    expense = new Expense(EXPENSE_DATA);
  });

  describe('constructor', () => {

    let localExpenseData;

    beforeEach(() => {
      localExpenseData = {
        id: ID,
        purchaseDate: PURCHASE_DATE,
        reimbursedDate: REIMBURSED_DATE,
        note: NOTE,
        url: URL,
        createdAt: CREATED_AT,
        receipt: RECEIPT,
        cost: COST,
        description: DESCRIPTION,
        employeeId: ID,
        expenseTypeId: ID,
        category: CATEGORY,
        showOnFeed: null,
        invalid: '{invalid}'
      };
      expense = new Expense(localExpenseData);
    });

    it('should populate required and optional values only', () => {
      expect(expense).toEqual(
        new Expense({
          id: ID,
          purchaseDate: PURCHASE_DATE,
          reimbursedDate: REIMBURSED_DATE,
          note: NOTE,
          url: URL,
          createdAt: CREATED_AT,
          receipt: RECEIPT,
          cost: COST,
          description: DESCRIPTION,
          employeeId: ID,
          expenseTypeId: ID,
          category: CATEGORY,
          showOnFeed: false
        })
      );
    }); // should populate required and optional values only
  }); // constructor

  describe('hasReceipt', () => {

    describe('when expense has a receipt', () => {

      it('should return true', () => {
        expect(expense.hasReceipt()).toBe(true);
      }); // should return true
    }); // when expense has a receipt

    describe('when expense does not have a receipt', () => {

      beforeEach(() => {
        expense.receipt = null;
      });

      it('should return false', () => {
        expect(expense.hasReceipt()).toBe(false);
      }); // should return false
    }); // when expense does not have a receipt
  }); // hasReceipt

  describe('_isEmpty', () => {

    describe('when value is undefined', () => {

      it('should return true', () => {
        expect(expense._isEmpty(undefined)).toBe(true);
      }); // should return true
    }); // when value is undefined

    describe('when value is null', () => {

      it('should return true', () => {
        expect(expense._isEmpty(null)).toBe(true);
      }); // should return true
    }); // when value is null

    describe('when value is a space character', () => {

      it('should return true', () => {
        expect(expense._isEmpty(' ')).toBe(true);
      }); // should return true
    }); // when value is a space character

    describe('when value is not empty', () => {

      it('should return false', () => {
        expect(expense._isEmpty('value')).toBe(false);
      }); // should return false
    }); // when value is not empty
  }); // _isEmpty

  describe('isReimbursed', () => {

    describe('when expense is reimbursed', () => {

      it('should return true', () => {
        expect(expense.isReimbursed()).toBe(true);
      }); // should return true
    }); // when expense is reimbursed

    describe('when expense is not reimbursed', () => {

      beforeEach(() => {
        expense.reimbursedDate = null;
      });

      it('should return false', () => {
        expect(expense.isReimbursed()).toBe(false);
      }); // should return false
    }); // when expense is reimbursed
  }); // isReimbursed
}); // expense
