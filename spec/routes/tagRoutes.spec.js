const TagRoutes = require('../../routes/tagRoutes');
const _ = require('lodash');

const Tag = require('../../models/tag');

describe('tagRoutes', () => {
  const _ROUTER = '{router}';

  const ID = '{id}';
  const TAG_NAME = '{tagName}';
  const EMPLOYEES = '{employees}';

  const TAG_DATA = {
    id: ID,
    tagName: TAG_NAME,
    employees: EMPLOYEES
  };

  let databaseModify, res, tagRoutes;
  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', ['getAllEntriesInDB', 'getEntry']);
    res = jasmine.createSpyObj('res', ['status', 'send']);
    res.status.and.returnValue(res);
    tagRoutes = new TagRoutes();
    tagRoutes.databaseModify = databaseModify;
    tagRoutes._router = _ROUTER;
  });

  // validating a Tag
  describe('_validateTag', () => {
    let tag;
    beforeEach(() => {
      tag = new Tag(TAG_DATA);
    });

    // valid Tag
    describe('when successfully validating a Tag', () => {
      let expectedTag;
      beforeEach(() => {
        tag.employees = null;
        expectedTag = _.cloneDeep(tag);
      });

      it('should return the expected Tag', (done) => {
        tagRoutes._validateTag(tag).then((data) => {
          expect(data).toEqual(expectedTag);
          done();
        });
      });
    });

    // invalid tag
    describe('when validating a tag is unsuccessful', () => {
      let tag;
      let err;
      beforeEach(() => {
        tag = new Tag(TAG_DATA);
        err = {
          code: 403,
          message: 'Error validating tag.'
        };
      });

      // invalid id
      describe('when id is null', () => {
        beforeEach(() => {
          tag.id = null;
          err.message = 'Invalid tag id.';
        });
        it('should return 403 rejected promise', (done) => {
          tagRoutes
            ._validateTag(tag)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when tag id is null

      // invalid tag name
      describe('when tag name is null', () => {
        beforeEach(() => {
          tag.tagName = null;
          err.message = 'Invalid tag name.';
        });
        it('should return 403 rejected promise', (done) => {
          tagRoutes
            ._validateTag(tag)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when tag name is null
    });
  }); // END _validateTag

  //   describe('_validateCreate', () => {
  //     let tag;
  //     beforeEach(() => {
  //       tag = new Tag(TAG_DATA);
  //     });

  //     describe('when validate create is successful', () => {});
  //   });
});
