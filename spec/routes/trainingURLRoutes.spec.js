const TrainingURLRoutes = require('../../routes/trainingURLRoutes');
const TrainingURL = require('../../models/trainingUrls');
const _ = require('lodash');

describe('trainingURLRoutes', () => {
  const id = 'https://invalidSite.notASite';
  const category = 'test';
  const hits = 1;
  const title = ' ';
  const description = ' ';
  const image = ' ';
  const logo = ' ';
  const publisher = ' ';

  const BAD_FIELDS = {
    code: 403, message: 'One of the required fields is invalid'
  };
  let databaseModify, trainingURLRoutes, trainingURL, data, metadata;

  beforeEach(() => {
    trainingURLRoutes = new TrainingURLRoutes();
    databaseModify = jasmine.createSpyObj('databaseModify', [
      'addToDB',
      'readFromDBURL'
    ]);
    data = { id, category, hits };
    metadata = { id, category, hits, title, description, image, logo, publisher };
    trainingURL = new TrainingURL(metadata);
    trainingURLRoutes.databaseModify = databaseModify;
    spyOn(trainingURLRoutes, '_getMetaData').and.returnValue({});
  });

  describe('_add', () => {

    describe('when addToDB is successful', () => {

      beforeEach(() => {
        spyOn(trainingURLRoutes, '_checkFields').and.returnValue(Promise.resolve());
        databaseModify.addToDB.and.returnValue(Promise.resolve(trainingURL));
      });

      it('should return added object', done => {
        trainingURLRoutes._add(id, data).then(result => {
          expect(result).toEqual(trainingURL);
          done();
        });
      });

      afterEach(() => {
        expect(trainingURLRoutes._checkFields).toHaveBeenCalledWith(trainingURL);
      });
    }); // when addToDB is successful

    describe('when addToDB fails', () => {
      beforeEach(() => {
        spyOn(trainingURLRoutes, '_checkFields').and.returnValue(Promise.reject(BAD_FIELDS));
      });

      it('should throw an error', done => {
        return trainingURLRoutes
          ._add(id, data)
          .then(() => {
            done(new Error('but succeeded - error expected'));
          })
          .catch(err => {
            expect(err).toEqual(BAD_FIELDS);
            done();
          });
      }); // should throw an error
    }); // when addToDB fails
  }); // _add

  describe('_checkFields', () => {
    describe('when trainingURL is valid', () => {
      it('should return a resolved promise', done => {
        trainingURLRoutes._checkFields(trainingURL).then(result => {
          expect(result).toEqual(trainingURL);
          done();
        });
      }); // should return a resolved promise
    }); // when trainingURL is valid

    describe('when id is null', () => {
      beforeEach(() => {
        trainingURL.id = undefined;
      });

      it('should throw an error', done => {
        trainingURLRoutes._checkFields(trainingURL)
          .catch(err => {
            expect(err).toEqual(BAD_FIELDS);
            done();
          });
      }); // should throw an error
    }); // when id is null

    describe('when hits is 0', () => {
      beforeEach(() => {
        trainingURL.hits = 0;
      });

      it('should throw an error', done => {
        trainingURLRoutes._checkFields(trainingURL)
          .catch(err => {
            expect(err).toEqual(BAD_FIELDS);
            done();
          });
      }); // should throw an error
    }); // when hits is 0
  }); // _checkFields

  describe('_getURLInfo', () => {

    let req, res;

    beforeEach(() => {
      req = {
        params: { id: 'id' }
      };
      res = jasmine.createSpyObj('res', ['status', 'send']);
      res.status.and.returnValue(res);
    });

    describe('output url is recieved', () => {

      beforeEach(() => {
        databaseModify.readFromDBURL.and.returnValue(Promise.resolve(['url info found']));
        spyOn(_, 'first').and.returnValue('elementFromServer');
      });

      it('should respond with the output and a 200 code', done => {
        trainingURLRoutes._getURLInfo(req, res).then(() => {
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith('elementFromServer');
          done();
        });
      }); //should respond with the output and a 200 code
    }); // url info received

    describe('output is null', () => {

      beforeEach(() => {
        databaseModify.readFromDBURL.and.returnValue(Promise.resolve(null));
      });

      it('should respond with the output and a 200 code', done => {
        trainingURLRoutes._getURLInfo(req, res).then(() => {
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(null);
          done();
        });
      }); //should respond with the output and a 200 code
    }); // output is null

    describe('output is undefined', () => {

      beforeEach(() => {
        databaseModify.readFromDBURL.and.returnValue(Promise.resolve(undefined));
        spyOn(trainingURLRoutes, '_handleError');
      });

      it('should throw an error', () => {
        trainingURLRoutes._getURLInfo(req, res).catch(() => {
          expect(trainingURLRoutes._handleError)
            .toHaveBeenCalledWith(res, {
              code: 404,
              message: 'entry not found in database'
            });
        });
      }); //should respond with the output and a 200 code
    }); // output is null
  }); // _getURLInfo

  describe('_update', () => {
    describe('when readFromDBURL is a success', () => {
      beforeEach(() => {
        databaseModify.readFromDBURL.and.returnValue(Promise.resolve(trainingURL));
      });

      it('should return an updated object', done => {
        trainingURLRoutes._update(id, category, data).then(result => {
          expect(result.data).toEqual(trainingURL.data);
          done();
        });
      }); //should return an updated object
    }); // when readFromDBURL is a success

    describe('when readFromDBURL fails', () => {

      beforeEach(() => {
        databaseModify.readFromDBURL.and.returnValue(Promise.reject('there was an error'));
      });

      it('should throw an error', () => {
        trainingURLRoutes._update(id, category, data).catch( err => {
          expect(err).toEqual('there was an error');
        });
      });
    }); // when readFromDBURL fails
  }); // _update
}); // employeeRoutes
