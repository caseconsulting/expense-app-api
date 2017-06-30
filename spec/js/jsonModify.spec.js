let jsonModify = require ('../../js/jsonModify');
const fs = require('fs');

describe("JsonModify", ()=> {
  beforeAll(() => {

    spyOn(fs, 'readFileSync').and.returnValue('jsonFile');
    spyOn(JSON, 'parse').and.returnValue([]);
    jsonModify = jsonModify('test.json');

  });

  it("should return a json filePath", () => {
    expect(jsonModify.getJson()).toEqual([]);
  });

  it("shan't work", () => {
    expect(4+5).toEqual(9);
  });
});
