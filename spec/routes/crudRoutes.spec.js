const CrudRoutes = require('../../routes/crudRoutes');
const TrainingUrls = require('../../models/trainingUrls');
const _ = require('lodash');
const moment = require('moment');
const ISOFORMAT = 'YYYY-MM-DD';

describe('crudRoutes', () => {

  const STAGE = 'dev';
  const _EMPLOYEE = {
    id: '{employeeId}',
    employeeRole: '{employeeRole}'
  };
  const _BODY = {
    id: '{id}'
  };
  const _PARAMS = {
    id: '{paramsId}',
    category: '{paramsCategory}'
  };
  const _REQ = {
    employee: _EMPLOYEE,
    body: _BODY,
    params: _PARAMS
  };

  const _ROUTER = '{router}';

  let databaseModify, crudRoutes, res;

  beforeEach(() => {
    databaseModify = jasmine.createSpyObj('databaseModify', [
      'addToDB',
      'getAllEntriesInDB',
      'getEntry',
      'getEntryUrl',
      'querySecondaryIndexInDB',
      'queryWithTwoIndexesInDB',
      'readFromDB',
      'readFromDBUrl',
      'removeFromDB',
      'updateEntryInDB'
    ]);
    res = jasmine.createSpyObj('res', ['status', 'send']);
    res.status.and.returnValue(res);

    crudRoutes = new CrudRoutes();
    crudRoutes.databaseModify = databaseModify;
    crudRoutes._router = _ROUTER;
  });

  describe('_checkPermissionToCreate', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(_EMPLOYEE);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToCreate(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToCreate

  describe('_checkPermissionToDelete', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(_EMPLOYEE);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToDelete(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToDelete

  describe('_checkPermissionToRead', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(_EMPLOYEE);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToRead(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToRead(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToRead(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToRead(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToRead(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToRead

  describe('_checkPermissionToReadAll', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(_EMPLOYEE);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expense-types`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToReadAll(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToReadAll

  describe('_checkPermissionToUpdate', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(_EMPLOYEE);
    });

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is a user

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      describe('and valid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
        });

        it('should return true', () => {
          expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(true);
        }); // should return true
      }); // and valid table name

      describe('and invalid table name', () => {

        beforeEach(() => {
          crudRoutes.databaseModify.tableName = 'invalid-table-name';
        });

        it('should return false', () => {
          expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(false);
        }); // should return true
      }); // and invalid table name
    }); // when employee is an admin

    describe('when employee is not a user or admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'invalid-role';
      });

      it('should return false', () => {
        expect(crudRoutes._checkPermissionToUpdate(employee)).toEqual(false);
      }); // should return false
    }); // when employee is not a user or admin
  }); // _checkPermissionToUpdate

  describe('_checkTableName', () => {

    beforeEach(() => {
      crudRoutes.databaseModify.tableName =  `${STAGE}-expenses`;
    });

    describe('when database table is in list of table names', () => {

      it('should return true', () => {
        expect(crudRoutes._checkTableName(['expenses'])).toEqual(true);
      }); // should retrun true
    }); // when database table is in the list of table names

    describe('when database table is not in list of table names', () => {
      it('should return false', () => {
        expect(crudRoutes._checkTableName(['invalid-table-name'])).toEqual(false);
      }); // should retrun false
    }); // when database table is not in the list of table names
  }); // _checkTableName

  describe('_createWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(_REQ);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        spyOn(crudRoutes, '_create').and.returnValue(Promise.resolve(_BODY));
      });

      describe('creating a Training URL', () => {

        let trainingUrl;

        beforeEach(() => {
          trainingUrl = new TrainingUrls({id: 'id', category: 'category'});
          databaseModify.addToDB.and.returnValue(Promise.resolve(trainingUrl));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes._createWrapper(req, res).then(data => {
            expect(data).toEqual(trainingUrl);
            expect(crudRoutes._create).toHaveBeenCalledWith(_BODY);
            expect(databaseModify.addToDB).toHaveBeenCalledWith(_BODY);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(trainingUrl);
            done();
          });
        }); // should respond with a 200 and data
      }); // creating a Training URL

      describe('creating something other than a Training URL', () => {

        beforeEach(() => {
          databaseModify.addToDB.and.returnValue(Promise.resolve(_BODY));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes._createWrapper(req, res).then(data => {
            expect(data).toEqual(_BODY);
            expect(crudRoutes._create).toHaveBeenCalledWith(_BODY);
            expect(databaseModify.addToDB).toHaveBeenCalledWith(_BODY);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(_BODY);
            done();
          });
        }); // should respond with a 200 and data
      }); // creating something other than a Training URL
    }); // when called without error

    describe('when employee does not have permission to create', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to create object in database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._createWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to create

    describe('when failed to create object', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error creating object.'
        };
        spyOn(crudRoutes, '_create').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._createWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._create).toHaveBeenCalledWith(_BODY);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to create object

    describe('when failed to validate inputs', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error validating inputs.'
        };
        spyOn(crudRoutes, '_create').and.returnValue(Promise.resolve(_BODY));
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._createWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._create).toHaveBeenCalledWith(_BODY);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(_BODY);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to validate inputs

    describe('when failed to add object to database', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error adding object to database.'
        };
        spyOn(crudRoutes, '_create').and.returnValue(Promise.resolve(_BODY));
        databaseModify.addToDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._createWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._create).toHaveBeenCalledWith(_BODY);
          expect(databaseModify.addToDB).toHaveBeenCalledWith(_BODY);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to add object to database
  }); // _createWrapper

  describe('_deleteWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(_REQ);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        spyOn(crudRoutes, '_delete').and.returnValue(Promise.resolve(_BODY));
        databaseModify.removeFromDB.and.returnValue(Promise.resolve(_BODY));
      });

      it('should respond with a 200 and data', done => {
        crudRoutes._deleteWrapper(req, res).then(data => {
          expect(data).toEqual(_BODY);
          expect(crudRoutes._delete).toHaveBeenCalledWith(_PARAMS.id);
          expect(databaseModify.removeFromDB).toHaveBeenCalledWith(_BODY.id);
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(_BODY);
          done();
        });
      }); // should respond with a 200 and data
    }); //when called without error

    describe('when employee does not have permission to delete', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to delete object from database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._deleteWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to delete

    describe('when failed to delete object', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        crudRoutes.databaseModify.tableName =  `${STAGE}-expenses`;
        err = {
          code: 403,
          message: 'Error deleting object.'
        };
        spyOn(crudRoutes, '_delete').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._deleteWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to delete object

    describe('when failed to remove object from database', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error removing object from database.'
        };
        spyOn(crudRoutes, '_delete').and.returnValue(Promise.resolve(_BODY));
        databaseModify.removeFromDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._deleteWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._delete).toHaveBeenCalledWith(_PARAMS.id);
          expect(databaseModify.removeFromDB).toHaveBeenCalledWith(_BODY.id);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to remove object from database
  }); // _deleteWrapper

  describe('getBudgetDates', () => {

    let hireDate, expectedDates;

    beforeEach(() => {
      hireDate = moment();
    });

    describe('when hire date is before today', () => {

      beforeEach(() => {
        hireDate.subtract(5, 'y');
      });

      describe('and anniversary already occured this year', () => {

        beforeEach(() => {
          hireDate.subtract(1, 'd');
          expectedDates = {
            startDate: moment().subtract(1, 'd'),
            endDate: moment().add(1, 'y').subtract(2, 'd')
          };
        });

        it('should return a start date with the current year and end date of next year', () => {
          expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
            .toEqual(expectedDates.startDate.format(ISOFORMAT));
          expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
            .toEqual(expectedDates.endDate.format(ISOFORMAT));
        }); // should return a start date with the current year
      }); // and anniversary already occured this year

      describe('and anniversary is today', () => {

        beforeEach(() => {
          expectedDates = {
            startDate: moment(),
            endDate: moment().add(1, 'y').subtract(1, 'd')
          };
        });

        it('should return a start date with the current year and end date of next year', () => {
          expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
            .toEqual(expectedDates.startDate.format(ISOFORMAT));
          expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
            .toEqual(expectedDates.endDate.format(ISOFORMAT));
        }); // should return a start date with the current year
      }); // and anniversary is today

      describe('and anniversary has not occured this year', () => {

        beforeEach(() => {
          hireDate.add(1, 'd');
          expectedDates = {
            startDate: moment().subtract(1, 'y').add(1, 'd'),
            endDate: moment()
          };
        });

        it('should return a start date of last year and end date of the current year', () => {
          expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
            .toEqual(expectedDates.startDate.format(ISOFORMAT));
          expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
            .toEqual(expectedDates.endDate.format(ISOFORMAT));
        }); // should return a start date with the current year
      }); // and anniversary has not occured this year
    }); // when hire date is before today

    describe('when hire date is today', () => {

      beforeEach(() => {
        expectedDates = {
          startDate: moment(),
          endDate: moment().add(1, 'y').subtract(1, 'd')
        };
      });

      it('should return a start date with the current year and end date of next year', () => {
        expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
          .toEqual(expectedDates.startDate.format(ISOFORMAT));
        expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
          .toEqual(expectedDates.endDate.format(ISOFORMAT));
      }); // should return a start date with the current year
    }); // when hire date is today

    describe('when hire date is after today', () => {
      beforeEach(() => {
        hireDate.add(1, 'd');
        expectedDates = {
          startDate: moment().add(1, 'd'),
          endDate: moment().add(1, 'y')
        };
      });

      it('should return a start date with the hire year and end date a year after the hire year', () => {
        expect(crudRoutes.getBudgetDates(hireDate).startDate.format(ISOFORMAT))
          .toEqual(expectedDates.startDate.format(ISOFORMAT));
        expect(crudRoutes.getBudgetDates(hireDate).endDate.format(ISOFORMAT))
          .toEqual(expectedDates.endDate.format(ISOFORMAT));
      }); // should return a start date with the current year
    }); // when hire date is after today
  }); // getBudgetDates

  describe('_getTableName', () => {

    beforeEach(() => {
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    it ('should return the database table name', () => {
      expect(crudRoutes._getTableName()).toEqual(`${STAGE}-expenses`);
    }); // should return the database table name
  }); // _getTableName

  describe('isAdmin', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(_EMPLOYEE);
    });

    describe('when the employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return true', () => {
        expect(crudRoutes.isAdmin(employee)).toBe(true);
      }); // should return true
    }); // when the employee is an admin

    describe('when the employee is not an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return false', () => {
        expect(crudRoutes.isAdmin(employee)).toBe(false);
      }); // should return false
    }); // when the employee is not an admin
  }); // isAdmin

  describe('isUser', () => {

    let employee;

    beforeEach(() => {
      employee = _.cloneDeep(_EMPLOYEE);
    });

    describe('when the employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return true', () => {
        expect(crudRoutes.isUser(employee)).toBe(true);
      }); // should return true
    }); // when the employee is a user

    describe('when the employee is not a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return false', () => {
        expect(crudRoutes.isUser(employee)).toBe(false);
      }); // should return false
    }); // when the employee is not an user
  }); // isUser

  describe('_readWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(_REQ);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      describe('when user and object belongs to the user', () => {

        let objectRead;

        beforeEach(() => {
          req.employee.employeeRole = 'user';
          req.employee.id = 'id';
          objectRead = _.cloneDeep(_BODY);
          objectRead.employeeId = 'id';
          spyOn(crudRoutes, '_read').and.returnValue(Promise.resolve(objectRead));
        });

        it('should respond with a 403 and error', done => {
          crudRoutes._readWrapper(req, res).then(data => {
            expect(data).toEqual(objectRead);
            expect(crudRoutes._read).toHaveBeenCalledWith(_PARAMS);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(objectRead);
            done();
          });
        }); // should respond with a 403 and error
      }); // when user and object read does not belong to user

      describe('reading a Training URL', () => {

        let trainingUrl;

        beforeEach(() => {
          req.employee.employeeRole = 'admin';
          trainingUrl = new TrainingUrls({id: 'id', category: 'category'});
          spyOn(crudRoutes, '_read').and.returnValue(Promise.resolve(trainingUrl));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes._readWrapper(req, res).then(data => {
            expect(data).toEqual(trainingUrl);
            expect(crudRoutes._read).toHaveBeenCalledWith(_PARAMS);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(trainingUrl);
            done();
          });
        }); // should respond with a 200 and data
      }); // reading a Training URL

      describe('reading something other than a Training URL', () => {

        beforeEach(() => {
          req.employee.employeeRole = 'admin';
          spyOn(crudRoutes, '_read').and.returnValue(Promise.resolve(_BODY));
        });

        it('should respond with a 200 and data', done => {
          crudRoutes._readWrapper(req, res).then(data => {
            expect(data).toEqual(_BODY);
            expect(crudRoutes._read).toHaveBeenCalledWith(_PARAMS);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(_BODY);
            done();
          });
        }); // should respond with a 200 and data
      }); // reading something other than a Training URL
    }); //when called without error

    describe('when employee does not have permission to read', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to read object from database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to read

    describe('when failed to read object', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error reading object.'
        };
        spyOn(crudRoutes, '_read').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._read).toHaveBeenCalledWith(_PARAMS);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to read object

    describe('when user and object read does not belong to user', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'user';
        req.employee.id = 'invalid-id';
        err = {
          code: 403,
          message: 'Unable to read object from database due to insufficient employee permissions.'
        };
        spyOn(crudRoutes, '_read').and.returnValue(Promise.resolve(_BODY));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._read).toHaveBeenCalledWith(_PARAMS);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when user and object read does not belong to user
  }); // _readWrapper

  describe('_readAllWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(_REQ);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.resolve(_BODY));
      });

      it('should respond with a 200 and data', done => {
        crudRoutes._readAllWrapper(req, res).then(data => {
          expect(data).toEqual(_BODY);
          expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(200);
          expect(res.send).toHaveBeenCalledWith(_BODY);
          done();
        });
      }); // should respond with a 200 and data
    }); //when called without error

    describe('when employee does not have permission to read', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to read all objects from database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readAllWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to read

    describe('when failed to read all objects from database', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error reading all objects from database.'
        };
        databaseModify.getAllEntriesInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._readAllWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(databaseModify.getAllEntriesInDB).toHaveBeenCalled();
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to read all objects from database
  }); // _readWrapper

  describe('router', () => {
    it('should return the router', () => {
      expect(crudRoutes.router).toEqual(_ROUTER);
    }); // should return the router
  }); // router

  describe('_sendError', () => {

    let err;

    beforeEach(() => {
      err = {
        code: 403,
        message: 'Forbidden error'
      };
    });

    afterEach(() => {
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith(err);
    });

    it('should send an error', () => {
      crudRoutes._sendError(res, err);
    }); // should send an error
  }); // _sendError

  describe('_updateWrapper', () => {

    let req;

    beforeEach(() => {
      req = _.cloneDeep(_REQ);
      crudRoutes.databaseModify.tableName = `${STAGE}-expenses`;
    });

    describe('when called without error', () => {

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
      });

      describe('and updating a Training URL', () => {

        let trainingUrl;

        beforeEach(() => {
          trainingUrl = new TrainingUrls({id: 'id', category: 'category'});
          req.body = trainingUrl;
          spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(trainingUrl));
          databaseModify.updateEntryInDB.and.returnValue(Promise.resolve(trainingUrl));
        });

        it ('should respond with a 200 and data', done => {
          crudRoutes._updateWrapper(req, res).then(data => {
            expect(data).toEqual(trainingUrl);
            expect(crudRoutes._update).toHaveBeenCalledWith(trainingUrl);
            expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(trainingUrl);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(trainingUrl);
            done();
          });
        }); // should respond with a 200 and data
      }); // and updating a training url

      describe('and updated object has the same id', () => {

        beforeEach(() => {
          spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(_BODY));
          databaseModify.updateEntryInDB.and.returnValue(Promise.resolve(_BODY));
        });

        it ('should respond with a 200 and data', done => {
          crudRoutes._updateWrapper(req, res).then(data => {
            expect(data).toEqual(_BODY);
            expect(crudRoutes._update).toHaveBeenCalledWith(_BODY);
            expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(_BODY);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(_BODY);
            done();
          });
        }); // should respond with a 200 and data
      }); // and updated object has the same id

      describe('and updated object has a different id', () => {

        let newObject;

        beforeEach(() => {
          newObject = {
            id: 'different-id'
          };
          spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(newObject));
        });

        it ('should respond with a 200 and data', done => {
          crudRoutes._updateWrapper(req, res).then(data => {
            expect(data).toEqual(newObject);
            expect(crudRoutes._update).toHaveBeenCalledWith(_BODY);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith(newObject);
            done();
          });
        }); // should respond with a 200 and data
      }); // and updated object has a different id
    }); //when called without error

    describe('when employee does not have permission to update', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'invalid-role';
        err = {
          code: 403,
          message: 'Unable to update object in database due to insufficient employee permissions.'
        };
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._updateWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when employee does not have permission to update

    describe('when failed to update object', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error updating object.'
        };
        spyOn(crudRoutes, '_update').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._updateWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._update).toHaveBeenCalledWith(_BODY);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to update object

    describe('when failed to validate inputs', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error validating inputs.'
        };
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(_BODY));
        spyOn(crudRoutes, '_validateInputs').and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._updateWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._update).toHaveBeenCalledWith(_BODY);
          expect(crudRoutes._validateInputs).toHaveBeenCalledWith(_BODY);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to validate inputs

    describe('when failed to update object in database', () => {

      let err;

      beforeEach(() => {
        req.employee.employeeRole = 'admin';
        err = {
          code: 403,
          message: 'Error updating object to database.'
        };
        spyOn(crudRoutes, '_update').and.returnValue(Promise.resolve(_BODY));
        databaseModify.updateEntryInDB.and.returnValue(Promise.reject(err));
      });

      it('should respond with a 403 and error', done => {
        crudRoutes._updateWrapper(req, res).then(data => {
          expect(data).toEqual(err);
          expect(crudRoutes._update).toHaveBeenCalledWith(_BODY);
          expect(databaseModify.updateEntryInDB).toHaveBeenCalledWith(_BODY);
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.send).toHaveBeenCalledWith(err);
          done();
        });
      }); // should respond with a 403 and error
    }); // when failed to update object to database
  }); // _updateWrapper

  describe('_validateInputs', () => {

    describe('when object id exists', () => {

      describe('when all params are valid', () => {

        it('should return the object', () => {
          crudRoutes._validateInputs(_BODY).then(data => {
            expect(data).toEqual(_BODY);
          });
        }); // should return the object
      }); // when all params are valid

      describe('when one or more params is empty', () => {

        let err, invalidObject;

        beforeEach(() => {
          err = {
            code: 406,
            message: 'Failed to validate inputs. All fields are needed.'
          };
          invalidObject = {
            id: '{id}',
            invalidParam: ''
          };
        });

        it('should return a 406 error', done => {
          crudRoutes._validateInputs(invalidObject).catch(error => {
            expect(error).toEqual(err);
            done();
          });
        }); // should return a 406 error
      }); // when one or more params is empty
    }); // when object id exists

    describe('when object id does not exist', () => {

      let err, invalidObject;

      beforeEach(() => {
        err = {
          code: 400,
          message: 'Failed to validate inputs'
        };
        invalidObject = {
          body: 'body'
        };
      });

      it('should return a 400 error', done => {
        crudRoutes._validateInputs(invalidObject).catch(error => {
          expect(error).toEqual(err);
          done();
        });
      }); // should return a 400 error
    }); // when object id does not exist
  }); // _validateInputs
}); // crudRoutes
