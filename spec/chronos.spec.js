const chronos = require('../chronos/chronos');
const dateUtils = require('../js/dateUtils');
const _ = require('lodash');

const Budget = require('../models/budget');
const ExpenseType = require('../models/expenseType');

const ID = '{id}';
const NAME = '{name}';
const BUDGET = '{budget}';
const START_DATE = '{startDate}';
const END_DATE = '{endDate}';
const OD_FLAG = '{odFlag}';
const REQUIRED_FLAG = '{requireReceipt}';
const RECURRING_FLAG = '{recurringFlag}';
const IS_INACTIVE = '{isInactive}';
const DESCRIPTION = '{description}';
const CATEGORIES = [];
const ACCESSIBLE_BY = ['{accessibleBy}'];
const REIMBURSED_AMOUNT = 0;
const PENDING_AMOUNT = 0;
const FISCAL_START_DATE = '{fiscalStartDate}';
const FISCAL_END_DATE = '{fiscalEndDate}';
const AMOUNT = 0;
const PRORATED = false;
const ALWAYS_ON_FEED = false;
const HAS_RECIPIENT = false;
const REQUIRE_URL = false;

const EXPENSE_TYPE_DATA = {
  id: ID,
  name: NAME,
  budget: BUDGET,
  startDate: START_DATE,
  endDate: END_DATE,
  odFlag: OD_FLAG,
  requireReceipt: REQUIRED_FLAG,
  recurringFlag: RECURRING_FLAG,
  isInactive: IS_INACTIVE,
  description: DESCRIPTION,
  categories: CATEGORIES,
  accessibleBy: ACCESSIBLE_BY,
  proRated: PRORATED,
  showOnFeed: ALWAYS_ON_FEED,
  hasRecipient: HAS_RECIPIENT,
  requireURL: REQUIRE_URL
};

const BUDGET_DATA = {
  id: ID,
  expenseTypeId: ID,
  employeeId: ID,
  reimbursedAmount: REIMBURSED_AMOUNT,
  pendingAmount: PENDING_AMOUNT,
  fiscalStartDate: FISCAL_START_DATE,
  fiscalEndDate: FISCAL_END_DATE,
  amount: AMOUNT
};

