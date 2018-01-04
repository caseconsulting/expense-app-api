const uuid = require('uuid/v4');
const ExpenseTypeRoutes = require('../../routes/expenseTypeRoutes');

let jsonModify, svc;
beforeEach(() => jsonModify = jasmine.createSpyObj('jsonModify', ['findObjectInDB']));
beforeEach(() => svc = new ExpenseTypeRoutes(jsonModify, uuid()));

describe("expenseTypeRoutes", () => {
  describe("_add", () => {
    let newExpense, uuid;
    beforeEach(() => uuid = 'uuid');
    beforeEach(() => newExpense = {
      name: '{name}',
      budget: '{budget}',
      odFlag: '{odFlag}'
    });

    it("should take in object types", () => {
      const returnVal = svc._add(uuid, newExpense);
      expect(returnVal).toEqual({
        id: 'uuid',
        name: '{name}',
        budget: '{budget}',
        odFlag: '{odFlag}'
      });
    });
  }); // _add
  describe("_update", () => {
    let newExpense, id;
    beforeEach(() => id = '{id}');
    beforeEach(() => newExpense = {
      name: '{name}',
      budget: '{budget}',
      odFlag: '{odFlag}'
    });
    it("should take in object types", () => {
      const returnVal = svc._update(id, newExpense);
      console.log(returnVal);
      expect(returnVal).toEqual({
        id: '{id}',
        name: '{name}',
        budget: '{budget}',
        odFlag: '{odFlag}'
      });
    });
  }); // _update

}); // employeeRoutes