const uuid = require('uuid/v4');
const EmployeeRoutes = require('../../routes/employeeRoutes');
const Employee = require('../../models/employee');
describe('employeeRoutes', () => {
  let databaseModify, employeeRoutes;
  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB']);
    employeeRoutes = new EmployeeRoutes(databaseModify, uuid());
  });

  fdescribe('_add', () => {
    let expectedEmployee, uuid, data;
    beforeEach(() => {
      data = {
        id: 'uuid',
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
        hireDate: '{hireDate}',
        expenseTypes: '[expenseTypes]',
        email: '{email}',
        employeeRole: '{employeeRole}',
        isActive: '{isActive}'
      };
      uuid = 'uuid';
      expectedEmployee = new Employee(data);

      spyOn(EmployeeRoutes.prototype,'_createRecurringExpenses')
        .and.returnValue(Promise.resolve(expectedEmployee));
    });
    it('should call _createRecurringExpenses and return the added employee', done => {
      employeeRoutes._add(uuid, data).then( returnedEmployee =>{
        expect(returnedEmployee).toEqual(expectedEmployee);
        expect(EmployeeRoutes.prototype._createRecurringExpenses).toHaveBeenCalledWith(uuid, expectedEmployee.hireDate);
        done();
      });
    });

  }); // _add

  describe('update', () => {
    let employeeObj, id, expectedObj;
    beforeEach(() => {
      employeeObj = {
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
        hireDate: '{hireDate}',
        expenseTypes: '[expenseTypes]'
      };
      id = 'id';
    });
    describe('if promise resolves', () => {
      beforeEach(() => {
        databaseModify.findObjectInDB.and.returnValue(Promise.resolve({}));
        expectedObj = {
          id: 'id',
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          empId: '{empId}',
          hireDate: '{hireDate}',
          expenseTypes: '[expenseTypes]'
        };
      });

      it('should return updated employee object', done => {
        employeeRoutes._update(id, employeeObj).then(data => {
          expect(databaseModify.findObjectInDB).toHaveBeenCalledWith(id);
          expect(data).toEqual(expectedObj);
          done();
        });
      });
    }); // if promise resolves
    describe('if the promise is rejected', () => {
      let expectedErr;
      beforeEach(() => {
        databaseModify.findObjectInDB.and.returnValue(Promise.reject('server error'));
        expectedErr = 'server error';
      });

      it('should return error from server', () => {
        employeeRoutes._update(id, employeeObj).catch(err => {
          expect(err).toEqual(expectedErr);
        });
      });
    });
  }); // if the promise is rejected
}); // employeeRoutes
