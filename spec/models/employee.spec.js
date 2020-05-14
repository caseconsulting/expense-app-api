const Employee = require('../../models/employee');

describe('employee', () => {

  const ID = '{id}';
  const FIRST_NAME = '{firstName}';
  const MIDDLE_NAME = '{middleName}';
  const LAST_NAME = '{lastName}';
  const EMPLOYEE_NUMBER = 0;
  const HIRE_DATE = '{hireDate}';
  const EMAIL = '{email}';
  const EMPLOYEE_ROLE = '{employeeRole}';
  const WORK_STATUS = 0;

  const EMPLOYEE_DATA = {
    id: ID,
    firstName: FIRST_NAME,
    middleName: MIDDLE_NAME,
    lastName: LAST_NAME,
    employeeNumber: EMPLOYEE_NUMBER,
    hireDate: HIRE_DATE,
    email: EMAIL,
    employeeRole: EMPLOYEE_ROLE,
    workStatus: WORK_STATUS
  };

  let employee, blankEmployee;

  beforeEach(() => {
    employee = new Employee(EMPLOYEE_DATA);
    blankEmployee = new Employee({});
  });

  describe('constructor', () => {

    it('should populate empty attribute values', () => {
      expect(blankEmployee).toEqual(jasmine.objectContaining({
        id: ' ',
        firstName: ' ',
        middleName: ' ',
        lastName: ' ',
        hireDate: ' ',
        email: ' ',
        employeeRole: ' ',
        workStatus: ' ',
        birthday: ' ',
        jobRole: ' ',
        prime: ' ',
        contract: ' ',
        github: ' ',
        twitter: ' ',
        city: ' ',
        st: ' ',
        country: ' ',
        deptDate: ' '
      }));
    }); // should populate empty attribute values
  }); // constructor

  describe('fullName', () => {

    it('should return the employee\'s first and last name', () => {
      expect(employee.fullName()).toEqual('{firstName} {lastName}');
    }); // should return the employee\'s first and last name
  }); // fullName

  describe('isAdmin', () => {

    describe('when employee is an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return true', () => {
        expect(employee.isAdmin()).toBe(true);
      }); // should return true
    }); // when employee is an admin

    describe('when employee is not an admin', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return false', () => {
        expect(employee.isAdmin()).toBe(false);
      }); // should return false
    }); // when employee is not an admin
  }); // isAdmin

  describe('_isEmpty', () => {

    describe('when value is undefined', () => {

      it('should return true', () => {
        expect(employee._isEmpty(undefined)).toBe(true);
      }); // should return true
    }); // when value is undefined

    describe('when value is null', () => {

      it('should return true', () => {
        expect(employee._isEmpty(null)).toBe(true);
      }); // should return true
    }); // when value is null

    describe('when value is a space character', () => {

      it('should return true', () => {
        expect(employee._isEmpty(' ')).toBe(true);
      }); // should return true
    }); // when value is a space character

    describe('when value is not empty', () => {

      it('should return false', () => {
        expect(employee._isEmpty('value')).toBe(false);
      }); // should return false
    }); // when value is not empty
  }); // _isEmpty

  describe('isFullTime', () => {

    describe('when employee work status is 100', () => {

      beforeEach(() => {
        employee.workStatus = 100;
      });

      it('should return true', () => {
        expect(employee.isFullTime()).toBe(true);
      }); // should return true
    }); // when employee work status is 100

    describe('when employee work status is 50', () => {

      beforeEach(() => {
        employee.workStatus = 50;
      });

      it('should return false', () => {
        expect(employee.isFullTime()).toBe(false);
      }); // should return false
    }); // when employee work status is 50

    describe('when employee work status is 0', () => {

      beforeEach(() => {
        employee.workStatus = 0;
      });

      it('should return false', () => {
        expect(employee.isFullTime()).toBe(false);
      }); // should return false
    }); // when employee work status is 0
  }); // isFullTime

  describe('isInactive', () => {

    describe('when employee work status is 0', () => {

      beforeEach(() => {
        employee.workStatus = 0;
      });

      it('should return true', () => {
        expect(employee.isInactive()).toBe(true);
      }); // should return true
    }); // when employee work status is 0

    describe('when employee work status is 100', () => {

      beforeEach(() => {
        employee.workStatus = 100;
      });

      it('should return false', () => {
        expect(employee.isInactive()).toBe(false);
      }); // should return false
    }); // when employee work status is 100

    describe('when employee work status is 50', () => {

      beforeEach(() => {
        employee.workStatus = 50;
      });

      it('should return false', () => {
        expect(employee.isInactive()).toBe(false);
      }); // should return false
    }); // when employee work status is 50
  }); // isInactive

  describe('isPartTime', () => {

    describe('when employee work status is 50', () => {

      beforeEach(() => {
        employee.workStatus = 50;
      });

      it('should return true', () => {
        expect(employee.isPartTime()).toBe(true);
      }); // should return true
    }); // when employee work status is 50

    describe('when employee work status is 100', () => {

      beforeEach(() => {
        employee.workStatus = 100;
      });

      it('should return false', () => {
        expect(employee.isPartTime()).toBe(false);
      }); // should return false
    }); // when employee work status is 100

    describe('when employee work status is 0', () => {

      beforeEach(() => {
        employee.workStatus = 0;
      });

      it('should return false', () => {
        expect(employee.isPartTime()).toBe(false);
      }); // should return false
    }); // when employee work status is 0
  }); // isFullTime

  describe('isUser', () => {

    describe('when employee is a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'user';
      });

      it('should return true', () => {
        expect(employee.isUser()).toBe(true);
      }); // should return true
    }); // when employee is a user

    describe('when employee is not a user', () => {

      beforeEach(() => {
        employee.employeeRole = 'admin';
      });

      it('should return false', () => {
        expect(employee.isUser()).toBe(false);
      }); // should return false
    }); // when employee is not a user
  }); // isUser
}); // employee
