const Budget = require('../../models/budget');
const Employee = require('../../models/employee');
const Expense = require('../../models/expense');
const EmployeeRoutes = require('../../routes/employeeRoutes');
const ExpenseType = require('../../models/expenseType');
const moment = require('moment');
const _ = require('lodash');

describe('employeeRoutes', () => {

  // const ISOFORMAT = 'YYYY-MM-DD';

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

  const PURCHASE_DATE = '{purchaseDate}';
  const REIMBURSED_DATE = '{reimbursedDate}';
  const NOTE = '{note}';
  const URL = '{url}';
  const CREATED_AT = '{createdAt}';
  const RECEIPT = '{receipt}';
  const COST = 0;
  const CATEGORY = '{category}';

  const NAME = '{name}';
  const BUDGET = 0;
  const START_DATE = '{startDate}';
  const END_DATE = '{endDate}';
  const OD_FLAG = '{odFlag}';
  const REQUIRED_FLAG = '{requiredFlag}';
  const RECURRING_FLAG = '{recurringFlag}';
  const IS_INACTIVE = '{isInactive}';
  const ACCESSIBLE_BY = '{accessibleBy}';
  const CATEGORIES = [];

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

  const EXPENSE_DATA = {
    id: ID,
    purchaseDate: PURCHASE_DATE,
    reimbursedDate: REIMBURSED_DATE,
    note: NOTE,
    url: URL,
    createdAt: CREATED_AT,
    receipt: RECEIPT,
    cost: COST,
    description: DESCRIPTION,
    employeeId: ID,
    expenseTypeId: ID,
    category: CATEGORY
  };

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

  let employeeRoutes, budgetDynamo, databaseModify, expenseTypeDynamo, expenseDynamo;

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
    databaseModify = jasmine.createSpyObj('databaseModify', [
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
    expenseDynamo = jasmine.createSpyObj('expenseDynamo', [
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
    expenseTypeDynamo = jasmine.createSpyObj('expenseTypeDynamo', [
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

    employeeRoutes = new EmployeeRoutes();
    employeeRoutes.budgetDynamo = budgetDynamo;
    employeeRoutes.databaseModify = databaseModify;
    employeeRoutes.expenseDynamo = expenseDynamo;
    employeeRoutes.expenseTypeDynamo = expenseTypeDynamo;
  });

  describe('_create', () => {

    let data, employee;

    beforeEach(() => {
      data = _.cloneDeep(EMPLOYEE_DATA);
      employee = new Employee(EMPLOYEE_DATA);
    });

    describe('when successfully creates an employee', () => {

      beforeEach(() => {
        spyOn(employeeRoutes, '_validateEmployee').and.returnValue(Promise.resolve(employee));
        spyOn(employeeRoutes, '_validateCreate').and.returnValue(Promise.resolve(employee));
      });

      it('should return the employee created', done => {
        employeeRoutes._create(data)
          .then(employeeCreated => {
            expect(employeeCreated).toEqual(employee);
            expect(employeeRoutes._validateEmployee).toHaveBeenCalledWith(employee);
            expect(employeeRoutes._validateCreate).toHaveBeenCalledWith(employee);
            done();
          });
      }); // should return the employee created
    }); // when successfully creates an employee

    describe('when fails to validate employee', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Failed to validate employee.'
        };

        spyOn(employeeRoutes, '_validateEmployee').and.returnValue(Promise.resolve(employee));
        spyOn(employeeRoutes, '_validateCreate').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._create(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(employeeRoutes._validateEmployee).toHaveBeenCalledWith(employee);
            expect(employeeRoutes._validateCreate).toHaveBeenCalledWith(employee);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate employee

    describe('when fails to validate create', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Failed to validate create.'
        };

        spyOn(employeeRoutes, '_validateEmployee').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._create(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(employeeRoutes._validateEmployee).toHaveBeenCalledWith(employee);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate create
  }); // _create

  describe('_delete', () => {

    let employee;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
    });

    describe('when successfully prepares delete for employee', () => {

      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(employee));
        spyOn(employeeRoutes, '_validateDelete').and.returnValue(Promise.resolve(employee));
      });

      it('should return the employee to be deleted', done => {
        employeeRoutes._delete(ID)
          .then(data => {
            expect(data).toEqual(employee);
            done();
          });
      }); // should return the employee object to delete

    }); // when successfully prepares delete for employee

    describe('when fails to find employee', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Failed to find employee.'
        };

        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected proimse', done => {
        employeeRoutes._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 403 rejected proimse
    }); // when fails to find employee

    describe('when fails to validate delete', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Failed to validate delete.'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(employee));
        spyOn(employeeRoutes, '_validateDelete').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected proimse', done => {
        employeeRoutes._delete(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeRoutes._validateDelete).toHaveBeenCalledWith(employee);
            done();
          });
      }); // should return a 403 rejected proimse
    }); // when fails to validate delete
  }); // _delete

  describe('_read', () => {

    let params, employee;

    beforeEach(() => {
      params = {
        id: ID
      };

      employee = new Employee(EMPLOYEE_DATA);
    });

    describe('when successfully reads an employee', () => {

      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(employee));
      });

      it('should return the employee read', () => {
        employeeRoutes._read(params)
          .then(data => {
            expect(data).toEqual(employee);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
          });
      }); // should return the employee read
    }); // when successfully reads and employee

    describe('when fails to read employee', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find employee.'
        };

        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        employeeRoutes._read(params)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read employee
  }); // _read

  describe('_readAll', () => {

    let employees;

    beforeEach(() => {
      employees = [new Employee(EMPLOYEE_DATA)];
    });

    describe('when successfully reads all entries', () => {

      beforeEach(() => {
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve(employees));
      })

      it('should return the employees', done => {
        employeeRoutes._readAll()
          .then(data => {
            expect(data).toEqual(employees);
            done();
          });
      }); // should return the employees
    }); // when successfully reads all entries

    describe('when fails to read all entries', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries'
        };
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        employeeRoutes._readAll()
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read all entries
  }); // _readAll

  describe('_update', () => {

    let data, oldEmployee, newEmployee;

    beforeEach(() => {
      data = _.cloneDeep(EMPLOYEE_DATA);
      oldEmployee = new Employee(EMPLOYEE_DATA);
      newEmployee = new Employee(EMPLOYEE_DATA);
    });

    describe('when successfully prepares to update employee', () => {

      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldEmployee));
        spyOn(employeeRoutes, '_validateEmployee').and.returnValue(Promise.resolve(newEmployee));
        spyOn(employeeRoutes, '_validateUpdate').and.returnValue(Promise.resolve(newEmployee));
        spyOn(employeeRoutes, '_updateBudgets').and.returnValue(Promise.resolve([]));
      });

      it('should return the prepared employee', done => {
        employeeRoutes._update(data)
          .then(employee => {
            expect(employee).toEqual(newEmployee);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeRoutes._validateEmployee).toHaveBeenCalledWith(newEmployee);
            expect(employeeRoutes._validateUpdate).toHaveBeenCalledWith(oldEmployee, newEmployee);
            expect(employeeRoutes._updateBudgets).toHaveBeenCalledWith(oldEmployee, newEmployee);
            done();
          });
      }); // should return the prepared employee
    }); // when successfully prepares to update employee

    describe('when fails to find old employee', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find employee.'
        };

        databaseModify.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        employeeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to find old employee

    describe('when fails to validate new employee', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Failed to validate employee.'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(oldEmployee));
        spyOn(employeeRoutes, '_validateEmployee').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeRoutes._validateEmployee).toHaveBeenCalledWith(newEmployee);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate new employee

    describe('when fails to validate update', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Failed to validate update.'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(oldEmployee));
        spyOn(employeeRoutes, '_validateEmployee').and.returnValue(Promise.resolve(newEmployee));
        spyOn(employeeRoutes, '_validateUpdate').and.returnValue(Promise.reject(err));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeRoutes._validateEmployee).toHaveBeenCalledWith(newEmployee);
            expect(employeeRoutes._validateUpdate).toHaveBeenCalledWith(oldEmployee, newEmployee);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fais to validate update

    describe('when fails to update budgets', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to update budget.'
        };

        databaseModify.getEntry.and.returnValue(Promise.resolve(oldEmployee));
        spyOn(employeeRoutes, '_validateEmployee').and.returnValue(Promise.resolve(newEmployee));
        spyOn(employeeRoutes, '_validateUpdate').and.returnValue(Promise.resolve(newEmployee));
        spyOn(employeeRoutes, '_updateBudgets').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        employeeRoutes._update(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ID);
            expect(employeeRoutes._validateEmployee).toHaveBeenCalledWith(newEmployee);
            expect(employeeRoutes._validateUpdate).toHaveBeenCalledWith(oldEmployee, newEmployee);
            expect(employeeRoutes._updateBudgets).toHaveBeenCalledWith(oldEmployee, newEmployee);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to update budgets
  }); // _update

  describe('_updateBudgets', () => {

    let oldEmployee, newEmployee;

    beforeEach(() => {
      oldEmployee = new Employee(EMPLOYEE_DATA);
      newEmployee = new Employee(EMPLOYEE_DATA);
    });

    describe('when work status is the same', () => {

      beforeEach(() => {
        oldEmployee.workStatus = 100;
        newEmployee.workStatus = 100;
      });

      it ('should return an empty array of budgets', done => {
        employeeRoutes._updateBudgets(oldEmployee, newEmployee)
          .then(data => {
            expect(data).toEqual([]);
            done();
          });
      }); // should return an empty array of budgets
    }); // when work status is the same

    describe('when work status is changed', () => {

      let expenseType1, expenseType2, expenseTypes, today;
      let budget1, budget2, budget3, budgets, expectedBudget1, expectedBudget2, expectedBudget3, expectedBudgets;

      beforeEach(() => {
        expenseType1 = new ExpenseType(EXPENSE_TYPE_DATA);
        expenseType2 = new ExpenseType(EXPENSE_TYPE_DATA);
        budget1 = new Budget(BUDGET_DATA);
        budget2 = new Budget(BUDGET_DATA);
        budget3 = new Budget(BUDGET_DATA);
        expectedBudget1 = new Budget(BUDGET_DATA);
        expectedBudget2 = new Budget(BUDGET_DATA);
        expectedBudget3 = new Budget(BUDGET_DATA);

        today = moment();
        oldEmployee.workStatus = 100;
        newEmployee.workStatus = 50;

        expenseType1.accessibleBy = 'FULL TIME';
        expenseType1.id = 'expenseType1_ID';
        expenseType1.budget = 100;

        expenseType2.accessibleBy = 'ALL';
        expenseType2.id = 'expenseType2_ID';
        expenseType2.budget = 100;

        // inactive budget
        budget1.fiscalStartDate = '2000-08-18';
        budget1.fiscalEndDate = '2000-08-18';
        budget1.expenseTypeId = 'expenseType1_ID';
        budget1.amount = 100;

        // employee does not have full time access to active budget
        budget2.fiscalStartDate = today;
        budget2.fiscalEndDate = today;
        budget2.expenseTypeId = 'expenseType1_ID';
        budget2.amount = 100;

        // employee has part time access to active budget
        budget3.fiscalStartDate = today;
        budget3.fiscalEndDate = today;
        budget3.expenseTypeId = 'expenseType2_ID';
        budget3.amount = 100;

        expectedBudget1.fiscalStartDate = '2000-08-18';
        expectedBudget1.fiscalEndDate = '2000-08-18';
        expectedBudget1.expenseTypeId = 'expenseType1_ID';
        expectedBudget1.amount = 100;

        expectedBudget2.fiscalStartDate = today;
        expectedBudget2.fiscalEndDate = today;
        expectedBudget2.expenseTypeId = 'expenseType1_ID';
        expectedBudget2.amount = 0;

        expectedBudget3.fiscalStartDate = today;
        expectedBudget3.fiscalEndDate = today;
        expectedBudget3.expenseTypeId = 'expenseType2_ID';
        expectedBudget3.amount = 50;

        expenseTypes = [expenseType1, expenseType2];
        budgets = [budget1, budget2, budget3];
        expectedBudgets = [expectedBudget1, expectedBudget2, expectedBudget3];
      });

      describe('and successfully updates budgets', () => {

        beforeEach(() => {
          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve(expenseTypes));
          budgetDynamo.updateEntryInDB.and.returnValues(
            Promise.resolve(expectedBudget1),
            Promise.resolve(expectedBudget2),
            Promise.resolve(expectedBudget3)
          );
        });

        it('should return the employee budgets', done => {
          employeeRoutes._updateBudgets(oldEmployee, newEmployee)
            .then(data => {
              expect(data).toEqual(expectedBudgets);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('employeeId-expenseTypeId-index', 'employeeId', ID);
              expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledTimes(2);
              done();
            });
        });
      }); // and successfully updates budgets

      describe('and fails to get budgets', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employee budgets.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          employeeRoutes._updateBudgets(oldEmployee, newEmployee)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('employeeId-expenseTypeId-index', 'employeeId', ID);
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to get budgets

      describe('and fails to get expense types', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get expense types.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          employeeRoutes._updateBudgets(oldEmployee, newEmployee)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('employeeId-expenseTypeId-index', 'employeeId', ID);
              expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to get expense types

      describe('and fails to update entry in database', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to update budget.'
          };

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve(expenseTypes));
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', done => {
          employeeRoutes._updateBudgets(oldEmployee, newEmployee)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('employeeId-expenseTypeId-index', 'employeeId', ID);
              expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
              expect(budgetDynamo.updateEntryInDB).toHaveBeenCalled();
              done();
            });
        }); // should return a 404 rejected promise
      }); // and fails to update entry in database
    }); // when work status is changed
  }); // _updateBudgets

  describe('_validateCreate', () => {

    let employee, employee1, employees;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      employee1 = new Employee(EMPLOYEE_DATA);
      employees = [employee1];
    });

    describe('when successfully validates create', () => {

      beforeEach(() => {
        employee.id = 'OTHER_ID';
        employee.employeeNumber = 'OTHER_NUBMER';
        employee.email = 'OTHER_EMAIL';

        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve(employees));
      });

      it('should return the validated employee', done => {
        employeeRoutes._validateCreate(employee)
          .then(data => {
            expect(data).toEqual(employee);
            done();
          });
      }); // should return the validated employee
    }); // when successfully validates create

    describe('when there is a duplicate employee id', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Unexpected duplicate id created. Please try submitting again.'
        };

        employee.employeeNumber = 'OTHER_NUBMER';
        employee.email = 'OTHER_EMAIL';

        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve(employees));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateCreate(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            done();
          });
      }); // should return a 403 rejected promise
    }); // when there is a duplicate employee id

    describe('when there is a duplicate employee number', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: `Employee number ${EMPLOYEE_NUMBER} already taken. Please enter a new number.`
        };

        employee.id = 'OTHER_ID';
        employee.email = 'OTHER_EMAIL';

        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve(employees));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateCreate(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            done();
          });
      }); // should return a 403 rejected promise
    }); // when there is a duplicate employee number

    describe('when there is a duplicate employee email', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: `Employee email ${EMAIL} already taken. Please enter a new email.`
        };

        employee.id = 'OTHER_ID';
        employee.employeeNumber = 'OTHER_NUMBER';

        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve(employees));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateCreate(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            done();
          });
      }); // should return a 403 rejected promise
    }); // when there is a duplicate employee email
  }); // _validateCreate

  describe('_validateDelete', () => {

    let employee;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
    });

    describe('when successfully validates delete', () => {

      beforeEach(() => {
        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([]));
      });

      it('should return the validated employee', done => {
        employeeRoutes._validateDelete(employee)
          .then(data => {
            expect(data).toEqual(employee);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            done();
          });
      }); // should return the validated employee
    }); // when successfully validates delete

    describe('when fails to get expenses', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expenses.'
        };

        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        employeeRoutes._validateDelete(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get expenses

    describe('when employee has expenses', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Cannot delete an employee with expenses.'
        };

        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([new Expense(EXPENSE_DATA)]));
      });

      it('should return a 404 rejected promise', done => {
        employeeRoutes._validateDelete(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee has expenses
  }); // _validateDelete

  describe('_validateEmployee', () => {

    let employee;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
    });

    describe('when successfully validates employee', () => {

      it('should return the validated employee', () => {
        employeeRoutes._validateEmployee(employee)
          .then(data => {
            expect(data).toEqual(employee);
          });
      }); // should return the validated employee
    }); // when successfully validates employee

    describe('when employee id is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid employee id.'
        };

        employee.id = ' ';
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateEmployee(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee id is missing

    describe('when employee first name is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid employee first name.'
        };

        employee.firstName = ' ';
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateEmployee(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee first name is missing

    describe('when employee last name is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid employee last name.'
        };

        employee.lastName = ' ';
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateEmployee(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee last name is missing

    describe('when employee number is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid employee number.'
        };

        employee.employeeNumber = ' ';
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateEmployee(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee number is missing

    describe('when employee hire date is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid employee hire date.'
        };

        employee.hireDate = ' ';
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateEmployee(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee hire date is missing

    describe('when employee email is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid employee email.'
        };

        employee.email = ' ';
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateEmployee(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee email is missing

    describe('when employee role is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid employee role.'
        };

        employee.employeeRole = ' ';
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateEmployee(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee role is missing

    describe('when employee work status is missing', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid employee work status.'
        };

        employee.workStatus = ' ';
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateEmployee(employee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee work status is missing
  }); // _validateEmployee

  describe('_validateUpdate', () => {

    let oldEmployee, newEmployee, budget1, budgets;

    beforeEach(() => {
      oldEmployee = new Employee(EMPLOYEE_DATA);
      newEmployee = new Employee(EMPLOYEE_DATA);
      budget1 = new Budget(BUDGET_DATA);
      budgets = [budget1];
    });

    describe('when successfully validates update', () => {

      beforeEach(() => {
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([oldEmployee]));
      });

      describe('and hire date is the same', () => {

        it('should return the validated employee', done => {
          employeeRoutes._validateUpdate(oldEmployee, newEmployee)
            .then(data => {
              expect(data).toEqual(newEmployee);
              expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
              done();
            });
        }); // should return the validated employee
      }); // and hire date is the same

      describe('and hire date is changed', () => {

        beforeEach(() => {
          oldEmployee.hireDate = '2000-08-18';
          newEmployee.hireDate = '2001-08-18';

          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([]));
        });

        it('should return the validated employee', done => {
          employeeRoutes._validateUpdate(oldEmployee, newEmployee)
            .then(data => {
              expect(data).toEqual(newEmployee);
              expect(budgetDynamo.querySecondaryIndexInDB)
                .toHaveBeenCalledWith('employeeId-expenseTypeId-index', 'employeeId', ID);
              expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
              done();
            });
        }); // should return the validated employee
      }); // and hire date is changed
    }); // when successfully validates update

    describe('when another employee already has the same employee number', () => {

      let err, otherEmployee;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Employee number 0 already taken. Please enter a new number.'
        };

        otherEmployee = new Employee(EMPLOYEE_DATA);
        otherEmployee.email = 'OTHER_EMAIL';

        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([oldEmployee, otherEmployee]));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateUpdate(oldEmployee, newEmployee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            done();
          });
      }); // should return a 403 rejected promise
    }); // when another employee already has the same employee number

    describe('when another employee already has the same employee email', () => {

      let err, otherEmployee;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Employee email {email} already taken. Please enter a new email.'
        };

        otherEmployee = new Employee(EMPLOYEE_DATA);
        otherEmployee.employeeNumber = 'OTHER_NUMBER';

        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([oldEmployee, otherEmployee]));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateUpdate(oldEmployee, newEmployee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            done();
          });
      }); // should return a 403 rejected promise
    }); // when another employee already has the same employee email

    describe('when old employee id does not match the new employee id', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating employee IDs.'
        };

        newEmployee.id = 'OTHER_ID';
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([oldEmployee]));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateUpdate(oldEmployee, newEmployee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when old employee id does not match the new employee id

    describe('when employee hire date is changed and the employee has budgets', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Cannot change hire date for employees with existing budgets.'
        };

        oldEmployee.hireDate = '2000-08-18';
        newEmployee.hireDate = '2001-08-18';
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([oldEmployee]));
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve(budgets));
      });

      it('should return a 403 rejected promise', done => {
        employeeRoutes._validateUpdate(oldEmployee, newEmployee)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(budgetDynamo.querySecondaryIndexInDB)
              .toHaveBeenCalledWith('employeeId-expenseTypeId-index', 'employeeId', ID);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            done();
          });
      }); // should return a 403 rejected promise
    }); // when employee hire date is changed and the employee has budgets
  }); // _validateUpdate
}); //employeeRoutes
