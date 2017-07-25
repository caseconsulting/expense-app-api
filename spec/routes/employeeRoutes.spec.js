const uuid = require('uuid/v4');
//const jsonModify = require('../../js/jsonModify')('employee.json');
const EmployeeRoutes = require('../../routes/employeeRoutes');

fdescribe("employeeRoutes", () => {
  let jsonModify, svc;
  beforeEach(() => jsonModify = jasmine.createSpyObj('jsonModify', ['_specificFind']));
  beforeEach(() => svc = new EmployeeRoutes(jsonModify, uuid()));
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
        jsonModify._specificFind.and.returnValue(true);
        //testSpy = spyOn(jsonModify, "_specificFind").and.returnValue('******');
      });

      it("objectWasFound should be null", () => {
        const returnVal = svc._add(uuid, newEmployee);
        console.log(returnVal);

        expect(returnVal).toEqual(null);
      });
    }); //if employee is not found

    describe("if employee was found", () => {
      beforeEach(() => {
        jsonModify._specificFind.and.returnValue(false);

      });
      afterEach(() => {
        expect(jsonModify._specificFind).toHaveBeenCalled();
      });
      it("objectWasFound should have a value", () => {
        const returnVal = svc._add(uuid, newEmployee);
        expect(returnVal).toEqual({ id: 'uuid', firstName: '{firstName}', middleName: '{middleName}', lastName: '{lastName}', empId: '{empId}', hireDate: '{hireDate}' });
      });
    }); // if employee was found
  }); // _add

  describe("update", () => {
    let jsonModify, svc;
    beforeEach(() => jsonModify = jasmine.createSpyObj('jsonModify', ['_specificFind']));
    beforeEach(() => svc = new EmployeeRoutes(jsonModify, uuid()));
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
      beforeEach(()=> jsonModify._specificFind.and.returnValue(false));
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
    describe("if found is true", () => {
      beforeEach(()=> jsonModify._specificFind.and.returnValue(true));
      beforeEach(() => newEmployee = {
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
        hireDate: '{hireDate}'
      });
      it("should return object being updated if employee ID is not found", () => {

        const returnVal = svc._add(uuid, newEmployee);
        expect(returnVal).toEqual(null);
      });
    }); //if found is null
  });


}); // employeeRoutes
