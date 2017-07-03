const jsonModifyRequire = require ('../../js/jsonModify');
const fs = require('fs');
const _ = require('lodash');

fdescribe("JsonModify", ()=> {
  let JsonModify;
  beforeEach(() => {

    spyOn(fs, 'readFileSync').and.returnValue('jsonFile');
    spyOn(JSON, 'parse').and.returnValue([]);
    jsonModify = jsonModifyRequire('test.json');

  });

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
          expect(_.findIndex).toHaveBeenCalledWith([newJsonObj],"{matches}");
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
          expect(_.findIndex).toHaveBeenCalledWith([],"{matches}");
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
          expect(_.find).toHaveBeenCalledWith([],"{matches}");
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
          expect(_.find).toHaveBeenCalledWith([],"{matches}");
        });

        it("should return null",()=>{
          expect(jsonModify.readFromJson(passedID)).toEqual(null);
        });
      });
    }); // readFromJson

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
  });

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
      describe("when remove returns an empty array",()=>{
        beforeEach(()=> spyOn(_,"remove").and.returnValue([]));
        afterEach(()=> expect(_.remove).toHaveBeenCalledWith([],"{matches}"));

        it("should call the error function callback",()=>{
          //callback function should be called
          jsonModify.removeFromJson(passedID,callback);
          expect(callback).toHaveBeenCalledWith({message:'REMOVE: Object not found'});
        });
      });
      describe("when remove returns an element",()=>{
        beforeEach(()=> spyOn(_,"remove").and.returnValue(["output"]));
        afterEach(()=> expect(_.remove).toHaveBeenCalledWith([],"{matches}"));
        describe("when writting to json",()=>{
          beforeEach(()=> spyOn(fs,"writeFile"));
          afterEach(()=> expect(fs.writeFile).toHaveBeenCalledWith('json/test.json',"[]",jasmine.any(Function)));

          it("should will write the file and return the removed element",()=>{
            expect(jsonModify.removeFromJson(passedID,callback)).toEqual("output");
          });
        });
      });
        });
  }); // removeFromJson

  describe("getJson", ()=>{
    it("should return a json filePath", () => {
      expect(jsonModify.getJson()).toEqual([]);
    });
  }); // getJson

});
