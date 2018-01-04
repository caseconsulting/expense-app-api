const databaseModify = require('../../js/databaseModify');
const fs = require('fs');
const _ = require('lodash');

describe("databaseModify", () => {
  let databaseModify, jsonParsed;
  beforeEach(() => {

    spyOn(fs, 'readFileSync').and.returnValue('jsonFile');
    spyOn(JSON, 'parse').and.returnValue([]);
    databaseModify = new databaseModify();
    jsonParsed = [];

  });

  describe("findObjectInDB", () => {
    //
    let primaryKey;

    beforeEach(() => primaryKey = "{primaryKey}");
    beforeEach(() => {
      // spyOn(_, "find");
    });
    afterEach(() => {
      //Expect something
      // expect(_.find).toHaveBeenCalledWith(jsonParsed, [indexKey, targetValue]);
    });

    describe("when found is not null", () => {
      beforeEach(() => {
        _.find.and.returnValue("{found}");
      });
      it("should return found", () => {
        const returnVal = databaseModify.findObjectInDB(targetValue);
        expect(returnVal).toEqual("{found}");
      });
    }); //when found is not null

    describe("when found is null", () => {
      beforeEach(() => {
        _.find.and.returnValue(null);
      });
      it("should return null", () => {
        const returnVal = databaseModify.findObjectInDB(targetValue);
        expect(returnVal).toEqual(null);
      });
    }); //when found is null
  }); //findObjectInDB

  describe("_addToJson", () => {
    let newJsonObj, callback, err;
    beforeEach(() => newJsonObj = {
      id: '{id}'
    });
    beforeEach(() => err = "{err}");
    beforeEach(() => callback = jasmine.createSpy('callback'));

    describe("when there is an error", () => {
      it("should call the callback function", () => {
        const f = databaseModify._addToJson(newJsonObj, callback);
        f(err);
        expect(callback).toHaveBeenCalledWith(err);
      });
    });
    describe("when there is no error", () => {
      beforeEach(() => spyOn(databaseModify, "addToDB"));
      beforeEach(() => err = null);
      afterEach(() => expect(databaseModify.addToDB).toHaveBeenCalledWith(newJsonObj, callback));
      it("should call addToDB", () => {
        const f = databaseModify._addToJson(newJsonObj, callback);
        f(err);
      });
    });
  }); // _addToJson

  describe("addToDB", () => {
    let newJsonObj, callback;
    beforeEach(() => newJsonObj = "{newJsonObj}");
    beforeEach(() => callback = "{callback}");

    describe("when newJsonObj is true", () => {
      beforeEach(() => newJsonObj = true);
      beforeEach(() => spyOn(databaseModify, '_writeCallback').and.returnValue('_writeCallback()'));
      afterEach(() => {
        expect(databaseModify._writeCallback).toHaveBeenCalledWith(newJsonObj, callback);
      });
      describe("when writting file", () => {
        beforeEach(() => spyOn(fs, "writeFile"));
        afterEach(() => expect(fs.writeFile).toHaveBeenCalledWith('json/', JSON.stringify([newJsonObj], null, 2), '_writeCallback()'));

        it("should write a new json file", () => {
          databaseModify.addToDB(newJsonObj, callback);
        });
      });

    });
  }); // addToDB

  //TODO redo this. _matches does not exist anymore
  describe("readFromDB", () => {
    let passedID;
    beforeEach(() => passedID = "{passedID}");

    describe("when matches", () => {
      beforeEach(() => {
        spyOn(databaseModify, "_matches").and.returnValue("{matches}");
      });
      afterEach(() => {
        expect(databaseModify._matches).toHaveBeenCalledWith(passedID);
      });
      describe("when find is true", () => {
        beforeEach(() => {
          spyOn(_, "find").and.returnValue(true);
        });
        afterEach(() => {
          expect(_.find).toHaveBeenCalledWith(jsonParsed, "{matches}");
        });

        it("should return true", () => {
          expect(databaseModify.readFromDB(passedID)).toEqual(true);
        });
      });
      describe("when find is false", () => {
        beforeEach(() => {
          spyOn(_, "find").and.returnValue(false);
        });
        afterEach(() => {
          expect(_.find).toHaveBeenCalledWith(jsonParsed, "{matches}");
        });

        it("should return null", () => {
          expect(databaseModify.readFromDB(passedID)).toEqual(null);
        });
      });
    }); // readFromDB

    describe("removeFromDB", () => {
      let passedID, callback;
      beforeEach(() => {
        callback = jasmine.createSpy("callback");
      });
      beforeEach(() => passedID = "{passedID}");
      describe("when matches", () => {
        beforeEach(() => {
          spyOn(databaseModify, "_matches").and.returnValue("{matches}");
        });
        afterEach(() => {
          expect(databaseModify._matches).toHaveBeenCalledWith(passedID);
        });
        describe("when find Index returns -1", () => {
          beforeEach(() => spyOn(_, "findIndex").and.returnValue(-1));
          afterEach(() => expect(_.findIndex).toHaveBeenCalledWith(jsonParsed, "{matches}"));

          it("should call the error function callback", () => {
            //callback function should be called
            databaseModify.removeFromDB(passedID, callback);
            expect(callback).toHaveBeenCalledWith({
              message: 'REMOVE: Object not found'
            });
          });
        });
        describe("when find Index returns a position", () => {
          beforeEach(() => spyOn(_, "findIndex").and.returnValue(1));
          afterEach(() => expect(_.findIndex).toHaveBeenCalledWith(jsonParsed, "{matches}"));

          describe("when the object to be removed is found", () => {
            beforeEach(() => spyOn(_, "find").and.returnValue('output'));
            afterEach(() => expect(_.find).toHaveBeenCalledWith(jsonParsed, "{matches}"));
            describe("when object is removed", () => {
              beforeEach(() => spyOn(_, "reject").and.returnValue(['jsonParsed - removed']));
              afterEach(() => expect(_.reject).toHaveBeenCalledWith(jsonParsed, '{matches}'));

              describe("when writeCallback is called", () => {
                beforeEach(() => spyOn(databaseModify, "_writeCallback").and.returnValue('callback()'));
                afterEach(() => expect(databaseModify._writeCallback).toHaveBeenCalledWith('output', callback));
                describe("when writting to json", () => {
                  beforeEach(() => spyOn(fs, "writeFile"));
                  afterEach(() => expect(fs.writeFile).toHaveBeenCalledWith('json/', JSON.stringify(['jsonParsed - removed'], null, 2), 'callback()'));

                  it("should will write the file and return the removed element", () => {
                    databaseModify.removeFromDB(passedID, callback);
                  });
                });
              });

            });
          });
        });
      });
    }); // removeFromDB

    describe("updateEntryInDB", () => {
      let newJsonObj, callback;
      beforeEach(() => {
        callback = jasmine.createSpy('callback');
      });
      beforeEach(() => newJsonObj = {
        id: '{id}'
      });

      describe("when _addToJson is called", () => {
        beforeEach(() => spyOn(databaseModify, "_addToJson").and.returnValue('addToDB()'));
        afterEach(() => expect(databaseModify._addToJson).toHaveBeenCalledWith(newJsonObj, callback));

        describe("when removeFromDB is called", () => {
          beforeEach(() => spyOn(databaseModify, "removeFromDB"));
          afterEach(() => expect(databaseModify.removeFromDB).toHaveBeenCalledWith(newJsonObj.id, 'addToDB()'));

          it("should pass along to removeFromDB", () => {
            databaseModify.updateEntryInDB(newJsonObj, callback);
          });
        });

      });


    }); // updateEntryInDB

    describe("getAllEntriesInDB", () => {
      it("should return a json filePath", () => {
        expect(databaseModify.getAllEntriesInDB()).toEqual([]);
      });
    }); // getAllEntriesInDB

  });
});