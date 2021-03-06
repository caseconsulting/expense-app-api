const CrudRoutes = require('../../routes/crudRoutes');
const TrainingUrls = require('../../models/trainingUrls');
const _ = require('lodash');
const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');

const Budget = require('../../models/budget');
const Employee = require('../../models/employee');
// const Expense = require('../../models/expense');
const ExpenseType = require('../../models/expenseType');

describe('crudRoutes', () => {

  const ISOFORMAT = 'YYYY-MM-DD';
  const STAGE = 'dev';
  const _ROUTER = '{router}';

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
  //   employeeId: ID,
  //   expenseTypeId: ID,
  //   category: CATEGORY
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

  let databaseModify, crudRoutes, res, budgetDynamo;

  beforeEach(() => {
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

    crudRoutes = new CrudRoutes();
    crudRoutes.databaseModify = databaseModify;
    crudRoutes.budgetDynamo = budgetDynamo;
    crudRoutes._router = _ROUTER;
  });

  describe('calcAdjustedAmount', () => {

    let employee, expenseType;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType.budget = 100;
    });

    describe('when employee has access', () => {

      beforeEach(() => {
        spyOn(crudRoutes, 'hasAccess').and.returnValue(true);
      });

      describe('and expense type is accessible by All', () => {

        beforeEach(() => {
          expenseType.accessibleBy = 'ALL';
          employee.workStatus = 50;
        });

        it('should return 50% of the budget', () => {
          expect(crudRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(50);
        }); // should return 50% of the budget
      }); // and expense type is accessible by All

      describe('and expense type is accessible by Full', () => {

        beforeEach(() => {
          expenseType.accessibleBy = 'FULL';
          employee.workStatus = 50;
        });

        it('should return 100% of the budget', () => {
          expect(crudRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(100);
        }); // should return 100% of the budget
      }); // and expense type is accessible by Full

      describe('and expense type is accessible by Full Time', () => {

        beforeEach(() => {
          expenseType.accessibleBy = 'FULL TIME';
          employee.workStatus = 100;
        });

        it('should return 100% of the budget', () => {
          expect(crudRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(100);
        }); // should return 100% of the budget
      }); // and expense type is accessible by Full Time

      describe('and expense type is accessible by Custom', () => {

        beforeEach(() => {
          expenseType.accessibleBy = '{custom}';
          employee.workStatus = 50;
        });

        it('should return 50% of the budget', () => {
          expect(crudRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(50);
        }); // should return 50% of the budget
      }); // and expense type is accessible by Custom
    }); // when employee has access

    describe('when employee does not have access', () => {

      beforeEach(() => {
        spyOn(crudRoutes, 'hasAccess').and.returnValue(false);
      });

      it('should return 0', () => {
        expect(crudRoutes.calcAdjustedAmount(employee, expenseType)).toEqual(0);
      }); // should return 0
    }); // when employee does not have access
  }); // calcAdjustedAmount

  describe('_checkPermissionToCreate', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToCreate

  describe('_checkPermissionToDelete', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToDelete

  describe('_checkPermissionToRead', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToRead(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToRead(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToRead(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToRead(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToRead(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToRead

  describe('_checkPermissionToReadAll', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expense-types`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToReadAll

  describe('_checkPermissionToUpdate', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(EMPLOYEE_DATA);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToUpdate

  describe('_checkTableName', () => {

    beforeEach(() => {
      crudRoutes.databaseModify.tableName =  `${STAGE}-expenses`;
    });

    describe('when database table is in list of table names', () => {

      it('should return true', () => {
        expect(crudRoutes._checkTableName(['expenses'])).toEqual(true);
      }); // should retrun true
    }); // when database table is in the list of table names

    describe('when database table is not in list of table names', () => {
      it('should return false', () => {
        expect(crudRoutes._checkTableName(['invalid-table-name'])).toEqual(false);
      }); // should retrun false
    }); // when database table is not in the list of table names
  }); // _checkTableName

  describe('createNewBudget', () => {

    let employee, expectedBudget, expenseType;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      employee.hireDate = '2000-08-18';
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType.budget = 100;
      expectedBudget = new Budget(BUDGET_DATA);
      spyOn(crudRoutes, 'getUUID').and.returnValue(ID);
    });

    describe('when successfully creates a new budget,', () => {

      beforeEach(() => {
        budgetDynamo.addToDB.and.returnValue(Promise.resolve(expectedBudget));
      });

      describe('expense type is recurring,', () => {

        describe('annual start not provided,', () => {

          let endDate, startDate;

          beforeEach(() => {
            expenseType.recurringFlag = true;
            startDate = moment('2000-08-18', ISOFORMAT);
            endDate = moment('2001-08-17', ISOFORMAT);
            spyOn(crudRoutes, 'getBudgetDates').and.returnValue({startDate, endDate});
            expectedBudget.fiscalStartDate = '2000-08-18';
            expectedBudget.fiscalEndDate = '2001-08-17';
          });

          describe('and employee has access', () => {

            beforeEach(() => {
              expenseType.accessibleBy = 'ALL';
              employee.workStatus = 100;
              expectedBudget.amount = 100;
            });

            it('should create and return a new budget with full amount and anniversary date', done => {
              crudRoutes.createNewBudget(employee, expenseType)
                .then(data => {
                  expect(data).toEqual(expectedBudget);
                  expect(crudRoutes.getBudgetDates).toHaveBeenCalledWith('2000-08-18');
                  expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
                  done();
                });
            }); // should create and return a new budget with full amount and anniversary date
          }); // and employee has access

          describe('and employee does not have access', () => {

            beforeEach(() => {
              expenseType.accessibleBy = [];
              expectedBudget.amount = 0;
            });

            it('should create and return a new budget with 0 amount and anniversary date', done => {
              crudRoutes.createNewBudget(employee, expenseType)
                .then(data => {
                  expect(data).toEqual(expectedBudget);
                  expect(crudRoutes.getBudgetDates).toHaveBeenCalledWith('2000-08-18');
                  expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
                  done();
                });
            }); // should create and return a new budget with 0 amount and anniversary date
          }); // and employee does not have access
        }); // annual start not provided,

        describe('annual start provided,', () => {

          beforeEach(() => {
            expenseType.recurringFlag = true;
            expectedBudget.fiscalStartDate = '2000-08-18';
            expectedBudget.fiscalEndDate = '2001-08-17';
          });

          describe('and employee has access', () => {

            beforeEach(() => {
              expenseType.accessibleBy = 'ALL';
              employee.workStatus = 100;
              expectedBudget.amount = 100;
            });

            it('should create and return a new budget with full amount and anniversary date', done => {
              crudRoutes.createNewBudget(employee, expenseType, '2000-08-18')
                .then(data => {
                  expect(data).toEqual(expectedBudget);
                  expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
                  done();
                });
            }); // should create and return a new budget with full amount and anniversary date
          }); // and employee has access

          describe('and employee does not have access', () => {

            beforeEach(() => {
              expenseType.accessibleBy = [];
              expectedBudget.amount = 0;
            });

            it('should create and return a new budget with 0 amount and anniversary date', done => {
              crudRoutes.createNewBudget(employee, expenseType, '2000-08-18')
                .then(data => {
                  expect(data).toEqual(expectedBudget);
                  expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
                  done();
                });
            }); // should create and return a new budget with 0 amount and anniversary date
          }); // and employee does not have access
        }); // annual start provided,
      }); // expense type is recurring,

      describe('when expense type is not recurring', () => {

        beforeEach(() => {
          expenseType.recurringFlag = false;
          expenseType.startDate = '2000-08-18';
          expenseType.endDate = '2001-08-17';
          expectedBudget.fiscalStartDate = '2000-08-18';
          expectedBudget.fiscalEndDate = '2001-08-17';
        });

        describe('and employee has access', () => {

          beforeEach(() => {
            expenseType.accessibleBy = 'ALL';
            employee.workStatus = 100;
            expectedBudget.amount = 100;
          });

          it('should create and return a new budget with full amount and expense type date', done => {
            crudRoutes.createNewBudget(employee, expenseType)
              .then(data => {
                expect(data).toEqual(expectedBudget);
                expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
                done();
              });
          }); // should create and return a new budget with full amount and expense type date
        }); // and employee has access

        describe('and employee does not have access', () => {

          beforeEach(() => {
            expenseType.accessibleBy = [];
            expectedBudget.amount = 0;
          });

          it('should create and return a new budget with 0 amount and expense type date', done => {
            crudRoutes.createNewBudget(employee, expenseType)
              .then(data => {
                expect(data).toEqual(expectedBudget);
                expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
                done();
              });
          }); // should create and return a new budget with 0 amount and expense type date
        }); // and employee does not have access
      }); // when expense type is not recurring
    }); // when successfully creates a new budget

    describe('when fails to create a new budget', () => {

      let err;

      beforeEach(() => {
        expenseType.recurringFlag = false;
        expenseType.startDate = '2000-08-18';
        expenseType.endDate = '2001-08-17';
        expenseType.accessibleBy = [];
        expectedBudget.fiscalStartDate = '2000-08-18';
        expectedBudget.fiscalEndDate = '2001-08-17';
        expectedBudget.amount = 0;
        err = {
          code: 404,
          message: 'Failed to add to database.'
        };
        budgetDynamo.addToDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 404 and error', done => {
        crudRoutes.createNewBudget(employee, expenseType)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(budgetDynamo.addToDB).toHaveBeenCalledWith(expectedBudget);
            done();
          });
      }); // should respond with a 404 and error
    }); // when fails to create a new budget
  }); // createNewBudget

  describe('_createWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        spyOn(crudRoutes, '_create').and.returnValue(Promise.resolve(BODY_DATA));
      });

      describe('creating a Training URL', () => {

        let trainingUrl;

        beforeEach(() => {
          trainingUrl = new TrainingUrls({id: 'id', category: 'category'});
          databaseModify.addToDB.and.returnValue(Promise.resolve(trainingUrl));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes._createWrapper(req, res)
            .then(data => {
              expect(data).toEqual(trainingUrl);
              expect(crudRoutes._create).toHaveBeenCalledWith(BODY_DATA);
              expect(databaseModify.addToDB).toHaveBeenCalledWith(BODY_DATA);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(trainingUrl);
              done();
            });
        }); // should respond with a 200 and data
      }); // creating a Training URL

      describe('creating something other than a Training URL', () => {

        beforeEach(() => {
          databaseModify.addToDB.and.returnValue(Promise.resolve(BODY_DATA));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes._createWrapper(req, res)
            .then(data => {
              expect(data).toEqual(BODY_DATA);
              expect(crudRoutes._create).toHaveBeenCalledWith(BODY_DATA);
              expect(databaseModify.addToDB).toHaveBeenCalledWith(BODY_DATA);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(BODY_DATA);
              done();
            });
        }); // should respond with a 200 and data
      }); // creating something other than a Training URL
    }); // when called without error

    describe('when employee does not have permission to create', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to create object in database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._createWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to create

    describe('when failed to create object', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error creating object.'
        };
        spyOn(crudRoutes, '_create').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._createWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._create).toHaveBeenCalledWith(BODY_DATA);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to create object

    describe('when failed to validate inputs', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error validating inputs.'
        };
        spyOn(crudRoutes, '_create').and.returnValue(Promise.resolve(BODY_DATA));
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._createWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._create).toHaveBeenCalledWith(BODY_DATA);
            expect(crudRoutes._validateInputs).toHaveBeenCalledWith(BODY_DATA);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to validate inputs

    describe('when failed to add object to database', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error adding object to database.'
        };
        spyOn(crudRoutes, '_create').and.returnValue(Promise.resolve(BODY_DATA));
        databaseModify.addToDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._createWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._create).toHaveBeenCalledWith(BODY_DATA);
            expect(databaseModify.addToDB).toHaveBeenCalledWith(BODY_DATA);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to add object to database
  }); // _createWrapper

  describe('_deleteWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        spyOn(crudRoutes, '_delete').and.returnValue(Promise.resolve(BODY_DATA));
        databaseModify.removeFromDB.and.returnValue(Promise.resolve(BODY_DATA));
      });

      it('should respond with a 200 and data', done => {
        crudRoutes._deleteWrapper(req, res)
          .then(data => {
            expect(data).toEqual(BODY_DATA);
            expect(crudRoutes._delete).toHaveBeenCalledWith(PARAMS_DATA.id);
            expect(databaseModify.removeFromDB).toHaveBeenCalledWith(BODY_DATA.id);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(BODY_DATA);
            done();
          });
      }); // should respond with a 200 and data
    }); //when called without error

    describe('when employee does not have permission to delete', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to delete object from database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._deleteWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to delete

    describe('when failed to delete object', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        crudRoutes.databaseModify.tableName =  `${STAGE}-expenses`;
        err = {
          code: 403,
          message: 'Error deleting object.'
        };
        spyOn(crudRoutes, '_delete').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._deleteWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to delete object

    describe('when failed to remove object from database', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error removing object from database.'
        };
        spyOn(crudRoutes, '_delete').and.returnValue(Promise.resolve(BODY_DATA));
        databaseModify.removeFromDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._deleteWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._delete).toHaveBeenCalledWith(PARAMS_DATA.id);
            expect(databaseModify.removeFromDB).toHaveBeenCalledWith(BODY_DATA.id);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to remove object from database
  }); // _deleteWrapper

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
          expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
            .toEqual(expectedDates.startDate.format(ISOFORMAT));
          expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
            .toEqual(expectedDates.endDate.format(ISOFORMAT));
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
          expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
            .toEqual(expectedDates.startDate.format(ISOFORMAT));
          expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
            .toEqual(expectedDates.endDate.format(ISOFORMAT));
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
          expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
            .toEqual(expectedDates.startDate.format(ISOFORMAT));
          expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
            .toEqual(expectedDates.endDate.format(ISOFORMAT));
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
        expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
          .toEqual(expectedDates.startDate.format(ISOFORMAT));
        expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
          .toEqual(expectedDates.endDate.format(ISOFORMAT));
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
        expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
          .toEqual(expectedDates.startDate.format(ISOFORMAT));
        expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
          .toEqual(expectedDates.endDate.format(ISOFORMAT));
      }); // should return a start date with the current year
    }); // when hire date is after today
  }); // getBudgetDates

  describe('_getTableName', () => {

    beforeEach(() => {
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    it ('should return the database table name', () => {
      expect(crudRoutes._getTableName()).toEqual(`${STAGE}-expenses`);
    }); // should return the database table name
  }); // _getTableName

  describe('getUUID', () => {

    it('should return an id value', () => {
      let id = crudRoutes.getUUID();
      expect(id).toBeDefined();
    }); // should return an id value
  }); // getUUID

  describe('hasAccess', () => {

    let employee, expenseType;

    beforeEach(() => {
      employee = new Employee(EMPLOYEE_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
    });

    describe('when expense type is accessible by all employees', () => {

      beforeEach(() => {
        expenseType.accessibleBy = 'ALL';
        employee.workStatus = 50;
      });

      it('should return true', () => {
        expect(crudRoutes.hasAccess(employee, expenseType)).toBe(true);
      }); // should return true;
    }); // when expense type is accessible by all employees

    describe('when expense type is accessible by full time employees', () => {

      beforeEach(() => {
        expenseType.accessibleBy = 'FULL TIME';
      });

      describe('and employee work status is 100', () => {

        beforeEach(() => {
          employee.workStatus = 100;
        });

        it('should return true', () => {
          expect(crudRoutes.hasAccess(employee, expenseType)).toBe(true);
        }); // should return true;

      }); // and employee work status is 100

      describe('and employee work status is 50', () => {

        beforeEach(() => {
          employee.workStatus = 50;
        });

        it('should return false', () => {
          expect(crudRoutes.hasAccess(employee, expenseType)).toBe(false);
        }); // should return false;

      }); // and employee work status is 50

      describe('and employee work status is 0', () => {

        beforeEach(() => {
          employee.workStatus = 0;
        });

        it('should return false', () => {
          expect(crudRoutes.hasAccess(employee, expenseType)).toBe(false);
        }); // should return false;
      }); // and employee work status is 0
    }); // when expense type is accessible by full time employees

    describe('when expense type is accessible by full for employees', () => {

      beforeEach(() => {
        expenseType.accessibleBy = 'FULL';
      });

      describe('and employee work status is 100', () => {

        beforeEach(() => {
          employee.workStatus = 100;
        });

        it('should return true', () => {
          expect(crudRoutes.hasAccess(employee, expenseType)).toBe(true);
        }); // should return true;
      }); // and employee work status is 100

      describe('and employee work status is 50', () => {

        beforeEach(() => {
          employee.workStatus = 50;
        });

        it('should return true', () => {
          expect(crudRoutes.hasAccess(employee, expenseType)).toBe(true);
        }); // should return true;
      }); // and employee work status is 50

      describe('and employee work status is 0', () => {

        beforeEach(() => {
          employee.workStatus = 0;
        });

        it('should return false', () => {
          expect(crudRoutes.hasAccess(employee, expenseType)).toBe(false);
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
          expect(crudRoutes.hasAccess(employee, expenseType)).toBe(true);
        }); // should return true
      }); // and employee is included in the custom list

      describe('and employee is not included in the custom list', () => {

        beforeEach(() => {
          expenseType.accessibleBy = [];
          employee.workStatus = 50;
        });

        it('should return false', () => {
          expect(crudRoutes.hasAccess(employee, expenseType)).toBe(false);
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
        expect(crudRoutes.isAdmin(employee)).toBe(true);
      }); // should return true
    }); // when the employee is an admin

    describe('when the employee is not an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return false', () => {
        expect(crudRoutes.isAdmin(employee)).toBe(false);
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
        expect(crudRoutes.isUser(employee)).toBe(true);
      }); // should return true
    }); // when the employee is a user

    describe('when the employee is not a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return false', () => {
        expect(crudRoutes.isUser(employee)).toBe(false);
      }); // should return false
    }); // when the employee is not an user
  }); // isUser

  describe('_readWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      describe('when user and object belongs to the user', () => {

        let objectRead;

        beforeEach(() => {
          req.employee.employeeRole = 'user';
          req.employee.id = 'id';
          objectRead = _.cloneDeep(BODY_DATA);
          objectRead.employeeId = 'id';
          spyOn(crudRoutes, '_read').and.returnValue(Promise.resolve(objectRead));
        });

        it('should respond with a 403 and error', done => {
          crudRoutes._readWrapper(req, res)
            .then(data => {
              expect(data).toEqual(objectRead);
              expect(crudRoutes._read).toHaveBeenCalledWith(PARAMS_DATA);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(objectRead);
              done();
            });
        }); // should respond with a 403 and error
      }); // when user and object read does not belong to user

      describe('reading a Training URL', () => {

        let trainingUrl;

        beforeEach(() => {
          req.employee.employeeRole = 'admin';
          trainingUrl = new TrainingUrls({id: 'id', category: 'category'});
          spyOn(crudRoutes, '_read').and.returnValue(Promise.resolve(trainingUrl));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes._readWrapper(req, res)
            .then(data => {
              expect(data).toEqual(trainingUrl);
              expect(crudRoutes._read).toHaveBeenCalledWith(PARAMS_DATA);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(trainingUrl);
              done();
            });
        }); // should respond with a 200 and data
      }); // reading a Training URL

      describe('reading something other than a Training URL', () => {

        beforeEach(() => {
          req.employee.employeeRole = 'admin';
          spyOn(crudRoutes, '_read').and.returnValue(Promise.resolve(BODY_DATA));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes._readWrapper(req, res)
            .then(data => {
              expect(data).toEqual(BODY_DATA);
              expect(crudRoutes._read).toHaveBeenCalledWith(PARAMS_DATA);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(BODY_DATA);
              done();
            });
        }); // should respond with a 200 and data
      }); // reading something other than a Training URL
    }); //when called without error

    describe('when employee does not have permission to read', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to read object from database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to read

    describe('when failed to read object', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error reading object.'
        };
        spyOn(crudRoutes, '_read').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._read).toHaveBeenCalledWith(PARAMS_DATA);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to read object

    describe('when user and object read does not belong to user', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'user';
        req.employee.id = 'invalid-id';
        err = {
          code: 403,
          message: 'Unable to read object from database due to insufficient employee permissions.'
        };
        spyOn(crudRoutes, '_read').and.returnValue(Promise.resolve(BODY_DATA));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._read).toHaveBeenCalledWith(PARAMS_DATA);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when user and object read does not belong to user
  }); // _readWrapper

  describe('_readAllWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve(BODY_DATA));
      });

      it('should respond with a 200 and data', done => {
        crudRoutes._readAllWrapper(req, res)
          .then(data => {
            expect(data).toEqual(BODY_DATA);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(BODY_DATA);
            done();
          });
      }); // should respond with a 200 and data
    }); //when called without error

    describe('when employee does not have permission to read', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to read all objects from database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readAllWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to read

    describe('when failed to read all objects from database', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error reading all objects from database.'
        };
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readAllWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to read all objects from database
  }); // _readWrapper

  describe('router', () => {

    it('should return the router', () => {
      expect(crudRoutes.router).toEqual(_ROUTER);
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
      crudRoutes._sendError(res, err);
    }); // should send an error
  }); // _sendError

  describe('_updateWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(REQ_DATA);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
      });

      describe('and updating a Training URL', () => {

        let trainingUrl;

        beforeEach(() => {
          trainingUrl = new TrainingUrls({id: 'id', category: 'category'});
          req.body = trainingUrl;
          spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(trainingUrl));
          databaseModify.updateEntryInDB.and.returnValue(Promise.resolve(trainingUrl));
        });

        it ('should respond with a 200 and data', done => {
          crudRoutes._updateWrapper(req, res)
            .then(data => {
              expect(data).toEqual(trainingUrl);
              expect(crudRoutes._update).toHaveBeenCalledWith(trainingUrl);
              expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(trainingUrl);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(trainingUrl);
              done();
            });
        }); // should respond with a 200 and data
      }); // and updating a training url

      describe('and updated object has the same id', () => {

        beforeEach(() => {
          spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(BODY_DATA));
          databaseModify.updateEntryInDB.and.returnValue(Promise.resolve(BODY_DATA));
        });

        it ('should respond with a 200 and data', done => {
          crudRoutes._updateWrapper(req, res)
            .then(data => {
              expect(data).toEqual(BODY_DATA);
              expect(crudRoutes._update).toHaveBeenCalledWith(BODY_DATA);
              expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(BODY_DATA);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(BODY_DATA);
              done();
            });
        }); // should respond with a 200 and data
      }); // and updated object has the same id

      describe('and updated object has a different id', () => {

        let newObject;

        beforeEach(() => {
          newObject = {
            id: 'different-id'
          };
          spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(newObject));
        });

        it ('should respond with a 200 and data', done => {
          crudRoutes._updateWrapper(req, res)
            .then(data => {
              expect(data).toEqual(newObject);
              expect(crudRoutes._update).toHaveBeenCalledWith(BODY_DATA);
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(newObject);
              done();
            });
        }); // should respond with a 200 and data
      }); // and updated object has a different id
    }); //when called without error

    describe('when employee does not have permission to update', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to update object in database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._updateWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to update

    describe('when failed to update object', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error updating object.'
        };
        spyOn(crudRoutes, '_update').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._updateWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._update).toHaveBeenCalledWith(BODY_DATA);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to update object

    describe('when failed to validate inputs', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error validating inputs.'
        };
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(BODY_DATA));
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._updateWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._update).toHaveBeenCalledWith(BODY_DATA);
            expect(crudRoutes._validateInputs).toHaveBeenCalledWith(BODY_DATA);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to validate inputs

    describe('when failed to update object in database', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error updating object to database.'
        };
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(BODY_DATA));
        databaseModify.updateEntryInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._updateWrapper(req, res)
          .then(data => {
            expect(data).toEqual(err);
            expect(crudRoutes._update).toHaveBeenCalledWith(BODY_DATA);
            expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(BODY_DATA);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.send).toHaveBeenCalledWith(err);
            done();
          });
      }); // should respond with a 403 and error
    }); // when failed to update object to database
  }); // _updateWrapper

  describe('_validateInputs', () => {

    describe('when object id exists', () => {

      describe('when all params are valid', () => {

        it('should return the object', () => {
          crudRoutes._validateInputs(BODY_DATA)
            .then(data => {
              expect(data).toEqual(BODY_DATA);
            });
        }); // should return the object
      }); // when all params are valid

      describe('when one or more params is empty', () => {

        let err, invalidObject;

        beforeEach(() => {
          err = {
            code: 406,
            message: 'Failed to validate inputs. All fields are needed.'
          };
          invalidObject = {
            id: '{id}',
            invalidParam: ''
          };
        });

        it('should return a 406 error', done => {
          crudRoutes._validateInputs(invalidObject)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch(error => {
              expect(error).toEqual(err);
              done();
            });
        }); // should return a 406 error
      }); // when one or more params is empty
    }); // when object id exists

    describe('when object id does not exist', () => {

      let err, invalidObject;

      beforeEach(() => {
        err = {
          code: 400,
          message: 'Failed to validate inputs.'
        };
        invalidObject = {
          body: 'body'
        };
      });

      it('should return a 400 error', done => {
        crudRoutes._validateInputs(invalidObject)
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 400 error
    }); // when object id does not exist
  }); // _validateInputs
}); // crudRoutes
