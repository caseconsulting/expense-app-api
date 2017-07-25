const uuid = require('uuid/v4');
const ExpenseRoutes = require('../../routes/expenseRoutes');

describe('expenseRoutes', () => {
  let jsonModify, svc;
  beforeEach(() => jsonModify = jasmine.createSpyObj('jsonModify', ['_specificFind']));
  beforeEach(() => svc = new ExpenseRoutes(jsonModify, uuid()));

  //deccribe the _add route
  describe("_add", () => {
    //declaration
    let newExpense, uuid;
    //set up
    beforeEach(() => {
      uuid = 'uuid'
    });
    beforeEach(() => newExpense = {
      expenseId: '{expenseId}',
      purchaseDate: '{purchaseDate}',
      reimbursedDate: '{reimbursedDate}',
      cost: '{cost}',
      description: '{description}',
      note: '{note}',
      receipt: '{receipt}',
      expenseTypeId: '{expenseTypeId}',
      userId: '{userId}'
    });
    it("should take in an expense", () => {
      const returnVal = svc._add(uuid, newExpense);
      expect(returnVal).toEqual(
        {
          id: 'uuid',
          expenseId: '{expenseId}',
          purchaseDate: '{purchaseDate}',
          reimbursedDate: '{reimbursedDate}',
          cost: '{cost}',
          description: '{description}',
          note: '{note}',
          receipt: '{receipt}',
          expenseTypeId: '{expenseTypeId}',
          userId: '{userId}'
        }
      );
    });
  }); //_add
  describe("_update", () => {
    let newExpense, id;
    beforeEach(() => newExpense =
    {
      expenseId: '{expenseId}',
      purchaseDate: '{purchaseDate}',
      reimbursedDate: '{reimbursedDate}',
      cost: '{cost}',
      description: '{description}',
      note: '{note}',
      receipt: '{receipt}',
      expenseTypeId: '{expenseTypeId}',
      userId: '{userId}'
    });
    beforeEach(() => id = '{id}');
    it("should update an expense", () => {
      const returnVal = svc._update(id, newExpense);
      expect(returnVal).toEqual(
        {
          id: '{id}',
          expenseId: '{expenseId}',
          purchaseDate: '{purchaseDate}',
          reimbursedDate: '{reimbursedDate}',
          cost: '{cost}',
          description: '{description}',
          note: '{note}',
          receipt: '{receipt}',
          expenseTypeId: '{expenseTypeId}',
          userId: '{userId}'
        }
      );

      });
  }); //_update
});
