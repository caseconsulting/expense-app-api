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

    spyOn(crudRoutes, '_createInDatabase').and.returnValue(Promise.resolve('_createInDatabase'));
    spyOn(crudRoutes, '_updateDatabase').and.returnValue(Promise.resolve('_updateDatabase'));
    spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.resolve(true));
    spyOn(crudRoutes, '_handleError').and.returnValue('ERROR MSG');
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

    it('should add req.body', done => {
      return crudRoutes.create(req, res).then(() => {
        expect(crudRoutes._add).toHaveBeenCalledWith(
          jasmine.anything(),
          req.body
        );
        expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, {});
        expect(crudRoutes._createInDatabase).toHaveBeenCalledWith(res, true);
        done();
      });


    describe('if something goes wrong', () => {
      beforeEach(() => {
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
      fdescribe('when readFromDB returns at least one element', () => {
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
      fdescribe('when readFromDB does not return an element', () => {
        beforeEach(() => {
          spyOn(_, 'first').and.returnValue(undefined);
        });
        it('should throw an error', done => {
          expect(() => {
            crudRoutes
              .read(req, res)
              .then()
              .toThrow(err);
          });
          done();
          fail('Cant test error handling');
        }); //should respond with the output and a 200 code
      }); //when readFromDB returns at least one element
    }); //When promise is resolved
    fdescribe('when promise does not resolve', () => {
      beforeEach(() => {
        res = {};
        err = {};
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
    let res, req, newEmployee;
    beforeEach(() => (res = jasmine.createSpyObj('res', ['status', 'send'])));
    beforeEach(() => res.status.and.returnValue(res));
    beforeEach(() => (req = jasmine.createSpyObj('req', ['params'])));
    beforeEach(() =>
      req.params.and.returnValue({
        id: '{id}'
      })
    );
    beforeEach(() => (req = jasmine.createSpyObj('req', ['body'])));
    beforeEach(() =>
      req.body.and.returnValue({
        bodyContent: '{body content}'
      })
    );
    beforeEach(() => (newEmployee = '{newEmployee}'));
    describe('when create is called', () => {
      beforeEach(() => spyOn(crudRoutes, '_handleResponse'));
      afterEach(() => expect(crudRoutes._handleResponse).toHaveBeenCalledWith(404, res));
      afterEach(() =>
        expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(newEmployee, crudRoutes._handleResponse(404, res))
      );
      it('should call addToDB', () => {
        databaseModify.updateEntryInDB(newEmployee, crudRoutes._handleResponse(404, res));
      });
    });
  }); // update

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
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.reject({}));
      });
      it('should pass the error to _handleError ', () => {
        return crudRoutes.showList(req, res).then(() => {
          expect(crudRoutes._handleError).toHaveBeenCalledWith(res, err);
        });
      });
    });
  }); // showList
}); // crudRoutes
