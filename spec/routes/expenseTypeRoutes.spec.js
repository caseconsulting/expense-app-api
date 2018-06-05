const uuid = require('uuid/v4');
const ExpenseTypeRoutes = require('../../routes/expenseTypeRoutes');

describe('expenseTypeRoutes', () => {
  let databaseModify, expenseTypeRoutes;
  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB']);
    expenseTypeRoutes = new ExpenseTypeRoutes(databaseModify, uuid());
  });

  fdescribe('_add', () => {
    let newExpense, uuid;
    beforeEach(() => {
      uuid = 'uuid';
      newExpenseType = {
        id: uuid,
        budgetName: 'name',
        description: 'description',
        budget: 100,
        odFlag: true
      };
      // spyOn(expenseTypeRoutes, '_add').and.returnValue(Promise.resolve(newExpense));
    });
    it('should take in object types', done => {
      return expenseTypeRoutes._add(uuid, newExpenseType).then(expenseType => {
        expect(expenseType).toEqual(uuid);
        done();
      });
    });
  }); // _add

  describe('_update', () => {
    let newExpense, id;
    beforeEach(() => (id = '{id}'));
    beforeEach(
      () =>
        (newExpense = {
          name: '{name}',
          budget: '{budget}',
          odFlag: '{odFlag}'
        })
    );
    it('should take in object types', () => {
      const returnVal = expenseTypeRoutes._update(id, newExpense);
      expect(returnVal).toEqual({
        id: '{id}',
        name: '{name}',
        budget: '{budget}',
        odFlag: '{odFlag}'
      });
    });
  }); // _update
}); // employeeRoutes
