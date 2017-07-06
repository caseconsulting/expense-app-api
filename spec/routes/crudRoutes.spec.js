const crudRoutesRequire = require('../../routes/crudRoutes');

describe("crudRoutes", () => {

  let crudRoutes, jsonModify, _add, _update;
  beforeEach(() => jsonModify = jasmine.createSpyObj('jsonModify', ['addToJson', 'readFromJson', 'removeFromJson', 'updateJsonEntry', 'getJson']));
  beforeEach(() => _add = jasmine.createSpy('_add'));
  beforeEach(() => _update = jasmine.createSpy('_update'));
  beforeEach(() => crudRoutes = crudRoutesRequire(jsonModify, _add, _update));

  describe("_handleResponse", () => {
    let errorCode, res, sendBack, err;
    beforeEach(() => errorCode = "{errorCode}");
    beforeEach(() => res = jasmine.createSpyObj('res', ['status', 'send']));
    beforeEach(() => sendBack = "{sendBack}");
    beforeEach(() => err = {
      message: '{message}'
    });
    describe("when there is an error", () => {
      beforeEach(() => res.status.and.returnValue(res));
      it("should call respond with a given error code", () => {
        const f = crudRoutes._handleResponse(errorCode, res);
        f(err, sendBack);
        expect(res.status).toHaveBeenCalledWith(errorCode);
        expect(res.send).toHaveBeenCalledWith({
          error: err.message
        });
      });
    });
    describe("when there is no error", () => {
      beforeEach(() => res.status.and.returnValue(res));
      beforeEach(() => err = null);
      it("should call respond with a given error code", () => {
        const f = crudRoutes._handleResponse(errorCode, res);
        f(err, sendBack);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(sendBack);
      });
    });
  }); // _handleResponse

  describe("create", () => {
    let req, res, newEmployee;
    beforeEach(() => req = jasmine.createSpyObj('req', ['body']));
    beforeEach(() => res = jasmine.createSpyObj('res', ['status', 'send']));
    beforeEach(() => newEmployee = "{newEmployee}");
    beforeEach(() => req.body.and.returnValue({
      bodyContent: '{body content}'
    }));

    describe("when create is called", () => {

      beforeEach(() => spyOn(crudRoutes, "_handleResponse"));
      afterEach(() => expect(crudRoutes._handleResponse).toHaveBeenCalledWith(404, res));
      afterEach(() => expect(jsonModify.addToJson).toHaveBeenCalledWith(newEmployee, crudRoutes._handleResponse(404, res)));
      it("should call addToJson", () => {
        jsonModify.addToJson(newEmployee, crudRoutes._handleResponse(404, res));
      });
    });
  }); // create



}); // crudRoutes
