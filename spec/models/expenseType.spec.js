const ExpenseType = require('../../models/expenseType');

describe('expenseType', () => {

  const ID = '{id}';
  const NAME = '{name}';
  const BUDGET = '{budget}';
  const START_DATE = '{startDate}';
  const END_DATE = '{endDate}';
  const OD_FLAG = '{odFlag}';
  const REQUIRED_FLAG = '{requireReceipt}';
  const RECURRING_FLAG = '{recurringFlag}';
  const IS_INACTIVE = '{isInactive}';
  const DESCRIPTION = '{description}';
  const CATEGORIES = [];
  const ACCESSIBLE_BY = '{accessibleBy}';

  const EXPENSE_TYPE_DATA = {
    id: ID,
    name: NAME,
    budget: BUDGET,
    startDate: START_DATE,
    endDate: END_DATE,
    odFlag: OD_FLAG,
    requireReceipt: REQUIRED_FLAG,
    recurringFlag: RECURRING_FLAG,
    isInactive: IS_INACTIVE,
    description: DESCRIPTION,
    categories: CATEGORIES,
    accessibleBy: ACCESSIBLE_BY
  };

  let expenseType;

  beforeEach(() => {
    expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
  });

  describe('constructor', () => {

    let localExpenseTypeData;

    beforeEach(() => {
      localExpenseTypeData = {
        id: ID,
        name: NAME,
        budget: BUDGET,
        odFlag: OD_FLAG,
        requireReceipt: REQUIRED_FLAG,
        recurringFlag: RECURRING_FLAG,
        isInactive: IS_INACTIVE,
        description: DESCRIPTION,
        categories: CATEGORIES,
        accessibleBy: ACCESSIBLE_BY,
        invalid: '{invalid}'
      };
      expenseType = new ExpenseType(localExpenseTypeData);
    });

    it('should populate required and optional values only', () => {
      expect(expenseType).toEqual(
        new ExpenseType({
          id: ID,
          name: NAME,
          budget: BUDGET,
          odFlag: OD_FLAG,
          requireReceipt: REQUIRED_FLAG,
          recurringFlag: RECURRING_FLAG,
          isInactive: IS_INACTIVE,
          description: DESCRIPTION,
          categories: CATEGORIES,
          accessibleBy: ACCESSIBLE_BY
        })
      );
    }); // should populate required and optional values only
  }); // constructor

  describe('isDateInRange', () => {

    let dateStr;

    describe('when expense type is recurring', () => {

      beforeEach(() => {
        expenseType.recurringFlag = true;
        delete expenseType.startDate;
        delete expenseType.endDate;
      });

      it('should return true', () => {
        expect(expenseType.isDateInRange(undefined)).toBe(true);
      }); // should return true
    }); // when expense type is recurring and does not have an date

    describe('when expense type is not recurring', () => {

      beforeEach(() => {
        expenseType.recurringFlag = false;
        expenseType.startDate = '2000-08-18';
        expenseType.endDate = '2002-08-18';
      });

      describe('and date does not exist', () => {

        it('should return false', () => {
          expect(expenseType.isDateInRange(undefined)).toBe(false);
        }); // should be false
      }); // and date does not exist

      describe('and date is same as fiscal start date', () => {

        beforeEach(() => {
          dateStr = '2000-08-18';
        });

        it('should return true', () => {
          expect(expenseType.isDateInRange(dateStr)).toBe(true);
        }); // should return true
      }); // and date is same as fiscal start date

      describe('and date is same as fiscal end date', () => {

        beforeEach(() => {
          dateStr = '2002-08-18';
        });

        it('should return true', () => {
          expect(expenseType.isDateInRange(dateStr)).toBe(true);
        }); // should return true
      }); // and date is same as fiscal end date

      describe('and date is between fiscal start date and fiscal end date', () => {

        beforeEach(() => {
          dateStr = '2001-08-18';
        });

        it('should return true', () => {
          expect(expenseType.isDateInRange(dateStr)).toBe(true);
        }); // should return true
      }); // and date is between fiscal start date and fiscal end date

      describe('and date is before fiscal start date', () => {

        beforeEach(() => {
          dateStr = '1999-08-18';
        });

        it('should return false', () => {
          expect(expenseType.isDateInRange(dateStr)).toBe(false);
        }); // should return false
      }); // and date is before fiscal start date

      describe('and date is after fiscal end date', () => {

        beforeEach(() => {
          dateStr = '2003-08-18';
        });

        it('should return false', () => {
          expect(expenseType.isDateInRange(dateStr)).toBe(false);
        }); // should return false
      }); // and date is after fiscal end date
    }); // when expense type is not recurring
  }); // isDateInRange

  describe('_isEmpty', () => {

    describe('when value is undefined', () => {

      it('should return true', () => {
        expect(expenseType._isEmpty(undefined)).toBe(true);
      }); // should return true
    }); // when value is undefined

    describe('when value is null', () => {

      it('should return true', () => {
        expect(expenseType._isEmpty(null)).toBe(true);
      }); // should return true
    }); // when value is null

    describe('when value is a space character', () => {

      it('should return true', () => {
        expect(expenseType._isEmpty(' ')).toBe(true);
      }); // should return true
    }); // when value is a space character

    describe('when value is not empty', () => {

      it('should return false', () => {
        expect(expenseType._isEmpty('value')).toBe(false);
      }); // should return false
    }); // when value is not empty
  }); // _isEmpty
}); // expenseType
