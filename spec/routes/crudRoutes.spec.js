const Crud = require('../../routes/crudRoutes');
const _ = require('lodash');

describe('crudRoutes', () => {
  //Create spies for all calls to databaseModify
  let crudRoutes, databaseModify, _add, _update, _uuid;
  beforeEach(() => {
    _add = jasmine.createSpy('_add');
    _update = jasmine.createSpy('_update');
    _uuid = jasmine.createSpy('uuid');
    databaseModify = jasmine.createSpyObj('databaseModify', [
      'addToDB',
      'readFromDB',
      'removeFromDB',
      'updateEntryInDB',
      'getAllEntriesInDB'
    ]);
    crudRoutes = new Crud(databaseModify, _add, _update, _uuid);
  });

  describe('_inputChecker', () => {
    let objectToCheck;
    beforeEach(() => (objectToCheck = '{objectToCheck}'));
    beforeEach(() => spyOn(_, 'includes'));
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

  describe('update', () => {
    let req, res, err;
    beforeEach(() => {
      req = {
        body: 'body',
        params: {
          id: 'id'
        }
      };
      res = 'res';
      err = 'err';
    });
    describe('if everything works', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_updateDatabase').and.returnValue(Promise.resolve('_updateDatabase'));
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve({}));
      });
      it('should update using req.body', done => {
        return crudRoutes.update(req, res).then(() => {
          expect(crudRoutes._update).toHaveBeenCalledWith(jasmine.anything(), req.body);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, {});
          expect(crudRoutes._updateDatabase).toHaveBeenCalledWith(res, true);
          done();
        });
      });
    }); //if everything works

    describe('if something goes wrong', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
        spyOn(crudRoutes, '_update').and.returnValue(Promise.reject({}));
      });
      it('should error out', () => {
        return crudRoutes.update(req, res).catch(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    }); //if something goes wrong
  }); //update

  describe('create', () => {
    let req, res, err;
    beforeEach(() => {
      req = { body: 'body' };
      res = 'res';
      err = 'err';
    });
    describe('if everything works', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_createInDatabase').and.returnValue(Promise.resolve('_createInDatabase'));
        spyOn(crudRoutes, '_add').and.returnValue(Promise.resolve({}));
      });
      it('should add req.body', done => {
        return crudRoutes.create(req, res).then(() => {
          expect(crudRoutes._add).toHaveBeenCalledWith(jasmine.anything(), req.body);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, {});
          expect(crudRoutes._createInDatabase).toHaveBeenCalledWith(res, true);
          done();
        });
      });
    }); //if everything works

    describe('if something goes wrong', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
        spyOn(crudRoutes, '_add').and.returnValue(Promise.reject({}));
      });
      it('should error out', () => {
        return crudRoutes.create(req, res).catch(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    }); //if something goes wrong
  }); //create

  describe('read', () => {
    let res, output, err, req;
    beforeEach(() => {
      req = { body: 'body', params: { id: 'id' } };
      err = { code: 404, message: 'entry not found in database' };
      data = {};
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
      }); //when readFromDB returns at least one element
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
      });
    }); //when promise does not resolve
  }); // read

  describe('update', () => {
    let req, res, err;
    beforeEach(() => {
      req = {
        body: 'body',
        params: {
          id: 'id'
        }
      };
      res = 'res';
      err = 'err';
    });
    describe('if everything works', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
        spyOn(crudRoutes, '_updateDatabase').and.returnValue(Promise.resolve('_updateDatabase'));
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve({}));
      });
      it('should update using req.body', done => {
        return crudRoutes.update(req, res).then(() => {
          expect(crudRoutes._update).toHaveBeenCalledWith(jasmine.anything(), req.body);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, {});
          expect(crudRoutes._updateDatabase).toHaveBeenCalledWith(res, true);
          done();
        });
      });
    }); //if everything works

    describe('if something goes wrong', () => {
      beforeEach(() => {
        spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
        spyOn(crudRoutes, '_update').and.returnValue(Promise.reject({}));
      });
      it('should error out', () => {
        return crudRoutes.update(req, res).catch(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    }); //if something goes wrong
  }); //update

  describe('onDelete', () => {
    let res, req, data;
    beforeEach(() => {
      req = { body: 'body' };
      err = {};
      data = {};
    });
    describe('when showList is called without error', () => {
      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve({}));
      });
      it('should return the complete json file ', done => {
        return crudRoutes.showList(req, res).then(() => {
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(data);
          done();
        });
      });
    });
    describe('when there is an error', () => {
      beforeEach(() => {
        res = {};
        spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.reject({}));
      });
      it('should pass the error to _handleError ', () => {
        return crudRoutes.showList(req, res).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    });
  }); // onDelete

  describe('showList', () => {
    let res, req, data;
    beforeEach(() => {
      req = { body: 'body' };
      err = {};
      data = {};
    });
    describe('when showList is called without error', () => {
      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve({}));
      });
      it('should return the complete json file ', done => {
        return crudRoutes.showList(req, res).then(() => {
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(data);
          done();
        });
      });
    });
    describe('when there is an error', () => {
      beforeEach(() => {
        res = {};
        spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.reject({}));
      });
      it('should pass the error to _handleError ', () => {
        return crudRoutes.showList(req, res).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    });
  }); // showList

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
      expect(res.send).toHaveBeenCalledWith(err.message);
    });
  }); // _handleError

  describe('_createInDatabase', () => {
    let res, newObject, data, err;
    beforeEach(() => {
      data = {};
      newObject = {};
      err = {};
    });
    describe('when _createInDatabase is called without error', () => {
      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.addToDB.and.returnValue(Promise.resolve({}));
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
        spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
        databaseModify.addToDB.and.returnValue(Promise.reject({}));
      });
      it('should pass the error to _handleError ', () => {
        return crudRoutes._createInDatabase(res, newObject).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    });
  }); // _createInDatabase
  describe('_updateDatabase', () => {
    let res, newObject, data, err;
    beforeEach(() => {
      data = {};
      newObject = {};
      err = {};
    });
    describe('when _updateDatabase is called without error', () => {
      beforeEach(() => {
        res = jasmine.createSpyObj('res', ['status', 'send']);
        res.status.and.returnValue(res);
        databaseModify.updateEntryInDB.and.returnValue(Promise.resolve({}));
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
        databaseModify.updateEntryInDB.and.returnValue(Promise.reject({}));
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
      fdescribe('if inputChecker returns true', () => {
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
      fdescribe('if inputChecker returns false', () => {
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
    fdescribe('if newObject does not have an id', () => {
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
}); // crudRoutes
