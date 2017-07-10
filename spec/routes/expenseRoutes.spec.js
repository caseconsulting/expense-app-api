const uuid = require('uuid/v4');
const svc = require('../../routes/expenseRoutes');

describe('expenseRoutes', () => {
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
    it("should take in an expense type", () => {
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
});
