const uuid = require('uuid/v4');
const svc = require('../../routes/employeeRoutes');
describe("employeeRoutes", () => {
  xdescribe("_add", () => {
    let newEmployee, uuid;
    beforeEach(() => newEmployee = {
      firstName: '{firstName}',
      middleName: '{middleName}',
      lastName: '{lastName}',
      empId: '{empId}',
      hireDate: '{hireDate}'
    });

    beforeEach(() => {
      spyOn(uuid, 'uuid').and.returnValue('uuid()');
    });
    afterEach(() => expect(uuid).toHaveBeenCalledWith());
    it("should take in object types", () => {
      const returnVal = svc._add(newEmployee);
      expect(returnVal).toEqual({
        id: 'uuid()',
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
        hireDate: '{hireDate}'
      });
    });
  }); // _add
  describe("_update", () => {
    let newEmployee, id;
    beforeEach(() => id = '{id}');
    beforeEach(() => newEmployee = {
      firstName: '{firstName}',
      middleName: '{middleName}',
      lastName: '{lastName}',
      empId: '{empId}',
      hireDate: '{hireDate}'
    });
    it("should take in object types", () => {
      const returnVal = svc._update(id, newEmployee);
      expect(returnVal).toEqual({
        id: '{id}',
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
        hireDate: '{hireDate}'
      });
    });
  }); // _update

}); // employeeRoutes
