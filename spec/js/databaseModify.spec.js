const databaseModifyClass = require('../../js/databaseModify');
const _ = require('lodash');

const AWS = require('aws-sdk-mock');

xdescribe('databaseModify', () => {
  let databaseModify;
  beforeEach(() => {
    databaseModify = new databaseModifyClass('employee.json');
  });

  describe('buildExpressionAttributeValues', () => {
    let objToUpdate;

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
          ':ui': objToUpdate.userId,
          ':cat': objToUpdate.createdAt,
          ':rurl': objToUpdate.url,
          ':cate': objToUpdate.categories
        },
        _.identity
      );
    });

    it('should return result', () => {
      expect(databaseModify.buildExpressionAttributeValues(objToUpdate)).toEqual('result');
    });
  }); // buildExpressionAttributeValues

  describe('buildExpressionAttributeValues', () => {
    let objToUpdate;

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

  describe('findObjectInDB', () => {
    //
    let primaryKey;
    beforeEach(() => (primaryKey = '{primaryKey}'));

    describe('when entry is found in the database', () => {
      //Create a spy that returns
      beforeEach(() => {
        jasmine.createSpy(databaseModify, 'readFromDB').and.returnValue(function() {
          // return new Promise(function(resolve, reject) { need to test the reject
          return new Promise(function(resolve) {
            resolve('Successfully found object in database');
          });
        });
      });
      it('should return a resolved promise and the found object', () => {
        databaseModify.findObjectInDB(primaryKey).then(function(data) {
          expect(data).toEqual('Successfully found object in database');
        });
      });
    }); //when entry is found in the database

    describe('when entry is not in the database', () => {
      beforeEach(() => {
        jasmine.createSpy(databaseModify, 'readFromDB').and.returnValue(function() {
          return new Promise(function(resolve, reject) {
            reject('object not found in database');
          });
        });
      });
      it('should return a rejected promise with a reason', () => {
        databaseModify.findObjectInDB(primaryKey).then(function(err) {
          expect(err).toEqual('object not found in database');
        });
      });
    }); //when entry is not in the database
  }); //findObjectInDB

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
});
