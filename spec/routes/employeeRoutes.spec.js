const uuid = require('uuid/v4');
//const databaseModify = require('../../js/databaseModify')('employee.json');
const EmployeeRoutes = require('../../routes/employeeRoutes');

describe("employeeRoutes", () => {
  let databaseModify, svc;
  beforeEach(() => databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB']));
  beforeEach(() => svc = new EmployeeRoutes(databaseModify, uuid()));

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

    describe("if employee is not found", () => {
      beforeEach(() => {
        databaseModify.findObjectInDB.and.returnValue({
          id: '{id}'
        });
      });

      it("objectWasFound should be null", () => {
        const returnVal = svc._add(uuid, newEmployee);
        console.log(returnVal);

        expect(returnVal).toEqual(null);
      });
    }); //if employee is not found

    describe("if employee was found", () => {
      beforeEach(() => {
        databaseModify.findObjectInDB.and.returnValue(false);

      });
      afterEach(() => {
        expect(databaseModify.findObjectInDB).toHaveBeenCalled();
      });
      it("objectWasFound should have a value", () => {
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
    }); // if employee was found
  }); // _add

  describe("update", () => {
    let databaseModify, svc;
    beforeEach(() => databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB']));
    beforeEach(() => svc = new EmployeeRoutes(databaseModify, uuid()));
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
      beforeEach(() => databaseModify.findObjectInDB.and.returnValue(false));
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
      beforeEach(() => databaseModify.findObjectInDB.and.returnValue(true));
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