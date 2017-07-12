const uuid = require('uuid/v4');
const svc = require('../../routes/employeeRoutes');
const jsonModify = require('../../js/jsonModify') ('employee.json');

describe("employeeRoutes", () => {

  fdescribe("_add", () => {
    let newEmployee, uuid, found;
    beforeEach(()=> uuid = 'uuid');
    beforeEach(() => newEmployee = {
      firstName: '{firstName}',
      middleName: '{middleName}',
      lastName: '{lastName}',
      empId: '{empId}',
      hireDate: '{hireDate}'
    });

    describe("if found is not null", () => {
      beforeEach(() => {
        spyOn(jsonModify, "_specificFind").and.returnValue('{found}');
        });
      it("should return null", () => {
        const returnVal = svc._add(uuid,newEmployee);
        expect(returnVal).toEqual(null);
      });
    }); //if found is null, meaning the object is not already existing

    describe("if found is null", () => {
      beforeEach(() => {
        found = null;
        });

      it("should return object being added if object is not found", () => {

        const returnVal = svc._add(uuid, newEmployee);
        expect(returnVal).toEqual({
          id: 'uuid',
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          empId: '{empId}',
          hireDate: '{hireDate}'
        });
      });
    }); //if found is null
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
