const databaseModifyClass = require('../../js/databaseModify');
const _ = require('lodash');

const AWS = require('aws-sdk-mock');

describe('databaseModify', () => {
  let databaseModify;

  beforeEach(() => {
    databaseModify = new databaseModifyClass('employee.json');
  });

  describe('_buildBudgetUpdateParams', () => {

    let objToUpdate = '{objToUpdate}';

    beforeEach(() => spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' }));

    afterEach(() => expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate));

    it('should return the appropriate params', () => {
      expect(databaseModify._buildBudgetUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-budgets',
        Key: {
          id: objToUpdate.id
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildBudgetUpdateParams

  describe('_buildEmployeeUpdateParams', () => {

    let objToUpdate = '{objToUpdate}';

    beforeEach(() => spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' }));

    afterEach(() => expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate));
    it('should return the appropriate params', () => {
      expect(databaseModify._buildEmployeeUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-employees',
        Key: {
          id: objToUpdate.id
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildEmployeeUpdateParams

  describe('_buildExpenseTypeUpdateParams', () => {

    let objToUpdate = '{objToUpdate}';

    beforeEach(() => spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' }));

    afterEach(() => expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate));

    it('should return the appropriate params', () => {
      expect(databaseModify._buildExpenseTypeUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-expense-types',
        Key: {
          id: objToUpdate.id
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildExpenseTypeUpdateParams

  describe('_buildExpenseUpdateParams', () => {

    let objToUpdate = '{objToUpdate}';

    beforeEach(() => spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' }));

    afterEach(() => expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate));

    it('should return the appropriate params', () => {
      expect(databaseModify._buildExpenseUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-expenses',
        Key: {
          id: objToUpdate.id
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildExpenseUpdateParams

  describe('_buildExpression', () => {

    let data;

    beforeEach(() => {
      data = '{data}';
    });

    describe('when data has an id attribute', () => {

      beforeEach(() =>
        (data = {
          id: 'id',
          something: 'something',
          somethingElse: 'something else',
          lastThing: 'last thing'
        })
      );

      it('should ignore the id attribute', () => {
        expect(databaseModify._buildExpression(data)).toEqual({
          ExpressionAttributeValues: {
            ':a': 'something',
            ':b': 'something else',
            ':c': 'last thing'
          },
          UpdateExpression: 'set something = :a,somethingElse = :b,lastThing = :c'
        });
      });
    }); // when data has an id attribute

    describe('when data has a url attribute', () => {

      beforeEach(() =>
        (data = {
          id: 'id',
          something: 'something',
          somethingElse: 'something else',
          lastThing: 'last thing',
          url: 'url'
        })
      );

      it('should ignore handle the special case with the url', () => {
        expect(databaseModify._buildExpression(data)).toEqual({
          ExpressionAttributeValues: {
            ':a': 'something',
            ':b': 'something else',
            ':c': 'last thing',
            ':d': 'url'
          },
          UpdateExpression: 'set something = :a,somethingElse = :b,lastThing = :c,#url = :d',
          ExpressionAttributeNames: { '#url': 'url' }
        });
      });
    }); // when data has a url attribute

    describe('when data does not have an id or url attribute', () => {

      beforeEach(() =>
        (data = {
          id: 'id',
          something: null
        })
      );

      it('should not build attribute values or names', () => {
        expect(databaseModify._buildExpression(data)).toEqual({
          ExpressionAttributeValues: {},
          UpdateExpression: 'set '
        });
      }); // should not build attribute values or names
    }); // when data does not have an id or url attribute
  }); // _buildExpression

  describe('_buildTrainingUrlUpdateParams', () => {

    let objToUpdate = '{objToUpdate}';

    beforeEach(() => spyOn(databaseModify, '_buildExpression').and.returnValue({ expression: '{expression}' }));

    afterEach(() => expect(databaseModify._buildExpression).toHaveBeenCalledWith(objToUpdate));

    it('should return the appropriate params', () => {
      expect(databaseModify._buildTrainingUrlUpdateParams(objToUpdate)).toEqual({
        TableName: 'dev-training-urls',
        Key: {
          id: objToUpdate.id,
          category: objToUpdate.category
        },
        ReturnValues: 'ALL_NEW',
        expression: '{expression}'
      });
    });
  }); // _buildTrainingUrlUpdateParams

  describe('addToDB', () => {

    let newJsonObj;

    beforeEach(
      () =>
        (newJsonObj = {
          id: '{id}'
        })
    );

    describe('when there is an error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
          callback({
            message: 'error'
          });
        });
      });

      it('should return a failed promise', done => {
        return databaseModify.addToDB(newJsonObj).catch(function(err) {
          expect(err).toEqual({
            message: 'error'
          });
          done();
        });
      });
    }); //when there is an error

    describe('when there is no error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'put', function(params, callback) {
          callback(null, {
            Data: 'data'
          });
        });
      });

      it('should return a successful promise with the object that was inserted', done => {
        return databaseModify.addToDB(newJsonObj).then(function(data) {
          expect(data).toEqual(newJsonObj);
          done();
        });
      });
    }); //when there is no error

    describe('when the newJsonObj is undefined', () => {

      it('should throw a 406 error with related message', () => {
        return databaseModify.addToDB(undefined).catch(function(err) {
          expect(err).toEqual({
            code: 406,
            message: 'ADD: Object already in system'
          });
        });
      });
    }); //when the newJsonObj is undefined

    afterEach(() => {
      AWS.restore();
    });
  }); // addToDB

  describe('buildExpressionAttributeValues', () => {

    let objToUpdate;

    describe ('default call', () => {

      beforeEach(() => {
        objToUpdate = '{objToUpdate}';
        spyOn(_, 'pickBy').and.returnValue('result');
      });

      afterEach(() => {
        expect(_.pickBy).toHaveBeenCalledWith(
          {
            ':pd': objToUpdate.purchaseDate,
            ':rd': objToUpdate.reimbursedDate,
            ':c': objToUpdate.cost,
            ':d': objToUpdate.description,
            ':n': objToUpdate.note,
            ':r': objToUpdate.receipt,
            ':eti': objToUpdate.expenseTypeId,
            ':ei': objToUpdate.employeeId,
            ':cat': objToUpdate.createdAt,
            ':rurl': objToUpdate.url,
            ':cate': objToUpdate.category
          },
          _.identity
        );
      });

      it('should return result', () => {
        expect(databaseModify.buildExpressionAttributeValues(objToUpdate)).toEqual('result');
      }); // should return result
    }); // default call

    describe('when there are no undefined values', () => {
      beforeEach(() => {
        objToUpdate = {
          purchaseDate: 'my purchase date'
        };
      });

      it('should return the appropriate object', () => {
        expect(databaseModify.buildExpressionAttributeValues(objToUpdate)).toEqual({
          ':pd': 'my purchase date'
        });
      });
    }); // when there are no undefined values

    describe('when there are undefined values', () => {
      beforeEach(() => {
        objToUpdate = {
          purchaseDate: 'my purchase date',
          reimbursedDate: undefined
        };
      });

      it('should return the appropriate object', () => {
        expect(databaseModify.buildExpressionAttributeValues(objToUpdate)).toEqual({
          ':pd': 'my purchase date'
        });
      });
    }); // when there are undefined values
  }); // buildExpressionAttributeValues

  describe('buildUpdateParams', () => {

    let objToUpdate;

    beforeEach(() => {
      objToUpdate = '{objToUpdate}';
      spyOn(databaseModify, '_buildExpenseUpdateParams').and.returnValue('{expenseParams}');
      spyOn(databaseModify, '_buildEmployeeUpdateParams').and.returnValue('{employeeParams}');
      spyOn(databaseModify, '_buildExpenseTypeUpdateParams').and.returnValue('{expenseTypeParams}');
      spyOn(databaseModify, '_buildBudgetUpdateParams').and.returnValue('{budgetParams}');
      spyOn(databaseModify, '_buildTrainingUrlUpdateParams').and.returnValue('{trainingUrlParams}');
    });

    describe('when this.tableName is dev-expenses', () => {

      beforeEach(() => (databaseModify.tableName = 'dev-expenses'));
      afterEach(() => {
        expect(databaseModify._buildExpenseUpdateParams).toHaveBeenCalledWith(objToUpdate);
        expect(databaseModify._buildEmployeeUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildExpenseTypeUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildBudgetUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildTrainingUrlUpdateParams).not.toHaveBeenCalled();
      });

      it('should return {expenseParams}', () => {
        expect(databaseModify.buildUpdateParams(objToUpdate)).toEqual('{expenseParams}');
      });
    }); // when this.tableName is dev-expenses

    describe('when this.tableName is dev-employees', () => {

      beforeEach(() => (databaseModify.tableName = 'dev-employees'));

      afterEach(() => {
        expect(databaseModify._buildExpenseUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildEmployeeUpdateParams).toHaveBeenCalledWith(objToUpdate);
        expect(databaseModify._buildExpenseTypeUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildBudgetUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildTrainingUrlUpdateParams).not.toHaveBeenCalled();
      });

      it('should return {employeeParams}', () => {
        expect(databaseModify.buildUpdateParams(objToUpdate)).toEqual('{employeeParams}');
      });
    }); // when this.tableName is dev-employees

    describe('when this.tableName is dev-expense-types', () => {

      beforeEach(() => (databaseModify.tableName = 'dev-expense-types'));

      afterEach(() => {
        expect(databaseModify._buildExpenseUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildEmployeeUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildExpenseTypeUpdateParams).toHaveBeenCalledWith(objToUpdate);
        expect(databaseModify._buildBudgetUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildTrainingUrlUpdateParams).not.toHaveBeenCalled();
      });

      it('should return {expenseTypeParams}', () => {
        expect(databaseModify.buildUpdateParams(objToUpdate)).toEqual('{expenseTypeParams}');
      });
    }); // when this.tableName is dev-expense-types

    describe('when this.tableName is dev-budgets', () => {

      beforeEach(() => (databaseModify.tableName = 'dev-budgets'));

      afterEach(() => {
        expect(databaseModify._buildExpenseUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildEmployeeUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildExpenseTypeUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildBudgetUpdateParams).toHaveBeenCalledWith(objToUpdate);
        expect(databaseModify._buildTrainingUrlUpdateParams).not.toHaveBeenCalled();
      });

      it('should return {budgetParams}', () => {
        expect(databaseModify.buildUpdateParams(objToUpdate)).toEqual('{budgetParams}');
      });
    }); // when this.tableName is dev-budgets

    describe('when this.tableName is dev-training-urls', () => {

      beforeEach(() => (databaseModify.tableName = 'dev-training-urls'));

      afterEach(() => {
        expect(databaseModify._buildExpenseUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildEmployeeUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildExpenseTypeUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildBudgetUpdateParams).not.toHaveBeenCalled();
        expect(databaseModify._buildTrainingUrlUpdateParams).toHaveBeenCalledWith(objToUpdate);
      });

      it('should return {trainingUrlParams}', () => {
        expect(databaseModify.buildUpdateParams(objToUpdate)).toEqual('{trainingUrlParams}');
      });
    }); // when this.tableName is dev-training-urls
  }); // buildUpdateParams

  describe('findObjectInDB', () => {

    let primaryKey;

    beforeEach(() => (primaryKey = '{primaryKey}'));

    describe('when entry is read in the database and data is not empty', () => {

      //Create a spy that returns
      beforeEach(() => {
        spyOn(databaseModify, 'readFromDB').and.returnValue(Promise.resolve(['Successfully found object in database']));
      });

      it('should return a resolved promise and the found object', done => {
        databaseModify.findObjectInDB(primaryKey).then(data => {
          expect(data).toEqual('Successfully found object in database');
          done();
        });
      });
    }); //when entry is read in the database and data is not empty

    describe('when entry is read in the database but data is empty', () => {

      //Create a spy that returns
      beforeEach(() => {
        spyOn(databaseModify, 'readFromDB').and.returnValue(Promise.resolve([]));
      });

      it('should return a rejected promise with a reason', done => {
        databaseModify.findObjectInDB(primaryKey).catch(err => {
          expect(err).toEqual({code: 404, message: 'Entry not found in database'});
          done();
        });
      }); // should return a rejected promise with a reason
    }); // when entry is read in the database but data is empty

    describe('when entry is not read in the database', () => {

      beforeEach(() => {
        spyOn(databaseModify, 'readFromDB').and.returnValue(Promise.reject('object not found in database'));
      });

      it('should return a rejected promise with a reason', done => {
        databaseModify.findObjectInDB(primaryKey).catch(err => {
          expect(err).toEqual('object not found in database');
          done();
        });
      });
    }); // when entry is not in the database
  }); // findObjectInDB

  describe('getAllEntriesInDB', () => {
    // let newJsonObj;
    // beforeEach(
    //     () =>
    //         (newJsonObj = {
    //             id: '{id}'
    //         })
    // ); add expect for newJsonObj

    describe('when there is an error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
          callback({
            message: 'error'
          });
        });
      });

      it('should return a failed promise', done => {
        return databaseModify.getAllEntriesInDB().catch(function(err) {
          expect(err).toEqual({
            message: 'error'
          });
          done();
        });
      });
    }); //when there is an error

    describe('when there is no error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'scan', function(params, callback) {
          callback(null, {
            Items: ['a', 'b', 'c']
          });
        });
      });

      it('should return a successful promise with the object that was inserted', done => {
        return databaseModify.getAllEntriesInDB().then(function(data) {
          expect(data).toEqual(['a', 'b', 'c']);
          done();
        });
      });
    }); //when there is no error

    afterEach(() => {
      AWS.restore();
    });
  }); // getAllEntriesInDB

  describe('querySecondaryIndexInDB', () => {

    let secondaryIndex, queryKey, queryParam;

    beforeEach(() => {
      secondaryIndex = 'employeeId-index';
      queryKey = 'employeeId';
      queryParam = 'employeeId';
    });

    describe('when AWS returns a query with items', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: ['data0, data1, data2']
          });
        });
      });

      it('should return a resolved promise of queried items', done => {
        databaseModify.querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam).then( data => {
          expect(data).toEqual(['data0, data1, data2']);
          done();
        });
      }); // should return a resolved promise of queried items
    }); // when AWS returns a query with items

    describe('when AWS returns an error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback({
            message: 'AWS error'
          });
        });
      });

      it('should return the error given by AWS', done => {
        databaseModify.querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam).catch(function(err) {
          expect(err).toEqual({ message: 'AWS error' });
          done();
        });
      }); // should return the error given by AWS
    }); // when AWS returns an error

    afterEach(() => {
      AWS.restore();
    });
  }); // querySecondaryIndexInDB

  describe('queryWithTwoIndexesInDB', () => {

    let employeeId, expenseTypeId;

    beforeEach(() => {
      employeeId = 'employeeId';
      expenseTypeId = 'expenseTypeId';
    });

    describe('when AWS returns a query with items', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: ['data0, data1, data2']
          });
        });
      });

      it('should return a resolved promise of queried items', done => {
        databaseModify.queryWithTwoIndexesInDB(employeeId, expenseTypeId).then( data => {
          expect(data).toEqual(['data0, data1, data2']);
          done();
        });
      }); // should return a resolved promise of queried items
    }); // when AWS returns a query with items

    describe('when AWS returns a query with no items', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: []
          });
        });
      });

      it('should return a resolved promise of queried items', done => {
        databaseModify.queryWithTwoIndexesInDB(employeeId, expenseTypeId).then( data => {
          expect(data).toEqual(null);
          done();
        });
      }); // should return a resolved promise of queried items
    }); // when AWS returns a query with no items

    describe('when AWS returns an error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback({
            message: 'AWS error'
          });
        });
      });

      it('should return the error given by AWS', done => {
        databaseModify.queryWithTwoIndexesInDB(employeeId, expenseTypeId).catch(function(err) {
          expect(err).toEqual({ message: 'AWS error' });
          done();
        });
      }); // should return the error given by AWS
    }); // when AWS returns an error

    afterEach(() => {
      AWS.restore();
    });
  }); // queryWithTwoIndexesInDB

  describe('readFromDB', () => {

    let passedID;

    beforeEach(() => (passedID = '{passedID}'));

    describe('When AWS returns at least one item', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: ['data0, data1, data2']
          });
        });
      });

      it('Should return a resolved promise with the collection matching the query', done => {
        return databaseModify.readFromDB(passedID).then(function(data) {
          expect(data).toEqual(['data0, data1, data2']);
          done();
        });
      });
    }); //When AWS returns at least one item

    describe('When AWS returns an empty collection', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: []
          });
        });
      });

      it('Should return a rejected promise with a 404 status code', done => {
        return databaseModify.readFromDB(passedID).catch(function(err) {
          expect(err).toEqual({
            code: 404,
            message: 'Item not found'
          });
          done();
        });
      });
    }); //When AWS returns an empty collection

    describe('When AWS returns an error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback({
            message: 'AWS error'
          });
        });
      });

      it('should return the error given by aws', done => {
        return databaseModify.readFromDB(passedID).catch(function(err) {
          expect(err).toEqual({
            message: 'AWS error'
          });
          done();
        });
      });
    }); //When AWS returns an error

    afterEach(() => {
      AWS.restore();
    });
  }); // readFromDB

  describe('readFromDBURL', () => {

    let passedID, category;

    beforeEach(() => {
      passedID = 'https://google.com';
      category = 'alpha';
    });

    describe('when AWS returns a query with items', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: ['data']
          });
        });
      });

      it('should return a resolved promise of queried item', done => {
        databaseModify.readFromDBURL(passedID, category).then( data => {
          expect(data).toEqual(['data']);
          done();
        });
      }); // should return a resolved promise of queried item
    }); // when AWS returns a query with items

    describe('when AWS returns an error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback({
            message: 'AWS error'
          });
        });
      });

      it('should return the error given by AWS', done => {
        databaseModify.readFromDBURL(passedID, category).catch(function(err) {
          expect(err).toEqual({ message: 'AWS error' });
          done();
        });
      }); // should return the error given by AWS
    }); // when AWS returns an error

    describe('when DocumentClient has no items', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'query', function(params, callback) {
          callback(null, {
            Items: []
          });
        });
      });

      it('should return null', () => {
        databaseModify.readFromDBURL(passedID, category).catch( err => {
          expect(err).toEqual(null);
        });
      }); // should return null
    }); // when DocumentClient has no items

    afterEach(() => {
      AWS.restore();
    });
  }); // readFromDBURL

  describe('removeFromDB', () => {

    let passedID;

    beforeEach(() => (passedID = '{passedID}'));

    describe('when an item is successfully removed', () => {

      beforeEach(() => {
        AWS.mock(
          'DynamoDB.DocumentClient',
          'delete',
          Promise.resolve({
            Attributes: 'Hello'
          })
        );
      });

      it('should return data returned from AWS', done => {
        databaseModify.removeFromDB(passedID).then(function(data) {
          expect(data).toEqual('Hello');
          done();
        });
      }); //should return data returned from AWS
    }); //when an item is successfully removed

    describe('when an error is returned from Dynamo', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'delete', Promise.reject('error'));
      });

      it('should throw the error returned from AWS', done => {
        databaseModify.removeFromDB(passedID).catch(function(err) {
          expect(err).toEqual('error');
          done();
        });
      }); //should throw the error returned from AWS
    }); //when an error is returned from Dynamo

    afterEach(() => {
      AWS.restore();
    });
  }); // removeFromDB

  describe('updateEntryInDB', () => {

    let newJsonObj;

    beforeEach(
      () =>
        (newJsonObj = {
          id: '{id}'
        })
    );

    describe('when there is an error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'update', function(params, callback) {
          callback({
            message: 'error'
          });
        });
      });

      it('should return a failed promise', done => {
        return databaseModify.updateEntryInDB(newJsonObj).catch(function(err) {
          expect(err).toEqual({
            message: 'error'
          });
          done();
        });
      });
    }); //when there is an error

    describe('when there is no error', () => {

      beforeEach(() => {
        AWS.mock('DynamoDB.DocumentClient', 'update', function(params, callback) {
          callback(null, {
            Attributes: {
              id: '{id}'
            }
          });
        });
      });

      it('should return a successful promise with the object that was inserted', done => {
        return databaseModify.updateEntryInDB(newJsonObj).then(function(data) {
          expect(data).toEqual(newJsonObj);
          done();
        });
      });
    }); //when there is no error

    afterEach(() => {
      AWS.restore();
    });
  }); // updateEntryInDB
}); // databaseModify
