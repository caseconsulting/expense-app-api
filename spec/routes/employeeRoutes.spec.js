const EmployeeRoutes = require('../../routes/employeeRoutes');
const Employee = require('../../models/employee');

describe('employeeRoutes', () => {
  let employeeRoutes;
  beforeEach(() => {
    employeeRoutes = new EmployeeRoutes();
    employeeRoutes.databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB']);
  });

  describe('_add', () => {
    let expectedEmployee, uuid, data;
    beforeEach(() => {
      data = {
        id: 'uuid',
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        employeeNumber: '{employeeNumber}',
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

  describe('_update', () => {
    let expectedEmployee, data, id;
    beforeEach(() => {
      data = {
        id: '{id}',
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        employeeNumber: '{employeeNumber}',
        hireDate: '{hireDate}',
        expenseTypes: '[expenseTypes]',
        email: '{email}',
        employeeRole: '{employeeRole}',
        isActive: '{isActive}'
      };
      id = '{id}';
      
    });
    describe('if promise resolves', () => {
      beforeEach(() => {
        expectedEmployee = new Employee(data);
        employeeRoutes.databaseModify.findObjectInDB.and.returnValue(Promise.resolve({expectedEmployee}));
      });

      it('should return updated employee object', done => {
        employeeRoutes._update(id, data).then(returnedEmployee => {
          expect(returnedEmployee).toEqual(expectedEmployee);
          expect(employeeRoutes.databaseModify.findObjectInDB).toHaveBeenCalledWith(id);
          done();
        });
      });
    }); // if promise resolves
    describe('if the promise is rejected', () => {
      let expectedErr;
      beforeEach(() => {
        employeeRoutes.databaseModify.findObjectInDB.and.returnValue(Promise.reject('server error'));
        expectedErr = 'server error';
      });

      it('should return error from server', () => {
        employeeRoutes._update(id, data).catch(err => {
          expect(err).toEqual(expectedErr);
        });
      });// should return error from server
    });// if the promise is rejected
  }); // _update
}); // employeeRoutes
