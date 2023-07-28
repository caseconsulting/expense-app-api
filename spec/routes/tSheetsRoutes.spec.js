const TSheetsRoutes = require('../../routes/tSheetsRoutes');
const _ = require('lodash');

describe('tSheetsRoutes', () => {
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

  const START_DATE = '2020-01-01';
  const END_DATE = '2020-01-31';

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

  const PARAMS_DATA = {
    employeeNumber: EMPLOYEE_NUMBER,
    startDate: START_DATE,
    endDate: END_DATE
  };

  const REQ_DATA = {
    employee: EMPLOYEE_DATA,
    params: PARAMS_DATA
  };

  const MONTHLY_HOURS = {
    body: '{timesheets}'
  };

  const TIMESHEETS = '{timesheets}';

  const MONTHLY_HOURS_ERR = {
    body: '',
    errorMessage: 'Failed to get monthly hours'
  };

  const PTO_BALANCES_PAYLOAD = {
    body: '{ptoBalances}'
  };

  const PTO_BALANCES = '{ptoBalances}';

  const PTO_BALANCES_ERR = {
    body: '',
    errorMessage: 'Failed to get pto balances'
  };

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
      tSheetsRoutes.asyncForEach(array, (number) => {
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

  describe('isIsoFormat', () => {
    let value;

    describe('when value is in iso format', () => {
      beforeEach(() => {
        value = '2020-01-11';
      });
      it('should return true', () => {
        expect(tSheetsRoutes.isIsoFormat(value)).toBeTrue();
      });
    }); // value is in iso format

    describe('when value is not in iso format', () => {
      beforeEach(() => {
        value = '01-11-2020';
      });
      it('should return false', () => {
        expect(tSheetsRoutes.isIsoFormat(value)).toBeFalse();
      });
    }); // value is not in iso format
  }); // isIsoFormat

  describe('_getMonthlyHours', () => {
    let req, monthlyHours, timesheets;
    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      monthlyHours = _.cloneDeep(MONTHLY_HOURS);
      timesheets = _.cloneDeep(TIMESHEETS);
    });

    describe('when successfully returns monthly hours', () => {
      beforeEach(() => {
        spyOn(tSheetsRoutes, 'invokeLambda').and.returnValue(monthlyHours);
      });
      it('should respond with a 200 and monthly hours', (done) => {
        tSheetsRoutes._getMonthlyHours(req, res).then((data) => {
          expect(data).toEqual(timesheets);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(timesheets);
          expect(tSheetsRoutes.invokeLambda).toHaveBeenCalled();
          done();
        });
      });
    }); // successfully returns monthly hours

    describe('when it fails to return monthly hours', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get monthly hours'
        };
        spyOn(tSheetsRoutes, 'invokeLambda').and.returnValue(MONTHLY_HOURS_ERR);
        spyOn(tSheetsRoutes, '_sendError').and.returnValue(err);
      });
      it('should respond with 404 and err', (done) => {
        tSheetsRoutes._getMonthlyHours(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(tSheetsRoutes._sendError).toHaveBeenCalled();
          expect(tSheetsRoutes.invokeLambda).toHaveBeenCalled();
          done();
        });
      });
    }); // fails to return monthly hours
  }); // _getMonthlyHours

  describe('_getPTOBalances', () => {
    let req, ptoBalancesPayload, ptoBalances;
    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      ptoBalancesPayload = _.cloneDeep(PTO_BALANCES_PAYLOAD);
      ptoBalances = _.cloneDeep(PTO_BALANCES);
    });
    describe('when successfully return pto balances', () => {
      beforeEach(() => {
        spyOn(tSheetsRoutes, 'invokeLambda').and.returnValue(ptoBalancesPayload);
      });
      it('should respond with a 200 and pto balances', (done) => {
        tSheetsRoutes._getPTOBalances(req, res).then((data) => {
          expect(data).toEqual(ptoBalances);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(ptoBalances);
          expect(tSheetsRoutes.invokeLambda).toHaveBeenCalled();
          done();
        });
      });
    }); // successfully returns pto balances

    describe('when it fails to return pto balances', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get pto balances'
        };
        spyOn(tSheetsRoutes, 'invokeLambda').and.returnValue(PTO_BALANCES_ERR);
        spyOn(tSheetsRoutes, '_sendError').and.returnValue(err);
      });
      it('should respond with 404 and err', (done) => {
        tSheetsRoutes._getPTOBalances(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(tSheetsRoutes._sendError).toHaveBeenCalled();
          expect(tSheetsRoutes.invokeLambda).toHaveBeenCalled();
          done();
        });
      });
    }); // fails to return pto balances
  }); // _getPToBalances
}); // tSheetsRoutes
