const AWS = require('aws-sdk-mock');
const Budget = require('../../models/budget');
const DatabaseModify = require('../../js/databaseModify');
const Employee = require('../../models/employee');
const Expense = require('../../models/expense');
const ExpenseType = require('../../models/expenseType');
// const moment = require('moment');
const TrainingUrl = require('../../models/trainingUrls');

describe('databaseModify', () => {

  // const ISOFORMAT = 'YYYY-MM-DD';
  const STAGE = 'dev';

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
  const BUDGET = '{budget}';
  const START_DATE = '{startDate}';
  const END_DATE = '{endDate}';
  const OD_FLAG = '{odFlag}';
  const REQUIRED_FLAG = '{requiredFlag}';
  const RECURRING_FLAG = '{recurringFlag}';
  const IS_INACTIVE = '{isInactive}';
  const ACCESSIBLE_BY = '{accessibleBy}';
  const CATEGORIES = [];

  const HITS = 0;

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

  const TRAINING_URL_DATA = {
    id: URL,
    category: CATEGORY,
    hits: HITS,
  };

  let databaseModify;

  beforeEach(() => {
    databaseModify = new DatabaseModify('expenses');
    databaseModify.tableName = `${STAGE}-expenses`;
  });

  describe('addToDB', () => {

    let newDyanmoObj;

    beforeEach(() => {
      newDyanmoObj = new Expense(EXPENSE_DATA);
    });

    afterEach(() => {
      AWS.restore();
    });

    describe('when successfully adds object to dynamo', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
          callback(null, {
            Data: newDyanmoObj
          });
        });
      });

      it('should return the added object', done => {
        databaseModify.addToDB(newDyanmoObj)
          .then(data => {
            expect(data).toEqual(newDyanmoObj);
            done();
          });
      }); // should return the added object
    }); // when successfully adds object to dynamo

    describe('when object is undefined', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find object to add to database.'
        };
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.addToDB(undefined)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when object is undefined

    describe('when fails to put object in dynamo', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to put object in database.'
        };

        AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
          callback(err);
        });
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.addToDB(newDyanmoObj)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to put object in dynamo
  }); // addToDB

  describe('_buildBudgetUpdateParams', () => {

    let objToUpdate = new Budget(BUDGET_DATA);

    beforeEach(() => {
      spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' });
    });

    afterEach(() => {
      expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate);
    });

    it('should return the appropriate params', () => {
      expect(databaseModify._buildBudgetUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-budgets',
        Key: {
          id: '{id}'
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildBudgetUpdateParams

  describe('_buildEmployeeUpdateParams', () => {

    let objToUpdate = new Employee(EMPLOYEE_DATA);

    beforeEach(() => {
      spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' });
    });

    afterEach(() => {
      expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate);
    });

    it('should return the appropriate params', () => {
      expect(databaseModify._buildEmployeeUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-employees',
        Key: {
          id: '{id}'
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildEmployeeUpdateParams

  describe('_buildExpenseTypeUpdateParams', () => {

    let objToUpdate = new ExpenseType(EXPENSE_TYPE_DATA);

    beforeEach(() => {
      spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' });
    });

    afterEach(() => {
      expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate);
    });

    it('should return the appropriate params', () => {
      expect(databaseModify._buildExpenseTypeUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-expense-types',
        Key: {
          id: '{id}'
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildExpenseTypeUpdateParams

  describe('_buildExpenseUpdateParams', () => {

    let objToUpdate = new Expense(EXPENSE_DATA);

    beforeEach(() => {
      spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' });
    });

    afterEach(() => {
      expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate);
    });

    it('should return the appropriate params', () => {
      expect(databaseModify._buildExpenseUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-expenses',
        Key: {
          id: '{id}'
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildExpenseUpdateParams

  describe('_buildExpression', () => {

    let data;

    describe('when data is an expense with a url', () => {

      let expectedExpressionAttributeValues, expectedUpdateExpression, expectedExpressionAttributeNames;

      beforeEach(() => {
        data = new Expense(EXPENSE_DATA);

        expectedExpressionAttributeValues = {
          ':a': '{purchaseDate}',
          ':b': '{reimbursedDate}',
          ':c': '{note}',
          ':d': '{url}',
          ':e': '{createdAt}',
          ':f': '{receipt}',
          ':g': 0,
          ':h': '{description}',
          ':i': '{id}',
          ':j': '{id}',
          ':k': '{category}'
        };

        expectedUpdateExpression = 'set'
          + ' purchaseDate = :a,'
          + 'reimbursedDate = :b,'
          + 'note = :c,'
          + '#url = :d,'
          + 'createdAt = :e,'
          + 'receipt = :f,'
          + 'cost = :g,'
          + 'description = :h,'
          + 'employeeId = :i,'
          + 'expenseTypeId = :j,'
          + 'category = :k';

        expectedExpressionAttributeNames = { '#url': 'url' };
      });

      it('should handle the special case with the url', () => {
        expect(databaseModify._buildExpression(data)).toEqual({
          ExpressionAttributeValues: expectedExpressionAttributeValues,
          UpdateExpression: expectedUpdateExpression,
          ExpressionAttributeNames: expectedExpressionAttributeNames
        });
      }); // should handle the special case with the url
    }); // when data is an expense with a url

    describe('when data is an expense with null values', () => {

      let expectedExpressionAttributeValues, expectedUpdateExpression;

      beforeEach(() => {
        data = {
          id: ID,
          purchaseDate: PURCHASE_DATE,
          reimbursedDate: null,
          note: null,
          url: null,
          createdAt: CREATED_AT,
          receipt: null,
          cost: COST,
          description: DESCRIPTION,
          employeeId: ID,
          expenseTypeId: ID,
          category: null
        };

        expectedExpressionAttributeValues = {
          ':a': '{purchaseDate}',
          ':e': '{createdAt}',
          ':g': 0,
          ':h': '{description}',
          ':i': '{id}',
          ':j': '{id}',
        };

        expectedUpdateExpression = 'set'
          + ' purchaseDate = :a,'
          + 'createdAt = :e,'
          + 'cost = :g,'
          + 'description = :h,'
          + 'employeeId = :i,'
          + 'expenseTypeId = :j';
      });

      it('should only handle the defined attributes', () => {
        expect(databaseModify._buildExpression(data)).toEqual({
          ExpressionAttributeValues: expectedExpressionAttributeValues,
          UpdateExpression: expectedUpdateExpression,
        });
      }); // should only handle the defined attributes
    }); // when data is an expense with null values

    describe('when data is a training url', () => {

      let expectedExpressionAttributeValues, expectedUpdateExpression;

      beforeEach(() => {
        data = new TrainingUrl(TRAINING_URL_DATA);

        expectedExpressionAttributeValues = {
          ':a': 0,
          ':b': ' ',
          ':c': ' ',
          ':d': ' ',
          ':e': ' ',
          ':f': ' '
        };

        expectedUpdateExpression = 'set'
          + ' hits = :a,'
          + 'title = :b,'
          + 'description = :c,'
          + 'image = :d,'
          + 'logo = :e,'
          + 'publisher = :f';
      });

      it('should omit id and category', () => {
        expect(databaseModify._buildExpression(data)).toEqual({
          ExpressionAttributeValues: expectedExpressionAttributeValues,
          UpdateExpression: expectedUpdateExpression
        });
      }); // should omit id and category
    }); // when data is a training url
  }); // _buildExpression

  describe('_buildTrainingUrlUpdateParams', () => {

    let objToUpdate = new TrainingUrl(TRAINING_URL_DATA);

    beforeEach(() => {
      spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' });
    });

    afterEach(() => {
      expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate);
    });

    it('should return the appropriate params', () => {
      expect(databaseModify._buildTrainingUrlUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-training-urls',
        Key: {
          id: '{url}',
          category: '{category}'
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildTrainingUrlUpdateParams

  describe('_buildUpdateParams', () => {

    let objToUpdate;

    describe('when updating expenses table', () => {

      beforeEach(() => {
        objToUpdate = new Expense(EXPENSE_DATA);
        databaseModify.tableName = `${STAGE}-expenses`;
        spyOn(databaseModify, '_buildExpenseUpdateParams').and.returnValue('{updateParams}');
      });

      afterEach(() => {
        expect(databaseModify._buildExpenseUpdateParams).toHaveBeenCalledWith(objToUpdate);
      });

      it('should return the update params', () => {
        expect(databaseModify._buildUpdateParams(objToUpdate)).toEqual('{updateParams}');
      }); // should return the update param
    }); // when updating expenses table

    describe('when updating employees table', () => {

      beforeEach(() => {
        objToUpdate = new Employee(EMPLOYEE_DATA);
        databaseModify.tableName = `${STAGE}-employees`;
        spyOn(databaseModify, '_buildEmployeeUpdateParams').and.returnValue('{updateParams}');
      });

      afterEach(() => {
        expect(databaseModify._buildEmployeeUpdateParams).toHaveBeenCalledWith(objToUpdate);
      });

      it('should return the update params', () => {
        expect(databaseModify._buildUpdateParams(objToUpdate)).toEqual('{updateParams}');
      }); // should return the update param
    }); // when updating employees table

    describe('when updating expense types table', () => {

      beforeEach(() => {
        objToUpdate = new ExpenseType(EXPENSE_TYPE_DATA);
        databaseModify.tableName = `${STAGE}-expense-types`;
        spyOn(databaseModify, '_buildExpenseTypeUpdateParams').and.returnValue('{updateParams}');
      });

      afterEach(() => {
        expect(databaseModify._buildExpenseTypeUpdateParams).toHaveBeenCalledWith(objToUpdate);
      });

      it('should return the update params', () => {
        expect(databaseModify._buildUpdateParams(objToUpdate)).toEqual('{updateParams}');
      }); // should return the update param
    }); // when updating expense types table

    describe('when updating budgets table', () => {

      beforeEach(() => {
        objToUpdate = new Budget(BUDGET_DATA);
        databaseModify.tableName = `${STAGE}-budgets`;
        spyOn(databaseModify, '_buildBudgetUpdateParams').and.returnValue('{updateParams}');
      });

      afterEach(() => {
        expect(databaseModify._buildBudgetUpdateParams).toHaveBeenCalledWith(objToUpdate);
      });

      it('should return the update params', () => {
        expect(databaseModify._buildUpdateParams(objToUpdate)).toEqual('{updateParams}');
      }); // should return the update param
    }); // when updating budgets table

    describe('when updating training urls table', () => {

      beforeEach(() => {
        objToUpdate = new TrainingUrl(TRAINING_URL_DATA);
        databaseModify.tableName = `${STAGE}-training-urls`;
        spyOn(databaseModify, '_buildTrainingUrlUpdateParams').and.returnValue('{updateParams}');
      });

      afterEach(() => {
        expect(databaseModify._buildTrainingUrlUpdateParams).toHaveBeenCalledWith(objToUpdate);
      });

      it('should return the update params', () => {
        expect(databaseModify._buildUpdateParams(objToUpdate)).toEqual('{updateParams}');
      }); // should return the update param
    }); // when updating training urls table
  }); // _buildUpdateParams

  describe('getAllEntriesInDB', () => {

    afterEach(() => {
      AWS.restore();
    });

    describe('when successfully scans all entries in table', () => {

      let items;

      beforeEach(() => {
        items = ['a', 'b', 'c'];

        AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
          callback(null, {
            Items: items
          });
        });
      });

      it('should return all the entries scanned', () => {
        databaseModify.getAllEntriesInDB()
          .then(data => {
            expect(data).toEqual(items);
          });
      }); // should return all the entries scanned
    }); // when successfully scans all entries in table

    describe('when fails to scan all entries in table', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to scan entries from database.'
        };

        AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
          callback(err);
        });
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.getAllEntriesInDB()
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to scan all entries in table
  }); // getAllEntriesInDB

  describe('getEntry', () => {

    describe('when successfully gets an entry and one entry is read from database', () => {

      let entries;

      beforeEach(() => {
        entries = ['entry1'];
        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.resolve(entries));
      });

      it('should return the entry obtained', done => {
        databaseModify.getEntry(ID)
          .then(data => {
            expect(data).toEqual('entry1');
            expect(databaseModify._readFromDB).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return the entry obtained
    }); // when successfully gets an entry and one entry is read from database

    describe('when successfully gets an entry and multiple entries are read from database', () => {

      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];
        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.resolve(entries));
      });

      it('should return the entry obtained', done => {
        databaseModify.getEntry(ID)
          .then(data => {
            expect(data).toEqual('entry1');
            expect(databaseModify._readFromDB).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return the entry obtained
    }); // when successfully gets an entry and multiple entries are read from database

    describe('when successful reads entries but no entries were found', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Entry not found in database'
        };

        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.resolve([]));
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.getEntry(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify._readFromDB).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when successful reads entries but no entries were found

    describe('when fails to read entries from database', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries from database.'
        };

        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.getEntry(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify._readFromDB).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read entries from database
  }); // getEntry

  describe('getEntryUrl', () => {

    describe('when successfully gets an entry and one entry is read from database', () => {

      let entries;

      beforeEach(() => {
        entries = ['entry1'];
        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.resolve(entries));
      });

      it('should return the entry obtained', done => {
        databaseModify.getEntryUrl(ID, CATEGORY)
          .then(data => {
            expect(data).toEqual('entry1');
            expect(databaseModify._readFromDBUrl).toHaveBeenCalledWith(ID, CATEGORY);
            done();
          });
      }); // should return the entry obtained
    }); // when successfully gets an entry and one entry is read from database

    describe('when successfully gets an entry and multiple entries are read from database', () => {

      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];
        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.resolve(entries));
      });

      it('should return the entry obtained', done => {
        databaseModify.getEntryUrl(ID, CATEGORY)
          .then(data => {
            expect(data).toEqual('entry1');
            expect(databaseModify._readFromDBUrl).toHaveBeenCalledWith(ID, CATEGORY);
            done();
          });
      }); // should return the entry obtained
    }); // when successfully gets an entry and multiple entries are read from database

    describe('when successful reads entries but no entries were found', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Entry not found in database'
        };

        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.resolve([]));
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.getEntryUrl(ID, CATEGORY)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify._readFromDBUrl).toHaveBeenCalledWith(ID, CATEGORY);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when successful reads entries but no entries were found

    describe('when fails to read entries from database', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries from database.'
        };

        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.getEntryUrl(ID, CATEGORY)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            expect(databaseModify._readFromDBUrl).toHaveBeenCalledWith(ID, CATEGORY);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read entries from database
  }); // getEntryUrl

  describe('querySecondaryIndexInDB', () => {

    let secondaryIndex, queryKey, queryParam;

    beforeEach(() => {
      secondaryIndex = 'expenseTypeId-index';
      queryKey = 'expenseTypeId';
      queryParam = '00000000-0000-0000-0000-000000000000';
    });

    afterEach(() => {
      AWS.restore();
    });

    describe('when successfully queries index from database', () => {

      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];

        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: entries
          });
        });
      });

      it('should return the entires queried', done => {
        databaseModify.querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam)
          .then(data => {
            expect(data).toEqual(entries);
            done();
          });
      });
    }); // when successfully queries index from database

    describe('when fails to query index from database', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query index from database.'
        };

        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(err);
        });
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to query index from database
  }); // querySecondaryIndexInDB

  describe('queryWithTwoIndexesInDB', () => {

    let employeeId, expenseTypeId;

    beforeEach(() => {
      employeeId = ID;
      expenseTypeId = ID;
    });

    afterEach(() => {
      AWS.restore();
    });

    describe('when successfully queries index from database', () => {

      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];

        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: entries
          });
        });
      });

      it('should return the entires queried', done => {
        databaseModify.queryWithTwoIndexesInDB(employeeId, expenseTypeId)
          .then(data => {
            expect(data).toEqual(entries);
            done();
          });
      });
    }); // when successfully queries index from database

    describe('when fails to query index from database', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query index from database.'
        };

        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(err);
        });
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.queryWithTwoIndexesInDB(employeeId, expenseTypeId)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to query index from database
  }); // queryWithTwoIndexesInDB

  describe('_readFromDB', () => {

    afterEach(() => {
      AWS.restore();
    });

    describe('when successfully reads entries from database', () => {

      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];

        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: entries
          });
        });
      });

      it('should return the entries read', () => {
        databaseModify._readFromDB(ID)
          .then(data => {
            expect(data).toEqual(entries);
          });
      }); // should return the entries read
    }); // when successfully reads entries from database

    describe('when fails to read entries from database', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries from database.'
        };

        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(err);
        });
      });

      it('should return a 404 rejected promise', done => {
        databaseModify._readFromDB(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read entries from database
  }); // _readFromDB

  describe('_readFromDBUrl', () => {

    afterEach(() => {
      AWS.restore();
    });

    describe('when successfully reads entries from database', () => {

      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];

        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: entries
          });
        });
      });

      it('should return the entries read', () => {
        databaseModify._readFromDBUrl(ID, CATEGORY)
          .then(data => {
            expect(data).toEqual(entries);
          });
      }); // should return the entries read
    }); // when successfully reads entries from database

    describe('when fails to read entries from database', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries from database.'
        };

        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(err);
        });
      });

      it('should return a 404 rejected promise', done => {
        databaseModify._readFromDBUrl(ID, CATEGORY)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read entries from database
  }); // _readFromDBUrl

  describe('removeFromDB', () => {

    afterEach(() => {
      AWS.restore();
    });

    describe('when successfully removes entry from database', () => {

      let deletedObject;

      beforeEach(() => {
        deletedObject = new Expense(EXPENSE_DATA);

        AWS.mock('DynamoDB.DocumentClient', 'delete', Promise.resolve({Attributes: deletedObject}));
      });

      it('should return the deleted object', done => {
        databaseModify.removeFromDB(ID)
          .then(data => {
            expect(data).toEqual(deletedObject);
            done();
          });
      });
    }); // when successfully removes entry from database

    describe('when fails to remove entry from database', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          messge: 'Failed to delete entry from database.'
        };

        AWS.mock('DynamoDB.DocumentClient', 'delete', Promise.reject(err));
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.removeFromDB(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return 404 rejected promise
    }); // when fails to remove entry from database
  }); // removeFromDB

  describe('updateEntryInDB', () => {

    let newDyanmoObj;

    beforeEach(() => {
      newDyanmoObj = new Expense(EXPENSE_DATA);
    });

    afterEach(() => {
      AWS.restore();
    });

    describe('when successfully updates entry in database', () => {

      beforeEach(() => {
        spyOn(databaseModify, '_buildUpdateParams').and.returnValue('{updateParams}');
        AWS.mock('DynamoDB.DocumentClient', 'update', function(params, callback) {
          callback(null, {
            Attributes: newDyanmoObj
          });
        });
      });

      it('should return the updated object', done => {
        databaseModify.updateEntryInDB(newDyanmoObj)
          .then(data => {
            expect(data).toEqual(newDyanmoObj);
            done();
          });
      });
    }); // when successfully updates entry in database

    describe('when fails to update entry in database', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 404,
          messge: 'Failed to update entry in database.'
        };

        spyOn(databaseModify, '_buildUpdateParams').and.returnValue('{updateParams}');
        AWS.mock('DynamoDB.DocumentClient', 'update', function(params, callback) {
          callback(err);
        });
      });

      it('should return a 404 rejected promise', done => {
        databaseModify.updateEntryInDB(newDyanmoObj)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch(error => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return 404 rejected promise
    }); // when fails to update entry in database
  }); // updateEntryInDB
}); // databaseModify
