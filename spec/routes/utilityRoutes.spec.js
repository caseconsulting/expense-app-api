const Budget = require('../../models/budget');
const Employee = require('../../models/employee');
const Expense = require('../../models/expense');
const ExpenseType = require('../../models/expenseType');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');
// const TrainingUrls = require('../../models/trainingUrls');
const UtilityRoutes = require('../../routes/utilityRoutes');
const _ = require('lodash');
// const BasecampRoutes = require('../../routes/basecampRoutes');

describe('utilityRoutes', () => {
  const ISOFORMAT = 'YYYY-MM-DD';
  // const STAGE = 'dev';
  const _ROUTER = '{router}';

  const ID = '{id}';
  const DESCRIPTION = '{description}';

  const FIRST_NAME = '{firstName}';
  const MIDDLE_NAME = '{middleName}';
  const LAST_NAME = '{lastName}';
  const NICKNAME = '{nickname}';
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
  const BUDGET = '{budget}';
  const START_DATE = '{startDate}';
  const END_DATE = '{endDate}';
  const OD_FLAG = '{odFlag}';
  const REQUIRED_FLAG = '{requiredFlag}';
  const RECURRING_FLAG = '{recurringFlag}';
  const IS_INACTIVE = '{isInactive}';
  const ACCESSIBLE_BY = '{accessibleBy}';
  const CATEGORIES = [];
  const CAMPFIRE = '{campfire}';
  const PRORATED = '{proRated}';

  const BASE_CAMP_TOKEN = '{basecampToken}';

  const BASE_CAMP_INFO = {
    PROJ_NAME: {
      ID: 0,
      SCHEDULE_ID: 0
    }
  };
  // const HITS = 0;
  // const TITLE = '{title}';
  // const IMAGE = '{image}';
  // const LOGO = '{logo}';
  // const PUBLISHER = '{publisher}';

  const DATE = moment().format(ISOFORMAT);

  const EMPLOYEE_DATA = {
    id: ID,
    firstName: FIRST_NAME,
    middleName: MIDDLE_NAME,
    lastName: LAST_NAME,
    nickname: NICKNAME,
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
    accessibleBy: ACCESSIBLE_BY,
    campfire: CAMPFIRE,
    proRated: PRORATED
  };

  const BASE_CAMP_DATA = {
    id: ID
  };

  // const TRAINING_URL_DATA = {
  //   id: URL,
  //   category: CATEGORY,
  //   hits: HITS,
  //   title: TITLE,
  //   description: DESCRIPTION,
  //   image: IMAGE,
  //   logo: LOGO,
  //   publisher: PUBLISHER
  // };

  const BODY_DATA = {
    id: ID
  };

  const PARAMS_DATA = {
    id: ID,
    category: CATEGORY,
    expenseTypeId: ID,
    date: DATE
  };

  const REQ_DATA = {
    employee: EMPLOYEE_DATA,
    body: BODY_DATA,
    params: PARAMS_DATA
  };

  let budgetDynamo, expenseDynamo, employeeDynamo, expenseTypeDynamo, res, trainingDynamo, utilityRoutes;

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
    employeeDynamo = jasmine.createSpyObj('employeeDynamo', [
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
    trainingDynamo = jasmine.createSpyObj('trainingDynamo', [
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
    // basecamp = jasmine.createSpyObj('basecamp', [
    //   '_getBasecampToken',
    //   'getBasecampInfo',
    //   '_getScheduleEntries'
    // ]);
    res = jasmine.createSpyObj('res', ['status', 'send']);
    res.status.and.returnValue(res);

    utilityRoutes = new UtilityRoutes();
    utilityRoutes.budgetDynamo = budgetDynamo;
    utilityRoutes.expenseDynamo = expenseDynamo;
    utilityRoutes.employeeDynamo = employeeDynamo;
    utilityRoutes.expenseTypeDynamo = expenseTypeDynamo;
    utilityRoutes.trainingDynamo = trainingDynamo;
    utilityRoutes._router = _ROUTER;
  });

  describe('asyncForEach', () => {
    let counter, array;

    beforeEach(() => {
      array = [1, 2, 3, 4, 5];
      counter = 0;
    });

    it('should call the a number of times depending on the array size', () => {
      utilityRoutes.asyncForEach(array, (number) => {
        counter++;
        expect(counter).toEqual(number);
      });
    }); // should call the a number of times depending on the array size
  }); // asyncForEach

  describe('calcAdjustedAmount', () => {
    let employee, expenseType;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType.budget = 100;
    });

    describe('when employee has access', () => {
      beforeEach(() => {
        spyOn(utilityRoutes, 'hasAccess').and.returnValue(true);
      });

      describe('and expense type is accessible for all users', () => {
        beforeEach(() => {
          expenseType.accessibleBy = ['Intern', 'FullTime', 'PartTime'];
          expenseType.proRated = true;
          employee.workStatus = 50;
        });

        it('should return 50% of the budget', () => {
          expect(utilityRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(50);
        }); // should return 50% of the budget
      }); // and expense type is accessible by All

      describe('and expense type is accessible by Intern', () => {
        beforeEach(() => {
          expenseType.accessibleBy = expenseType.accessibleBy = ['Intern'];
          employee.workStatus = 100;
        });

        it('should return 100% of the budget', () => {
          expect(utilityRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(100);
        }); // should return 100% of the budget
      }); // and expense type is accessible by Full

      describe('and expense type is accessible by Full Time', () => {
        beforeEach(() => {
          expenseType.accessibleBy = ['FullTime'];
          employee.workStatus = 100;
        });

        it('should return 100% of the budget', () => {
          expect(utilityRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(100);
        }); // should return 100% of the budget
      }); // and expense type is accessible by Full Time

      describe('and expense type is accessible by Custom', () => {
        beforeEach(() => {
          expenseType.accessibleBy = '{custom}';
          employee.workStatus = 50;
        });

        it('should return 50% of the budget', () => {
          expect(utilityRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(50);
        }); // should return 50% of the budget
      }); // and expense type is accessible by Custom
    }); // when employee has access

    describe('when employee does not have access', () => {
      beforeEach(() => {
        spyOn(utilityRoutes, 'hasAccess').and.returnValue(false);
      });

      it('should return 0', () => {
        expect(utilityRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(0);
      }); // should return 0
    }); // when employee does not have access
  }); // calcAdjustedAmount

  describe('aggregateExpenseData', () => {
    let expenses, expense1, expense2;
    let employees, employee1, employee2;
    let expenseTypes, expenseType1, expenseType2;
    let aggregateExpenses, aggregateExpense1, aggregateExpense2;

    beforeEach(() => {
      expense1 = new Expense(EXPENSE_DATA);
      expense2 = new Expense(EXPENSE_DATA);
      employee1 = new Employee(EMPLOYEE_DATA);
      employee2 = new Employee(EMPLOYEE_DATA);
      expenseType1 = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType2 = new ExpenseType(EXPENSE_TYPE_DATA);
      aggregateExpense1 = new Expense(EXPENSE_DATA);
      aggregateExpense2 = new Expense(EXPENSE_DATA);

      expense1.employeeId = 'EID_1';
      expense1.expenseTypeId = 'ETID_1';

      expense2.employeeId = 'EID_2';
      expense2.expenseTypeId = 'ETID_2';

      employee1.id = 'EID_1';
      employee1.firstName = 'first_1';
      employee1.middleName = 'middle_1';
      employee1.lastName = 'last_1';
      employee1.nickname = 'nick_1';

      employee2.id = 'EID_2';
      employee2.firstName = 'first_2';
      employee2.middleName = 'middle_2';
      employee2.lastName = 'last_2';
      employee2.nickname = 'nick_2';

      expenseType1.id = 'ETID_1';
      expenseType1.budgetName = 'budgetName_1';
      expenseType1.campfire = 'campfire_1';

      expenseType2.id = 'ETID_2';
      expenseType2.budgetName = 'budgetName_2';
      expenseType2.campfire = 'campfire_2';

      aggregateExpense1.employeeId = 'EID_1';
      aggregateExpense1.expenseTypeId = 'ETID_1';
      aggregateExpense1.budgetName = 'budgetName_1';
      aggregateExpense1.employeeName = 'first_1 last_1';
      aggregateExpense1.firstName = 'first_1';
      aggregateExpense1.middleName = 'middle_1';
      aggregateExpense1.lastName = 'last_1';
      aggregateExpense1.nickname = 'nick_1';
      aggregateExpense1.campfire = 'campfire_1';

      aggregateExpense2.employeeId = 'EID_2';
      aggregateExpense2.expenseTypeId = 'ETID_2';
      aggregateExpense2.budgetName = 'budgetName_2';
      aggregateExpense2.employeeName = 'first_2 last_2';
      aggregateExpense2.firstName = 'first_2';
      aggregateExpense2.middleName = 'middle_2';
      aggregateExpense2.lastName = 'last_2';
      aggregateExpense2.nickname = 'nick_2';
      aggregateExpense2.campfire = 'campfire_2';

      expenses = [expense1, expense2];
      employees = [employee1, employee2];
      expenseTypes = [expenseType1, expenseType2];
      aggregateExpenses = [aggregateExpense1, aggregateExpense2];
    });

    describe('when expense type and and employee are found', () => {
      it('should return the aggregate expenses', () => {
        expect(utilityRoutes._aggregateExpenseData(expenses, employees, expenseTypes)).toEqual(aggregateExpenses);
      }); // should return the aggregate expenses
    }); // when expense type and and employee are found

    describe('when fails to find expense type', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find expense type or employee for an expense.'
        };

        expenseTypes = [expenseType2];
      });

      it('should throw an error', () => {
        expect(() => utilityRoutes._aggregateExpenseData(expenses, employees, expenseTypes)).toThrow(err);
      }); // should return the aggregate expenses without the missing expense type
    }); // when fails to find expense type

    describe('when fails to find employee', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find expense type or employee for an expense.'
        };

        employees = [employee2];
      });

      it('should throw an error', () => {
        expect(() => utilityRoutes._aggregateExpenseData(expenses, employees, expenseTypes)).toThrow(err);
      }); // should return the aggregate expenses without the missing expense type
    }); // when fails to find expense type
  }); // aggregateExpenseData

  describe('_getActiveBudget', () => {
    let employee, expenseType;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
    });

    describe('when successfully gets an active budget', () => {
      let budgetsData, activeBudget;

      describe('and a budget already exists', () => {
        let budgetData1, budgetData2;

        beforeEach(() => {
          budgetData1 = _.cloneDeep(BUDGET_DATA);
          budgetData1.fiscalStartDate = moment().subtract(1, 'd').format(ISOFORMAT);
          budgetData1.fiscalEndDate = moment().add(1, 'd').format(ISOFORMAT);

          budgetData2 = _.cloneDeep(BUDGET_DATA);
          budgetData2.fiscalStartDate = '2000-08-18';
          budgetData2.fiscalEndDate = '2001-08-18';

          budgetsData = [budgetData1, budgetData2];

          activeBudget = {
            expenseTypeName: NAME,
            description: DESCRIPTION,
            odFlag: OD_FLAG,
            expenseTypeId: ID,
            budgetObject: new Budget(budgetData1)
          };
          budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve(budgetsData));
        });

        it('should return the aggregate active budgets', (done) => {
          utilityRoutes._getActiveBudget(employee, expenseType).then((data) => {
            expect(data).toEqual(activeBudget);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
        }); // should return the aggregate active budgets
      }); // and budget already exists

      describe('and a budget does not exist', () => {
        let budgetObject;

        beforeEach(() => {
          budgetObject = new Budget({
            expenseTypeId: ID,
            employeeId: ID,
            pendingAmount: 0,
            reimbursedAmount: 0,
            amount: 0
          });

          budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([]));
        });

        describe('and expense type is recurring', () => {
          let budgetDates;

          beforeEach(() => {
            expenseType.recurringFlag = true;

            budgetDates = {
              startDate: moment().subtract(1, 'd'),
              endDate: moment().add(1, 'd')
            };

            budgetObject.fiscalStartDate = moment().subtract(1, 'd').format(ISOFORMAT);
            budgetObject.fiscalEndDate = moment().add(1, 'd').format(ISOFORMAT);

            activeBudget = {
              expenseTypeName: NAME,
              description: DESCRIPTION,
              odFlag: OD_FLAG,
              expenseTypeId: ID,
              budgetObject: new Budget(budgetObject)
            };

            spyOn(utilityRoutes, 'getBudgetDates').and.returnValue(budgetDates);
            spyOn(utilityRoutes, 'calcAdjustedAmount').and.returnValue(0);
          });

          it('should return the aggregate active budgets', (done) => {
            utilityRoutes._getActiveBudget(employee, expenseType).then((data) => {
              expect(data).toEqual(activeBudget);
              expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
              expect(utilityRoutes.getBudgetDates).toHaveBeenCalledWith(HIRE_DATE);
              expect(utilityRoutes.calcAdjustedAmount).toHaveBeenCalledWith(employee, expenseType);
              done();
            });
          }); // should return the aggregate active budgets
        }); // and expense type is recurring

        describe('and expense type is not recurring', () => {
          beforeEach(() => {
            expenseType.recurringFlag = false;

            expenseType.startDate = moment().subtract(1, 'd').format(ISOFORMAT);
            expenseType.endDate = moment().add(1, 'd').format(ISOFORMAT);

            budgetObject.fiscalStartDate = moment().subtract(1, 'd').format(ISOFORMAT);
            budgetObject.fiscalEndDate = moment().add(1, 'd').format(ISOFORMAT);

            activeBudget = {
              expenseTypeName: NAME,
              description: DESCRIPTION,
              odFlag: OD_FLAG,
              expenseTypeId: ID,
              budgetObject: new Budget(budgetObject)
            };

            spyOn(utilityRoutes, 'calcAdjustedAmount').and.returnValue(0);
          });

          it('should return the aggregate active budgets', (done) => {
            utilityRoutes._getActiveBudget(employee, expenseType).then((data) => {
              expect(data).toEqual(activeBudget);
              expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
              expect(utilityRoutes.calcAdjustedAmount).toHaveBeenCalledWith(employee, expenseType);
              done();
            });
          }); // should return the aggregate active budgets
        }); // and expense type is not recurring
      }); // and a budget does not exist
    }); // when successfully gets an active budget

    describe('when fails to get expense type budgets', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query budgets from database.'
        };

        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        utilityRoutes
          ._getActiveBudget(employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get expense type budgets
  }); // _getActiveBudget

  describe('_getAllActiveEmployeeBudgets', () => {
    let employee, expenseType1, expenseType2, expenseType3, expenseTypes;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expenseType1 = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType2 = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType3 = new ExpenseType(EXPENSE_TYPE_DATA);

      expenseType1.recurringFlag = false;
      expenseType1.startDate = '2000-08-18';
      expenseType1.endDate = '2001-08-18';

      expenseType2.recurringFlag = false;
      expenseType2.startDate = moment().subtract(1, 'd').format(ISOFORMAT);
      expenseType2.endDate = moment().add(1, 'd').format(ISOFORMAT);

      expenseType3.recurringFlag = true;

      expenseTypes = [expenseType1, expenseType2, expenseType3];
    });

    describe('when successfully gets all active budgets', () => {
      beforeEach(() => {
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve(expenseTypes));
        spyOn(utilityRoutes, '_getActiveBudget').and.returnValue('{activeBudget}');
        spyOn(utilityRoutes, 'hasAccess').and.returnValue(true);
      });

      it('should respond with a 200 and the 2 active aggregated expenses', (done) => {
        utilityRoutes._getAllActiveEmployeeBudgets(REQ_DATA, res).then((data) => {
          expect(data).toEqual(['{activeBudget}', '{activeBudget}']);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(utilityRoutes._getActiveBudget).toHaveBeenCalledTimes(2);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(['{activeBudget}', '{activeBudget}']);
          done();
        });
      }); // should respond with a 200 and the 2 active aggregated expenses
    }); // when successfully gets all active budgets

    describe('when fails to get employee', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get employee.'
        };

        employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllActiveEmployeeBudgets(REQ_DATA, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to get employee

    describe('when fails to get expense types', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense types.'
        };

        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllActiveEmployeeBudgets(REQ_DATA, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to get expense types

    describe('when getting an active budget throws an error', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get active budget.'
        };

        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve(expenseTypes));
        spyOn(utilityRoutes, '_getActiveBudget').and.returnValue(Promise.reject(err));
        spyOn(utilityRoutes, 'hasAccess').and.returnValue(true);
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllActiveEmployeeBudgets(REQ_DATA, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(utilityRoutes._getActiveBudget).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when getting an active budget throws an error
  }); // _getAllActiveEmployeeBudgets

  describe('_getAllExpenses', () => {
    let req, expenseType, expense, aggregateExpense, employee;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      expenseType = _.cloneDeep(EXPENSE_TYPE_DATA);
      employee = _.cloneDeep(EMPLOYEE_DATA);
      expense = _.cloneDeep(EXPENSE_DATA);
      aggregateExpense = new Expense(EXPENSE_DATA);
      aggregateExpense.budgetName = NAME;
      aggregateExpense.employeeName = `${FIRST_NAME} ${LAST_NAME}`;
      aggregateExpense.firstName = FIRST_NAME;
      aggregateExpense.middleName = MIDDLE_NAME;
      aggregateExpense.lastName = LAST_NAME;
      aggregateExpense.nickname = NICKNAME;
      aggregateExpense.campfire = CAMPFIRE;
      req.employee.employeeRole = 'admin';
    });

    describe('when it successfully gets all expenses', () => {
      beforeEach(() => {
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
        employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([employee]));
        expenseDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expense]));
      });

      it('should respond with a 200 and the expenses', (done) => {
        utilityRoutes._getAllExpenses(req, res).then((data) => {
          expect(data).toEqual([aggregateExpense]);
          expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(expenseDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith([aggregateExpense]);
          done();
        });
      }); // should respond with a 200 and the aggregated expenses
    }); // when it successfully gets all expenses

    describe('when it fails to get expense types', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense types.'
        };

        spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllExpenses(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when it fails to get expense types

    describe('when it fails to get employees', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get employees.'
        };

        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
        employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllExpenses(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when it fails to get employees
  }); // _getAllExpenses

  describe('_getAllEvents', () => {
    let req,
      expenseType,
      expense,
      aggregateExpense,
      employee,
      expectedEmployee,
      basecampEvent,
      basecampInfo,
      basecampToken,
      payload;

    beforeEach(() => {
      req = _.cloneDeep(EXPENSE_TYPE_DATA);
      expenseType = _.cloneDeep(EXPENSE_TYPE_DATA);
      expenseType.isInactive = false;
      expenseType.endDate = moment();
      expenseType.campfire = CAMPFIRE;
      employee = _.cloneDeep(EMPLOYEE_DATA);
      expectedEmployee = new Employee(EMPLOYEE_DATA);
      expense = _.cloneDeep(EXPENSE_DATA);
      aggregateExpense = new Expense(EXPENSE_DATA);
      aggregateExpense.budgetName = NAME;
      aggregateExpense.employeeName = `${FIRST_NAME} ${LAST_NAME}`;
      aggregateExpense.firstName = FIRST_NAME;
      aggregateExpense.middleName = MIDDLE_NAME;
      aggregateExpense.lastName = LAST_NAME;
      aggregateExpense.nickname = NICKNAME;
      aggregateExpense.campfire = CAMPFIRE;
      basecampEvent = _.cloneDeep(BASE_CAMP_DATA);
      basecampInfo = _.cloneDeep(BASE_CAMP_INFO);
      basecampToken = _.cloneDeep(BASE_CAMP_TOKEN);
      payload = { employees: [expectedEmployee], expenses: [aggregateExpense], schedules: [basecampEvent] };
    });

    describe('when successfully gets all events for the payload', () => {
      beforeEach(() => {
        spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue([expenseType]);
        employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([employee]));
        spyOn(utilityRoutes, 'queryExpenses').and.returnValue(Promise.resolve([aggregateExpense]));
        spyOn(utilityRoutes, 'getBasecampInfo').and.returnValue(basecampInfo);
        spyOn(utilityRoutes, 'getBasecampToken').and.returnValue(basecampToken);
        spyOn(utilityRoutes, 'getScheduleEntries').and.returnValue(basecampEvent);
        spyOn(utilityRoutes, '_aggregateExpenseData').and.returnValue([aggregateExpense]);
      });

      it('should respond with a 200 and the data', (done) => {
        utilityRoutes._getAllEvents(req, res).then((data) => {
          expect(data).toEqual(payload);
          expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
          expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(utilityRoutes.queryExpenses).toHaveBeenCalled(); //TODO: queryExpense?
          expect(utilityRoutes.getBasecampToken).toHaveBeenCalled();
          expect(utilityRoutes.getScheduleEntries).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(payload);
          done();
        });
      }); // should respond with a 200 and the aggregated expenses
    }); // when successfully gets all events for the payload

    describe('when fails to get expense type', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense types.'
        };

        // expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
        spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllEvents(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to get expense type

    describe('when fails to get employees', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get employees.'
        };

        // expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
        spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue([expenseType]);
        employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllEvents(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
          expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to get employees

    describe('when it fails to get basecamp token', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get basecamp token'
        };

        // expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
        spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue([expenseType]);
        employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([employee]));
        expenseDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expense])); //TODO: queryExpense?
        spyOn(utilityRoutes, 'queryExpenses').and.returnValue(Promise.resolve([aggregateExpense]));
        spyOn(utilityRoutes, 'getBasecampInfo').and.returnValue(basecampInfo);
        spyOn(utilityRoutes, 'getBasecampToken').and.returnValue(Promise.reject(err));
        spyOn(utilityRoutes, '_aggregateExpenseData').and.returnValue([aggregateExpense]);
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllEvents(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
          expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(utilityRoutes.getBasecampToken).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      });
    }); // when it fails to get basecamp token

    describe('when it fails to get basecamp schedule entries', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get basecamp events'
        };

        // expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
        spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue([expenseType]);
        employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([employee]));
        spyOn(utilityRoutes, 'queryExpenses').and.returnValue(Promise.resolve([aggregateExpense]));
        spyOn(utilityRoutes, 'getBasecampToken').and.returnValue(basecampToken);
        spyOn(utilityRoutes, 'getBasecampInfo').and.returnValue(basecampInfo);
        spyOn(utilityRoutes, 'getScheduleEntries').and.returnValue(Promise.reject(err));
        spyOn(utilityRoutes, '_aggregateExpenseData').and.returnValue([aggregateExpense]);
      });

      it('should respond witha  404 and error', (done) => {
        utilityRoutes._getAllEvents(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
          expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(utilityRoutes.queryExpenses).toHaveBeenCalled();
          expect(utilityRoutes.getBasecampToken).toHaveBeenCalled();
          expect(utilityRoutes.getScheduleEntries).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      });
    }); // when it fails to get basecamp schedule entries
  });

  describe('queryExpenses', () => {
    let cutOffDate, expenseType, expense, formattedDate, additionalParams;

    beforeEach(() => {
      cutOffDate = moment();
      expenseType = _.cloneDeep(EXPENSE_TYPE_DATA);
      expense = _.cloneDeep(EXPENSE_DATA);
      formattedDate = cutOffDate.format('YYYY-MM-DD');
      additionalParams = {
        ExpressionAttributeValues: {
          ':queryKey': expenseType.id,
          ':cutOffDate': formattedDate
        },
        KeyConditionExpression: 'expenseTypeId = :queryKey and reimbursedDate >= :cutOffDate'
      };
    });

    describe('when it succeeds in returning all queried expenses', () => {
      beforeEach(() => {
        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([expense]));
      });

      it('should respond with 200 and expense data', (done) => {
        utilityRoutes.queryExpenses(expenseType, cutOffDate).then((data) => {
          expect(data).toEqual([expense]);
          expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'expenseTypeId-reimbursedDate-index',
            'expenseTypeId',
            expenseType.id,
            additionalParams
          );
          done();
        });
      });
    }); // when it succeeds in returning all queried expenses

    describe('when it fails to return queried expenses', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get queried expenses'
        };

        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with 404 and err', (done) => {
        utilityRoutes.queryExpenses(expenseType, cutOffDate).then((data) => {
          expect(data).toEqual(err);
          expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'expenseTypeId-reimbursedDate-index',
            'expenseTypeId',
            expenseType.id,
            additionalParams
          );
          done();
        });
      });
    });
  });

  describe('_getAllAggregateExpenses', () => {
    let req, expenseType, employee, expense, aggregateExpense;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      expenseType = _.cloneDeep(EXPENSE_TYPE_DATA);
      employee = _.cloneDeep(EMPLOYEE_DATA);
      expense = _.cloneDeep(EXPENSE_DATA);
      aggregateExpense = new Expense(EXPENSE_DATA);
      aggregateExpense.budgetName = NAME;
      aggregateExpense.employeeName = `${FIRST_NAME} ${LAST_NAME}`;
      aggregateExpense.firstName = FIRST_NAME;
      aggregateExpense.middleName = MIDDLE_NAME;
      aggregateExpense.lastName = LAST_NAME;
      aggregateExpense.nickname = NICKNAME;
      aggregateExpense.campfire = CAMPFIRE;
    });

    describe('when employee is an admin', () => {
      beforeEach(() => {
        spyOn(utilityRoutes, 'isAdmin').and.returnValue(true);
        spyOn(utilityRoutes, 'isUser').and.returnValue(false);
        spyOn(utilityRoutes, 'isIntern').and.returnValue(false);
        spyOn(utilityRoutes, 'isManager').and.returnValue(false);
      });

      describe('and successfully gets all aggregate expenses', () => {
        beforeEach(() => {
          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([employee]));
          expenseDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expense]));
        });

        it('should respond with a 200 and the aggregated expenses', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual([aggregateExpense]);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(expenseDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith([aggregateExpense]);
            done();
          });
        }); // should respond with a 200 and the aggregated expenses
      }); // and successfully gets all aggregate expenses

      describe('when fails to get expense types', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get expense types.'
          };

          spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // when fails to get expense types

      describe('when fails to get employees', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employees.'
          };

          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // when fails to get employees

      describe('when fails to get expenses', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get expenses.'
          };

          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([employee]));
          expenseDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(expenseDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // when fails to get expenses
    }); // when employee is an admin

    describe('when employee is an manager', () => {
      beforeEach(() => {
        spyOn(utilityRoutes, 'isAdmin').and.returnValue(false);
        spyOn(utilityRoutes, 'isUser').and.returnValue(false);
        spyOn(utilityRoutes, 'isIntern').and.returnValue(false);
        spyOn(utilityRoutes, 'isManager').and.returnValue(true);
      });

      describe('and successfully gets all aggregate expenses', () => {
        beforeEach(() => {
          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([expense]));
        });

        it('should respond with a 200 and the aggregate expenses', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual([aggregateExpense]);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith([aggregateExpense]);
            done();
          });
        }); // should respond with a 200 and the aggregate expenses
      }); // and successfully gets all aggregate expenses

      describe('and fails to get expense types', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get expense types.'
          };

          spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get expense types

      describe('and fails to get employee', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employee.'
          };

          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get employee

      describe('and fails to get employee expenses', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employee expenses.'
          };

          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get employee expenses
    }); // when employee is an manager

    describe('when employee is a user', () => {
      beforeEach(() => {
        spyOn(utilityRoutes, 'isAdmin').and.returnValue(false);
        spyOn(utilityRoutes, 'isUser').and.returnValue(true);
        spyOn(utilityRoutes, 'isIntern').and.returnValue(false);
        spyOn(utilityRoutes, 'isManager').and.returnValue(false);
      });

      describe('and successfully gets all aggregate expenses', () => {
        beforeEach(() => {
          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([expense]));
        });

        it('should respond with a 200 and the aggregate expenses', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual([aggregateExpense]);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith([aggregateExpense]);
            done();
          });
        }); // should respond with a 200 and the aggregate expenses
      }); // and successfully gets all aggregate expenses

      describe('and fails to get expense types', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get expense types.'
          };

          spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get expense types

      describe('and fails to get employee', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employee.'
          };

          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get employee

      describe('and fails to get employee expenses', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employee expenses.'
          };

          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get employee expenses
    }); // when employee is a user

    describe('when employee is an intern', () => {
      beforeEach(() => {
        spyOn(utilityRoutes, 'isAdmin').and.returnValue(false);
        spyOn(utilityRoutes, 'isUser').and.returnValue(false);
        spyOn(utilityRoutes, 'isIntern').and.returnValue(true);
        spyOn(utilityRoutes, 'isManager').and.returnValue(false);
      });

      describe('and successfully gets all aggregate expenses', () => {
        beforeEach(() => {
          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([expense]));
        });

        it('should respond with a 200 and the aggregate expenses', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual([aggregateExpense]);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith([aggregateExpense]);
            done();
          });
        }); // should respond with a 200 and the aggregate expenses
      }); // and successfully gets all aggregate expenses

      describe('and fails to get expense types', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get expense types.'
          };

          spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get expense types

      describe('and fails to get employee', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employee.'
          };

          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get employee

      describe('and fails to get employee expenses', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to get employee expenses.'
          };

          expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
          employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
          expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        it('should respond with a 404 and error', (done) => {
          utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
            expect(data).toEqual(err);
            expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
            expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
            expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
        }); // should respond with a 404 and error
      }); // and fails to get employee expenses
    }); // when employee is a user
    describe('when employee is not an admin nor user nor intern nor Manager', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Unable to get all aggregate expenses due to insufficient employee permissions.'
        };
        spyOn(utilityRoutes, 'isAdmin').and.returnValue(false);
        spyOn(utilityRoutes, 'isUser').and.returnValue(false);
        spyOn(utilityRoutes, 'isIntern').and.returnValue(false);
        spyOn(utilityRoutes, 'isManager').and.returnValue(false);
      });

      it('should respond with a 403 and error', (done) => {
        utilityRoutes._getAllAggregateExpenses(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when employee is not an admin or user
  }); // _getAllAggregateExpenses

  describe('_getAllEmployeeExpenses', () => {
    describe('when successfully gets all employee expenses', () => {
      let expenses;

      beforeEach(() => {
        expenses = [new Expense(EXPENSE_DATA)];

        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([EXPENSE_DATA]));
      });

      it('should respond with a 200 and the employee expenses', (done) => {
        utilityRoutes._getAllEmployeeExpenses(REQ_DATA, res).then((data) => {
          expect(data).toEqual(expenses);
          expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(expenses);
          done();
        });
      }); // should respond with a 200 and the employee expenses
    }); // when successfully gets all employee expenses

    describe('when fails to query employee expenses', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query employee expenses'
        };

        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllEmployeeExpenses(REQ_DATA, res).then((data) => {
          expect(data).toEqual(err);
          expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith('employeeId-index', 'employeeId', ID);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to query employee expenses
  }); // _getAllEmployeeExpenses

  describe('_getAllExpenseTypeExpenses', () => {
    let req;
    beforeEach(() => {
      req = _.clone(REQ_DATA);
      req.employee.employeeRole = 'admin';
    });

    describe('when successfully gets all expense type expenses', () => {
      let expenses;

      beforeEach(() => {
        expenses = [new Expense(EXPENSE_DATA)];
        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([EXPENSE_DATA]));
      });

      it('should respond with a 200 and the expense type expenses', (done) => {
        utilityRoutes._getAllExpenseTypeExpenses(req, res).then((data) => {
          expect(data).toEqual(expenses);
          expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'expenseTypeId-index',
            'expenseTypeId',
            ID
          );
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(expenses);
          done();
        });
      }); // should respond with a 200 and the expense type expenses
    }); // when successfully gets all expense type expenses

    describe('when fails to query expense type expenses', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query expense type expenses'
        };

        expenseDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getAllExpenseTypeExpenses(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(expenseDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'expenseTypeId-index',
            'expenseTypeId',
            ID
          );
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to query expense type expenses
  }); // _getAllExpenseTypeExpenses

  describe('getAllExpenseTypes', () => {
    let expenseType, finalExpenseType;

    beforeEach(() => {
      expenseType = _.cloneDeep(EXPENSE_TYPE_DATA);
      finalExpenseType = new ExpenseType(expenseType);
    });

    describe('when it successfully returns all expenseTypes', () => {
      beforeEach(() => {
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([expenseType]));
      });

      it('should return the expenseTypes', (done) => {
        utilityRoutes.getAllExpenseTypes().then((data) => {
          expect(data).toEqual([finalExpenseType]);
          expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          done();
        });
      });
    });

    describe('when it fails to return all expenseTypes', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get all expenseTypes.'
        };

        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
      });

      it('should have returned a 404 error', (done) => {
        utilityRoutes.getAllExpenseTypes().then((data) => {
          expect(data).toEqual(err);
          expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          done();
        });
      });
    });
  });
  describe('getBudgetDates', () => {
    let hireDate, expectedDates;

    beforeEach(() => {
      hireDate = moment();
    });

    describe('when hire date is before today', () => {
      beforeEach(() => {
        hireDate.subtract(5, 'y');
      });

      describe('and anniversary already occured this year', () => {
        beforeEach(() => {
          hireDate.subtract(1, 'd');
          expectedDates = {
            startDate: moment().subtract(1, 'd'),
            endDate: moment().add(1, 'y').subtract(2, 'd')
          };
        });

        it('should return a start date with the current year and end date of next year', () => {
          expect(utilityRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT)).toEqual(
            expectedDates.startDate.format(ISOFORMAT)
          );
          expect(utilityRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT)).toEqual(
            expectedDates.endDate.format(ISOFORMAT)
          );
        }); // should return a start date with the current year
      }); // and anniversary already occured this year

      describe('and anniversary is today', () => {
        beforeEach(() => {
          expectedDates = {
            startDate: moment(),
            endDate: moment().add(1, 'y').subtract(1, 'd')
          };
        });

        it('should return a start date with the current year and end date of next year', () => {
          expect(utilityRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT)).toEqual(
            expectedDates.startDate.format(ISOFORMAT)
          );
          expect(utilityRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT)).toEqual(
            expectedDates.endDate.format(ISOFORMAT)
          );
        }); // should return a start date with the current year
      }); // and anniversary is today

      describe('and anniversary has not occured this year', () => {
        beforeEach(() => {
          hireDate.add(1, 'd');
          expectedDates = {
            startDate: moment().subtract(1, 'y').add(1, 'd'),
            endDate: moment()
          };
        });

        it('should return a start date of last year and end date of the current year', () => {
          expect(utilityRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT)).toEqual(
            expectedDates.startDate.format(ISOFORMAT)
          );
          expect(utilityRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT)).toEqual(
            expectedDates.endDate.format(ISOFORMAT)
          );
        }); // should return a start date with the current year
      }); // and anniversary has not occured this year
    }); // when hire date is before today

    describe('when hire date is today', () => {
      beforeEach(() => {
        expectedDates = {
          startDate: moment(),
          endDate: moment().add(1, 'y').subtract(1, 'd')
        };
      });

      it('should return a start date with the current year and end date of next year', () => {
        expect(utilityRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT)).toEqual(
          expectedDates.startDate.format(ISOFORMAT)
        );
        expect(utilityRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT)).toEqual(
          expectedDates.endDate.format(ISOFORMAT)
        );
      }); // should return a start date with the current year
    }); // when hire date is today

    describe('when hire date is after today', () => {
      beforeEach(() => {
        hireDate.add(1, 'd');
        expectedDates = {
          startDate: moment().add(1, 'd'),
          endDate: moment().add(1, 'y')
        };
      });

      it('should return a start date with the hire year and end date a year after the hire year', () => {
        expect(utilityRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT)).toEqual(
          expectedDates.startDate.format(ISOFORMAT)
        );
        expect(utilityRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT)).toEqual(
          expectedDates.endDate.format(ISOFORMAT)
        );
      }); // should return a start date with the current year
    }); // when hire date is after today
  }); // getBudgetDates

  describe('_getEmployeeBudget', () => {
    let employee, expenseType, budget;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_DATA);
      budget = new Budget(BUDGET_DATA);
    });

    describe('when successfully finds a budget', () => {
      beforeEach(() => {
        budget.fiscalStartDate = moment().subtract(1, 'd').format(ISOFORMAT);
        budget.fiscalEndDate = moment().add(1, 'd').format(ISOFORMAT);
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([budget]));
      });

      it('should respond with a 200 and the employees budget', (done) => {
        utilityRoutes._getEmployeeBudget(REQ_DATA, res).then((data) => {
          expect(data).toEqual(budget);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(budget);
          done();
        });
      }); // should respond with a 200 and the employees budget
    }); // when successfully finds a budget

    describe('when the budget does not exist', () => {
      beforeEach(() => {
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.resolve([]));
      });

      it('should respond with a 200 and the employees budget', (done) => {
        utilityRoutes._getEmployeeBudget(REQ_DATA, res).then((data) => {
          expect(data).toEqual(undefined);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(undefined);
          done();
        });
      }); // should respond with a 200 and an undefined budget
    }); // when the budget does not exist

    describe('when fails to get employee', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get employee'
        };

        employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getEmployeeBudget(REQ_DATA, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to get employee

    describe('when fails to get expense types', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense types'
        };

        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getEmployeeBudget(REQ_DATA, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to get expense types

    describe('when fails to query budgets', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query budgets'
        };

        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getEntry.and.returnValue(Promise.resolve(expenseType));
        budgetDynamo.queryWithTwoIndexesInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getEmployeeBudget(REQ_DATA, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(expenseTypeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(budgetDynamo.queryWithTwoIndexesInDB).toHaveBeenCalledWith(ID, ID);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to query budgets
  }); // _getEmployeeBudget

  describe('_getFiscalDateViewBudgets', () => {
    let req, employee, expenseType1, expenseType2, expenseType3, expenseType4, expenseType5;
    let budget1, budget2, budget3, budget4, budget5, budget6, budget7;
    let expectedBudget1, expectedBudget2, expectedBudget3;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
      expenseType1 = _.cloneDeep(EXPENSE_TYPE_DATA);
      expenseType2 = _.cloneDeep(EXPENSE_TYPE_DATA);
      expenseType3 = _.cloneDeep(EXPENSE_TYPE_DATA);
      expenseType4 = _.cloneDeep(EXPENSE_TYPE_DATA);
      expenseType5 = _.cloneDeep(EXPENSE_TYPE_DATA);
      budget1 = _.cloneDeep(BUDGET_DATA);
      budget2 = _.cloneDeep(BUDGET_DATA);
      budget3 = _.cloneDeep(BUDGET_DATA);
      budget4 = _.cloneDeep(BUDGET_DATA);
      budget5 = _.cloneDeep(BUDGET_DATA);
      budget6 = _.cloneDeep(BUDGET_DATA);
      budget7 = _.cloneDeep(BUDGET_DATA);

      expenseType1.id = 'ETID_1';
      expenseType1.recurringFlag = true;

      expenseType2.id = 'ETID_2';
      expenseType2.recurringFlag = false;
      expenseType2.startDate = '2000-08-18';
      expenseType2.endDate = '2000-08-19';

      expenseType3.id = 'ETID_3';
      expenseType3.recurringFlag = false;
      expenseType3.startDate = '2000-02-01';
      expenseType3.endDate = '2002-02-01';

      expenseType4.id = 'ETID_4';
      expenseType4.recurringFlag = false;
      expenseType4.startDate = '2004-08-16';
      expenseType4.endDate = '2004-08-17';

      expenseType5.id = 'ETID_5';
      expenseType5.recurringFlag = false;
      expenseType5.startDate = '2000-08-18';
      expenseType5.endDate = '2020-08-17';

      budget1.expenseTypeId = 'ETID_1';
      budget1.fiscalStartDate = '2000-08-18';
      budget1.fiscalEndDate = '2001-08-17';

      budget2.expenseTypeId = 'ETID_1';
      budget2.fiscalStartDate = '2001-08-18';
      budget2.fiscalEndDate = '2002-08-17';

      budget3.expenseTypeId = 'ETID_1';
      budget3.fiscalStartDate = '2003-08-18';
      budget3.fiscalEndDate = '2004-08-17';

      budget4.expenseTypeId = 'ETID_2';
      budget4.fiscalStartDate = '2000-08-18';
      budget4.fiscalEndDate = '2000-08-19';

      budget5.expenseTypeId = 'ETID_3';
      budget5.fiscalStartDate = '2000-02-01';
      budget5.fiscalEndDate = '2002-02-01';

      budget6.expenseTypeId = 'ETID_4';
      budget6.fiscalStartDate = '2004-08-16';
      budget6.fiscalEndDate = '2004-08-17';

      budget7.expenseTypeId = 'ETID_5';
      budget7.fiscalStartDate = '2000-08-18';
      budget7.fiscalEndDate = '2020-08-17';

      req = _.cloneDeep(REQ_DATA);
      req.params.fiscalStartDate = '2001-08-18';

      expectedBudget1 = {
        expenseTypeName: NAME,
        description: DESCRIPTION,
        odFlag: OD_FLAG,
        expenseTypeId: 'ETID_1',
        budgetObject: new Budget(_.cloneDeep(budget2))
      };

      expectedBudget2 = {
        expenseTypeName: NAME,
        description: DESCRIPTION,
        odFlag: OD_FLAG,
        expenseTypeId: 'ETID_3',
        budgetObject: new Budget(_.cloneDeep(budget5))
      };

      expectedBudget3 = {
        expenseTypeName: NAME,
        description: DESCRIPTION,
        odFlag: OD_FLAG,
        expenseTypeId: 'ETID_5',
        budgetObject: new Budget(_.cloneDeep(budget7))
      };
    });

    describe('when successfully getting fiscal date view bugets', () => {
      beforeEach(() => {
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(
          Promise.resolve([expenseType1, expenseType2, expenseType3, expenseType4, expenseType5])
        );
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(
          Promise.resolve([budget1, budget2, budget3, budget4, budget5, budget6, budget7])
        );
      });

      it('should respond with a 200 and the employee budgets', (done) => {
        utilityRoutes._getFiscalDateViewBudgets(req, res).then((data) => {
          expect(data).toEqual([expectedBudget1, expectedBudget2, expectedBudget3]);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith([expectedBudget1, expectedBudget2, expectedBudget3]);
          done();
        });
      }); // should respond with a 200 and the employee budgets
    }); // when successfully getting fiscal date view bugets

    describe('when fails to get employee', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get employee'
        };
        employeeDynamo.getEntry.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getFiscalDateViewBudgets(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to get employee

    describe('when fails to get expense type', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to get expense type'
        };
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        spyOn(utilityRoutes, 'getAllExpenseTypes').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getFiscalDateViewBudgets(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(utilityRoutes.getAllExpenseTypes).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to get expense type

    describe('when fails to query employee budgets', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query employee budgets'
        };
        employeeDynamo.getEntry.and.returnValue(Promise.resolve(employee));
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(
          Promise.resolve([expenseType1, expenseType2, expenseType3, expenseType4, expenseType5])
        );
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', (done) => {
        utilityRoutes._getFiscalDateViewBudgets(req, res).then((data) => {
          expect(data).toEqual(err);
          expect(employeeDynamo.getEntry).toHaveBeenCalledWith(ID);
          expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalled();
          expect(budgetDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'employeeId-expenseTypeId-index',
            'employeeId',
            ID
          );
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 404 and error
    }); // when fails to query employee budgets
  }); // _getFiscalDateViewBudgets

  describe('hasAccess', () => {
    let employee, expenseType;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
    });

    describe('when expense type is accessible by all employees', () => {
      beforeEach(() => {
        expenseType.accessibleBy = ['Intern', 'FullTime', 'PartTime'];
        employee.workStatus = 50;
      });

      it('should return true', () => {
        expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(true);
      }); // should return true;
    }); // when expense type is accessible by all employees

    describe('when expense type is accessible by full time employees', () => {
      beforeEach(() => {
        expenseType.accessibleBy = ['FullTime'];
      });

      describe('and employee work status is 100', () => {
        beforeEach(() => {
          employee.workStatus = 100;
        });

        it('should return true', () => {
          expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(true);
        }); // should return true;
      }); // and employee work status is 100

      describe('and employee work status is 50', () => {
        beforeEach(() => {
          employee.workStatus = 50;
        });

        it('should return false', () => {
          expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(false);
        }); // should return false;
      }); // and employee work status is 50

      describe('and employee work status is 0', () => {
        beforeEach(() => {
          employee.workStatus = 0;
        });

        it('should return false', () => {
          expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(false);
        }); // should return false;
      }); // and employee work status is 0
    }); // when expense type is accessible by full time employees

    describe('when expense type is accessible by intern for employees', () => {
      beforeEach(() => {
        expenseType.accessibleBy = ['Intern'];
      });

      describe('and employee work status is 100', () => {
        beforeEach(() => {
          employee.workStatus = 100;
          employee.employeeRole = 'intern';
        });

        it('should return true', () => {
          expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(true);
        }); // should return true;
      }); // and employee work status is 100

      describe('and employee work status is 50', () => {
        beforeEach(() => {
          employee.workStatus = 50;
        });

        it('should return true', () => {
          expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(false);
        }); // should return true;
      }); // and employee work status is 50

      describe('and employee work status is 0', () => {
        beforeEach(() => {
          employee.workStatus = 0;
        });

        it('should return false', () => {
          expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(false);
        }); // should return false;
      }); // and employee work status is 0
    }); // when expense type is accessible by full for employees

    describe('when expense type is accessible by custom employees', () => {
      describe('and employee is included in the custom list', () => {
        beforeEach(() => {
          expenseType.accessibleBy = [ID];
          employee.workStatus = 50;
        });

        it('should return true', () => {
          expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(true);
        }); // should return true
      }); // and employee is included in the custom list

      describe('and employee is not included in the custom list', () => {
        beforeEach(() => {
          expenseType.accessibleBy = [];
          employee.workStatus = 50;
        });

        it('should return false', () => {
          expect(utilityRoutes.hasAccess(employee, expenseType)).toBe(false);
        }); // should return false
      }); // and employee is not included in the custom list
    }); // when expense type is accessible by custom employees
  }); // hasAccess

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
        expect(utilityRoutes.isAdmin(employee)).toBe(true);
      }); // should return true
    }); // when the employee is an admin

    describe('when the employee is a user', () => {
      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return false', () => {
        expect(utilityRoutes.isAdmin(employee)).toBe(false);
      }); // should return false
    }); // when the employee is a user

    describe('when the employee is an intern', () => {
      beforeEach(() => {
        employee.employeeRole = 'intern';
      });

      it('should return false', () => {
        expect(utilityRoutes.isAdmin(employee)).toBe(false);
      }); // should return false
    }); // when the employee is an intern
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
        expect(utilityRoutes.isUser(employee)).toBe(true);
      }); // should return true
    }); // when the employee is a user

    describe('when the employee is an admin', () => {
      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return false', () => {
        expect(utilityRoutes.isUser(employee)).toBe(false);
      }); // should return false
    }); // when the employee is an admin

    describe('when the employee is an intern', () => {
      beforeEach(() => {
        employee.employeeRole = 'intern';
      });

      it('should return false', () => {
        expect(utilityRoutes.isUser(employee)).toBe(false);
      }); // should return true
    }); // when the employee is an intern
  }); // isUser

  describe('isIntern', () => {
    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when the employee is a user', () => {
      beforeEach(() => {
        employee.employeeRole = 'intern';
      });

      it('should return true', () => {
        expect(utilityRoutes.isIntern(employee)).toBe(true);
      }); // should return true
    }); // when the employee is a user

    describe('when the employee is an admin', () => {
      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return false', () => {
        expect(utilityRoutes.isIntern(employee)).toBe(false);
      }); // should return false
    }); // when the employee is an admin

    describe('when the employee is an user', () => {
      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return false', () => {
        expect(utilityRoutes.isIntern(employee)).toBe(false);
      }); // should return true
    }); // when the employee is an intern
  }); // isIntern

  describe('isManager', () => {
    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when the employee is a manager', () => {
      beforeEach(() => {
        employee.employeeRole = 'manager';
      });

      it('should return true', () => {
        expect(utilityRoutes.isManager(employee)).toBe(true);
      }); // should return true
    }); // when the employee is a user

    describe('when the employee is an admin', () => {
      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return false', () => {
        expect(utilityRoutes.isManager(employee)).toBe(false);
      }); // should return false
    }); // when the employee is an admin

    describe('when the employee is an intern', () => {
      beforeEach(() => {
        employee.employeeRole = 'intern';
      });

      it('should return false', () => {
        expect(utilityRoutes.isManager(employee)).toBe(false);
      }); // should return false
    }); // when the employee is an intern
  }); // isManager

  describe('router', () => {
    it('should return the router', () => {
      expect(utilityRoutes.router).toEqual(_ROUTER);
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
      utilityRoutes._sendError(res, err);
    }); // should send an error
  }); // _sendError
}); // utilityRoutes
