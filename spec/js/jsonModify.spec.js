const jsonModifyRequire = require ('../../js/jsonModify');
const fs = require('fs');
const _ = require('lodash');

describe("JsonModify", ()=> {
  let jsonModify, jsonParsed;
  beforeEach(() => {

    spyOn(fs, 'readFileSync').and.returnValue('jsonFile');
    spyOn(JSON, 'parse').and.returnValue([]);
    jsonModify = jsonModifyRequire('test.json');
    jsonParsed = [];

  });

  describe("_matches",()=>{
    let id,jsonObj;
    beforeEach(()=>id = "{id}");
    beforeEach(()=>jsonObj={});

    describe("when the json id matches",()=>{
      beforeEach(()=>jsonObj.id=id);

      it("should be true",()=>{
        const f = jsonModify._matches(id);
        expect(f(jsonObj)).toEqual(true);
      });

    });
    describe("when the json id matches",()=>{
      beforeEach(()=>jsonObj.id="{NOTid}");

      it("should be false",()=>{
        const f = jsonModify._matches(id);
        expect(f(jsonObj)).toEqual(false);
      });

    });
  }); // _matches


  describe("_writeCallback",()=>{

  }); // _writeCallback

  describe("_addToJson",()=>{
    let newJsonObj,callback, err;
    beforeEach(()=>newJsonObj = {id:'{id}'});
    beforeEach(()=>err = "{err}");
    beforeEach(()=>callback = jasmine.createSpy('callback'));

    describe("when there is an error",()=>{
      it("should call the callback function",()=>{
        const f = jsonModify._addToJson(newJsonObj,callback);
        f(err);
        expect(callback).toHaveBeenCalledWith(err);
      });
    });
    describe("when there is no error",()=>{
      beforeEach(()=> spyOn(jsonModify,"addToJson"));
      beforeEach(()=> err = null);
      afterEach(()=> expect(jsonModify.addToJson).toHaveBeenCalledWith(newJsonObj,callback));
      it("should call addToJson",()=>{
        const f = jsonModify._addToJson(newJsonObj,callback);
        f(err);
      });
    });

  }); // _addToJson

  describe("addToJson",()=>{
    let newJsonObj, callback;
    beforeEach(()=>{
      callback = jasmine.createSpy('callback');
    });
    beforeEach(()=>newJsonObj={id:"{id}"});

    describe("when matches",()=>{
      beforeEach(()=>{
        spyOn(jsonModify,"_matches").and.returnValue("{matches}");
      });
      afterEach(()=>{
        expect(jsonModify._matches).toHaveBeenCalledWith(newJsonObj.id);
      });

      describe("when findIndex is -1",()=>{
        beforeEach(()=>{
          spyOn(_,"findIndex").and.returnValue(-1);
        });
        afterEach(()=>{
          expect(_.findIndex).toHaveBeenCalledWith(jsonParsed,"{matches}");
        });
        describe("when writting file",()=>{
          beforeEach(()=> spyOn(fs,"writeFile"));
          afterEach(()=> expect(fs.writeFile).toHaveBeenCalledWith('json/test.json', JSON.stringify([newJsonObj], null, 2), jasmine.any(Function)));

          it("should write a new json file",()=>{
            jsonModify.addToJson(newJsonObj,callback);
          });
        });
      });
      describe("when findIndex is not -1",()=>{
        beforeEach(()=>{
          spyOn(_,"findIndex").and.returnValue(7);
        });
        afterEach(()=>{
          expect(_.findIndex).toHaveBeenCalledWith(jsonParsed,"{matches}");
        });
        it("should call the callback function with an error",()=>{
          jsonModify.addToJson(newJsonObj,callback);
          expect(callback).toHaveBeenCalledWith({message:'ADD: Object already in system'});
        });
      });
    });
  }); // addToJson

  describe("readFromJson", ()=>{
    let passedID;
    beforeEach(()=>passedID="{passedID}");

    describe("when matches", ()=>{
      beforeEach(()=>{
        spyOn(jsonModify,"_matches").and.returnValue("{matches}");
      });
      afterEach(()=>{
        expect(jsonModify._matches).toHaveBeenCalledWith(passedID);
      });
      describe("when find is true", ()=>{
        beforeEach(()=>{
          spyOn(_,"find").and.returnValue(true);
        });
        afterEach(()=>{
          expect(_.find).toHaveBeenCalledWith(jsonParsed,"{matches}");
        });

        it("should return true",()=>{
          expect(jsonModify.readFromJson(passedID)).toEqual(true);
        });
      });
      describe("when find is false", ()=>{
        beforeEach(()=>{
          spyOn(_,"find").and.returnValue(false);
        });
        afterEach(()=>{
          expect(_.find).toHaveBeenCalledWith(jsonParsed,"{matches}");
        });

        it("should return null",()=>{
          expect(jsonModify.readFromJson(passedID)).toEqual(null);
        });
      });
    }); // readFromJson

    describe("removeFromJson",()=>{
      let passedID, callback;
      beforeEach(()=>{
        callback = jasmine.createSpy("callback");
      });
      beforeEach(()=>passedID="{passedID}");
      describe("when matches", ()=>{
        beforeEach(()=>{
          spyOn(jsonModify,"_matches").and.returnValue("{matches}");
        });
        afterEach(()=>{
          expect(jsonModify._matches).toHaveBeenCalledWith(passedID);
        });
        describe("when find Index returns -1",()=>{
          beforeEach(()=> spyOn(_,"findIndex").and.returnValue(-1));
          afterEach(()=> expect(_.findIndex).toHaveBeenCalledWith(jsonParsed,"{matches}"));

          it("should call the error function callback",()=>{
            //callback function should be called
            jsonModify.removeFromJson(passedID,callback);
            expect(callback).toHaveBeenCalledWith({message:'REMOVE: Object not found'});
          });
        });
        describe("when find Index returns a position",()=>{
          beforeEach(()=> spyOn(_,"findIndex").and.returnValue(1));
          afterEach(()=> expect(_.findIndex).toHaveBeenCalledWith(jsonParsed,"{matches}"));

          describe("when the object to be removed is found",()=>{
            beforeEach(()=> spyOn(_,"find").and.returnValue('output'));
            afterEach(()=> expect(_.find).toHaveBeenCalledWith(jsonParsed,"{matches}"));
            describe("when object is removed",()=>{
              beforeEach(()=> spyOn(_,"reject").and.returnValue(['jsonParsed - removed']));
              afterEach(()=> expect(_.reject).toHaveBeenCalledWith(jsonParsed, '{matches}'));

              describe("when writeCallback is called",()=>{
                beforeEach(()=> spyOn(jsonModify,"_writeCallback").and.returnValue('callback()'));
                afterEach(()=> expect(jsonModify._writeCallback).toHaveBeenCalledWith('output',callback));
                describe("when writting to json",()=>{
                  beforeEach(()=> spyOn(fs,"writeFile"));
                  afterEach(()=> expect(fs.writeFile).toHaveBeenCalledWith('json/test.json',JSON.stringify(['jsonParsed - removed'], null, 2),'callback()'));

                  it("should will write the file and return the removed element",()=>{
                    jsonModify.removeFromJson(passedID,callback);
                  });
                });
              });

            });
          });
        });
      });
    }); // removeFromJson

    describe("updateJsonEntry",()=>{
      let newJsonObj, callback;
      beforeEach(()=>{
        callback = jasmine.createSpy('callback');
      });
      beforeEach(()=>newJsonObj = {id:'{id}'});

      describe("when _addToJson is called",()=>{
        beforeEach(()=> spyOn(jsonModify,"_addToJson").and.returnValue('addToJson()'));
        afterEach(()=> expect(jsonModify._addToJson).toHaveBeenCalledWith(newJsonObj,callback));

        describe("when removeFromJson is called",()=>{
          beforeEach(()=> spyOn(jsonModify,"removeFromJson"));
          afterEach(()=> expect(jsonModify.removeFromJson).toHaveBeenCalledWith(newJsonObj.id,'addToJson()'));

          it("should pass along to removeFromJson",()=>{
            jsonModify.updateJsonEntry(newJsonObj,callback);
          });
        });

      });


    }); // updateJsonEntry

    describe("getJson", ()=>{
      it("should return a json filePath", () => {
        expect(jsonModify.getJson()).toEqual([]);
      });
    }); // getJson

  });
});
