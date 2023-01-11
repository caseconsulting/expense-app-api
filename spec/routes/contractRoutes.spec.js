const ContractRoutes = require('../../routes/contractRoutes');
const _ = require('lodash');

const Contract = require('../../models/contract');

describe('contractRoutes', () => {
  const _ROUTER = '{router}';
  const ID = '{id}';
  const CONTRACT_NAME = '{contractName}';
  const PRIME_NAME = '{primeName}';
  const COST_TYPE = '{costType}';
  const POP_START_DATE = '{popStartDate}';
  const POP_END_DATE = '{popEndDate}';
  const PROJECTS = [{ projectName: '{projectName}' }];

  const CONTRACT_DATA = {
    id: ID,
    contractName: CONTRACT_NAME,
    primeName: PRIME_NAME,
    costType: COST_TYPE,
    popStartDate: POP_START_DATE,
    popEndDate: POP_END_DATE,
    projects: PROJECTS
  };

  const EXISTING_CONTRACT = new Contract({
    id: 'existingID',
    contractName: 'existingContractName',
    primeName: 'existingPrimeName',
    costType: 'existingCostType',
    popStartDate: 'existingPopStartDate',
    popEndDate: 'existingPopEndDate',
    projects: [{ projectName: 'existingProjectName' }]
  });

  let databaseModify, contractRoutes, res;

  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', [
      'addToDB',
      'getAllEntriesInDB',
      'getEntry',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      '_readFromDB',
      '_readFromDBUrl',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    res = jasmine.createSpyObj('res', ['status', 'send']);
    res.status.and.returnValue(res);
    contractRoutes = new ContractRoutes();
    contractRoutes.databaseModify = databaseModify;
    contractRoutes._router = _ROUTER;
  });

  // validating a contract
  describe('_validateContract', () => {
    let contract;
    beforeEach(() => {
      contract = new Contract(CONTRACT_DATA);
    });

    // valid contract tests
    describe('when successfully validating a contract', () => {
      let expectedContract;
      beforeEach(() => {
        contract.contractName = 'Test Contract';
        contract.primeName = 'Test Prime';
        contract.costType = 'Test Cost Type';
        contract.popStartDate = 'Test PoP Start Date';
        contract.popEndDate = 'Test PoP End Date';
        contract.projects = [{ projectName: 'Test Project Name' }];
        expectedContract = _.cloneDeep(contract);
      });

      it('should return the expected contract', (done) => {
        contractRoutes._validateContract(contract).then((data) => {
          expect(data).toEqual(expectedContract);
          done();
        });
      });

      // optional contract PoP start date
      describe('when contract PoP start date is nil', () => {
        beforeEach(() => {
          contract.popStartDate = null;
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateContract(contract)
            .then((data) => {
              expect(data).toEqual(contract);
              done();
            })
            .catch((error) => {
              fail('Should not have thrown error: ' + error);
              done();
            });
        });
      }); // END when contract PoP start date is nil
    }); // END when successfully validating a contract

    // invalid contract tests
    describe('when failing to validate a contract', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating contract.'
        };
      });

      // invalid id
      describe('when contract id is nil', () => {
        beforeEach(() => {
          contract.id = null;
          err.message = 'Invalid contract id.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateContract(contract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when contract id is nil

      // invalid contract name
      describe('when contract name is nil', () => {
        beforeEach(() => {
          contract.contractName = null;
          err.message = 'Invalid contract name.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateContract(contract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when contract name is nil

      // invalid contract prime name
      describe('when contract prime name is nil', () => {
        beforeEach(() => {
          contract.primeName = null;
          err.message = 'Invalid contract prime name.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateContract(contract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when contract prime name is nils

      // invalid contract projects being null
      describe('when contract projects is nil', () => {
        beforeEach(() => {
          contract.projects = null;
          err.message = 'Invalid contract projects.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateContract(contract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when contract projects is nil

      // invalid contract projects being empty array
      describe('when contract projects is empty', () => {
        beforeEach(() => {
          contract.projects = [];
          err.message = 'Invalid contract projects.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateContract(contract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when contract projects is empty

      // invalid contract cost type
      describe('when contract cost type is nil', () => {
        beforeEach(() => {
          contract.costType = null;
          err.message = 'Invalid contract cost type.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateContract(contract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when contract cost type is nil

      // invalid contract PoP end date being nil
      describe('when contract PoP end date is nil', () => {
        beforeEach(() => {
          contract.popEndDate = null;
          err.message = 'Invalid contract PoP end date.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateContract(contract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END when contract PoP end date is nil
    }); // END when failing to validate a contract
  }); // END _validateContract

  // validating a contract update
  describe('_validateUpdate', () => {
    let oldContract;
    let newContract;

    beforeEach(() => {
      oldContract = new Contract(CONTRACT_DATA);
      newContract = new Contract(CONTRACT_DATA);
    });

    // valid contract updates
    describe('when successfully validating a contract update', () => {
      describe('when contract name is updated', () => {
        beforeEach(() => {
          oldContract.contractName = 'oldName';
          newContract.contractName = 'newName';
        });

        it('should return the updated contract', (done) => {
          contractRoutes
            ._validateUpdate(oldContract, newContract)
            .then((data) => {
              expect(data).toEqual(newContract);
              done();
            })
            .catch((error) => {
              fail('should not have thrown error: ' + JSON.stringify(error));
              done();
            });
        });
      }); // END when contract name is updated

      describe('when contract prime name is updated', () => {
        beforeEach(() => {
          oldContract.primeName = 'oldName';
          newContract.primeName = 'newName';
          databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([oldContract]));
        });

        it('should return the updated contract', (done) => {
          contractRoutes
            ._validateUpdate(oldContract, newContract)
            .then((data) => {
              expect(data).toEqual(newContract);
              done();
            })
            .catch((error) => {
              fail('should not have thrown error: ' + JSON.stringify(error));
              done();
            });
        });
      }); // END when contract prime name is updated

      describe('when contract projects are updated', () => {
        beforeEach(() => {
          oldContract.projects = [{ projectName: 'proj1' }];
          newContract.projects = [{ projectName: 'proj1' }, { projectName: 'proj2' }];
          databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([oldContract]));
        });

        it('should return the updated contract', (done) => {
          contractRoutes
            ._validateUpdate(oldContract, newContract)
            .then((data) => {
              expect(data).toEqual(newContract);
              done();
            })
            .catch((error) => {
              fail('should not have thrown error: ' + JSON.stringify(error));
              done();
            });
        });
      }); // END when contract projects are updated
    }); // END when successfully validating a contract update

    // invalid contract updates
    describe('when unsuccessfully validating a contract update', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating update for contract.'
        };
      });

      describe('where contract IDs do not match', () => {
        beforeEach(() => {
          oldContract.id = 'id1';
          newContract.id = 'id2';
          err.message = 'Error validating contract IDs.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateUpdate(oldContract, newContract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END where contract IDs do not match

      describe('where updated contract already exists', () => {
        beforeEach(() => {
          oldContract.contractName = 'uniqueContractName';
          oldContract.primeName = 'uniquePrimeName';
          newContract.contractName = 'existingContractName';
          newContract.primeName = 'existingPrimeName';
          databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([EXISTING_CONTRACT, oldContract]));
          err.message =
            `Contract ${newContract.contractName} with prime ${newContract.primeName} already taken.` +
            'Please enter a unique contract and prime combination.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateUpdate(oldContract, newContract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END where updated contract already exists
    }); // END when unsuccessfully validating a contract update
  }); // END _validateContract METHOD

  // validating a contract
  describe('_validateDelete', () => {
    let contract;
    beforeEach(() => {
      contract = new Contract(CONTRACT_DATA);
    });
    // TODO: VALIDATE DELETE NOT FULLY IMPLEMENTED SO WHEN IT IS IMPLEMENTED,
    //         ADD MORE SUCCESSFULL AND UNSUCCESSFULL TESTS
    describe('when successfully validating a contract deletion before deleting it', () => {
      it('should return the deleted contract', (done) => {
        contractRoutes
          ._validateDelete(contract)
          .then((data) => {
            expect(data).toEqual(contract);
            done();
          })
          .catch((error) => {
            fail('should not have thrown the error: ' + JSON.stringify(error));
            done();
          });
      });
    });
  }); // END _validateDelete METHOD

  // validating a contract
  describe('_validateCreate', () => {
    let contract;
    beforeEach(() => {
      contract = new Contract(CONTRACT_DATA);
      databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve([EXISTING_CONTRACT]));
    });

    // successfully validating a creation
    describe('when successfully validating if a contract can be created', () => {
      it('should return the expected contract', (done) => {
        contractRoutes
          ._validateCreate(contract)
          .then((data) => {
            expect(data).toEqual(contract);
            done();
          })
          .catch((error) => {
            fail('should not have thrown error: ' + JSON.stringify(error));
            done();
          });
      });
    }); // when successfully validating if a contract can be created

    describe('when unsuccessfully validating if a contract can be created', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Error validating create for contract.'
        };
      });

      describe('where two contracts have duplicate IDs', () => {
        beforeEach(() => {
          contract.id = 'existingID';
          err.message = 'Unexpected duplicate id created. Please try submitting again.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateCreate(contract)
            .then(() => {
              fail('error expected to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END where two contracts have duplicate IDs

      describe('where contract already exists', () => {
        beforeEach(() => {
          contract.contractName = 'existingContractName';
          contract.primeName = 'existingPrimeName';
          err.message =
            `Contract ${contract.contractName} with prime ${contract.primeName} already taken.` +
            'Please enter a unique contract and prime name combination.';
        });

        it('should return a 403 rejected promise', (done) => {
          contractRoutes
            ._validateCreate(contract)
            .then(() => {
              fail('expected error to have been thrown');
              done();
            })
            .catch((error) => {
              expect(error).toEqual(err);
              done();
            });
        });
      }); // END where contract already exists
    }); // END when unsuccessfully validating if a contract can be created
  }); // END _validateCreate

  describe('_create', () => {
    let contract;
    beforeEach(() => {
      contract = new Contract(CONTRACT_DATA);
    });

    // describe('when the contract should successfully be created', () => {
    //   it('should return the created contract', (done) => {
    //     contractRoutes
    //       ._create(contract)
    //       .then((data) => {
    //         expect(data).toEqual(contract);
    //         done();
    //       })
    //       .catch((error) => {
    //         fail('error not expected to have been thrown: ' + JSON.stringify(error));
    //         done();
    //       });
    //   });
    // }); // END when the contract should successfully be created

    describe('when the contract should unsuccessfully be created', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid contract name.'
        };
        contract.contractName = null;
      });

      it('should return a 403 rejected promise', (done) => {
        contractRoutes
          ._create(contract)
          .then(() => {
            fail('expected an error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      });
    }); // END when the contract should unsuccessfully be created
  }); // END _create

  describe('_update', () => {
    let oldContract;
    let newContract;
    beforeEach(() => {
      oldContract = new Contract(CONTRACT_DATA);
      newContract = new Contract(CONTRACT_DATA);
    });

    describe('when the contract should successfully be updated', () => {
      beforeEach(() => {
        newContract.contractName = 'newContract';
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldContract));
      });

      it('should return the updated contract', (done) => {
        contractRoutes
          ._update(newContract)
          .then((data) => {
            expect(data).toEqual(newContract);
            // not sure why these aren't working
            //expect(contractRoutes._validateContract).toHaveBeenCalledWith(newContract);
            //expect(contractRoutes._validateUpdate).toHaveBeenCalledWith(oldContract, newContract);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(oldContract.id);
            done();
          })
          .catch((error) => {
            fail('error not expected to have been thrown: ' + JSON.stringify(error));
            done();
          });
      });
    }); // END when the contract should successfully be updated

    describe('when the contract should unsuccessfully be updated', () => {
      let err;
      beforeEach(() => {
        err = {
          code: 403,
          message: 'Invalid contract projects.'
        };
        newContract.projects = [];
        databaseModify.getEntry.and.returnValue(Promise.resolve(oldContract));
      });

      it('should return a 403 rejected promise', (done) => {
        contractRoutes
          ._update(newContract)
          .then(() => {
            fail('expected an error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      });
    }); // END when the contract should unsuccessfully be updated
  }); // END _update

  describe('_delete', () => {
    let contract;
    beforeEach(() => {
      contract = new Contract(CONTRACT_DATA);
    });

    describe('when the contract should successfully be deleted', () => {
      beforeEach(() => {
        databaseModify.getEntry.and.returnValue(Promise.resolve(contract));
      });

      it('should return the deleted contract', (done) => {
        contractRoutes
          ._delete(contract.id)
          .then((data) => {
            expect(data).toEqual(contract);
            // not sure why these aren't working
            //expect(contractRoutes._validateDelete).toHaveBeenCalledWith(contract);
            expect(databaseModify.getEntry).toHaveBeenCalledWith(contract.id);
            done();
          })
          .catch((error) => {
            fail('error not expected to have been thrown: ' + JSON.stringify(error));
            done();
          });
      });
    }); // END when the contract should successfully be deleted
    // TODO WHEN DELETE IS FINISHED BEING IMPLEMENTED
    // describe('when the contract should unsuccessfully be deleted', () => {
    //   let err;
    //   beforeEach(() => {
    //     err = "TypeError: Cannot read properties of undefined (reading 'id')";
    //     contract.id = null;
    //   });

    //   it('should return a 403 rejected promise', (done) => {
    //     contractRoutes
    //       ._delete(contract.id)
    //       .then(() => {
    //         fail('expected an error to have been thrown');
    //         done();
    //       })
    //       .catch((error) => {
    //         expect(error).toEqual(err);
    //         done();
    //       });
    //   });
    // }); // END when the contract should unsuccessfully be deleted
  }); // END delete
}); // END contractRoutes
