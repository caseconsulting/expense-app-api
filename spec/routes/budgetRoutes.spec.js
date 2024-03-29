const Budget = require('../../models/budget');
const BudgetRoutes = require('../../routes/budgetRoutes');
const _ = require('lodash');

describe('budgetRoutes', () => {
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

  const REIMBURSED_AMOUNT = 0;
  const PENDING_AMOUNT = 0;
  const FISCAL_START_DATE = '{fiscalStartDate}';
  const FISCAL_END_DATE = '{fiscalEndDate}';
  const AMOUNT = 0;

  const CATEGORY = '{category}';

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

  const BUDGET_DATA = {
    id: ID,
    expenseTypeId: ID,
    employeeId: ID,
    reimbursedAmount: REIMBURSED_AMOUNT,
    pendingAmount: PENDING_AMOUNT,
    fiscalStartDate: FISCAL_START_DATE,
    fiscalEndDate: FISCAL_END_DATE,
    amount: AMOUNT
  };

  const BODY_DATA = {
    id: ID
  };

  const PARAMS_DATA = {
    id: ID,
    category: CATEGORY
  };

  const REQ_DATA = {
    employee: EMPLOYEE_DATA,
    body: BODY_DATA,
    params: PARAMS_DATA
  };

  let budgetRoutes, res, budgetDynamo;

  beforeEach(() => {
    budgetDynamo = jasmine.createSpyObj('budgetDynamo', [
      'addToDB',
      'getAllEntriesInDB',
      'getEntry',
      'getEntryUrl',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      '_readFromDB',
      '_readFromDBUrl',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    res = jasmine.createSpyObj('res', ['status', 'send']);
    res.status.and.returnValue(res);

    budgetRoutes = new BudgetRoutes();
    budgetRoutes.budgetDynamo = budgetDynamo;
    budgetRoutes._router = _ROUTER;
  });

  describe('_getCallerBudgets', () => {
    let req;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
    });

    describe('when successfully gets employee caller budgets', () => {
      beforeEach(() => {
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([BUDGET_DATA]));
      });

      it('should return an array of budget', (done) => {
        budgetRoutes._getCallerBudgets(req, res).then((data) => {
          expect(data).toEqual([new Budget(BUDGET_DATA)]);
          expect(budgetDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'employeeId-expenseTypeId-index',
            'employeeId',
            ID
          );
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith([new Budget(BUDGET_DATA)]);
          done();
        });
      }); // should return an array of budgets
    }); // when successfully gets employee caller budgets

    describe('when fails to get employee caller budgets', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get budgets.'
        };
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        budgetRoutes
          ._getCallerBudgets(req, res)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get employee caller budgets
  }); // _getCallerBudgets

  describe('_getEmployeeBudgets', () => {
    let req;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
    });

    describe('when successfully gets employee budgets', () => {
      beforeEach(() => {
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([BUDGET_DATA]));
      });

      it('should return an array of budget', (done) => {
        budgetRoutes._getEmployeeBudgets(req, res).then((data) => {
          expect(data).toEqual([new Budget(BUDGET_DATA)]);
          expect(budgetDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'employeeId-expenseTypeId-index',
            'employeeId',
            ID
          );
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith([new Budget(BUDGET_DATA)]);
          done();
        });
      }); // should return an array of budgets
    }); // when successfully gets employee budgets

    describe('when fails to get employee budgets', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get budgets.'
        };
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        budgetRoutes
          ._getEmployeeBudgets(req, res)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get employee budgets
  }); // _getEmployeeBudgets

  describe('router', () => {
    it('should return the router', () => {
      expect(budgetRoutes.router).toEqual(_ROUTER);
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
      budgetRoutes._sendError(res, err);
    }); // should send an error
  }); // _sendError
}); // budgetRoutes
