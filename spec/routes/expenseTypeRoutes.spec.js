const uuid = require('uuid/v4');
const svc = require('../../routes/expenseTypeRoutes');
describe("expenseTypeRoutes", () => {
  describe("_add", () => {
    let newExpense, uuid;
    beforeEach(()=> uuid = 'uuid');
    beforeEach(() => newExpense = {
      name: '{name}',
      budget: '{budget}',
      odFlag: '{odFlag}'
    });

    it("should take in object types", () => {
      const returnVal = svc._add(uuid,newExpense);
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
