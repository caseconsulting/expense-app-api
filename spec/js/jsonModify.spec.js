let jsonModify = require ('../../js/jsonModify');
const fs = require('fs');
const _ = require('lodash');

describe("JsonModify", ()=> {
  beforeAll(() => {

    spyOn(fs, 'readFileSync').and.returnValue('jsonFile');
    spyOn(JSON, 'parse').and.returnValue([]);
    jsonModify = jsonModify('test.json');

  });

  describe("getJson", ()=>{
    it("should return a json filePath", () => {
      expect(jsonModify.getJson()).toEqual([]);
    });
  }); // getJson

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
});
