const Crud = require('../../routes/crudRoutes');
const _ = require('lodash');

describe("crudRoutes", () => {

  //Create spies for all calls to databaseModify
  let crudRoutes, databaseModify, _add, _update, _uuid;
  beforeEach(() => databaseModify = jasmine.createSpyObj('databaseModify', ['addToDB', 'readFromDB', 'removeFromDB', 'updateEntryInDB', 'getAllEntriesInDB']));
  beforeEach(() => _add = jasmine.createSpy('_add'));
  beforeEach(() => _update = jasmine.createSpy('_update'));
  // beforeEach(() => _uuid = jasmine.createSpy('_uuid'));
  beforeEach(() => crudRoutes = new Crud(databaseModify, _add, _update, _uuid));

  describe("_inputChecker", () => {
    let objectToCheck, res;
    beforeEach(() => objectToCheck = "{objectToCheck}");
    beforeEach(() => res = jasmine.createSpyObj('res', ['status', 'send']));
    beforeEach(() => res.status.and.returnValue(res));
    beforeEach(() => spyOn(_, 'includes'));

    describe("if an empty space is found", () => {
      let errorCall;
      beforeEach(() => _.includes.and.returnValue('true'));
      beforeEach(() => errorCall = jasmine.createSpy('errorCall()'));
      beforeEach(() => spyOn(crudRoutes, "_handleResponse").and.returnValue(errorCall));

      afterEach(() => expect(crudRoutes._handleResponse).toHaveBeenCalledWith(406, res));
      it("should call errorCall", () => {
        crudRoutes._inputChecker(objectToCheck, res);

        expect(errorCall).toHaveBeenCalledWith({
          message: 'CREATE: All fields needed'
        });
      });
    }); // if an empty space is found


  }); // _inputChecker

  describe("create", () => {
    let req, res, newObject, validated, err;
    beforeEach(() => req = jasmine.createSpyObj('req', ['body']));
    beforeEach(() => res = jasmine.createSpyObj('res', ['status', 'send']));
    beforeEach(() => newObject = "{newObject}");
    beforeEach(() => validated = "{validated}");
    beforeEach(() => req.body.and.returnValue({
      bodyContent: '{body content}'
    }));
    describe("when create is called", () => {
      beforeEach(() => spyOn(crudRoutes, "_validateInputs"));
      beforeEach(() => spyOn(crudRoutes, "_createInDatabase"));
      beforeEach(() => spyOn(crudRoutes, "_handleError"));
      beforeEach(() => spyOn(uuid, "uuid").and.returnValue('{uuid}'));
      afterEach(() => expect(_add).toHaveBeenCalledWith(res, newObject));
      afterEach(() => expect(crudRoutes._validateInputs).toHaveBeenCalledWith(res, newObject));
      afterEach(() => expect(crudRoutes._createInDatabase).toHaveBeenCalledWith(res, validated));
      afterEach(() => expect(databaseModify.addToDB).toHaveBeenCalledWith(newObject, crudRoutes._handleResponse(404, res)));
      it("should call addToDB", () => {
        crudRoutes.create(req, res);
      });
    });
  }); // create

  describe("read", () => {
    let res, output, err, req;
    beforeEach(() => res = jasmine.createSpyObj('res', ['status', 'send']));
    beforeEach(() => err = "{err}");
    beforeEach(() => req = jasmine.createSpyObj('req', ['params']));
    beforeEach(() => req.params.and.returnValue({
      id: '{id}'
    }));
    beforeEach(() => res.status.and.returnValue(res));
    describe("when output is called", () => {
      beforeEach(() => databaseModify.readFromDB.and.returnValue('{return from readFromDB}'));
      afterEach(() => expect(databaseModify.readFromDB).toHaveBeenCalledWith(req.params.id));
      beforeEach(() => output = databaseModify.readFromDB(req.params.id));
      describe("when there is an output", () => {
        it("should respond with the output and a 200 code", () => {
          crudRoutes.read(req, res);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(output);
        });
      }); // when there is an output
    });
    describe("when output is empty", () => {
      beforeEach(() => databaseModify.readFromDB.and.returnValue(null));
      afterEach(() => expect(databaseModify.readFromDB).toHaveBeenCalledWith(req.params.id));
      beforeEach(() => output = databaseModify.readFromDB(req.params.id));
      describe("when there is an output", () => {
        it("should respond with the output and a 200 code", () => {
          crudRoutes.read(req, res);
          expect(res.status).toHaveBeenCalledWith(404);
          expect(res.send).toHaveBeenCalledWith({
            error: 'READ: Object not found'
          });
        });
      }); // when there is an output
    });
  }); // read

  describe("update", () => {
    let res, req, newEmployee;
    beforeEach(() => res = jasmine.createSpyObj('res', ['status', 'send']));
    beforeEach(() => res.status.and.returnValue(res));
    beforeEach(() => req = jasmine.createSpyObj('req', ['params']));
    beforeEach(() => req.params.and.returnValue({
      id: '{id}'
    }));
    beforeEach(() => req = jasmine.createSpyObj('req', ['body']));
    beforeEach(() => req.body.and.returnValue({
      bodyContent: '{body content}'
    }));
    beforeEach(() => newEmployee = "{newEmployee}");
    describe("when create is called", () => {
      beforeEach(() => spyOn(crudRoutes, "_handleResponse"));
      afterEach(() => expect(crudRoutes._handleResponse).toHaveBeenCalledWith(404, res));
      afterEach(() => expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(newEmployee, crudRoutes._handleResponse(404, res)));
      it("should call addToDB", () => {
        databaseModify.updateEntryInDB(newEmployee, crudRoutes._handleResponse(404, res));
      });
    });
  }); // update

  describe("onDelete", () => {
    let req, res, id;
    beforeEach(() => req = jasmine.createSpyObj('req', ['params']));
    beforeEach(() => res = jasmine.createSpyObj('res', ['status', 'send']));
    beforeEach(() => id = "{id}");
    beforeEach(() => req.params.and.returnValue({
      id: '{id}'
    }));
    describe("when create is called", () => {
      beforeEach(() => spyOn(crudRoutes, "_handleResponse"));
      afterEach(() => expect(crudRoutes._handleResponse).toHaveBeenCalledWith(404, res));
      afterEach(() => expect(databaseModify.removeFromDB).toHaveBeenCalledWith(id, crudRoutes._handleResponse(404, res)));
      it("should call addToDB", () => {
        databaseModify.removeFromDB(id, crudRoutes._handleResponse(404, res));
      });
    });
  }); // onDelete
  describe("showList", () => {
    let output, res, req;

    beforeEach(() => res = jasmine.createSpyObj('res', ['status', 'send']));
    beforeEach(() => res.status.and.returnValue(res));
    beforeEach(() => req = '{req}');
    describe("when showList is called", () => {
      beforeEach(() => databaseModify.getAllEntriesInDB.and.returnValue('{complete json}'));
      beforeEach(() => output = databaseModify.getAllEntriesInDB());
      afterEach(() => expect(databaseModify.getAllEntriesInDB).toHaveBeenCalledWith());

      it("should return the complete json file to const output and send output back with 200 code", () => {
        crudRoutes.showList(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(output);
      });
    });

  }); // showList

}); // crudRoutes