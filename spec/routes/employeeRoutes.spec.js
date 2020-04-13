const EmployeeRoutes = require('../../routes/employeeRoutes');

const Budget = require('../../models/budget');
const Employee = require('../../models/employee');
//const Expense = require('../../models/expense');
const ExpenseType = require('../../models/expenseType');

const IsoFormat = 'YYYY-MM-DD';
const moment = require('moment');

describe('employeeRoutes', () => {
  const ID = '{id}';
  const DESCRIPTION = '{description}';

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

  // const PURCHASE_DATE = '{purchaseDate}';
  // const REIMBURSED_DATE = '{reimbursedDate}';
  // const NOTE = '{note}';
  // const URL = '{url}';
  // const CREATED_AT = '{createdAt}';
  // const RECEIPT = '{receipt}';
  // const COST = 0;
  const CATEGORIES = [];

  const NAME = '{name}';
  const BUDGET = '{budget}';
  const START_DATE = '{startDate}';
  const END_DATE = '{endDate}';
  const OD_FLAG = '{odFlag}';
  const REQUIRED_FLAG = '{requiredFlag}';
  const RECURRING_FLAG = '{recurringFlag}';
  const IS_INACTIVE = '{isInactive}';
  const ACCESSIBLE_BY = '{accessibleBy}';

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
    userId: ID,
    reimbursedAmount: REIMBURSED_AMOUNT,
    pendingAmount: PENDING_AMOUNT,
    fiscalStartDate: FISCAL_START_DATE,
    fiscalEndDate: FISCAL_END_DATE,
    amount: AMOUNT
  };

  // const EXPENSE_DATA = {
  //   id: ID,
  //   purchaseDate: PURCHASE_DATE,
  //   reimbursedDate: REIMBURSED_DATE,
  //   note: NOTE,
  //   url: URL,
  //   createdAt: CREATED_AT,
  //   receipt: RECEIPT,
  //   cost: COST,
  //   description: DESCRIPTION,
  //   userId: ID,
  //   expenseTypeId: ID,
  //   categories: CATEGORIES
  // };

  const EXPENSE_TYPE_DATA = {
    id: ID,
    budgetName: NAME,
    budget: BUDGET,
    startDate: START_DATE,
    endDate: END_DATE,
    odFlag: OD_FLAG,
    requiredFlag: REQUIRED_FLAG,
    recurringFlag: RECURRING_FLAG,
    isInactive: IS_INACTIVE,
    description: DESCRIPTION,
    categories: CATEGORIES,
    accessibleBy: ACCESSIBLE_BY
  };

  let expenseDynamo, budgetDynamo, expenseTypeDynamo, employeeDynamo, employeeRoutes, expenseData;
  const uuid = 'uuid';
  beforeEach(() => {
    employeeRoutes = new EmployeeRoutes();
    employeeRoutes.databaseModify = jasmine.createSpyObj('databaseModify', [
      'findObjectInDB',
      'removeFromDB',
      'getAllEntriesInDB'
    ]);
    budgetDynamo = jasmine.createSpyObj('budgetDynamo', [
      'addToDB',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    expenseTypeDynamo = jasmine.createSpyObj('expenseTypeDynamo', ['findObjectInDB', 'getAllEntriesInDB']);
    employeeDynamo = jasmine.createSpyObj('employeeDynamo', ['findObjectInDB']);
    expenseDynamo = jasmine.createSpyObj('expenseDynamo', [
      'addToDB',
      'findObjectInDB',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    expenseData = jasmine.createSpyObj('expenseData', ['querySecondaryIndexInDB']);
    employeeRoutes.budgetDynamo = budgetDynamo;
    employeeRoutes.expenseTypeDynamo = expenseTypeDynamo;
    employeeRoutes.employeeDynamo = employeeDynamo;
    employeeRoutes.expenseDynamo = expenseDynamo;
    employeeRoutes.expenseData = expenseData;
  });

  describe('_add', () => {

    let expectedEmployee, data;

    beforeEach(() => {
      data = {
        id: 'uuid',
        firstName: '{firstName}',
        middleName: '{middleName}',
        lastName: '{lastName}',
        employeeNumber: '{employeeNumber}',
        hireDate: '{hireDate}',
        email: '{email}',
        employeeRole: '{employeeRole}',
        isInactive: false
      };
    });

    describe('when successfully adding employee', () => {

      beforeEach(() => {
        expectedEmployee = new Employee(data);

        spyOn(employeeRoutes, '_createCurrentBudgets').and.returnValue(Promise.resolve(expectedEmployee));
        spyOn(employeeRoutes, '_isDuplicateEmployee').and.returnValue(false);
      });

      it('should call _createCurrentBudgets and return the added employee', done => {
        employeeRoutes._add(uuid, data).then(returnedEmployee => {
          expect(returnedEmployee).toEqual(expectedEmployee);
          expect(employeeRoutes._createCurrentBudgets).toHaveBeenCalledWith(expectedEmployee);
          done();
        });
      }); // should call _createCurrentBudgets and return the added employee
    }); // when successfully adding employee

    describe('when failed to add employee', () => {

      let error;

      beforeEach(() => {
        error = {
          code: 403,
          message: 'Employee email already taken. Please enter a new email'
        };
        spyOn(employeeRoutes, '_isDuplicateEmployee').and.returnValue(error);
      });

      it('should throw an error', () => {
        employeeRoutes._add(uuid, data).catch( err => {
          expect(err).toEqual(error);
        });
      }); // should throw an error
    }); // when failed to add employee
  }); // _add

  describe('_createCurrentBudgets', () => {

    let employee;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      employee.hireDate = '2000-01-02';
    });

    describe('when successfully obtaining expense types', () => {

      let recurringExpenseType, currentExpenseType, oldExpenseType, expenseTypes;

      beforeEach(() => {
        recurringExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);
        recurringExpenseType.recurringFlag = true;
        currentExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);
        currentExpenseType.recurringFlag = false;
        currentExpenseType.startDate = moment().format(IsoFormat);
        currentExpenseType.endDate = moment().format(IsoFormat);
        oldExpenseType = new ExpenseType(EXPENSE_TYPE_DATA);
        oldExpenseType.recurringFlag = false;
        oldExpenseType.startDate = moment().subtract(1, 'd').format(IsoFormat);
        oldExpenseType.endDate = moment().subtract(1, 'd').format(IsoFormat);
        expenseTypes = [recurringExpenseType, currentExpenseType, oldExpenseType];
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(expenseTypes);
        spyOn(employeeRoutes, '_getUUID').and.returnValue(ID);
        budgetDynamo.addToDB.and.returnValue(new Budget(BUDGET_DATA));
      });

      afterEach(() => {
        expect(budgetDynamo.addToDB).toHaveBeenCalledTimes(2);
      });

      describe('and employee has access to the expense type', () => {

        beforeEach(() => {
          spyOn(employeeRoutes, '_hasAccess').and.returnValue(true);
        });

        it('should return the expected list of created budgets', done => {
          employeeRoutes._createCurrentBudgets(employee).then(results => {
            expect(results).toEqual([recurringExpenseType, currentExpenseType]);
            done();
          });
        }); // should return the expected list of created budgets
      }); // and employee has access to the expense type

      describe('and employee does not have access to the expense type', () => {

        beforeEach(() => {
          spyOn(employeeRoutes, '_hasAccess').and.returnValue(false);
        });

        it('should return the expected list of created budgets', done => {
          employeeRoutes._createCurrentBudgets(employee).then(results => {
            expect(results).toEqual([recurringExpenseType, currentExpenseType]);
            done();
          });
        }); // should return the expected list of created budgets
      }); // and employee does not have access to the expense type
    }); // when successfully obtaining expense types

    describe('when failing to obtain expense type list', () => {

      beforeEach(() => {
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject('Error getting expense type list'));
      });

      it('should throw an error', () => {
        employeeRoutes._createCurrentBudgets(employee).catch( err => {
          expect(err).toEqual('Error getting expense type list');
        });
      }); // should throw an error
    }); // when failing to obtain expense type list
  }); // _createCurrentBudgets

  describe('_delete', () => {

    let employeeData;

    beforeEach(() => {
      employeeData = {
        id: 'empleeId'
      };
    });

    describe('when user has no expenses', () => {

      beforeEach(() => {
        expenseData.querySecondaryIndexInDB.and.returnValue([]);
        employeeRoutes.databaseModify.removeFromDB.and.returnValue(employeeData);
        budgetDynamo.querySecondaryIndexInDB.and.returnValue([{id: 'budgetId'}]);
        budgetDynamo.removeFromDB.and.returnValue(Promise.resolve());
      });

      it('should delete and return the employee', done => {
        employeeRoutes._delete('id').then( data => {
          expect(data).toEqual(new Employee(employeeData));
          done();
        });
      }); // should delete and return the employee
    }); // when user has no expenses

    describe('when user has expenses', () => {

      beforeEach(() => {
        expenseData.querySecondaryIndexInDB.and.returnValue(['some random expense']);
      });

      it('should throw an error', done => {
        employeeRoutes._delete('id').catch( err => {
          expect(err).toEqual({
            code: 403,
            message: 'Employee can not be deleted if they have expenses'
          });
          done();
        });
      }); // should throw an error
    }); // when user has expenses

  }); // _delete

  describe('_getBudgetDates', () => {
    const moment = require('moment');
    let hireDate,
      expectedObj,
      expectedAnniversaryMonth,
      expectedAnniversaryDay,
      expectedStartDate,
      expectedEndDate,
      expectedAnniversaryYear,
      today;

    describe('when hired in the past and today is before the anniversary date', () => {

      beforeEach(() => {
        hireDate = moment().subtract(10, 'years').add(1, 'days');
        expectedAnniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
        expectedAnniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31

        today = moment();

        expectedStartDate = moment([today.year() - 1, expectedAnniversaryMonth, expectedAnniversaryDay]);
        expectedEndDate = moment([today.year(), expectedAnniversaryMonth, expectedAnniversaryDay])
          .subtract('1', 'days');

        expectedObj = {
          startDate: expectedStartDate,
          endDate: expectedEndDate
        };
      });

      it('should return an object with a start and end date', done => {
        let returnedObj = employeeRoutes._getBudgetDates(hireDate);
        expect(returnedObj.startDate.format()).toEqual(expectedObj.startDate.format());
        done();
      }); // should return an object with a start and end date
    }); // when hired in the past and today is before the anniversary date

    describe('when hired in the past and today is after the anniversary date', () => {

      beforeEach(() => {
        hireDate = moment().subtract(10, 'years');
        expectedAnniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
        expectedAnniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31

        today = moment();

        expectedStartDate = moment([today.year(), expectedAnniversaryMonth, expectedAnniversaryDay]);
        expectedEndDate = moment([today.year() + 1, expectedAnniversaryMonth, expectedAnniversaryDay])
          .subtract('1', 'days');

        expectedObj = {
          startDate: expectedStartDate,
          endDate: expectedEndDate
        };
      });

      it('should return an object with a start and end date', done => {
        let returnedObj = employeeRoutes._getBudgetDates(hireDate);
        expect(returnedObj.startDate.format()).toEqual(expectedObj.startDate.format());
        done();
      }); // should return an object with a start and end date
    }); // when hired in the past and today is after the anniversary date

    describe('when hire date is in the future', () => {

      beforeEach(() => {
        hireDate = moment().add(10, 'years');
        expectedAnniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
        expectedAnniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
        expectedAnniversaryYear = moment(hireDate, 'YYYY-MM-DD').year();

        today = moment();

        expectedStartDate = moment([expectedAnniversaryYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
        expectedEndDate = moment([expectedAnniversaryYear + 1, expectedAnniversaryMonth, expectedAnniversaryDay])
          .subtract('1', 'days');

        expectedObj = {
          startDate: expectedStartDate,
          endDate: expectedEndDate
        };
      });

      it('should return an object with a start and end date', done => {
        let returnedObj = employeeRoutes._getBudgetDates(hireDate);
        expect(returnedObj.startDate.format()).toEqual(expectedObj.startDate.format());
        done();
      }); // should return an object with a start and end date
    }); // when hire date is in the future
  }); // _getBudgetDates

  describe('_getUUID', () => {
    it('to return a uuid', () => {
      employeeRoutes._getUUID();
      expect(employeeRoutes._getUUID()).not.toBe(undefined);
    }); // to return a uuid
  }); // _getUUID

  describe('_isDuplicateEmployee', () => {

    describe('when duplicate employee number', () => {

      beforeEach(() => {
        employeeRoutes.databaseModify.getAllEntriesInDB.and.returnValue([{employeeNumber: 1}]);
      });

      it('should return an error', () => {
        employeeRoutes._isDuplicateEmployee({employeeNumber: 1}).catch( err => {
          expect(err).toEqual({
            code: 403,
            message: 'Employee number already taken. Please enter a new Employee number'
          });
        });
      }); // should return an error
    }); // when duplicate employee number

    describe('when duplicate employee email', () => {

      beforeEach(() => {
        employeeRoutes.databaseModify.getAllEntriesInDB.and.returnValue([{email: 'email'}]);
      });

      it('should return an error', () => {
        employeeRoutes._isDuplicateEmployee({employeeNumber: 1, email: 'email'}).catch( err => {
          expect(err).toEqual({
            code: 403,
            message: 'Employee email already taken. Please enter a new email'
          });
        });
      }); // should return an error
    }); // when duplicate employee email

    describe('is not duplicate employee', () => {

      beforeEach(() => {
        employeeRoutes.databaseModify.getAllEntriesInDB.and.returnValue([]);
      });

      it('should return false', () => {
        employeeRoutes._isDuplicateEmployee({email: 'email'}).then( data => {
          expect(data).toBe(false);
        });
      }); // should return an error
    }); // when duplicate employee email

  }); // _isDuplicateEmployee

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
        email: '{email}',
        employeeRole: '{employeeRole}',
        isInactive: '{isInactive}'
      };
      id = '{id}';
    });
    describe('if promise resolves', () => {
      beforeEach(() => {
        expectedEmployee = new Employee(data);
        employeeRoutes.databaseModify.findObjectInDB.and.returnValue(Promise.resolve({ expectedEmployee }));
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

      beforeEach(() => {
        employeeRoutes.databaseModify.findObjectInDB.and.returnValue(Promise.reject('Could not find employee'));
      });

      it('should return Could not find employee', done => {
        employeeRoutes._update(ID, EMPLOYEE_DATA).catch(err => {
          expect(err).toEqual('Could not find employee');
          done();
        });
      }); // should return Could not find employee
    }); // if the promise is rejected
  }); // _update
}); // employeeRoutes
