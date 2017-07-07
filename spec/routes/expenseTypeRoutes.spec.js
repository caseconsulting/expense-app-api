const uuid = require('uuid/v4');
const svc = require('../../routes/expenseTypeRoutes');
describe("expenseTypeRoutes", () => {
  xdescribe("_add", () => {
    let newExpense, uuid;
    beforeEach(() => newExpense = {
      name: '{name}',
      budget: '{budget}',
      odFlag: '{odFlag}'
    });

    beforeEach(() => {
      spyOn(uuid, 'uuid').and.returnValue('uuid()');
    });
    afterEach(() => expect(uuid).toHaveBeenCalledWith());
    it("should take in object types", () => {
      const returnVal = svc._add(newExpense);
      expect(returnVal).toEqual({
        id: 'uuid()',
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
      expect(returnVal).toEqual({
        id: '{id}',
        name: '{name}',
        budget: '{budget}',
        odFlag: '{odFlag}'
      });
    });
  }); // _update

}); // employeeRoutes
