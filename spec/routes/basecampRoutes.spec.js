// const Budget = require('../../models/budget');
// const Employee = require('../../models/employee');
// const Expense = require('../../models/expense');
// const ExpenseType = require('../../models/expenseType');
const moment = require('moment');
// const TrainingUrls = require('../../models/trainingUrls');
const _ = require('lodash');
const BasecampRoutes = require('../../routes/basecampRoutes');
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();

describe('basecampRoutes', () => {
  const ID = '{id}';
  
  const FIRST_NAME = '{firstName}';
  const MIDDLE_NAME = '{middleName}';
  const LAST_NAME = '{lastName}';
  const EMPLOYEE_NUMBER = 0;
  const HIRE_DATE = '{hireDate}';
  const EMAIL = '{email}';
  const EMPLOYEE_ROLE = '{employeeRole}';
  const WORK_STATUS = 0;
  
  const CATEGORY = '{category}';
  
  const ISOFORMAT = 'YYYY-MM-DD';
  const DATE = moment().format(ISOFORMAT);
  const _ROUTER = '{router}';

  const BASE_CAMP_TOKEN = '{basecampToken}';

  const BASECAMP_RAW_TOKEN = { Payload: '{"body":{"access_token":"{basecampToken}"}}' };

  let res;

  const BODY_DATA = {
    id: ID
  };

  const PARAMS_DATA = {
    id: ID,
    category: CATEGORY,
    expenseTypeId: ID,
    date: DATE
  };

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

  const REQ_DATA = {
    employee: EMPLOYEE_DATA,
    body: BODY_DATA,
    params: PARAMS_DATA
  };

  const BASE_CAMP_INFO = {
    PROJ_NAME: {
      ID: 0,
      SCHEDULE_ID: 0
    }
  };

  const BASE_CAMP_DATA = {
    id: ID
  };


  const BASECAMP_PROJECTS = {
    CASE_CARES: {
      ID: 9208019,
      SCHEDULE_ID: 1315884569
    },
    HQ: {
      ID: 4708396,
      SCHEDULE_ID: 650769733
    },
    TECH_CORNER: {
      ID: 219642,
      SCHEDULE_ID: 34602707
    }
  };

  res = jasmine.createSpyObj('res', ['status', 'send']);
  res.status.and.returnValue(res);
  let basecampRoutes = new BasecampRoutes();
  basecampRoutes._router = _ROUTER;

  describe('_getBasecampToken', () => {

    let rawToken, basecampToken;
    beforeEach(() => {
      rawToken = _.cloneDeep(BASECAMP_RAW_TOKEN);
      basecampToken = _.cloneDeep(BASE_CAMP_TOKEN);
    });

    describe('when it succeeds to return basecamp token', () => {
      
      beforeEach(() => {
        spyOn(basecampRoutes, 'getToken').and.returnValue(Promise.resolve(rawToken));
      });

      it('should respond with the data', done => {
        basecampRoutes._getBasecampToken()
          .then(data => {
            expect(data).toEqual(basecampToken);
            expect(basecampRoutes.getToken).toHaveBeenCalled();
            done();
          });
      });// it should respond with the data
    });

    describe('when it fails to get the token', () => {
      
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get basecamp token.'
        };

        spyOn(basecampRoutes, 'getToken').and.returnValue(Promise.reject(err));
      });

      it('should return 404 error', done => {
        basecampRoutes._getBasecampToken()
          .then(data => {
            expect(data).toEqual(err);
            expect(basecampRoutes.getToken).toHaveBeenCalled();
            done();
          });
      });// should return 404 error
    });
  });

  describe('_getBasecampAvatars', () => {

  });

  describe('_getScheduleEntries', () => {

  });

  describe('_getFeedEvents', () => {

  });

  describe('getBasecampInfo', () => {
    
    let projects;

    beforeEach(() => {
      projects = _.cloneDeep(BASECAMP_PROJECTS);
    });
    
    it('should return BASECAMP_PROJECTS', () => {
      expect(basecampRoutes.getBasecampInfo()).toEqual(projects);
    });//should return project data
  });

  describe('router', () => {
    it('should return the router', () => {
      expect(basecampRoutes.router).toEqual(_ROUTER);
    }); // should return the router
  });

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
      basecampRoutes._sendError(res, err);
    }); // should send an error
  });
});