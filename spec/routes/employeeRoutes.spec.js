const uuid = require('uuid/v4');
const EmployeeRoutes = require('../../routes/employeeRoutes');

xdescribe('employeeRoutes', () => {
  let databaseModify, employeeRoutes;
  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', ['findObjectInDB']);
    employeeRoutes = new EmployeeRoutes(databaseModify, uuid());
  });

  describe('_add', () => {
    let newEmployee, uuid, expectedObj;
    beforeEach(() => {
      newEmployee = {
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        empId: '{empId}',
        hireDate: '{hireDate}',
        expenseTypes: '[expenseTypes]'
      };
      uuid = 'uuid';
    });
    describe('if the promise resolves', () => {
      beforeEach(() => {
        expectedObj = {
          id: 'uuid',
          firstName: '{firstName}',
          middleName: '{middleName}',
          lastName: '{lastName}',
          empId: '{empId}',
          hireDate: '{hireDate}',
          expenseTypes: '[expenseTypes]'
        };
      });
      it('should return a new employee object', done => {
        employeeRoutes._add(uuid, newEmployee).then(data => {
          expect(data).toEqual(expectedObj);
          done();
        });
      });
    }); // if the promise resolves
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
