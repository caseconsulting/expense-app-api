const Employee = require('../../models/employee');

describe('employee', () => {
  const ID = '{id}';
  const FIRST_NAME = '{firstName}';
  const LAST_NAME = '{lastName}';
  const HIRE_DATE = '{hireDate}';
  const EMAIL = '{email}';
  const EMPLOYEE_ROLE = '{employeeRole}';
  const EMPLOYEE_NUMBER = 0;
  const WORK_STATUS = 0;

  const MIDDLE_NAME = '{middleName}';
  const BIRTHDAY = '{birthday}';
  const BIRTHDAY_FEED = '{birthday feed}';
  const JOB_ROLE = 'jobRole';
  const PRIME = 'prime';
  const CONTRACT = 'contract';
  const GITHUB = 'github';
  const TWITTER = 'twitter';
  const PHONE_NUMBER = 'phoneNumber';
  const CITY = 'city';
  const STREET = 'st';
  const COUNTRY = 'country';
  const DEPARTURE_DATE = 'deptDate';
  const CURRENT_CITY = 'currentCity';
  const CURRENT_STATE = 'currentState';
  const CURRENT_STREET = 'currentStreet';
  const CURRENT_ZIP = 'currentZIP';

  const EMPLOYEE_DATA = {
    id: ID,
    firstName: FIRST_NAME,
    lastName: LAST_NAME,
    employeeNumber: EMPLOYEE_NUMBER,
    hireDate: HIRE_DATE,
    email: EMAIL,
    employeeRole: EMPLOYEE_ROLE,
    workStatus: WORK_STATUS,
    middleName: MIDDLE_NAME,
    birthday: BIRTHDAY,
    birthdayFeed: BIRTHDAY_FEED,
    jobRole: JOB_ROLE,
    prime: PRIME,
    contract: CONTRACT,
    github: GITHUB,
    twitter: TWITTER,
    phoneNumber: PHONE_NUMBER,
    city: CITY,
    st: STREET,
    country: COUNTRY,
    deptDate: DEPARTURE_DATE,
    currentCity: CURRENT_CITY,
    currentState: CURRENT_STATE,
    currentStreet: CURRENT_STREET,
    currentZIP: CURRENT_ZIP
  };

  let employee;

  beforeEach(() => {
    employee = new Employee(EMPLOYEE_DATA);
  });

  describe('constructor', () => {
    let localEmployeeData;

    beforeEach(() => {
      localEmployeeData = {
        id: ID,
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
        employeeNumber: EMPLOYEE_NUMBER,
        hireDate: HIRE_DATE,
        email: EMAIL,
        employeeRole: EMPLOYEE_ROLE,
        workStatus: WORK_STATUS,
        twitter: TWITTER,
        invalid: '{invalid}'
      };
      employee = new Employee(localEmployeeData);
    });

    it('should populate required and optional values only', () => {
      expect(employee).toEqual(
        new Employee({
          id: ID,
          firstName: FIRST_NAME,
          lastName: LAST_NAME,
          employeeNumber: EMPLOYEE_NUMBER,
          hireDate: HIRE_DATE,
          email: EMAIL,
          employeeRole: EMPLOYEE_ROLE,
          workStatus: WORK_STATUS,
          twitter: TWITTER
        })
      );
    }); // should populate required and optional values only
  }); // constructor

  describe('fullName', () => {
    it("should return the employee's first and last name", () => {
      expect(employee.fullName()).toEqual('{firstName} {lastName}');
    }); // should return the employee\'s first and last name
  }); // fullName

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
}); // employee
