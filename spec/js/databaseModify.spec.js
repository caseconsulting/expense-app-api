const { mockClient } = require('aws-sdk-client-mock');
const {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand
} = require('@aws-sdk/lib-dynamodb');
const DatabaseModify = require('../../js/databaseModify');
const Expense = require('../../models/expense');
const TrainingUrl = require('../../models/trainingUrls');

describe('databaseModify', () => {
  const ddbMock = mockClient(DynamoDBDocumentClient);
  const STAGE = 'dev';

  const ID = '{id}';
  const DESCRIPTION = '{description}';

  const PURCHASE_DATE = '{purchaseDate}';
  const REIMBURSED_DATE = '{reimbursedDate}';
  const NOTE = '{note}';
  const URL = '{url}';
  const CREATED_AT = '{createdAt}';
  const RECEIPT = '{receipt}';
  const COST = 0;
  const CATEGORY = '{category}';
  const SHOWONFEED = '{showOnFeed}';

  const HITS = 0;

  const EXPENSE_DATA = {
    id: ID,
    purchaseDate: PURCHASE_DATE,
    reimbursedDate: REIMBURSED_DATE,
    note: NOTE,
    url: URL,
    createdAt: CREATED_AT,
    receipt: RECEIPT,
    cost: COST,
    description: DESCRIPTION,
    employeeId: ID,
    expenseTypeId: ID,
    category: CATEGORY,
    showOnFeed: SHOWONFEED
  };

  const TRAINING_URL_DATA = {
    id: URL,
    category: CATEGORY,
    hits: HITS
  };

  let databaseModify;

  beforeEach(() => {
    databaseModify = new DatabaseModify('expenses');
    databaseModify.tableName = `${STAGE}-expenses`;
  });

  describe('addToDB', () => {
    let newDyanmoObj;

    beforeEach(() => {
      newDyanmoObj = new Expense(EXPENSE_DATA);
    });

    describe('when successfully adds object to dynamo', () => {
      beforeEach(() => {
        ddbMock.on(PutCommand).resolves({
          Data: newDyanmoObj
        });
      });

      it('should return the added object', (done) => {
        databaseModify.addToDB(newDyanmoObj).then((data) => {
          expect(data).toEqual(newDyanmoObj);
          done();
        });
      }); // should return the added object
    }); // when successfully adds object to dynamo

    describe('when object is undefined', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find object to add to database.'
        };
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .addToDB(undefined)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when object is undefined

    describe('when fails to put object in dynamo', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to put object in database.'
        };

        ddbMock.on(PutCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .addToDB(newDyanmoObj)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to put object in dynamo
  }); // addToDB

  describe('getAllEntriesInDB', () => {
    describe('when successfully scans all entries in table', () => {
      let items;

      beforeEach(() => {
        items = ['a', 'b', 'c'];

        ddbMock.on(ScanCommand).resolves({ Items: items });
      });

      it('should return all the entries scanned', () => {
        databaseModify.getAllEntriesInDB().then((data) => {
          expect(data).toEqual(items);
        });
      }); // should return all the entries scanned
    }); // when successfully scans all entries in table

    describe('when fails to scan all entries in table', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to scan entries from database.'
        };

        ddbMock.on(ScanCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .getAllEntriesInDB()
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to scan all entries in table
  }); // getAllEntriesInDB

  describe('getEntry', () => {
    describe('when successfully gets an entry and one entry is read from database', () => {
      let entries;

      beforeEach(() => {
        entries = ['entry1'];
        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.resolve(entries));
      });

      it('should return the entry obtained', (done) => {
        databaseModify.getEntry(ID).then((data) => {
          expect(data).toEqual('entry1');
          expect(databaseModify._readFromDB).toHaveBeenCalledWith(ID);
          done();
        });
      }); // should return the entry obtained
    }); // when successfully gets an entry and one entry is read from database

    describe('when successfully gets an entry and multiple entries are read from database', () => {
      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];
        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.resolve(entries));
      });

      it('should return the entry obtained', (done) => {
        databaseModify.getEntry(ID).then((data) => {
          expect(data).toEqual('entry1');
          expect(databaseModify._readFromDB).toHaveBeenCalledWith(ID);
          done();
        });
      }); // should return the entry obtained
    }); // when successfully gets an entry and multiple entries are read from database

    describe('when successful reads entries but no entries were found', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Entry not found in database'
        };

        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.resolve([]));
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .getEntry(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify._readFromDB).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when successful reads entries but no entries were found

    describe('when fails to read entries from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries from database.'
        };

        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .getEntry(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify._readFromDB).toHaveBeenCalledWith(ID);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read entries from database
  }); // getEntry

  describe('getEntryUrl', () => {
    describe('when successfully gets an entry and one entry is read from database', () => {
      let entries;

      beforeEach(() => {
        entries = ['entry1'];
        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.resolve(entries));
      });

      it('should return the entry obtained', (done) => {
        databaseModify.getEntryUrl(ID, CATEGORY).then((data) => {
          expect(data).toEqual('entry1');
          expect(databaseModify._readFromDBUrl).toHaveBeenCalledWith(ID, CATEGORY);
          done();
        });
      }); // should return the entry obtained
    }); // when successfully gets an entry and one entry is read from database

    describe('when successfully gets an entry and multiple entries are read from database', () => {
      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];
        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.resolve(entries));
      });

      it('should return the entry obtained', (done) => {
        databaseModify.getEntryUrl(ID, CATEGORY).then((data) => {
          expect(data).toEqual('entry1');
          expect(databaseModify._readFromDBUrl).toHaveBeenCalledWith(ID, CATEGORY);
          done();
        });
      }); // should return the entry obtained
    }); // when successfully gets an entry and multiple entries are read from database

    describe('when successful reads entries but no entries were found', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Entry not found in database'
        };

        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.resolve([]));
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .getEntryUrl(ID, CATEGORY)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify._readFromDBUrl).toHaveBeenCalledWith(ID, CATEGORY);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when successful reads entries but no entries were found

    describe('when fails to read entries from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries from database.'
        };

        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .getEntryUrl(ID, CATEGORY)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            expect(databaseModify._readFromDBUrl).toHaveBeenCalledWith(ID, CATEGORY);
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read entries from database
  }); // getEntryUrl

  describe('querySecondaryIndexInDB', () => {
    let secondaryIndex, queryKey, queryParam;

    beforeEach(() => {
      secondaryIndex = 'expenseTypeId-index';
      queryKey = 'expenseTypeId';
      queryParam = '00000000-0000-0000-0000-000000000000';
    });

    describe('when successfully queries index from database', () => {
      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];

        ddbMock.on(QueryCommand).resolves({ Items: entries });
      });

      it('should return the entires queried', (done) => {
        databaseModify.querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam).then((data) => {
          expect(data).toEqual(entries);
          done();
        });
      });
    }); // when successfully queries index from database

    describe('when fails to query index from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query index from database.'
        };

        ddbMock.on(QueryCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to query index from database
  }); // querySecondaryIndexInDB

  describe('queryWithTwoIndexesInDB', () => {
    let employeeId, expenseTypeId;

    beforeEach(() => {
      employeeId = ID;
      expenseTypeId = ID;
    });

    describe('when successfully queries index from database', () => {
      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];

        ddbMock.on(QueryCommand).resolves({ Items: entries });
      });

      it('should return the entires queried', (done) => {
        databaseModify.queryWithTwoIndexesInDB(employeeId, expenseTypeId).then((data) => {
          expect(data).toEqual(entries);
          done();
        });
      });
    }); // when successfully queries index from database

    describe('when fails to query index from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to query index from database.'
        };

        ddbMock.on(QueryCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .queryWithTwoIndexesInDB(employeeId, expenseTypeId)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to query index from database
  }); // queryWithTwoIndexesInDB

  describe('_readFromDB', () => {
    describe('when successfully reads entries from database', () => {
      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];

        ddbMock.on(QueryCommand).resolves({ Items: entries });
      });

      it('should return the entries read', () => {
        databaseModify._readFromDB(ID).then((data) => {
          expect(data).toEqual(entries);
        });
      }); // should return the entries read
    }); // when successfully reads entries from database

    describe('when fails to read entries from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries from database.'
        };

        ddbMock.on(QueryCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          ._readFromDB(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read entries from database
  }); // _readFromDB

  describe('_readFromDBUrl', () => {
    describe('when successfully reads entries from database', () => {
      let entries;

      beforeEach(() => {
        entries = ['entry1', 'entry2', 'entry3'];

        ddbMock.on(QueryCommand).resolves({ Items: entries });
      });

      it('should return the entries read', () => {
        databaseModify._readFromDBUrl(ID, CATEGORY).then((data) => {
          expect(data).toEqual(entries);
        });
      }); // should return the entries read
    }); // when successfully reads entries from database

    describe('when fails to read entries from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read entries from database.'
        };

        ddbMock.on(QueryCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          ._readFromDBUrl(ID, CATEGORY)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return a 404 rejected promise
    }); // when fails to read entries from database
  }); // _readFromDBUrl

  describe('removeFromDB', () => {
    describe('when successfully removes entry from database', () => {
      let deletedObject;

      beforeEach(() => {
        deletedObject = new Expense(EXPENSE_DATA);

        ddbMock.on(DeleteCommand).resolves({ Attributes: deletedObject });
      });

      it('should return the deleted object', (done) => {
        databaseModify.removeFromDB(ID).then((data) => {
          expect(new Expense(data)).toEqual(deletedObject);
          done();
        });
      });
    }); // when successfully removes entry from database

    describe('when fails to remove entry from database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          messge: 'Failed to delete entry from database.'
        };

        ddbMock.on(DeleteCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .removeFromDB(ID)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return 404 rejected promise
    }); // when fails to remove entry from database
  }); // removeFromDB

  describe('updateEntryInDB', () => {
    let newDyanmoObj;

    beforeEach(() => {
      newDyanmoObj = new Expense(EXPENSE_DATA);
    });

    describe('when successfully updates an expense in database', () => {
      beforeEach(() => {
        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.resolve('{{ oldExpense }}'));
        ddbMock.on(PutCommand).resolves({ Data: newDyanmoObj });
      });

      it('should return the updated object', (done) => {
        databaseModify.updateEntryInDB(newDyanmoObj).then((data) => {
          expect(data).toEqual(newDyanmoObj);
          done();
        });
      });
    }); // when successfully updates an expense in database

    describe('when successfully updates a training url in database', () => {
      beforeEach(() => {
        newDyanmoObj = new TrainingUrl(TRAINING_URL_DATA);
      });

      beforeEach(() => {
        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.resolve('{{ oldExpense }}'));
        ddbMock.on(PutCommand).resolves({ Data: newDyanmoObj });
      });

      it('should return the updated object', (done) => {
        databaseModify.updateEntryInDB(newDyanmoObj).then((data) => {
          expect(data).toEqual(newDyanmoObj);
          done();
        });
      });
    }); // when successfully updates a training url in database

    describe('when fails to find expense to update in database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to find entry to update in database.'
        };

        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .updateEntryInDB(newDyanmoObj)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return 404 rejected promise
    }); // when fails to find expense to update in database

    describe('when fails to find training url to update in database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          messge: 'Failed to find entry to update in database.'
        };
        newDyanmoObj = new TrainingUrl(TRAINING_URL_DATA);
        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .updateEntryInDB(newDyanmoObj)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(err);
            done();
          });
      }); // should return 404 rejected promise
    }); // when fails to find training url to update in database

    describe('when fails to update expense in database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to update entry in database.'
        };

        spyOn(databaseModify, '_readFromDB').and.returnValue(Promise.resolve('{{ oldExpense }}'));
        ddbMock.on(PutCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .updateEntryInDB(newDyanmoObj)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return 404 rejected promise
    }); // when fails to update expense in database

    describe('when fails to update training url in database', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to update entry in database.'
        };
        newDyanmoObj = new TrainingUrl(TRAINING_URL_DATA);
        spyOn(databaseModify, '_readFromDBUrl').and.returnValue(Promise.resolve('{{ oldExpense }}'));
        ddbMock.on(PutCommand).rejects(err);
      });

      it('should return a 404 rejected promise', (done) => {
        databaseModify
          .updateEntryInDB(newDyanmoObj)
          .then(() => {
            fail('expected error to have been thrown');
            done();
          })
          .catch((error) => {
            expect(error).toEqual(new Error(err.message));
            done();
          });
      }); // should return 404 rejected promise
    }); // when fails to update training url in database
  }); // updateEntryInDB
}); // databaseModify
