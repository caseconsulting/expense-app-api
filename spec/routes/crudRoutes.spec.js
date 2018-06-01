const Crud = require('../../routes/crudRoutes');
const _ = require('lodash');

describe('crudRoutes', () => {
  //Create spies for all calls to databaseModify
  let crudRoutes, databaseModify, _add, _update, _uuid;
  beforeEach(
    () =>
      (databaseModify = jasmine.createSpyObj('databaseModify', [
        'addToDB',
        'readFromDB',
        'removeFromDB',
        'updateEntryInDB',
        'getAllEntriesInDB'
      ]))
  );
  beforeEach(() => {
    _add = jasmine.createSpy('_add');
    _update = jasmine.createSpy('_update');
    _uuid = jasmine.createSpy('uuid');
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

  fdescribe('update', () => {
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


  fdescribe('create', () => {
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
    beforeEach(() => (res = jasmine.createSpyObj('res', ['status', 'send'])));
    beforeEach(() => (err = '{err}'));
    beforeEach(() => (req = jasmine.createSpyObj('req', ['params'])));
    beforeEach(() =>
      req.params.and.returnValue({
        id: '{id}'
      })
    );
    beforeEach(() => res.status.and.returnValue(res));
    describe('when output is called', () => {
      beforeEach(() => databaseModify.readFromDB.and.returnValue('{return from readFromDB}'));
      afterEach(() => expect(databaseModify.readFromDB).toHaveBeenCalledWith(req.params.id));
      beforeEach(() => (output = databaseModify.readFromDB(req.params.id)));
      describe('when there is an output', () => {
        it('should respond with the output and a 200 code', () => {
          crudRoutes.read(req, res);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(output);
        });
      }); // when there is an output
    });
    describe('when output is empty', () => {
      beforeEach(() => databaseModify.readFromDB.and.returnValue(null));
      afterEach(() => expect(databaseModify.readFromDB).toHaveBeenCalledWith(req.params.id));
      beforeEach(() => (output = databaseModify.readFromDB(req.params.id)));
      describe('when there is an output', () => {
        it('should respond with the output and a 200 code', () => {
          crudRoutes.read(req, res);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith({
            error: 'READ: Object not found'
          });
        });
        it('should add req.body', done => {
            return crudRoutes.create(req, res).then(() => {
                expect(crudRoutes._add).toHaveBeenCalledWith(
                    jasmine.anything(),
                    req.body
                );
                expect(crudRoutes._validateInputs).toHaveBeenCalledWith(
                    res,
                    {}
                );
                expect(crudRoutes._createInDatabase).toHaveBeenCalledWith(
                    res,
                    true
                );
                done();
            });
        });
    }); //create

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
    let req, res, id;
    beforeEach(() => (req = jasmine.createSpyObj('req', ['params'])));
    beforeEach(() => (res = jasmine.createSpyObj('res', ['status', 'send'])));
    beforeEach(() => (id = '{id}'));
    beforeEach(() =>
      req.params.and.returnValue({
        id: '{id}'
      })
    );
    describe('when create is called', () => {
      beforeEach(() => spyOn(crudRoutes, '_handleResponse'));
      afterEach(() => expect(crudRoutes._handleResponse).toHaveBeenCalledWith(404, res));
      afterEach(() =>
        expect(databaseModify.removeFromDB).toHaveBeenCalledWith(id, crudRoutes._handleResponse(404, res))
      );
      it('should call addToDB', () => {
        databaseModify.removeFromDB(id, crudRoutes._handleResponse(404, res));
      });
    });
  }); // onDelete
  describe('showList', () => {
    let output, res, req;

    beforeEach(() => (res = jasmine.createSpyObj('res', ['status', 'send'])));
    beforeEach(() => res.status.and.returnValue(res));
    beforeEach(() => (req = '{req}'));
    describe('when showList is called', () => {
      beforeEach(() => databaseModify.getAllEntriesInDB.and.returnValue('{complete json}'));
      beforeEach(() => (output = databaseModify.getAllEntriesInDB()));
      afterEach(() => expect(databaseModify.getAllEntriesInDB).toHaveBeenCalledWith());

        beforeEach(
            () => (res = jasmine.createSpyObj('res', ['status', 'send']))
        );
        beforeEach(() => res.status.and.returnValue(res));
        beforeEach(() => (req = '{req}'));
        describe('when showList is called', () => {
            beforeEach(() =>
                databaseModify.getAllEntriesInDB.and.returnValue(
                    '{complete json}'
                )
            );
            beforeEach(() => (output = databaseModify.getAllEntriesInDB()));
            afterEach(() =>
                expect(databaseModify.getAllEntriesInDB).toHaveBeenCalledWith()
            );

            it('should return the complete json file to const output and send output back with 200 code', () => {
                crudRoutes.showList(req, res);
                expect(res.status).toHaveBeenCalledWith(200);
                expect(res.send).toHaveBeenCalledWith(output);
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
        fdescribe('when there is an error', () => {
            beforeEach(() => {
                databaseModify.addToDB.and.returnValue(Promise.reject({}));
            });
            it('should pass the error to _handleError ', () => {
                return crudRoutes._createInDatabase(res, newObject).then(() => {
                    expect(crudRoutes._handleError).toHaveBeenCalledWith(
                        res,
                        err
                    );
                });
            });
        });
    }); // _createInDatabase
}); // crudRoutes