describe('chronos', () => {
  describe('_asyncForEach', () => {
    let counter, array;

    beforeEach(() => {
      array = [1, 2, 3, 4, 5];
      counter = 0;
    });

    it('should call the a number of times depending on the array size', () => {
      chronos._asyncForEach(array, (number) => {
        counter++;
        expect(counter).toEqual(number);
      });
    }); // should call the a number of times depending on the array size
  }); // _asyncForEach

  describe('_budgetDynamo', () => {
    it('should return a database modify object', () => {
      let dynamo = chronos._budgetDynamo();
      expect(dynamo).toBeDefined();
    }); // should return a database modify object
  }); // _budgetDynamo

  describe('_expenseTypeDynamo', () => {
    it('should return a database modify object', () => {
      let dynamo = chronos._expenseTypeDynamo();
      expect(dynamo).toBeDefined();
    }); // should return a database modify object
  }); // _expenseTypeDynamo

  describe('_getAllExpenseTypes', () => {
    let expenseTypeDynamo, etData, etReturned;

    beforeEach(() => {
      etData = _.cloneDeep(EXPENSE_TYPE_DATA);
      etData.categories = ['{"name":"Meals","showOnFeed":false,"requireURL":false}'];
      etReturned = new ExpenseType(EXPENSE_TYPE_DATA);
      etReturned.categories = [
        {
          name: 'Meals',
          showOnFeed: false,
          requireURL: false
        }
      ];
      expenseTypeDynamo = jasmine.createSpyObj('expenseTypeDynamo', ['getAllEntriesInDB']);
      spyOn(chronos, '_expenseTypeDynamo').and.returnValue(expenseTypeDynamo);
    });

    afterEach(() => {
      expect(expenseTypeDynamo.getAllEntriesInDB).toHaveBeenCalledWith();
    });

    describe('when successfully reads all entries from db', () => {
      beforeEach(() => {
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.resolve([etData]));
      });

      it('should return all the expense types', () => {
        return chronos._getAllExpenseTypes().then((data) => {
          expect(data[0]).toEqual(etReturned);
        });
      }); // should return all the expense types
    }); // when successfully reads all entries from db

    describe('when fails to read all entries from db', () => {
      let err;

      beforeEach(() => {
        err = {
          code: 404,
          message: 'Failed to read all entries from db'
        };
        expenseTypeDynamo.getAllEntriesInDB.and.returnValue(Promise.reject(err));
      });

      it('should return a 404 rejected promise', () => {
        return chronos
          ._getAllExpenseTypes()
          .then(() => {
            fail('expected error to have been thrown');
          })
          .catch((error) => {
            expect(error).toEqual(err);
          });
      }); // should return a 404 rejected promise
    }); // when fails to read all entries from db
  }); // _getAllExpenseTypes

  describe('_getExpenseType', () => {
    let expenseTypes, expectedExpenseType;

    beforeEach(() => {
      expenseTypes = [{ id: 'id' }, { id: 'id-2' }];
      expectedExpenseType = { id: 'id-2' };
    });

    describe('expense type id exists in expense types', () => {
      it('should return the expense type that has a matching id', () => {
        expect(chronos._getExpenseType(expenseTypes, 'id-2')).toEqual(expectedExpenseType);
      }); // should return the expense type that has a matching id
    }); // expense type id exists in expense types

    describe('expense type id is not in expense types', () => {
      it('should throw an error', () => {
        try {
          chronos._getExpenseType(expenseTypes, 'id-3');
          fail('but failed to throw error');
        } catch (thrownError) {
          expect(thrownError.message).toEqual('Expense Type does not exist');
        }
      }); // throw an error
    }); // expense type id is not in expense types
  }); // _getExpenseType

  describe('_getUUID', () => {
    it('should return an id value', () => {
      let id = chronos._getUUID();
      expect(id).toBeDefined();
    }); // should return an id value
  }); // _getUUID

  describe('handler', () => {
    beforeEach(() => {
      spyOn(chronos, 'start').and.returnValue('hello world');
    });

    it('SHOULD return nothing', () => {
      return chronos
        .handler()
        .then((result) => {
          expect(result).toEqual('hello world');
        })
        .catch((error) => {
          fail('should not have thrown error: ' + JSON.stringify(error));
        });
    }); // SHOULD return nothing
  }); // handler

  describe('_makeNewBudget', () => {
    let budgetDynamo, expenseType, newBudget, oldBudget, updatedBudget;

    beforeEach(() => {
      oldBudget = new Budget(BUDGET_DATA);
      updatedBudget = new Budget(BUDGET_DATA);
      newBudget = new Budget(BUDGET_DATA);
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      spyOn(chronos, '_getUUID').and.returnValue('{id}');
      budgetDynamo = jasmine.createSpyObj('budgetDynamo', ['addToDB', 'updateEntryInDB']);
      spyOn(chronos, '_budgetDynamo').and.returnValue(budgetDynamo);
    });

    describe('when previous reimburse amount exceeds expense type limit', () => {
      beforeEach(() => {
        expenseType.budget = 100;

        oldBudget.reimbursedAmount = 120;
        oldBudget.pendingAmount = 30;
        oldBudget.amount = 100;
        oldBudget.fiscalStartDate = '2020-01-01';
        oldBudget.fiscalEndDate = '2020-12-31';

        updatedBudget.reimbursedAmount = 100;
        updatedBudget.pendingAmount = 0;
        updatedBudget.amount = 100;
        updatedBudget.fiscalStartDate = '2020-01-01';
        updatedBudget.fiscalEndDate = '2020-12-31';

        newBudget.reimbursedAmount = 20;
        newBudget.pendingAmount = 30;
        newBudget.amount = 100;
        newBudget.fiscalStartDate = '2021-01-01';
        newBudget.fiscalEndDate = '2021-12-31';
      });

      afterEach(() => {
        expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(updatedBudget);
      });

      describe('when successfully updates the old budget', () => {
        beforeEach(() => {
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(oldBudget));
        });

        afterEach(() => {
          expect(budgetDynamo.addToDB).toHaveBeenCalledWith(newBudget);
        });

        describe('and successfully adds new budget to db', () => {
          beforeEach(() => {
            budgetDynamo.addToDB.and.returnValue(Promise.resolve(newBudget));
          });

          it('should return the new budget', () => {
            return chronos._makeNewBudget(oldBudget, expenseType).then((result) => {
              expect(result).toEqual(newBudget);
            });
          }); // should return the new budget
        }); // when successfully adds new budget to db

        describe('and fails to add new budget to db', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 404,
              message: 'Failed to add new budget to db'
            };
            budgetDynamo.addToDB.and.returnValue(Promise.reject(err));
          });

          it('should return a 404 rejected promise', () => {
            return chronos
              ._makeNewBudget(oldBudget, expenseType)
              .then(() => {
                fail('expected error to have been thrown');
              })
              .catch((error) => {
                expect(error).toEqual(err);
              });
          }); // should return a 404 rejected promise
        }); // when fails to add new budget to db
      }); // whne successfully updates the old budget

      describe('when fails to update the old budget', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to update budget'
          };
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', () => {
          return chronos
            ._makeNewBudget(oldBudget, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
            })
            .catch((error) => {
              expect(error).toEqual(err);
            });
        }); // should return a 404 rejected promise
      }); // when fails to update the old budget
    }); // when previous reimburse amount exceeds expense type limit

    describe('when previous reimburse amount does not exceed expense type limit', () => {
      beforeEach(() => {
        expenseType.budget = 100;

        oldBudget.reimbursedAmount = 80;
        oldBudget.pendingAmount = 50;
        oldBudget.amount = 100;
        oldBudget.fiscalStartDate = '2020-01-01';
        oldBudget.fiscalEndDate = '2020-12-31';

        updatedBudget.reimbursedAmount = 80;
        updatedBudget.pendingAmount = 20;
        updatedBudget.amount = 100;
        updatedBudget.fiscalStartDate = '2020-01-01';
        updatedBudget.fiscalEndDate = '2020-12-31';

        newBudget.reimbursedAmount = 0;
        newBudget.pendingAmount = 30;
        newBudget.amount = 100;
        newBudget.fiscalStartDate = '2021-01-01';
        newBudget.fiscalEndDate = '2021-12-31';
      });

      afterEach(() => {
        expect(budgetDynamo.updateEntryInDB).toHaveBeenCalledWith(updatedBudget);
      });

      describe('when successfully updates the old budget', () => {
        beforeEach(() => {
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.resolve(oldBudget));
        });

        afterEach(() => {
          expect(budgetDynamo.addToDB).toHaveBeenCalledWith(newBudget);
        });

        describe('and successfully adds new budget to db', () => {
          beforeEach(() => {
            budgetDynamo.addToDB.and.returnValue(Promise.resolve(newBudget));
          });

          it('should return the new budget', () => {
            return chronos._makeNewBudget(oldBudget, expenseType).then((result) => {
              expect(result).toEqual(newBudget);
            });
          }); // should return the new budget
        }); // when successfully adds new budget to db

        describe('and fails to add new budget to db', () => {
          let err;

          beforeEach(() => {
            err = {
              code: 404,
              message: 'Failed to add new budget to db'
            };
            budgetDynamo.addToDB.and.returnValue(Promise.reject(err));
          });

          it('should return a 404 rejected promise', () => {
            return chronos
              ._makeNewBudget(oldBudget, expenseType)
              .then(() => {
                fail('expected error to have been thrown');
              })
              .catch((error) => {
                expect(error).toEqual(err);
              });
          }); // should return a 404 rejected promise
        }); // when fails to add new budget to db
      }); // whne successfully updates the old budget

      describe('when fails to update the old budget', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to update budget'
          };
          budgetDynamo.updateEntryInDB.and.returnValue(Promise.reject(err));
        });

        it('should return a 404 rejected promise', () => {
          return chronos
            ._makeNewBudget(oldBudget, expenseType)
            .then(() => {
              fail('expected error to have been thrown');
            })
            .catch((error) => {
              expect(error).toEqual(err);
            });
        }); // should return a 404 rejected promise
      }); // when fails to update the old budget
    }); // when previous reimburse amount exceeds expense type limit
  }); // _makeNewBudget

  describe('start', () => {
    let yesterday, budgetDynamo, expenseType;

    beforeEach(() => {
      expenseType = new ExpenseType(EXPENSE_TYPE_DATA);
      expenseType.recurringFlag = true;
      expenseType.budget = 100;

      yesterday = dateUtils.subtract(dateUtils.getTodaysDate(), 1, 'day');

      budgetDynamo = jasmine.createSpyObj('budgetDynamo', ['querySecondaryIndexInDB']);
      spyOn(chronos, '_getAllExpenseTypes').and.returnValue(Promise.resolve([expenseType]));

      spyOn(chronos, '_asyncForEach').and.callThrough();
    });

    describe('WHEN no budgets', () => {
      beforeEach(() => {
        budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.resolve([]));
        spyOn(chronos, '_budgetDynamo').and.returnValue(budgetDynamo);
      });

      afterEach(() => {
        expect(chronos._budgetDynamo).toHaveBeenCalledWith();
        expect(chronos._getAllExpenseTypes).toHaveBeenCalledWith();
        expect(budgetDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
          'fiscalEndDate-index',
          'fiscalEndDate',
          yesterday
        );
        expect(chronos._asyncForEach).not.toHaveBeenCalled();
      });

      it('SHOULD return nothing', () => {
        return chronos
          .start()
          .then((result) => {
            expect(result).toBeUndefined();
          })
          .catch((error) => {
            fail('unexpected error was thrown: ' + JSON.stringify(error));
          });
      });
    }); // WHEN no budgets

    describe('WHEN budgets', () => {
      let budget, noneReccuringBudget, underBudget;

      beforeEach(() => {
        budget = {
          id: ID,
          expenseTypeId: ID,
          employeeId: ID,
          reimbursedAmount: 70,
          pendingAmount: 60,
          fiscalStartDate: 'fiscalStartDate',
          fiscalEndDate: 'fiscalEndDate',
          amount: 100
        };

        underBudget = _.cloneDeep(BUDGET_DATA);
        noneReccuringBudget = _.cloneDeep(BUDGET_DATA);
        noneReccuringBudget.reimbursedAmount = 70;
        noneReccuringBudget.pendingAmount = 60;
        noneReccuringBudget.amount = 100;
        spyOn(chronos, '_budgetDynamo').and.returnValue(budgetDynamo);
      });

      describe('and successfully queries budgets', () => {
        beforeEach(() => {
          spyOn(chronos, '_getExpenseType').and.returnValues(
            expenseType,
            new ExpenseType(EXPENSE_TYPE_DATA),
            expenseType
          );
          spyOn(chronos, '_makeNewBudget').and.returnValue(Promise.resolve(new Budget(BUDGET_DATA)));
        });

        afterEach(() => {
          expect(budgetDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'fiscalEndDate-index',
            'fiscalEndDate',
            yesterday
          );
          expect(chronos._getAllExpenseTypes).toHaveBeenCalledWith();
          expect(chronos._makeNewBudget).toHaveBeenCalledWith(new Budget(budget));
        });

        describe('and creates 1 new budget', () => {
          beforeEach(() => {
            budgetDynamo.querySecondaryIndexInDB.and.returnValue(
              Promise.resolve([budget, noneReccuringBudget, underBudget])
            );
          });

          afterEach(() => {
            expect(chronos._asyncForEach).toHaveBeenCalledWith(
              [new Budget(budget), new Budget(noneReccuringBudget), new Budget(underBudget)],
              jasmine.any(Function)
            );
          });

          it('SHOULD return nothing', () => {
            return chronos.start().then((result) => {
              expect(result).toBeUndefined();
            });
          });
        }); // and makes 1 budget

        describe('and creates 2 new budget', () => {
          let budget2;

          beforeEach(() => {
            budget2 = _.cloneDeep(budget);
            budgetDynamo.querySecondaryIndexInDB.and.returnValue(
              Promise.resolve([budget, noneReccuringBudget, underBudget, budget2])
            );
          });

          afterEach(() => {
            expect(chronos._asyncForEach).toHaveBeenCalledWith(
              [new Budget(budget), new Budget(noneReccuringBudget), new Budget(underBudget), new Budget(budget2)],
              jasmine.any(Function)
            );
          });

          it('SHOULD return nothing', () => {
            return chronos.start().then((result) => {
              expect(result).toBeUndefined();
            });
          });
        }); // and makes 1 budget
      });

      describe('and fails queries budgets', () => {
        let err;

        beforeEach(() => {
          err = {
            code: 404,
            message: 'Failed to query budgets'
          };
          budgetDynamo.querySecondaryIndexInDB.and.returnValue(Promise.reject(err));
        });

        afterEach(() => {
          expect(budgetDynamo.querySecondaryIndexInDB).toHaveBeenCalledWith(
            'fiscalEndDate-index',
            'fiscalEndDate',
            yesterday
          );
          expect(chronos._asyncForEach).toHaveBeenCalledTimes(0);
        });

        it('SHOULD return nothing', () => {
          return chronos.start().then((result) => {
            expect(result).toBeUndefined();
          });
        });
      });

      afterEach(() => {
        expect(chronos._budgetDynamo).toHaveBeenCalled();
      });
    }); // WHEN budgets
  }); // start
}); // chronos
