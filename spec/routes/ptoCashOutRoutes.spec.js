const PTOCashOutRoutes = require('../../routes/ptoCashOutRoutes');
const _ = require('lodash');

const PTOCashOut = require('../../models/ptoCashOut');
const Employee = require('../../models/employee');

describe('ptoCashOutRoutes', () => {
  const _ROUTER = '{router}';
  const ID = '{id}';
  const EMPLOYEE_ID = '{employeeId}';
  const CREATION_DATE = '{creationDate}';
  const AMOUNT = 10;

  const APPROVED_DATE = '{approvedDate}';

  const PTO_CASH_OUT_DATA = {
    id: ID,
    employeeId: EMPLOYEE_ID,
    creationDate: CREATION_DATE,
    amount: AMOUNT,
    approvedDate: APPROVED_DATE
  };

  const EMPLOYEE = new Employee({
    id: ID,
    email: '{email}',
    employeeNumber: 0,
    employeeRole: '{employeeRole}',
    firstName: '{firstName}',
    hireDate: '{hireDate}',
    lastName: '{lastName}',
    workStatus: '{workStatus}'
  });

  let databaseModify, employeeDynamo, ptoCashOutRoutes, res;

  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', ['getAllEntriesInDB', 'getEntry']);
    employeeDynamo = jasmine.createSpyObj('employeeDynamo', ['getAllEntriesInDB']);
    res = jasmine.createSpyObj('res', ['status', 'send']);
    res.status.and.returnValue(res);
    ptoCashOutRoutes = new PTOCashOutRoutes();
    ptoCashOutRoutes.databaseModify = databaseModify;
    ptoCashOutRoutes.employeeDynamo = employeeDynamo;
    ptoCashOutRoutes._router = _ROUTER;
  });

  // validating a PTO cash out
  describe('_validatePtoCashOut', () => {
    let ptoCashOut;
    let employee;
    beforeEach(() => {
      ptoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
      employee = _.cloneDeep(EMPLOYEE);
    });

    // valid PTO cash out tests
    describe('when successfully validating a PTO cash out', () => {
      let expectedPtoCashOut;
      beforeEach(() => {
        ptoCashOut.employeeId = employee.id;
        ptoCashOut.creationDate = 'Test Creation Date';
        ptoCashOut.amount = 10;
        ptoCashOut.approvedDate = 'Test Approved Date';
        expectedPtoCashOut = _.cloneDeep(ptoCashOut);
      });

      it('should return the expected PTO cash oout', (done) => {
        ptoCashOutRoutes._validatePTOCashOut(ptoCashOut).then((data) => {
          expect(data).toEqual(expectedPtoCashOut);
          done();
        });
      });

      // optional PTO cash out approvedDate
      describe('when PTO cash out approved date is nil', () => {
        beforeEach(() => {
          ptoCashOut.approvedDate = null;
        });

        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validatePTOCashOut(ptoCashOut)
            .then((data) => {
              expect(data).toEqual(ptoCashOut);
              done();
            })
            .catch((error) => {
              fail('Should not have thrown error: ' + error);
              done();
            });
        });
      }); // END when PTO cash out approved date is nil
    }); // END when successfully validating a PTO cash out

    // invalid contract tests
    describe('when failing to validate a PTO cash out', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating ptoCashOut.'
        };
      });

      // invalid id
      describe('when PTO cash out id is nil', () => {
        beforeEach(() => {
          ptoCashOut.id = null;
          err.message = 'Invalid ptoCashOut id.';
        });

        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validatePTOCashOut(ptoCashOut)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when PTO cash out id is nil

      // invalid employee id
      describe('when PTO cash out employee id is nil', () => {
        beforeEach(() => {
          ptoCashOut.employeeId = null;
          err.message = 'Invalid employeeId.';
        });

        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validatePTOCashOut(ptoCashOut)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when PTO cash out employee id is nil

      // invalid PTO cash out creationDate
      describe('when PTO cash out creationDate is nil', () => {
        beforeEach(() => {
          ptoCashOut.creationDate = null;
          err.message = 'Invalid creationDate.';
        });

        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validatePTOCashOut(ptoCashOut)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when PTO cash out creationDate is nil

      // invalid amount being null
      describe('when PTO cash out amount is nil', () => {
        beforeEach(() => {
          ptoCashOut.amount = null;
          err.message = 'Invalid amount.';
        });

        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validatePTOCashOut(ptoCashOut)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when PTO cash out amount is nil
    }); // END when failing to validate a PTO cash out
  }); // END _validatePtoCashOut

  // validating a PTO cash out update
  describe('_validateUpdate', () => {
    let oldPtoCashOut;
    let newPtoCashOut;

    beforeEach(() => {
      oldPtoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
      newPtoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
    });

    // valid PTO cash out updates
    describe('when successfully validating a PTO cash out update', () => {
      describe('when PTO cash out creationDate is updated', () => {
        beforeEach(() => {
          oldPtoCashOut.creationDate = 'oldDate';
          newPtoCashOut.creationDate = 'newDate';
        });

        it('should return the updated PTO cash out', (done) => {
          ptoCashOutRoutes
            ._validateUpdate(oldPtoCashOut, newPtoCashOut)
            .then((data) => {
              expect(data).toEqual(newPtoCashOut);
              done();
            })
            .catch((error) => {
              fail('should not have thrown error: ' + JSON.stringify(error));
              done();
            });
        });
      }); // END when PTO cash out creationDate is updated

      describe('when PTO cash out amount is updated AND approvedDate is empty', () => {
        beforeEach(() => {
          oldPtoCashOut.amount = 10;
          oldPtoCashOut.approvedDate = null;
          newPtoCashOut.amount = 12;
          newPtoCashOut.approvedDate = null;
        });

        it('should return the updated PTO cash out', (done) => {
          ptoCashOutRoutes
            ._validateUpdate(oldPtoCashOut, newPtoCashOut)
            .then((data) => {
              expect(data).toEqual(newPtoCashOut);
              done();
            })
            .catch((error) => {
              fail('should not have thrown error: ' + JSON.stringify(error));
              done();
            });
        });
      }); // END when PTO cash out amount is updated AND approvedDate is empty

      describe('when PTO cash out approvedDate is updated', () => {
        beforeEach(() => {
          oldPtoCashOut.approvedDate = 'oldDate';
          newPtoCashOut.approvedDate = 'newDate';
        });

        it('should return the updated PTO cash out', (done) => {
          ptoCashOutRoutes
            ._validateUpdate(oldPtoCashOut, newPtoCashOut)
            .then((data) => {
              expect(data).toEqual(newPtoCashOut);
              done();
            })
            .catch((error) => {
              fail('should not have thrown error: ' + JSON.stringify(error));
              done();
            });
        });
      }); // END when PTO cash out approvedDate is updated
    }); // END when successfully validating a PTO cash out update

    // invalid PTO cash out updates
    describe('when unsuccessfully validating a PTO cash out update', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating update for ptoCashOut.'
        };
      });

      describe('where PTO cash out IDs do not match', () => {
        beforeEach(() => {
          oldPtoCashOut.id = 'id1';
          newPtoCashOut.id = 'id2';
          err.message = 'Error validating ptoCashOut IDs.';
        });

        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validateUpdate(oldPtoCashOut, newPtoCashOut)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END where PTO cash out IDs do not match

      describe('where updating amount in PTO cash out that has already been approved', () => {
        beforeEach(() => {
          oldPtoCashOut.amount = 10;
          oldPtoCashOut.approvedDate = 'Approved Date';
          newPtoCashOut.amount = 12;
          newPtoCashOut.approvedDate = 'Approved Date';
          err.message = 'Cannot change amount of approved ptoCashOut.';
        });

        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validateUpdate(oldPtoCashOut, newPtoCashOut)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END where updating amount in PTO cash out that has already been approved
    }); // END when unsuccessfully validating a PTO cash out update
  }); // END _validateUpdate METHOD

  // validating a PTO cash out deletion
  describe('_validateDelete', () => {
    let ptoCashOut;
    beforeEach(() => {
      ptoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
      ptoCashOut.approvedDate = null;
    });
    describe('when successfully validating a PTO cash out deletion before deleting it', () => {
      it('should return the deleted PTO cash out', (done) => {
        ptoCashOutRoutes
          ._validateDelete(ptoCashOut)
          .then((data) => {
            expect(data).toEqual(ptoCashOut);
            done();
          })
          .catch((error) => {
            fail('should not have thrown the error: ' + JSON.stringify(error));
            done();
          });
      });
    }); // END when successfully validating a PTO cash out deletion before deleting it

    describe('when unsuccessfully validating a PTO cash out deletion before deleting it', () => {
      describe('when it has already been approved', () => {
        let err;
        beforeEach(() => {
          ptoCashOut.approvedDate = 'Approved Date';
          err = {
            code: 403,
            message: 'Error validating delete for ptoCashOut.'
          };
        });
        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validateDelete(ptoCashOut)
            .then(() => {
              fail('should have thrown an error');
              done();
            })
            .catch((error) => {
              err.message = 'Cannot delete PTOCashOut, PTOCashOut has already been approved';
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when it has already been approved
    }); // END when unsuccessfully validating a PTO cash out deletion before deleting it
  }); // END _validateDelete METHOD

  // validating a contract
  describe('_validateCreate', () => {
    let ptoCashOut;
    let existingPtoCashOut;
    beforeEach(() => {
      ptoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
      existingPtoCashOut = _.cloneDeep(ptoCashOut);
      existingPtoCashOut.id = 'id3';
      databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([existingPtoCashOut]));
    });

    // successfully validating a creation
    describe('when successfully validating if a PTO cash out can be created', () => {
      it('should return the expected PTO cash out', (done) => {
        ptoCashOutRoutes
          ._validateCreate(ptoCashOut)
          .then((data) => {
            expect(data).toEqual(ptoCashOut);
            done();
          })
          .catch((error) => {
            fail('should not have thrown error: ' + JSON.stringify(error));
            done();
          });
      });
    }); // when successfully validating if a PTO cash out can be created

    describe('when unsuccessfully validating if a PTO cash out can be created', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating create for PTOCashOut.'
        };
      });

      describe('where two contracts have duplicate IDs', () => {
        beforeEach(() => {
          ptoCashOut.id = 'id3';
          err.message = 'Unexpected duplicate id created. Please try submitting again.';
        });

        it('should return a 403 rejected promise', (done) => {
          ptoCashOutRoutes
            ._validateCreate(ptoCashOut)
            .then(() => {
              fail('error expected to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END where two PTO cash outs have duplicate IDs
    }); // END when unsuccessfully validating if a PTO cash out can be created
  }); // END _validateCreate

  describe('_create', () => {
    let ptoCashOut;
    beforeEach(() => {
      ptoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
    });

    describe('when the PTO cash out should unsuccessfully be created', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid creationDate.'
        };
        ptoCashOut.creationDate = null;
      });

      it('should return a 403 rejected promise', (done) => {
        ptoCashOutRoutes
          ._create(ptoCashOut)
          .then(() => {
            fail('expected an error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      });
    }); // END when the PTO cash out should unsuccessfully be created
  }); // END _create

  describe('_update', () => {
    let oldPtoCashOut;
    let newPtoCashOut;
    beforeEach(() => {
      oldPtoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
      newPtoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
    });

    describe('when the PTO cash out should successfully be updated', () => {
      beforeEach(() => {
        delete newPtoCashOut.approvedDate;
        delete oldPtoCashOut.approvedDate;
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldPtoCashOut));
      });

      it('should return the updated PTO cash out', (done) => {
        ptoCashOutRoutes
          ._update({body: newPtoCashOut})
          .then((data) => {
            expect(data).toEqual(newPtoCashOut);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(oldPtoCashOut.id);
            done();
          })
          .catch((error) => {
            fail('error not expected to have been thrown: ' + JSON.stringify(error));
            done();
          });
      });
    }); // END when the PTO cash out should successfully be updated

    describe('when the PTO cash out should unsuccessfully be updated', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid amount.'
        };
        newPtoCashOut.amount = 0;
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldPtoCashOut));
      });

      it('should return a 403 rejected promise', (done) => {
        ptoCashOutRoutes
          ._update({body: newPtoCashOut})
          .then(() => {
            fail('expected an error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      });
    }); // END when the PTO cash out should unsuccessfully be updated
  }); // END _update

  describe('_delete', () => {
    let ptoCashOut;
    beforeEach(() => {
      ptoCashOut = new PTOCashOut(PTO_CASH_OUT_DATA);
      delete ptoCashOut.approvedDate;
    });

    describe('when the PTO cash out should successfully be deleted', () => {
      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(ptoCashOut));
      });

      it('should return the deleted PTO cash out', (done) => {
        ptoCashOutRoutes
          ._delete(ptoCashOut.id)
          .then((data) => {
            expect(data).toEqual(ptoCashOut);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(ptoCashOut.id);
            done();
          })
          .catch((error) => {
            fail('error not expected to have been thrown: ' + JSON.stringify(error));
            done();
          });
      });
    }); // END when the PTO cash out should successfully be deleted

    describe('when the PTO cash out should unsuccessfully be deleted', () => {
      let err;
      beforeEach(() => {
        ptoCashOut.approvedDate = 'Approved Date';
        databaseModify.getEntry.and.returnValue(Promise.resolve(ptoCashOut));
        err = {
          code: 403,
          message: 'Error validating delete for employee.'
        };
      });

      it('should return a 403 rejected promise', (done) => {
        ptoCashOutRoutes
          ._delete(ptoCashOut.id)
          .then(() => {
            fail('should have thrown an error');
            done();
          })
          .catch((error) => {
            err.message = 'Cannot delete PTOCashOut, PTOCashOut has already been approved';
            expect(error).toEqual(err);
            done();
          });
      });
    }); // END when the PTO cash out should unsuccessfully be deleted
  }); // END _delete
}); // END ptoCashOutRoutes
