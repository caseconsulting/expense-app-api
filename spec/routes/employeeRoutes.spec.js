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

  xdescribe('_createRecurringExpenses', () => {
    let userId, hireDate, newBudget, results, dates,expenseTypeDynamo, budgetDynamo;
    const databaseModify = require('../../js/databaseModify');
    budgetDynamo = new databaseModify('budgets');
    expenseTypeDynamo = new databaseModify('expense-types');
    beforeEach(() => {
      userId = 'userId';
      hireDate = 'YYYY-MM-DD';
      newBudget = {
        id: '{id}',
        expenseTypeId: '{expenseTypeId}',
        userId: '{userId}',
        reimbursedAmount: 0,
        pendingAmount: 0,
        fiscalStartDate: '{fiscalStartDate}',
        fiscalEndDate: '{fiscalEndDate}'
      };
      dates = {
        startDate: jasmine.createSpyObj('startDate', ['format']),
        endDate: jasmine.createSpyObj('endDate', ['format'])
      };

      dates.startDate.format.and.returnValue('{fiscalStartDate}');
      dates.endDate.format.and.returnValue('{fiscalEndDate}');

      spyOn(budgetDynamo, 'addToDB');
      spyOn(expenseTypeDynamo, 'getAllEntriesInDB');


      spyOn(EmployeeRoutes.prototype, '_getBudgetDates').and.returnValue(dates);     
    });
    it('should return a list of created budgets', async (done) => {
      results = await employeeRoutes._createRecurringExpenses(userId, hireDate);
      
      
      expect(EmployeeRoutes.prototype._getBudgetDates).toHaveBeenCalledWith(hireDate);
      expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
      expect(budgetDynamo.addToDB).toHaveBeenCalledWith(newBudget);
      expect(results).toEqual(jasmine.any(Object));
      done();
    }); // should return a list of created budgets
  }); // _createRecurringExpenses

  describe('_getBudgetDates', () => {
    const moment = require('moment');
    let hireDate,
      expectedObj,
      expectedAnniversaryMonth,
      expectedAnniversaryDay,
      currentYear,
      expectedStartDate,
      expectedEndDate,
      startYear,
      anniversaryComparisonDate;
      
    beforeEach(() => {
      hireDate = '1970-12-31';
      expectedAnniversaryMonth = moment(hireDate, 'YYYY-MM-DD').month(); // form 0-11
      expectedAnniversaryDay = moment(hireDate, 'YYYY-MM-DD').date(); // from 1 to 31
      currentYear = moment().year();
      anniversaryComparisonDate = moment([currentYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
      startYear = anniversaryComparisonDate.isSameOrBefore(moment(), 'day') ? currentYear : currentYear - 1;
      expectedStartDate = moment([startYear, expectedAnniversaryMonth, expectedAnniversaryDay]);
      expectedEndDate = moment([startYear + 1, expectedAnniversaryMonth, expectedAnniversaryDay-1]);

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
  
}); // employeeRoutes
