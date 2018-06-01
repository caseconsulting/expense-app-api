const uuid = require('uuid/v4');
const ExpenseTypeRoutes = require('../../routes/expenseTypeRoutes');

let databaseModify, svc;
beforeEach(
  () =>
    (databaseModify = jasmine.createSpyObj('databaseModify', [
      'findObjectInDB'
    ]))
);
beforeEach(() => (svc = new ExpenseTypeRoutes(databaseModify, uuid())));

describe('expenseTypeRoutes', () => {
  describe('_add', () => {
    let newExpense, uuid;
    beforeEach(() => (uuid = 'uuid'));
    beforeEach(
      () =>
        (newExpense = {
          name: '{name}',
          budget: '{budget}',
          odFlag: '{odFlag}'
        })
    );

    it('should take in object types', () => {
      const returnVal = svc._add(uuid, newExpense);
      expect(returnVal).toEqual({
        id: 'uuid',
        name: '{name}',
        budget: '{budget}',
        odFlag: '{odFlag}'
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
      const returnVal = svc._update(id, newExpense);
      expect(returnVal).toEqual({
        id: '{id}',
        name: '{name}',
        budget: '{budget}',
        odFlag: '{odFlag}'
      });
    });
  }); // _update
}); // employeeRoutes
