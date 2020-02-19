const EmployeeRoutes = require('../../routes/employeeRoutes');
const Employee = require('../../models/employee');

describe('employeeRoutes', () => {
  let expenseDynamo, budgetDynamo, expenseTypeDynamo, employeeDynamo, employeeRoutes, expenseData;
  const uuid = 'uuid';
  const id = 'id';
  const userId = '{userId}';
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

        spyOn(employeeRoutes, '_createRecurringExpenses').and.returnValue(Promise.resolve(expectedEmployee));
        spyOn(employeeRoutes, '_isDuplicateEmployee').and.returnValue(false);
      });

      it('should call _createRecurringExpenses and return the added employee', done => {
        employeeRoutes._add(uuid, data).then(returnedEmployee => {
          expect(returnedEmployee).toEqual(expectedEmployee);
          expect(employeeRoutes._createRecurringExpenses).toHaveBeenCalledWith(
            expectedEmployee.id,
            expectedEmployee.hireDate
          );
          done();
        });
      }); // should call _createRecurringExpenses and return the added employee
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

  describe('_createRecurringExpenses', () => {
    let hireDate, newBudget, dates, expenseType;
    beforeEach(() => {
      spyOn(employeeRoutes, '_getUUID').and.returnValue(uuid);
      hireDate = 'YYYY-MM-DD';
      newBudget = {
        id: uuid,
        expenseTypeId: id,
        userId: userId,
        reimbursedAmount: 0,
        pendingAmount: 0,
        fiscalStartDate: '{fiscalStartDate}',
        fiscalEndDate: '{fiscalEndDate}'
      };
      dates = {
        startDate: jasmine.createSpyObj('startDate', ['format']),
        endDate: jasmine.createSpyObj('endDate', ['format'])
      };

      expenseType = {
        id: id,
        recurringFlag: true
      };

      dates.startDate.format.and.returnValue('{fiscalStartDate}');
      dates.endDate.format.and.returnValue('{fiscalEndDate}');

      spyOn(employeeRoutes, '_getBudgetDates').and.returnValue(dates);

      budgetDynamo.addToDB.and.returnValue(Promise.resolve());
    });

    afterEach(() => {
      expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
    });

    describe('when successfully creating recurring expeneses', () => {

      beforeEach(() => {
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
      });

      it('should return a list of created budgets', done => {
        employeeRoutes._createRecurringExpenses(userId, hireDate).then(results => {
          expect(results).toEqual([expenseType]);
          done();
        });
      }); // should return a list of created budgets

      afterEach(() => {
        expect(employeeRoutes._getBudgetDates).toHaveBeenCalledWith(hireDate);
        expect(budgetDynamo.addToDB).toHaveBeenCalledWith(newBudget);
      });
    }); // when successfully creating recurring expeneses

    describe('when failing to obtain expense type list', () => {

      beforeEach(() => {
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject('there was an error'));
      });

      it('should throw an error', () => {
        employeeRoutes._createRecurringExpenses(userId, hireDate).catch( err => {
          expect(err).toEqual('there was an error');
        });
      }); // should throw an error
    }); // when failing to obtain expense type list
  }); // _createRecurringExpenses

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
      today,
      anniversaryComparisonDate;

    beforeEach(() => {
      hireDate = '1970-12-31';
      expectedAnniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
      expectedAnniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
      expectedAnniversaryYear = moment(hireDate, 'YYYY-MM-DD').year();
      anniversaryComparisonDate = moment([expectedAnniversaryYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
      let startYear;
      today = moment();

      if (anniversaryComparisonDate.isBefore(today)) {
        startYear = today.isBefore(moment([today.year(), expectedAnniversaryMonth, expectedAnniversaryDay]))
          ? today.year() - 1
          : today.year();
      } else {
        startYear = today.isBefore(moment([expectedAnniversaryYear, expectedAnniversaryMonth, expectedAnniversaryDay]))
          ? expectedAnniversaryYear
          : expectedAnniversaryYear - 1;
      }

      expectedStartDate = moment([startYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
      expectedEndDate = moment([startYear, expectedAnniversaryMonth, expectedAnniversaryDay])
        .add('1', 'years')
        .subtract('1', 'days');

      expectedObj = {
        startDate: expectedStartDate,
        endDate: expectedEndDate
      };
    });

    it('should return an object with a start and end date', done => {
      let returnedObj = employeeRoutes._getBudgetDates(hireDate);
      expect(returnedObj).toEqual(expectedObj);
      done();
    }); // should return an object with a start and end date
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
      let expectedErr;
      beforeEach(() => {
        employeeRoutes.databaseModify.findObjectInDB.and.returnValue(Promise.reject('server error'));
        expectedErr = 'server error';
      });

      it('should return error from server', () => {
        employeeRoutes._update(id, data).catch(err => {
          expect(err).toEqual(expectedErr);
        });
      }); // should return error from server
    }); // if the promise is rejected
  }); // _update
}); // employeeRoutes
