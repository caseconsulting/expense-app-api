const TrainingURLRoutes = require('../../routes/trainingURLRoutes');
const TrainingURL = require('../../models/trainingUrls');

describe('trainingURLRoutes', () => {
  const id = 'https://google.com';
  const category = '["Conference"]';
  const hits = 1;

  let trainingURLDynamo, trainingURLRoutes;

  beforeEach(() => {
    trainingURLRoutes = new TrainingURLRoutes();
    trainingURLDynamo = jasmine.createSpyObj('trainingURLDynamo', ['addToDB', 'updateEntryInDB']);
    trainingURLRoutes.trainingURLDynamo = trainingURLDynamo;
  });

  describe('_add', () => {
    let expectedTrainingURL, data;

    beforeEach(() => {
      data = { id, category, hits };
      expectedTrainingURL = new TrainingURL(data);

      spyOn(trainingURLRoutes, '_checkFields').and.returnValue(Promise.resolve());
      trainingURLDynamo.addToDB.and.returnValue(Promise.resolve(expectedTrainingURL));
    });
    afterEach(() => {
      expect(trainingURLRoutes._checkFields).toHaveBeenCalledWith(expectedTrainingURL);
    });
    describe('when addToDB is successful', () => {
      it('should return added object', done => {
        return trainingURLRoutes._add(id, data).then(result => {
          expect(result).toEqual(expectedTrainingURL);
          done();
        });
      });
    }); // when DynamoDB is successful

    xdescribe('when addToDB fails', () => {
      let expectedErr;
      beforeEach(() => {
        expectedErr = 'error from DynamoDB';
        trainingURLDynamo.addToDB.and.returnValue(Promise.reject(expectedErr));
      });

      it('should throw the error', done => {
        return trainingURLRoutes._add(id, data).catch(err => {
          expect(err).toEqual(expectedErr);
          done();
        });
      });
    }); // when DynamoDB throws an error
  }); // _add

  //   describe('_update', () => {
  //     let expectedExpenseType, data;

  //     beforeEach(() => {
  //       data = {
  //         id,
  //         budgetName,
  //         budget,
  //         odFlag,
  //         description,
  //         startDate,
  //         endDate,
  //         recurringFlag
  //       };
  //       expectedExpenseType = new ExpenseType(data);

  //       spyOn(expenseTypeRoutes, '_checkFields').and.returnValue(Promise.resolve());
  //       spyOn(expenseTypeRoutes, '_checkDates').and.returnValue(Promise.resolve());
  //     });

  //     afterEach(() => {
  //       expect(expenseTypeRoutes._checkFields).toHaveBeenCalledWith(expectedExpenseType);
  //       expect(expenseTypeRoutes._checkDates).toHaveBeenCalledWith(startDate, endDate, recurringFlag);
  //     });

  //     describe('when updateEntryInDB is successful', () => {
  //       beforeEach(() => {
  //         expenseTypeDynamo.updateEntryInDB.and.returnValue(Promise.resolve(expectedExpenseType));
  //       });

  //       it('should return updated object', done => {
  //         return expenseTypeRoutes._update(id, data).then(result => {
  //           expect(result).toEqual(expectedExpenseType);
  //           done();
  //         });
  //       });
  //     }); // when DynamoDB is successful

  //     describe('when updateEntryInDB fails', () => {
  //       let expectedErr;

  //       beforeEach(() => {
  //         expectedErr = 'error from DynamoDB';
  //         expenseTypeDynamo.updateEntryInDB.and.returnValue(Promise.reject(expectedErr));
  //       });

  //       it('should throw the error', done => {
  //         return expenseTypeRoutes._update(id, data).catch(err => {
  //           expect(err).toEqual(expectedErr);
  //           done();
  //         });
  //       });
  //     }); // when DynamoDB update throws an error
  //   }); // _update

  //   describe('_checkFields', () => {
  //     let expenseType;

  //     describe('if a vaild expense type is given', () => {
  //       let keptItsPromise;
  //       beforeEach(() => {
  //         expenseType = { id, budgetName, budget, odFlag, description, startDate, endDate, recurringFlag };
  //         keptItsPromise = false;
  //       });

  //       it('should return a resolved promise', done => {
  //         expenseTypeRoutes
  //           ._checkFields(expenseType)
  //           .then(() => {
  //             keptItsPromise = true;
  //             expect(keptItsPromise).toBe(true);
  //             done();
  //           })
  //           .catch(() => done(new Error('Promise should resolve')));
  //       }); // should return a resolved promise
  //     }); // if a vaild expense type is given
  //     describe('if a misformed expense type object is given', () => {
  //       let expectedErr;
  //       beforeEach(() => {
  //         expectedErr = {
  //           code: 403,
  //           message: 'One of the required fields is empty.'
  //         };
  //         expenseType = { budgetName, budget, odFlag, description, startDate, endDate, recurringFlag };
  //       });
  //       it('should return a promise rejection', done => {
  //         expenseTypeRoutes
  //           ._checkFields(expenseType)
  //           .then(() => done(new Error('Promise should reject')))
  //           .catch(err => {
  //             expect(err).toEqual(expectedErr);
  //             done();
  //           });
  //       }); // should return a promise rejection
  //     }); // if a misformed expense type object is given
  //   }); // _checkFields

  //   describe('_checkDates', () => {
  //     let startDate, endDate, recurringFlag, keptItsPromise;

  //     describe('if valid date range is given', () => {
  //       beforeEach(() => {
  //         startDate = '1970-12-01';
  //         endDate = '1970-12-31';
  //         recurringFlag = false;
  //         keptItsPromise = false;
  //       });

  //       it('should return a resolved promise', done => {
  //         expenseTypeRoutes
  //           ._checkDates(startDate, endDate, recurringFlag)
  //           .then(() => {
  //             keptItsPromise = true;
  //             expect(keptItsPromise).toBe(true);
  //             done();
  //           })
  //           .catch(() => done(new Error('Promise should resolve')));
  //       }); // should return a resolved promise
  //     }); // if valid date range is given

  //     describe('if an invalid range is given', () => {
  //       let expectedErr;
  //       beforeEach(() => {
  //         expectedErr = {
  //           code: 403,
  //           message: 'The dates are invalid.'
  //         };
  //         startDate = '2019-12-31';
  //         endDate = '1970-12-31';
  //         recurringFlag = false;
  //         keptItsPromise = false;
  //       });
  //       it('should return a promise rejection', done => {
  //         expenseTypeRoutes
  //           ._checkDates(startDate, endDate, recurringFlag)
  //           .then(() => done(new Error('Promise should reject')))
  //           .catch(err => {
  //             keptItsPromise = true;
  //             expect(err).toEqual(expectedErr);
  //             done();
  //           });
  //       }); // should return a promise rejection
  //     }); // if an invalid range is given
  //   }); // _checkDates
}); // employeeRoutes
