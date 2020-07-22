// const AWS = require('aws-sdk-mock');
// const moment = require('moment');
const TSheetsRoutes = require('../../routes/tSheetsRoutes');
const _ = require('lodash');

describe('tSheetsRoutes', () => {

  // const ISOFORMAT = 'YYYY-MM-DD';
  // const STAGE = 'dev';
  const _ROUTER = '{router}';

  const ID = '{id}';
  const FIRST_NAME = '{firstName}';
  const MIDDLE_NAME = '{middleName}';
  const LAST_NAME = '{lastName}';
  const EMPLOYEE_NUMBER = 0;
  const HIRE_DATE = '{hireDate}';
  const EMAIL = '{email}';
  const EMPLOYEE_ROLE = '{employeeRole}';
  const WORK_STATUS = 0;

  // const START_DATE = '2020-01-01';
  // const END_DATE = '2020-01-31';

  const EMPLOYEE_DATA = {
    id: ID,
    firstName: FIRST_NAME,
    middleName: MIDDLE_NAME,
    lastName: LAST_NAME,
    employeeNumber: EMPLOYEE_NUMBER,
    hireDate: HIRE_DATE,
    email: EMAIL,
    employeeRole: EMPLOYEE_ROLE,
    workStatus: WORK_STATUS
  };

  // const PARAMS_DATA = {
  //   employeeNumber: EMPLOYEE_NUMBER,
  //   startDate: START_DATE,
  //   endDate: END_DATE
  // };

  // const REQ_DATA = {
  //   employee: EMPLOYEE_DATA,
  //   params: PARAMS_DATA
  // };

  let res, tSheetsRoutes;

  beforeEach(() => {
    res = jasmine.createSpyObj('res', ['status', 'send']);
    res.status.and.returnValue(res);

    tSheetsRoutes = new TSheetsRoutes();
    tSheetsRoutes._router = _ROUTER;
  });

  describe('asyncForEach', () => {

    let counter, array;

    beforeEach(() => {
      array = [1, 2, 3, 4, 5];
      counter = 0;
    });

    it('should call the a number of times depending on the array size', () => {
      tSheetsRoutes.asyncForEach(array, number => {
        counter++;
        expect(counter).toEqual(number);
      });
    }); // should call the a number of times depending on the array size
  }); // asyncForEach

  describe('isAdmin', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when the employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return true', () => {
        expect(tSheetsRoutes.isAdmin(employee)).toBe(true);
      }); // should return true
    }); // when the employee is an admin

    describe('when the employee is not an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return false', () => {
        expect(tSheetsRoutes.isAdmin(employee)).toBe(false);
      }); // should return false
    }); // when the employee is not an admin
  }); // isAdmin

  describe('isUser', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when the employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return true', () => {
        expect(tSheetsRoutes.isUser(employee)).toBe(true);
      }); // should return true
    }); // when the employee is a user

    describe('when the employee is not a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return false', () => {
        expect(tSheetsRoutes.isUser(employee)).toBe(false);
      }); // should return false
    }); // when the employee is not an user
  }); // isUser

  describe('router', () => {

    it('should return the router', () => {
      expect(tSheetsRoutes.router).toEqual(_ROUTER);
    }); // should return the router
  }); // router

  describe('_sendError', () => {

    let err;

    beforeEach(() => {
      err = {
        code: 403,
        message: 'Forbidden error.'
      };
    });

    afterEach(() => {
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith(err);
    });

    it('should send an error', () => {
      tSheetsRoutes._sendError(res, err);
    }); // should send an error
  }); // _sendError
}); // tSheetsRoutes
