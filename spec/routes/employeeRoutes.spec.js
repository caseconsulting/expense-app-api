const uuid = require('uuid/v4');
const jsonModify = require('../../js/jsonModify')('employee.json');
const svc = require('../../routes/employeeRoutes');

describe("employeeRoutes", () => {

  describe("_add", () => {
    let newEmployee, uuid;
    beforeEach(() => uuid = 'uuid');
    beforeEach(() => newEmployee = {
      firstName: '{firstName}',
      middleName: '{middleName}',
      lastName: '{lastName}',
      empId: '{empId}',
      hireDate: '{hireDate}'
    });
    let testSpy;
    describe("if employee is not found", () => {
      beforeEach(() => {
        //testSpy = spyOn(jsonModify, "_specificFind").and.returnValue('******');
      });

      it("objectWasFound should be null", () => {
        const returnVal = svc._add(uuid, newEmployee);
        console.log(returnVal);
        console.log(testSpy());
        expect(returnVal).toEqual({
          id: 'uuid',
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          empId: '{empId}',
          hireDate: '{hireDate}'
        });
      });
    }); //if employee is not found

    fdescribe("if employee was found", () => {
      beforeEach(() => {
        createSpy(jsonModify).and.returnValue({_specificFind: 'spy'});
      });
      it("should call specificFind", () => {
        expect(jsonModify._specificFind).toHaveBeenCalled();
        });
      it("objectWasFound should have a value", () => {
        const returnVal = svc._add(uuid, newEmployee);
        expect(returnVal).toEqual('found');
      });
    }); // if employee was found
  }); // _add

  describe("update", () => {
    describe("if found is not null", () => {
      let newEmployee, id;
      beforeEach(() => id = '{id}');
      beforeEach(() => newEmployee = {
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
        hireDate: '{hireDate}'
      });
      it("should take in employee objects", () => {
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
    }); // if found is not null
    describe("if found is null", () => {
      beforeEach(() => {
        found = null;
      });

      it("should return object being updated if employee ID is not found", () => {

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
  });


}); // employeeRoutes
