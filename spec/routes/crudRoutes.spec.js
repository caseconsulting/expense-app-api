const Crud = require('../../routes/crudRoutes');
const _ = require('lodash');

describe('crudRoutes', () => {
  let stage = 'dev';
  //Create spies for all calls to databaseModify
  let crudRoutes, databaseModify;
  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', [
      'addToDB',
      'readFromDB',
      'readFromDBURL',
      'removeFromDB',
      'updateEntryInDB',
      'getAllEntriesInDB',
      'tableName'
    ]);
    crudRoutes = new Crud();
    crudRoutes.databaseModify = databaseModify;
  });

  describe('_checkPermissionForOnDelete', () => {

    let req;

    describe('when a user is accessing the expenses table', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isUser').and.returnValue(true);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(true);
      });

      it('should return true', () => {
        expect(crudRoutes._checkPermissionForOnDelete(req)).toBe(true);
      }); // should return true
    }); // when a user is accessing expense

    describe('when someone other than a user is accessing the expenses table', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isUser').and.returnValue(false);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(true);
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionForOnDelete(req)).toBe(false);
      }); // should return false
    }); // when someone other than a user is accessing the expenses table

    describe('when a user is accessing a different table than expenses', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isUser').and.returnValue(true);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(false);
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionForOnDelete(req)).toBe(false);
      }); // should return false
    }); // when a user is accessing a different table than expenses

    describe('when someone other than a user is accessing a differnt table than expenses', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isUser').and.returnValue(false);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(false);
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionForOnDelete(req)).toBe(false);
      }); // should return false
    }); // when someone other than a user is accessing a differnt table than expenses
  }); // _checkPermissionForOnDelete

  describe('_checkPermissionForShowList', () => {

    let req;

    describe('when an admin is accessing any table', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(true);
      });

      it('should return true', () => {
        expect(crudRoutes._checkPermissionForShowList(req)).toBe(true);
      }); // should return true
    }); // when an admin is accessing any table

    describe('when someone other than a user is accessing the expense-type or employees table', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(true);
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionForShowList(req)).toBe(true);
      }); // should return true
    }); // when someone other than a user is accessing the expense-type or employees table

    describe('when someone other than a user is accessing a table other than expense-type or employees', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(false);
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionForShowList(req)).toBe(false);
      }); // should return false
    }); // when someone other than a user is accessing a table other than expense-type or employees
  }); // _checkPermissionForShowList

  describe('_checkTableName', () => {
    let listOfValidTables, stage;
    beforeEach(() => {
      stage = process.env.STAGE;
    });
    describe('if the current table is in the list of valid tables', () => {
      beforeEach(() => {
        listOfValidTables = ['valid-table-name'];
        crudRoutes.databaseModify.tableName = `${stage}-valid-table-name`;
      });

      it('should return true', done => {
        let result = crudRoutes._checkTableName(listOfValidTables);
        expect(result).toBe(true);
        done();
      }); // should return true
    }); // if the current table is in the list of valid tables

    describe('if the current table is not in the list of valid tables', () => {
      beforeEach(() => {
        listOfValidTables = ['valid-table-name'];
        crudRoutes.databaseModify.tableName = `${stage}-not-valid-table-name`;
      });
      it('should return false', done => {
        let result = crudRoutes._checkTableName(listOfValidTables);
        expect(result).toBe(false);
        done();
      }); // should return false
    }); // if the current table is not in the list of valid tables
  }); // _checkTableName

  describe('create', () => {
    let req, res, err;
    beforeEach(() => {

      // req = { body: 'body',params:{id:'{id}'} };
      // err = '{err}';
      // data = '{data}';
      res = jasmine.createSpyObj('res', ['status', 'send']);
      res.status.and.returnValue(res);
      crudRoutes.databaseModify.tableName = `${stage}-expenses`;
    });

    describe('if the user role is admin', () => {

      beforeEach(() => {
        req = {
          body: 'body',
          employee: {
            employeeRole: 'admin'
          }
        };
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_createInDatabase').and.returnValue(Promise.resolve('_createInDatabase'));
        spyOn(crudRoutes, '_add').and.returnValue(Promise.resolve({}));
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-expenses`);
      });

      it('should add req.body', done => {
        return crudRoutes.create(req, res).then(() => {
          expect(crudRoutes._add).toHaveBeenCalledWith(jasmine.anything(), req.body);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, {});
          expect(crudRoutes._createInDatabase).toHaveBeenCalledWith(res, true);
          done();
        });
      });
    }); //if the user role is admin

    describe('if a user role is user and submitting an expense', () => {

      beforeEach(() => {
        req = {
          body: 'body',
          employee: {
            employeeRole: 'user'
          }
        };

        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_createInDatabase').and.returnValue(Promise.resolve('_createInDatabase'));
        spyOn(crudRoutes, '_add').and.returnValue(Promise.resolve({}));
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-expenses`);
      });

      it('should add req.body', done => {
        return crudRoutes.create(req, res).then(() => {
          expect(crudRoutes._add).toHaveBeenCalledWith(jasmine.anything(), req.body);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, {});
          expect(crudRoutes._createInDatabase).toHaveBeenCalledWith(res, true);
          done();
        });
      });
    }); //if a user role is user and submitting an expense

    describe('if user doesnt have permissions', () => {

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Unable to create object in database due to insufficient user permissions'
        };
        req = {
          body: 'body',
          employee: {
            employeeRole: 'NO_PERMISSION'
          }
        };

        spyOn(crudRoutes, '_handleError').and.returnValue({
          code: 403,
          message: 'Unable to create object in database due to insufficient user permissions'
        });

        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_createInDatabase').and.returnValue(Promise.resolve('_createInDatabase'));
        spyOn(crudRoutes, '_add').and.returnValue(Promise.resolve({}));
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-expenses`);
      });

      it('should error out', done => {
        crudRoutes.create(req, res);
        expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        done();
      });
    }); //if user doesnt have permissions

    describe('when create in database fails', () => {

      let req, res;

      beforeEach(() => {
        req = {  body: {id: 'req-body-id'} };
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        spyOn(crudRoutes, '_handleError');
        spyOn(crudRoutes, '_validPermissions').and.returnValue(true);
        spyOn(crudRoutes, '_add').and.returnValue(Promise.resolve());
        spyOn(crudRoutes, '_validateInputs').and.returnValue(true);
        spyOn(crudRoutes, '_createInDatabase').and.returnValue(Promise.reject('there was an error'));
      });

      it('should pass the error to _handleError', () => {
        return crudRoutes.create(req, res).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, 'there was an error');
        });
      }); // should pass the error to _handleError
    }); // when create in database fails
  }); //create

  describe('_createInDatabase', () => {

    let res, newObject, data, err;

    beforeEach(() => {
      data = '{data}';
      newObject = '{newObject}';
      err = '{err}';
    });

    describe('when _createInDatabase is called without error', () => {

      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.addToDB.and.returnValue(Promise.resolve(data));
      });

      it('should respond with a 200 and data', done => {
        return crudRoutes._createInDatabase(res, newObject).then(() => {
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(data);
          done();
        });
      });
    });

    describe('when there is an error', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_handleError');
        databaseModify.addToDB.and.returnValue(Promise.reject(err));
      });

      it('should pass the error to _handleError', () => {
        return crudRoutes._createInDatabase(res, newObject).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    });
  }); // _createInDatabase

  describe('_getTableName', () => {
    it('should return the table name', () => {
      expect(crudRoutes._getTableName()).toEqual(databaseModify.tableName);
    }); // should return the table name
  }); // _getTableName

  describe('_handleError', () => {
    let res, err;
    beforeEach(() => {
      res = jasmine.createSpyObj('res', ['status', 'send']);
      res.status.and.returnValue(res);
      err = {
        code: 'error code',
        message: 'error message'
      };
    });

    it('should send the error code and message', () => {
      crudRoutes._handleError(res, err);
      expect(res.status).toHaveBeenCalledWith(err.code);
      expect(res.send).toHaveBeenCalledWith(err);
    });
  }); // _handleError

  describe('_inputChecker', () => {
    let objectToCheck;
    beforeEach(() => {
      objectToCheck = '{objectToCheck}';
      spyOn(_, 'includes');
    });
    afterEach(() => {
      expect(_.includes).toHaveBeenCalledWith(objectToCheck, '');
    });
    describe('if an empty string is found', () => {
      beforeEach(() => _.includes.and.returnValue(true));
      it('should return true', () => {
        expect(crudRoutes._inputChecker(objectToCheck)).toBe(true);
      });
    }); // if an empty space is found
    describe('if there are no empty strings', () => {
      beforeEach(() => _.includes.and.returnValue(false));
      it('should return false', () => {
        expect(crudRoutes._inputChecker(objectToCheck)).toBe(false);
      });
    }); //if there are no empty strings
  }); // _inputChecker

  describe('_isAdmin', () => {

    let req;

    describe('when employee is admin', () => {

      beforeEach(() => {
        req = { employee: { employeeRole: 'admin' } };
      });

      it('should return true', () => {
        expect(crudRoutes._isAdmin(req)).toBe(true);
      }); // should return true
    }); // when employee is admin

    describe('when employee is not an admin', () => {

      beforeEach(() => {
        req = { employee: { employeeRole: 'user' } };
      });

      it('should return false', () => {
        expect(crudRoutes._isAdmin(req)).toBe(false);
      }); // should return false
    }); // when employee is not an admin
  }); // _isAdmin

  describe('_isUser', () => {

    let req;

    describe('when employee is user', () => {

      beforeEach(() => {
        req = { employee: { employeeRole: 'user' } };
      });

      it('should return true', () => {
        expect(crudRoutes._isUser(req)).toBe(true);
      }); // should return true
    }); // when employee is _isUser

    describe('when employee is not a user', () => {

      beforeEach(() => {
        req = { employee: { employeeRole: 'admin' } };
      });

      it('should return false', () => {
        expect(crudRoutes._isUser(req)).toBe(false);
      }); // should return false
    }); // when employee is not a user
  }); // _isUser

  describe('onDelete', () => {
    let res, req, err, data;
    beforeEach(() => {
      req = { body: 'body',params:{id:'{id}'} };
      err = '{err}';
      data = '{data}';
      res = jasmine.createSpyObj('res', ['status', 'send']);
      res.status.and.returnValue(res);
      spyOn(crudRoutes, '_handleError');
      spyOn(crudRoutes,'_onDeleteHelper');
    });

    describe('when a user is an admin', () => {
      beforeEach(() => {
        spyOn(crudRoutes,'_isAdmin').and.returnValue(true);
      });

      describe('when working with expenses, expense-types or employees dynamo tables', () => {
        beforeEach(() => {
          spyOn(crudRoutes,'_checkTableName').and.returnValue(true);
        });

        afterEach(()=>{
          expect(crudRoutes._checkTableName).toHaveBeenCalledWith(['expenses','expense-types','employees']);
        });

        it('should call _onDeleteHelper', done => {
          crudRoutes.onDelete(req,res);
          expect(crudRoutes._onDeleteHelper).toHaveBeenCalledWith(req.params.id, res);
          done();
        }); // should call _onDeleteHelper
      }); // when working with expenses, expense-types or employees dynamo tables

      describe('when working with any other dynamo table', () => {
        beforeEach(() => {
          spyOn(crudRoutes, '_checkTableName').and.returnValue(false);
        });

        describe('when removeFromDB promise resolves', () => {
          beforeEach(() => {
            crudRoutes.databaseModify.removeFromDB.and.returnValue(Promise.resolve(data));
          });

          it('should respond to caller with deleted object', done => {
            crudRoutes.onDelete(req, res).then(() => {
              expect(res.status).toHaveBeenCalledWith(200);
              expect(res.send).toHaveBeenCalledWith(data);
              done();
            });
          }); // should respond to caller with deleted object

        }); // when removeFromDB promise resolves

        describe('when removeFromDB promise rejects', () => {
          beforeEach(() => {
            crudRoutes.databaseModify.removeFromDB.and.returnValue(Promise.reject(err));
          });

          it('should pass the error to _handleError', done => {
            crudRoutes.onDelete(req, res).then(()=>{
              expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
              done();
            });
          }); // should pass the error to _handleError
        }); // when removeFromDB promise rejects
      }); // when working with any other dynamo table
    }); // when a user is an admin

    describe('when a user is not an admin ', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
        spyOn(crudRoutes, '_checkPermissionForOnDelete').and.returnValue(true);
      });

      it('should call _onDeleteHelper', done => {
        crudRoutes.onDelete(req, res);
        expect(crudRoutes._onDeleteHelper).toHaveBeenCalledWith(req.params.id, res);
        done();
      }); // should call _onDeleteHelper
    }); // when a user is not an admin

    describe('if the user has no permissions', () => {
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Unable to delete object in database due to insufficient user permissions'
        };
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
        spyOn(crudRoutes, '_checkPermissionForOnDelete').and.returnValue(false);
      });

      it('should call _handleError with error message', done => {
        crudRoutes.onDelete(req, res);
        expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        done();
      }); // should call _handleError with error message
    }); // if the user has no permissions
  }); // onDelete

  describe('_onDeleteHelper', () => {
    let res, id, data, error;
    beforeEach(() => {
      res = jasmine.createSpyObj('res', ['status', 'send']);
      res.status.and.returnValue(res);
      spyOn(crudRoutes, '_handleError');
      id = 'id';
      data = '{data}';
      error = '{error}';
    });

    afterEach(()=>{
      expect(crudRoutes._delete).toHaveBeenCalledWith(id);
    });

    describe('when _delete promise resolves', () => {
      beforeEach(() => {
        spyOn(crudRoutes,'_delete').and.returnValue(Promise.resolve(data));
      });
      it('should respond to caller with deleted object', done => {
        crudRoutes._onDeleteHelper(id, res).then(()=>{
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(data);
          done();
        });
      }); // should respond to caller with deleted object
    }); // when _delete promise resolves

    describe('when _delete promise rejects', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_delete').and.returnValue(Promise.reject(error));
      });
      it('should call _handleError with error message', done => {
        crudRoutes._onDeleteHelper(id, res).then(()=>{
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, error);
          done();
        });
      }); // should call _handleError with error message

    }); // when _delete promise rejects
  }); // _onDeleteHelper

  describe('read', () => {
    let res, req, err;
    beforeEach(() => {
      req = {
        body: 'body',
        employee: {
          id: 'id',
          employeeRole: 'admin'
        },
        params: {
          id: 'id'
        }
      };
      err = {
        code: 404,
        message: 'entry not found in database'
      };
    });

    describe('When promise is resolved', () => {

      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.readFromDB.and.returnValue(Promise.resolve({}));
      });

      describe('when readFromDB returns at least one element', () => {

        beforeEach(() => {
          spyOn(_, 'first').and.returnValue('elementFromServer');
        });

        it('should respond with the output and a 200 code', done => {
          crudRoutes.read(req, res).then(() => {
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith('elementFromServer');
            done();
          });
        }); //should respond with the output and a 200 code
      }); //when readFromDB returns at least one element

      describe('when readFromDB does not return an element', () => {

        beforeEach(() => {
          spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
          spyOn(_, 'first').and.returnValue(undefined);
        });

        it('should throw an error', done => {
          return crudRoutes.read(req, res).then(() => {
            expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
            done();
          });

          // fail('Cant test error handling');
        }); //should respond with the output and a 200 code
      }); //when readFromDB does not return an element
    }); //When promise is resolved
    describe('when promise does not resolve', () => {

      beforeEach(() => {
        res = {};
        err = {};
        spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
        databaseModify.readFromDB.and.returnValue(Promise.reject({}));
      });

      it('should pass the error to _handleError ', () => {
        return crudRoutes.read(req, res).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      }); // should pass the error to _handleError
    }); //when promise does not resolve

    describe('when successfully reading from training-urls and receiving output', () => {

      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.readFromDBURL.and.returnValue(Promise.resolve({}));
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-training-urls`);
        spyOn(_, 'first').and.returnValue('elementFromServer');
      });

      it('should respond with a 200 and data', done => {
        return crudRoutes.read(req, res).then(() => {
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith('elementFromServer');
          done();
        });
      }); // should respond with a 200 and data
    }); // when successfully reading from training-urls and receiving output

    describe('when successfully reading from training-urls but with no output', () => {

      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.readFromDBURL.and.returnValue(Promise.resolve([]));
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-training-urls`);
      });

      it('should throw an error', () => {
        crudRoutes.read(req, res).catch(err => {
          expect(err).toEqual({ code: 404, message: 'entry not found in database' });
        });
      }); // should throw an error
    }); // when successfully reading from training-urls but no output

    describe('when user is accessing expenses table', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-expenses`);
        spyOn(crudRoutes, '_isUser').and.returnValue(true);
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
      });

      describe('and expense id matches user id', () => {

        beforeEach(() => {
          databaseModify.readFromDB.and.returnValue(Promise.resolve([{userId: 'id'}]));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes.read(req, res).then(() => {
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({userId: 'id'});
            done();
          });
        }); // should respond with a 200 and data
      }); // and expense id matches user id

      describe('and expense id does not matche user id', () => {

        let err;

        beforeEach(() => {
          err = {
            code: 403,
            message: 'Unable to get objects from database due to insufficient user permissions'
          };
          databaseModify.readFromDB.and.returnValue(Promise.resolve([{userId: 'differentId'}]));
          spyOn(crudRoutes, '_handleError');
        });

        it('should pass the error to _handleError', () => {
          return crudRoutes.read(req, res).then(() => {
            expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
          });
        }); // should pass the error to _handleError
      }); // and expense id does not match user id
    }); // when user is accessing expenses table

    describe('when user is accessing expense-types table', () => {

      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);

        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-expense-types`);
        spyOn(crudRoutes, '_isUser').and.returnValue(true);
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
      });

      describe('and readFromDB is successful with output', () => {

        beforeEach(() => {
          databaseModify.readFromDB.and.returnValue(Promise.resolve(['output']));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes.read(req, res).then(() => {
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith('output');
            done();
          });
        }); // should respond with a 200 and data
      }); // and readFromDB is successful with output

      describe('and readFromDB is successful with no outputs', () => {

        beforeEach(() => {
          databaseModify.readFromDB.and.returnValue(Promise.resolve([]));
        });

        it('should throw an error', () => {
          crudRoutes.read(req, res).catch(err => {
            expect(err).toEqual({ code: 404, message: 'entry not found in database' });
          });
        }); // should throw an error
      }); // and readFromDB is successful with no outputs

      describe('and readFromDB fails', () => {

        beforeEach(() => {
          res = jasmine.createSpyObj('res', ['status', 'send']);
          res.status.and.returnValue(res);
          databaseModify.readFromDB.and.returnValue(Promise.reject('there was an error'));
          spyOn(crudRoutes, '_handleError');
        });

        it('should pass the error to _handleError', () => {
          return crudRoutes.read(req, res).then(() => {
            expect(crudRoutes._handleError).toHaveBeenCalledWith(res, 'there was an error');
          });
        }); // should pass the error to _handleError
      }); // and readFromDB fails
    }); // when user is accessing expense-types table

    describe('when user and table are invalid', () => {

      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Unable to get objects from database due to insufficient user permissions'
        };
        spyOn(crudRoutes, '_getTableName').and.returnValue('invalidTable');
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
        spyOn(crudRoutes, '_isUser').and.returnValue(false);
        spyOn(crudRoutes, '_handleError');
      });

      it('should pass the error to _handleError', () => {
        expect(crudRoutes.read(req, res)).toEqual(res.status(err.code).send(err));
      }); // should pass the error to _handleError
    }); // when user and table are invalid
  }); // read

  describe('showList', () => {
    let res, req, err, data;
    beforeEach(() => {
      req = { body: 'body' };
      err = '{err}';
      data = '{data}';
      res = '{res}';
      spyOn(crudRoutes, '_checkPermissionForShowList');
      spyOn(crudRoutes, '_handleError');
    });
    describe('when user has permission', () => {
      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        crudRoutes._checkPermissionForShowList.and.returnValue(true);
      });
      describe('when getAllEntriesInDB resolves', () => {
        beforeEach(() => {
          databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve(data));
        });
        it('should return the entry from database', done => {
          crudRoutes.showList(req, res).then(() => {
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(data);
            done();
          });
        }); // should return the entry from database
      }); // when getAllEntriesInDB resolves

      describe('when getAllEntriesInDB rejects', () => {
        beforeEach(() => {
          databaseModify.getAllEntriesInDB.and.returnValue(Promise.reject(err));
        });
        it('should pass the error to _handleError', done => {
          crudRoutes.showList(req, res).then(()=>{
            expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
          });
          done();
        }); // should pass the error to _handleError

      }); // when getAllEntriesInDB rejects

    }); // when user has permission
    describe('when user does not has permission', () => {
      beforeEach(() => {
        crudRoutes._checkPermissionForShowList.and.returnValue(false);
        err = {
          code: 403,
          message: 'Unable to get objects from database due to insufficient user permissions'
        };
      });
      it('should pass the error to _handleError ', () => {
        crudRoutes.showList(req, res);
        expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
      });
    });
  }); // showList

  describe('update', () => {
    let req, res, err;
    beforeEach(() => {
      res = jasmine.createSpyObj('res', ['status', 'send']);
      res.status.and.returnValue(res);
      crudRoutes.databaseModify.tableName = `${stage}-expenses`;
    });

    describe('if the user role is admin', () => {
      beforeEach(() => {
        req = {
          body: 'body',
          params: { id: 'id' },
          employee: {
            employeeRole: 'admin'
          }
        };

        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_updateDatabase').and.returnValue(Promise.resolve('_updateDatabase'));
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve({}));
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-expenses`);
      });
      it('should add req.body', done => {
        return crudRoutes.update(req, res).then(() => {
          expect(crudRoutes._update).toHaveBeenCalledWith(jasmine.anything(), req.body);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, {});
          expect(crudRoutes._updateDatabase).toHaveBeenCalledWith(res, true);
          done();
        });
      });
    }); //if the user role is admin

    describe('if a user role is user and updating an expense', () => {
      beforeEach(() => {
        req = {
          body: 'body',
          params: { id: 'id' },
          employee: {
            employeeRole: 'user'
          }
        };

        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_updateDatabase').and.returnValue(Promise.resolve('_updateDatabase'));
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve({}));
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-expenses`);
      });
      it('should add req.body', done => {
        return crudRoutes.update(req, res).then(() => {
          expect(crudRoutes._update).toHaveBeenCalledWith(jasmine.anything(), req.body);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, {});
          expect(crudRoutes._updateDatabase).toHaveBeenCalledWith(res, true);
          done();
        });
      });
    }); //if a user role is user and updating an expense

    describe('if user doesnt have permissions', () => {
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Unable to update object in database due to insufficient user permissions'
        };
        req = {
          body: 'body',
          employee: {
            role: 'NO_PERMISSION'
          }
        };

        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_updateDatabase').and.returnValue(Promise.resolve('_updateDatabase'));
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve({}));
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-expenses`);
        spyOn(crudRoutes, '_handleError').and.returnValue(err);
      });
      it('should error out', () => {
        crudRoutes.update(req, res);
        expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
      });
    }); //if user doesnt have permissions

    describe('when valid permissions and successfully updates training urls table', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_validPermissions').and.returnValue(true);
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-training-urls`);
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve('success'));
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve('success'));
        spyOn(crudRoutes, '_updateDatabase').and.returnValue(Promise.resolve('success'));
      });

      it('should add req.body', done => {
        crudRoutes.update(req, res).then( data => {
          expect(data).toEqual('success');
          done();
        });
      }); // should add req.body
    }); // when valid permissions and updating training urls table

    describe('when valid permissions and failing to update training urls table', () => {

      beforeEach(() => {
        err = 'there was an error';
        spyOn(crudRoutes, '_validPermissions').and.returnValue(true);
        spyOn(crudRoutes, '_getTableName').and.returnValue(`${stage}-training-urls`);
        spyOn(crudRoutes, '_update').and.returnValue(Promise.reject(err));
        spyOn(crudRoutes, '_handleError');
      });

      it('should pass the error to _handleError ', () => {
        return crudRoutes.update(req, res).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      }); // should pass the error to _handleError
    }); // when valid permissions and failing to update training urls table

    describe('when valid permissions but failing to update a tablet that is not training-urls', () => {

      beforeEach(() => {
        req = {
          body: 'body',
          params: { id: 'id' },
          employee: {
            employeeRole: 'user'
          }
        };
        err = 'there was an error';
        spyOn(crudRoutes, '_validPermissions').and.returnValue(true);
        spyOn(crudRoutes, '_getTableName').and.returnValue('not-training-urls');
        spyOn(crudRoutes, '_update').and.returnValue(Promise.reject(err));
        spyOn(crudRoutes, '_handleError');
      });

      it('should pass the error to _handleError ', () => {
        return crudRoutes.update(req, res).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      }); // should pass the error to _handleError
    }); // when valid permissions but failing to update a table that is not training-urls
  }); //update

  describe('_updateDatabase', () => {
    let res, newObject, data, err;
    beforeEach(() => {
      data = '{data}';
      newObject = '{newObject}';
      err = '{err}';
    });
    describe('when _updateDatabase is called without error', () => {
      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.updateEntryInDB.and.returnValue(Promise.resolve(data));
      });
      it('should respond with a 200 and data', done => {
        return crudRoutes._updateDatabase(res, newObject).then(() => {
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(data);
          done();
        });
      });
    });
    describe('when there is an error', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
        databaseModify.updateEntryInDB.and.returnValue(Promise.reject(err));
      });
      it('should pass the error to _handleError ', () => {
        return crudRoutes._updateDatabase(res, newObject).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    });
  }); // _updateDatabase

  describe('_validateInputs', () => {
    let res, newObject, expectedErr;
    beforeEach(() => {
      res = jasmine.createSpyObj('res', ['status', 'send']);
      res.status.and.returnValue(res);
    });
    describe('if newObject has an id', () => {
      describe('if inputChecker returns true', () => {
        beforeEach(() => {
          expectedErr = {
            code: 406, //Not Acceptable
            message: 'All fields are needed'
          };
          spyOn(crudRoutes, '_inputChecker').and.returnValue(true);
          newObject = {
            id: 'id',
            name: '' //empty string causes inputchecker to return true
          };
        });
        it('should reject passing along err', done => {
          crudRoutes._validateInputs(res, newObject).catch(err => {
            expect(err).toEqual(expectedErr);
            done();
          });
        });
      }); //if inputChecker returns true
      describe('if inputChecker returns false', () => {
        beforeEach(() => {
          spyOn(crudRoutes, '_inputChecker').and.returnValue(false);
          newObject = {
            id: 'id',
            name: '' //empty string causes inputchecker to return true
          };
        });
        it('should reject passing along err', done => {
          crudRoutes._validateInputs(res, newObject).then(data => {
            expect(data).toEqual(newObject);
            done();
          });
        });
      }); //if inputChecker returns false
    }); //if newObject has an id
    describe('if newObject does not have an id', () => {
      beforeEach(() => {
        expectedErr = {
          code: 400, //Not Acceptable
          message: 'input validation error'
        };
        newObject = {
          name: '' //empty string causes inputchecker to return true
        };
      });
      it('should reject passing along err', () => {
        expect(() => {
          crudRoutes._validateInputs(res, newObject);
        }).toThrow(expectedErr);
      });
    }); //if newObject does not have an id
  }); //_validateInputs

  describe('_validPermissions', () => {

    let req;

    describe('when an admin is checking expense-type, employees, expenses, or training-url table', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(true);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(true);
      });

      it('should return true', () => {
        expect(crudRoutes._validPermissions(req)).toBe(true);
      }); // should return true

    }); // when an admin is checking expense-type, employees, expenses, or training-url table

    describe('when admin is checking a table other than expense-type, employees, expenses, or trainging-url', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(true);
        spyOn(crudRoutes, '_isUser').and.returnValue(true);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(false);
      });

      it('should return false', () => {
        expect(crudRoutes._validPermissions(req)).toBe(false);
      }); // should return false
    }); // when admin is checking a table other than expense-type, employees, expenses, or trainging-url

    describe('when a user is checking expenses or training-urls table', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
        spyOn(crudRoutes, '_isUser').and.returnValue(true);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(true);
      });

      it('should return true', () => {
        expect(crudRoutes._validPermissions(req)).toBe(true);
      }); // should return true
    }); // when a user is checking expenses or training-urls table

    describe('when a user is checking a table other than expenses or training-url', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
        spyOn(crudRoutes, '_isUser').and.returnValue(true);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(false);
      });

      it('should return false', () => {
        expect(crudRoutes._validPermissions(req)).toBe(false);
      }); // should return false
    }); // when a user is checking a table other than expenses or training-url

    describe('when someone other than an admnin or user is trying to access tables', () => {

      beforeEach(() => {
        spyOn(crudRoutes, '_isAdmin').and.returnValue(false);
        spyOn(crudRoutes, '_isUser').and.returnValue(false);
        spyOn(crudRoutes, '_checkTableName').and.returnValue(true);
      });

      it('should return false', () => {
        expect(crudRoutes._validPermissions(req)).toBe(false);
      }); // should return false
    }); // when someone other than an admnin or user is trying to access tables
  }); // _validPermissions
}); // crudRoutes
