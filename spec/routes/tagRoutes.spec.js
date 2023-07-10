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
    }); // END when validating a tag is unsuccessful
  }); // END _validateTag

  // validate create
  describe('_validateCreate', () => {
    let tag;
    let existingTag;
    beforeEach(() => {
      tag = new Tag(TAG_DATA);
      existingTag = _.cloneDeep(tag);
      existingTag.id = 'id2';
      existingTag.tagName = 'tagName2';
      databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([existingTag]));
    });
    // when validate create is successful
    describe('when validate create is successful', () => {
      it('should return the expected Tag', (done) => {
        tagRoutes
          ._validateCreate(tag)
          .then((data) => {
            expect(data).toEqual(tag);
            done();
          })
          .catch((error) => {
            fail('should not have thrown error: ' + JSON.stringify(error));
            done();
          });
      });
    }); // END when validate create is successful

    // when validate create is unsuccessful
    describe('when validate create is unsuccessful', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating create for Tag.'
        };
      });
      // when tag ID is duplicated
      describe('when tag ID is duplicated', () => {
        beforeEach(() => {
          existingTag.id = '{id}';
          err.message = 'Unexpected duplicate id created. Please try submitting again.';
        });
        it('should return 403 rejected promise', (done) => {
          tagRoutes
            ._validateCreate(tag)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when tag ID is duplicated

      // when tag name is duplicated
      describe('when tag name is duplicated', () => {
        beforeEach(() => {
          existingTag.tagName = '{tagName}';
          err.message = `Tag name ${tag.tagName} is already taken. Please specify a new tag name.`;
        });
        it('should return 403 rejected promise', (done) => {
          tagRoutes
            ._validateCreate(tag)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when tag name is duplicated
    }); // END when validate create is unsuccessful
  }); // END _validateCreate

  // _validateDelete
  describe('_validateDelete', () => {
    let tag;
    beforeEach(() => {
      tag = new Tag(TAG_DATA);
      tag.employees = null;
    });
    // when validate delete is successful
    describe('when validate delete is successful', () => {
      it('should return the validated tag object', (done) => {
        tagRoutes._validateDelete(tag).then((data) => {
          expect(data).toEqual(tag);
          done();
        });
      });
    }); // END when validate delete is successful

    // when validate delete is unsuccessful
    describe('when validate delete is unsuccessful', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating create for Tag.'
        };
      });
      // when there are employees attached to tag
      describe('when there are employees attached to tag', () => {
        beforeEach(() => {
          tag.employees = [tag.employees];
          err.message = 'All employees must be removed from tag before deleting tag';
        });
        it('should return 403 rejected promise', (done) => {
          tagRoutes
            ._validateDelete(tag)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when there are employees attached to tag
    }); // END when validate delete is unsuccessful
  }); // END _validateDelete

  // _validateUpdate
  describe('_validateUpdate', () => {
    // when validate update is successful
    describe('when validate update is successful', () => {
      let oldTag;
      let newTag;
      let existingTag;
      beforeEach(() => {
        oldTag = new Tag(TAG_DATA);
        newTag = new Tag(TAG_DATA);
        newTag.tagName = 'new tag name';
        existingTag = new Tag(TAG_DATA);
        existingTag.id = '{id2}';
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([existingTag]));
      });
      it('should return the validated tag', (done) => {
        tagRoutes._validateUpdate(oldTag, newTag).then((data) => {
          expect(data).toEqual(newTag);
          done();
        });
      });
    }); // END when validate update is successful

    // when validate update is unsuccessful
    describe('when validate update is unsuccessful', () => {
      let oldTag;
      let newTag;
      let existingTag;
      let err;
      beforeEach(() => {
        oldTag = new Tag(TAG_DATA);
        newTag = new Tag(TAG_DATA);
        existingTag = new Tag(TAG_DATA);
        newTag.tagName = 'new tag name';
        err = {
          code: 403,
          message: 'Error validating update for tag.'
        };
      });

      // when old tag id does not match new tag id
      describe('when old tag id does not match new tag id', () => {
        beforeEach(() => {
          err.message = 'Error validating tag IDs.';
          oldTag.id = 'id2';
        });
        it('should return 403 rejected promise', (done) => {
          tagRoutes
            ._validateUpdate(oldTag, newTag)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when old tag id does not match new tag id

      // when tag name is duplicated
      describe('when tag name is duplicated', () => {
        beforeEach(() => {
          newTag.tagName = '{tagName2}';
          existingTag.tagName = '{tagName2}';
          existingTag.id = '{id2}';
          err.message = `Tag name ${newTag.tagName} is already taken. Please specify a new tag name.`;
          databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([existingTag]));
        });
        it('should return 403 rejected promise', (done) => {
          tagRoutes
            ._validateUpdate(oldTag, newTag)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when tag name is duplicated
    }); // END when validate update is unsuccessful
  }); // END _validateUpdate

  // _create
  describe('_create', () => {
    let tag;
    beforeEach(() => {
      tag = new Tag(TAG_DATA);
    });
    // when successfully creating tag
    describe('when successfully creating tag', () => {
      let existingTag;
      beforeEach(() => {
        existingTag = new Tag(TAG_DATA);
        existingTag.id = '{id2}';
        existingTag.tagName = '{tagName2}';
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([existingTag]));
      });
      it('should return the created tag', (done) => {
        tagRoutes._create(tag).then((data) => {
          expect(data).toEqual(tag);
          done();
        });
      });
    }); // END when successfully creating tag

    // when creating tag is unsuccessful
    describe('when creating tag is unsuccessful', () => {
      let tag;
      let existingTag;
      let err;
      beforeEach(() => {
        tag = new Tag(TAG_DATA);
        existingTag = new Tag(TAG_DATA);
        existingTag.id = '{id2}';
        err = {
          code: 403,
          message: `Tag name ${tag.tagName} is already taken. Please specify a new tag name.`
        };
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([existingTag]));
      });
      it('should return 403 rejected promise', (done) => {
        tagRoutes
          ._create(tag)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      });
    }); // END when creating tag is unsuccessful
  }); // END _create

  // _update
  describe('_update', () => {
    let tag;
    let existingTag;
    beforeEach(() => {
      tag = new Tag(TAG_DATA);
      existingTag = new Tag(TAG_DATA);
    });

    // when update is successful
    describe('when update is successful', () => {
      let updatedTag;
      beforeEach(() => {
        updatedTag = new Tag(TAG_DATA);
        updatedTag.tagName = 'new tag name';
        existingTag.id = '{id2}';
        existingTag.tagName = '{newTagName}';
        databaseModify.getEntry.and.returnValue(Promise.resolve(tag));
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([existingTag]));
      });
      it('should return updated tag', (done) => {
        tagRoutes._update(updatedTag).then((data) => {
          expect(data).toEqual(updatedTag);
          expect(databaseModify.getEntry).toHaveBeenCalledWith(tag.id);
          done();
        });
      });
    }); // END when update is successful

    // when update is unsuccessful
    describe('when update is unsuccessful', () => {
      let updatedTag;
      let err;
      beforeEach(() => {
        updatedTag = new Tag(TAG_DATA);
        updatedTag.tagName = 'new tag name';
        existingTag.id = '{id2}';
        existingTag.tagName = 'new tag name';
        databaseModify.getEntry.and.returnValue(Promise.resolve(tag));
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([existingTag]));
        err = {
          code: 403,
          message: `Tag name ${updatedTag.tagName} is already taken. Please specify a new tag name.`
        };
      });
      it('should return 403 rejected promise', (done) => {
        tagRoutes
          ._update(updatedTag)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      });
    }); // END when update is successful
  }); // _update

  // _delete
  describe('_delete', () => {
    let tag;
    beforeEach(() => {
      tag = new Tag(TAG_DATA);
      delete tag.employees;
    });
    // when delete is successful
    describe('when delete is successful', () => {
      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(tag));
      });
      it('should return deleted tag', (done) => {
        tagRoutes._delete(tag.id).then((data) => {
          expect(data).toEqual(tag);
          expect(databaseModify.getEntry).toHaveBeenCalledWith(tag.id);
          done();
        });
      });
    }); // END when delete is successful
  }); // END _delete
});
