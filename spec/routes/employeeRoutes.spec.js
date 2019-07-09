const EmployeeRoutes = require('../../routes/employeeRoutes');
const Employee = require('../../models/employee');

xdescribe('employeeRoutes', () => {
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

  describe('_update', () => {
    let expectedEmployee, data, id;
    beforeEach(() => {
      data = {
        id: '{id}',
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

  describe('_createRecurringExpenses', () => {
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
    let hireDate, returnedObj, expectedObj;
    const moment = require('moment');
    beforeEach(() => {
      hireDate = '1970-12-30';
      expectedObj = {
        startDate: moment([moment().year(), 12, 31]),
        endDate: moment([moment().year()+1, 12, 30])
      };
    });

    it('should return an object with a start and end date', done => {
      returnedObj = employeeRoutes._getBudgetDates(hireDate);
      expect(returnedObj).toEqual(expectedObj);
      done();
    }); // should return an object with a start and end date
  }); // _getBudgetDates
  
}); // employeeRoutes
