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
    category: CATEGORY
  };

  let expense, blankExpense;

  beforeEach(() => {
    expense = new Expense(EXPENSE_DATA);
    blankExpense = new Expense({});
  });

  describe('constructor', () => {

    it('should populate empty attributes values', () => {
      expect(blankExpense).toEqual(jasmine.objectContaining({
        id: ' ',
        purchaseDate: ' ',
        reimbursedDate: ' ',
        note: ' ',
        url: ' ',
        createdAt: ' ',
        receipt: ' ',
        description: ' ',
        employeeId: ' ',
        expenseTypeId: ' ',
        category: ' '
      }));
    }); // should populate empty attribute values
  }); // constructor

  describe('hasReceipt', () => {

    describe('when expense has a receipt', () => {

      it('should return true', () => {
        expect(expense.hasReceipt()).toBe(true);
      }); // should return true
    }); // when expense has a receipt

    describe('when expense does not have a receipt', () => {

      it('should return false', () => {
        expect(blankExpense.hasReceipt()).toBe(false);
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

      it('should return false', () => {
        expect(blankExpense.isReimbursed()).toBe(false);
      }); // should return false
    }); // when expense is reimbursed
  }); // isReimbursed
}); // expense
