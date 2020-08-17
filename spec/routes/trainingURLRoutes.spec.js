// const moment = require('moment');
const TrainingUrl = require('../../models/trainingUrls');
const TrainingUrlRoutes = require('../../routes/trainingUrlRoutes');
const _ = require('lodash');

describe('trainingUrlRoutes', () => {
  // const ISOFORMAT = 'YYYY-MM-DD';

  const URL = '{url}';
  const CATEGORY = '{category}';
  const HITS = 0;

  const TRAINING_URL_DATA = {
    id: URL,
    category: CATEGORY,
    hits: HITS
  };

  let databaseModify, trainingUrlRoutes;

  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', [
      'addToDB',
      'getAllEntriesInDB',
      'getEntry',
      'getEntryUrl',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      '_readFromDB',
      '_readFromDBUrl',
      'removeFromDB',
      'updateEntryInDB'
    ]);

    trainingUrlRoutes = new TrainingUrlRoutes();
    trainingUrlRoutes.databaseModify = databaseModify;
  });

  describe('_create', () => {
    let data, trainingUrl;

    beforeEach(() => {
      data = _.cloneDeep(TRAINING_URL_DATA);
      trainingUrl = new TrainingUrl(data);
    });

    describe('when successfully prepares a training url', () => {
      it('should return the training url to be created', (done) => {
        trainingUrlRoutes._create(data).then((trainingUrlCreated) => {
          expect(trainingUrlCreated).toEqual(trainingUrl);
          done();
        });
      }); // should return the training url to be created
    }); // when successfully prepares a training url

    describe('when fails to validate training url', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid training category.'
        };
        delete data.category;
      });

      it('should return a 404 rejected promise', (done) => {
        trainingUrlRoutes
          ._create(data)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate training url
  }); // _create

  describe('_decodeUrl', () => {
    let id, expectedUrl;

    beforeEach(() => {
      id = 'aHR0cDovL2dvb2dsZS5jb20vaGVsbG8td29ybGQ=';
      expectedUrl = 'http://google.com/hello-world';
    });

    describe('when successfully decodes url', () => {
      it('should return the decoded url', (done) => {
        trainingUrlRoutes._decodeUrl(id).then((url) => {
          expect(url).toEqual(expectedUrl);
          done();
        });
      }); // should return the decoded url
    }); // when successfully decodes url
  }); // _decodeUrl

  describe('_read', () => {
    let data, trainingUrl;

    beforeEach(() => {
      data = _.cloneDeep(TRAINING_URL_DATA);
      trainingUrl = new TrainingUrl(data);
    });

    describe('when successfully reads a training url', () => {
      beforeEach(() => {
        spyOn(trainingUrlRoutes, '_decodeUrl').and.returnValue(URL);
        databaseModify.getEntryUrl.and.returnValue(Promise.resolve(TRAINING_URL_DATA));
      });

      it('should return the training url read', (done) => {
        trainingUrlRoutes._read(data).then((trainingUrlRead) => {
          expect(trainingUrlRead).toEqual(trainingUrl);
          expect(trainingUrlRoutes._decodeUrl).toHaveBeenCalledWith(URL);
          expect(databaseModify.getEntryUrl).toHaveBeenCalledWith(URL, CATEGORY);
          done();
        });
      }); // should return the training url read
    }); // when successfully reads a training url

    describe('when fails to decode url', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to decode url'
        };

        spyOn(trainingUrlRoutes, '_decodeUrl').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        trainingUrlRoutes
          ._read(TRAINING_URL_DATA)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(trainingUrlRoutes._decodeUrl).toHaveBeenCalledWith(URL);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to decode url

    describe('when fails to get training url', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find training url'
        };

        spyOn(trainingUrlRoutes, '_decodeUrl').and.returnValue(URL);
        databaseModify.getEntryUrl.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        trainingUrlRoutes
          ._read(TRAINING_URL_DATA)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(trainingUrlRoutes._decodeUrl).toHaveBeenCalledWith(URL);
            expect(databaseModify.getEntryUrl).toHaveBeenCalledWith(URL, CATEGORY);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to get training url
  }); // _read

  describe('_update', () => {
    let newTrainingUrl, oldTrainingUrl;

    beforeEach(() => {
      oldTrainingUrl = new TrainingUrl(TRAINING_URL_DATA);
      newTrainingUrl = new TrainingUrl(TRAINING_URL_DATA);
      newTrainingUrl.hits = 1;
    });

    describe('when successfully prepares training url', () => {
      beforeEach(() => {
        databaseModify.getEntryUrl.and.returnValue(Promise.resolve(oldTrainingUrl));
      });

      it('should return the new training url to be updated', (done) => {
        trainingUrlRoutes._update(newTrainingUrl).then((data) => {
          expect(data).toEqual(newTrainingUrl);
          done();
        });
      }); // should return the new training url to be updated
    }); // when successfully prepares training url

    describe('when fails to find old training url', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find training url'
        };

        databaseModify.getEntryUrl.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        trainingUrlRoutes
          ._update(newTrainingUrl)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntryUrl).toHaveBeenCalledWith(URL, CATEGORY);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to find old training url

    describe('when fails to validate training url', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Training url hits cannot be less than zero.'
        };

        newTrainingUrl.hits = -1;

        databaseModify.getEntryUrl.and.returnValue(Promise.resolve(oldTrainingUrl));
      });

      it('should return a 403 rejected promise', (done) => {
        trainingUrlRoutes
          ._update(newTrainingUrl)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntryUrl).toHaveBeenCalledWith(URL, CATEGORY);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate training url

    describe('when fails to validate update', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating training url category.'
        };

        oldTrainingUrl.category = 'OTHER_CATEGORY';

        databaseModify.getEntryUrl.and.returnValue(Promise.resolve(oldTrainingUrl));
      });

      it('should return a 403 rejected promise', (done) => {
        trainingUrlRoutes
          ._update(newTrainingUrl)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify.getEntryUrl).toHaveBeenCalledWith(URL, CATEGORY);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when fails to validate update
  }); // _update

  describe('_validateTrainingUrl', () => {
    let trainingUrl;

    beforeEach(() => {
      trainingUrl = new TrainingUrl(TRAINING_URL_DATA);
    });

    describe('when successfully validates training url', () => {
      it('should return the validated training url', (done) => {
        trainingUrlRoutes._validateTrainingUrl(trainingUrl).then((data) => {
          expect(data).toEqual(trainingUrl);
          done();
        });
      }); // should return the validated training url
    }); // when successfully validates training url

    describe('when training url is empty', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid training url.'
        };

        delete trainingUrl.id;
      });

      it('should return a 403 rejected promise', (done) => {
        trainingUrlRoutes
          ._validateTrainingUrl(trainingUrl)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when training url is empty

    describe('when training category is empty', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid training category.'
        };

        delete trainingUrl.category;
      });

      it('should return a 403 rejected promise', (done) => {
        trainingUrlRoutes
          ._validateTrainingUrl(trainingUrl)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when training category is empty

    describe('when number of hits is negative', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Training url hits cannot be less than zero.'
        };

        trainingUrl.hits = -1;
      });

      it('should return a 403 rejected promise', (done) => {
        trainingUrlRoutes
          ._validateTrainingUrl(trainingUrl)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when number of hits is negative
  }); // _validateTrainingUrl

  describe('_validateUpdate', () => {
    let newTrainingUrl, oldTrainingUrl;

    beforeEach(() => {
      oldTrainingUrl = new TrainingUrl(TRAINING_URL_DATA);
      newTrainingUrl = new TrainingUrl(TRAINING_URL_DATA);
    });

    describe('when successfully validates update', () => {
      it('should return the validated training url', (done) => {
        trainingUrlRoutes._validateUpdate(oldTrainingUrl, newTrainingUrl).then((data) => {
          expect(data).toEqual(newTrainingUrl);
          done();
        });
      }); // should return the validated training url
    }); // when successfully validates update

    describe('when the old url does not match the new url', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating training url.'
        };

        newTrainingUrl.id = 'OTHER_URL';
      });

      it('should return a 403 rejected promise', (done) => {
        trainingUrlRoutes
          ._validateUpdate(oldTrainingUrl, newTrainingUrl)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when the old url does not match the new url

    describe('when the category does not match the new category', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating training url category.'
        };

        newTrainingUrl.category = 'OTHER_CATEGORY';
      });

      it('should return a 403 rejected promise', (done) => {
        trainingUrlRoutes
          ._validateUpdate(oldTrainingUrl, newTrainingUrl)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 403 rejected promise
    }); // when the category does not match the new category
  }); // _validateUpdate
}); // trainingUrlRoutes
