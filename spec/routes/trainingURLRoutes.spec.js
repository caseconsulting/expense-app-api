const TrainingURLRoutes = require('../../routes/trainingURLRoutes');
const TrainingURL = require('../../models/trainingUrls');

describe('trainingURLRoutes', () => {
  const id = 'https://testing.com';
  const category = 'test';
  const hits = 1;
  const BAD_FIELDS = {
    code: 403, message: 'One of the required fields is invalid'
  };
  let trainingURLDynamo, trainingURLRoutes, trainingURL, data;

  beforeEach(() => {
    trainingURLRoutes = new TrainingURLRoutes();
    trainingURLDynamo = jasmine.createSpyObj('trainingURLDynamo', ['addToDB', 'readFromDBURL']);
    trainingURLRoutes.trainingURLDynamo = trainingURLDynamo;
    data = { id, category, hits };
    trainingURL = new TrainingURL(data);
  });

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

  describe('_add', () => {

    describe('when addToDB is successful', () => {

      beforeEach(() => {
        spyOn(trainingURLRoutes, '_checkFields').and.returnValue(Promise.resolve());
        trainingURLDynamo.addToDB.and.returnValue(Promise.resolve(trainingURL));
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
    }); // when DynamoDB is successful

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

  describe('_update', () => {
    describe('when readFromDBURL is a success', () => {
      beforeEach(() => {
        trainingURLDynamo.readFromDBURL.and.returnValue(Promise.resolve(trainingURL));
      });

      it('should return an updated object', done => {
        trainingURLRoutes._update(id, category, data).then(result => {
          expect(result.data).toEqual(trainingURL.data);
          done();
        });
      }); //should return an updated object
    }); // when readFromDBURL is a success
  }); // _update
}); // employeeRoutes
