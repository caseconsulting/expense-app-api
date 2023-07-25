/* until end of file
const dateUtils = require('../../js/dateUtils');
// const _ = require('lodash');

describe('dateUtilsRoutes', () => {
  let result;

  beforeEach(() => {
    // ...

  });

  // this function is at the top because if it breaks then a lot of them will break
  describe('format', () => {
    describe('when the format is the same', () => {
      it('should return exactly the same as both inputs', () => {
        result = dateUtils.format('2022-12-23', 'YYYY-MM-DD');
        expect(result).toBe('2022-12-23');
      });
    });
    describe('when the format is different', () => {
      it('should reformat into the new format', () => {
        result = dateUtils.format('2022-12-23', 'DD/MM/YY');
        expect(result).toBe('23/12/22');
      });
    });
  }); // format


  describe('add', () => {
    describe('when positive days are added', () => {
      it('should be one day in the future', () => {
        result = dateUtils.add('2022-10-02', 1, 'D');
        expect(dateUtils.format(result, 'YYYY-MM-DD')).toBe('2022-10-03');
      });
    });
    describe('when negative days are added', () => {
      it('should be one day in the past', () => {
        result = dateUtils.add('2022-10-02', -1, 'D');
        expect(dateUtils.format(result, 'YYYY-MM-DD')).toBe('2022-10-01');
      });
    });
  }); // add

  describe('subtract', () => {
    describe('when positive days are subtracted', () => {
      it('should decrease by one day', () => {
        result = dateUtils.subtract('2022-10-02', 1, 'D');
        expect(dateUtils.format(result, 'YYYY-MM-DD')).toBe('2022-10-01');
      });
    });
    describe('when negative days are subtracted', () => {
      it('should increase by one day', () => {
        result = dateUtils.subtract('2022-10-02', -1, 'D');
        expect(dateUtils.format(result, 'YYYY-MM-DD')).toBe('2022-10-03');
      });
    });

  }); // subtract

  describe('difference', () => {
    describe('when date1 is larger than date2', () => {
      it('should return a positive number', () => {
        result = dateUtils.difference('2022-10-15', '2022-10-01');
        expect(result).toBe(14);
      });
    });
    describe('when date1 is smaller than date2', () => {
      it('should be a negative number', () => {
        result = dateUtils.difference('2022-10-01', '2022-10-15');
        expect(result).toBe(-14);
      });
    });
  }); // difference

  describe('getHour', () => {
    describe('when the date is in the past', () => {
      it('should return the hour normally', () => {
        result = dateUtils.getHour('December 23, 2022 4:25 AM');
        expect(result).toBe(4);
      });
    });
    describe('when the date is in the future', () => {
      it('should return the hour normally', () => {
        result = dateUtils.getHour('December 23, 3902 22:12');
        expect(result).toBe(22);
      });
    });
  }); // getHour

  describe('getDay', () => {
    describe('when the date is in the past', () => {
      it('should return the day of the date normally', () => {
        result = dateUtils.getDay('December 23, 2022 4:25 AM');
        expect(result).toBe(23);
      });
    });
    describe('when the date is in the future', () => {
      it('should return the day of the date normally', () => {
        result = dateUtils.getDay('December 23, 3902 4:25 AM');
        expect(result).toBe(23);
      });
    });
  }); // getDay

  describe('getMonth', () => {
    describe('when the date is in the past', () => {
      it('should returnt he month normally', () => {
        result = dateUtils.getMonth('December 23, 2022 4:25 AM');
        expect(result).toBe(11);
      });
    });
    describe('when the date is in the future', () => {
      it('should return the month normally', () => {
        result = dateUtils.getMonth('December 23, 3092 4:25 AM');
        expect(result).toBe(11);
      });
    });
  }); // getMonth

  describe('getYear', () => {
    describe('when the date is in the past', () => {
      it('should return the year nomally', () => {
        result = dateUtils.getYear('December 23, 2022 4:25 AM');
        expect(result).toBe();
      });
    });
    describe('when the date is in the future', () => {
      it('should return the year nomally', () => {
        result = dateUtils.getYear('December 23, 3092 4:25 AM');
        expect(result).toBe();
      });
    });
  }); // getYear

  describe('getIsoWeekday', () => {
    describe('when the date is in the past', () => {
      it('should return the weekday normally', () => {
        result = dateUtils.getIsoWeekday('December 23, 2022 4:25 AM');
        expect(result).toBe(5);
      });
    });
    describe('when the date is in the future', () => {
      it('should return the weekday normally', () => {
        result = dateUtils.getIsoWeekday('December 23, 2022 4:25 AM');
        expect(result).toBe(5);
      });
    });
  }); // getIsoWeekday

  describe('getTodaysDate', () => {
    // idk what else to test
    describe('when the day is today', () => {
      it('should return today\'s date', () => {
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0');
        var yyyy = today.getFullYear();
        today = dd + '-' + mm + '-' + yyyy;
        result = dateUtils.getTodaysDate('DD-MM-YYYY');
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe(today);
      });
    });
  }); // getTodaysDate

  describe('isAfter', () => {
    describe('when date1 is after date2', () => {
      it('should return true', () => {
        result = dateUtils.isAfter('01-01-2050', '01-02-2020');
        expect(result).toBe(true);
      });
    });
    describe('when date1 is before date2', () => {
      it('should return false', () => {
        result = dateUtils.isAfter('01-01-2000', '01-02-2020');
        expect(result).toBe(false);
      });
    });
    describe('when granularity is Day', () => {
      it('should care about the day', () => {
        result = dateUtils.isAfter('30-12-2222', '29-12-2222');
        expect(result).toBe(true);
      });
    });
    describe('when granularity is Month', () => {
      it('should not care about the day', () => {
        result = dateUtils.isAfter('01-05-2020', '01-02-2020');
        expect(result).toBe(true);
      });
    });
    describe('when granularity is Year', () => {
      it('should not care about the month or the day', () => {
        result = dateUtils.isAfter('01-01-2021', '01-02-2020');
        expect(result).toBe(true);
      });
    });
  }); // isAfter

  describe('isBefore', () => {
    describe('when date1 is after date2', () => {
      it('should return false', () => {
        result = dateUtils.isBefore('01-01-2050', '01-02-2020');
        expect(result).toBe(false);
      });
    });
    describe('when date1 is before date2', () => {
      it('should return true', () => {
        result = dateUtils.isBefore('01-01-2000', '01-02-2020');
        expect(result).toBe(true);
      });
    });
    describe('when granularity is Day', () => {
      it('should care about the day', () => {
        result = dateUtils.isBefore('30-12-2222', '29-12-2222');
        expect(result).toBe(false);
      });
    });
    describe('when granularity is Month', () => {
      it('should not care about the day', () => {
        result = dateUtils.isBefore('01-05-2020', '01-02-2020');
        expect(result).toBe(false);
      });
    });
    describe('when granularity is Year', () => {
      it('should not care about the month or the day', () => {
        result = dateUtils.isBefore('01-01-2021', '01-02-2020');
        expect(result).toBe(false);
      });
    });
  }); // isBefore

  describe('isBetween', () => {
    describe('when date is in between dates', () => {
      it('should return true', () => {
        result = dateUtils.isBetween('25-01-2000', '25-01-1999', '25-01-2001', 'Y', '()');
        expect(result).toBe(true);
      });
    });
    describe('when date is not in between dates', () => {
      it('should return false', () => {
        result = dateUtils.isBetween('25-01-2000', '25-01-2025', '25-01-2001', 'Y', '()');
        expect(result).toBe(false);
      });
    });
    describe('when date is endDate but not inclusive', () => {
      it('should return false', () => {
        result = dateUtils.isBetween('25-01-2000', '25-01-2001', '25-01-2001', 'Y', '()');
        expect(result).toBe(false);
      });
    });
    describe('when date is startDate and is inclusive', () => {
      it('should return true', () => {
        result = dateUtils.isBetween('25-01-2000', '25-01-2001', '25-01-2001', 'Y', '(]');
        expect(result).toBe(true);
      });
    });
  }); // isBetween

  describe('isSame', () => {
    describe('when date is not the same', () => {
      it('should return false', () => {
        result = dateUtils.isSame('25-01-2000', '25-01-2000');
        expect(result).toBe(false);
      });
    });
    describe('when date is the same', () => {
      it('should return true', () => {
        result = dateUtils.isSame('25-01-2000', '25-02-2000');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Day', () => {
      it('should return true', () => {
        result = dateUtils.isSame('25-01-2000', '25-01-2000', 'D');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Month', () => {
      it('should return true', () => {
        result = dateUtils.isSame('25-01-2000', '25-01-2000', 'M');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Year', () => {
      it('should return true', () => {
        result = dateUtils.isSame('25-01-2000', '25-01-2000', 'Y');
        expect(result).toBe(true);
      });
    });
  }); // isSame

  describe('isSameOrAfter', () => {
    describe('when date is not the same or after', () => {
      it('should return false', () => {
        result = dateUtils.isSameOrAfter('25-01-1999', '25-01-2000');
        expect(result).toBe(false);
      });
    });
    describe('when date is the same', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrAfter('25-01-2000', '25-01-2000');
        expect(result).toBe(true);
      });
    });
    describe('when date is after', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrAfter('25-01-2222', '25-01-2000');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Day', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrAfter('25-01-2000', '25-01-2000', 'D');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Month', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrAfter('25-01-2000', '25-01-2000', 'M');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Year', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrAfter('25-01-2000', '25-01-2000', 'Y');
        expect(result).toBe(true);
      });
    });
  }); // isSameOrAfter

  describe('isSameOrBefore', () => {
    describe('when date is not the same or before', () => {
      it('should return false', () => {
        result = dateUtils.isSameOrBefore('25-01-2222', '25-01-2000');
        expect(result).toBe(false);
      });
    });
    describe('when date is the same', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrBefore('25-01-2000', '25-01-2000');
        expect(result).toBe(true);
      });
    });
    describe('when date is before', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrBefore('25-01-1999', '25-01-2000');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Day', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrBefore('25-01-2000', '25-01-2000', 'D');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Month', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrBefore('25-01-2000', '25-01-2000', 'M');
        expect(result).toBe(true);
      });
    });
    describe('when date is the same and granularity is Year', () => {
      it('should return true', () => {
        result = dateUtils.isSameOrBefore('25-01-2000', '25-01-2000', 'Y');
        expect(result).toBe(true);
      });
    });
  }); // isSameOrBefore

  describe('isValid', () => {
    describe('when date is valid', () => {
      it('should return true', () => {
        result = dateUtils.isValid('01-01-2000', 'DD-MM-YYYY');
        expect(result).toBe(true);
      });
    });
    describe('when date is non existant', () => {
      it('should return false', () => {
        result = dateUtils.isValid('99-99-9999', 'DD-MM-YYYY');
        expect(result).toBe(false);
      });
    });
    describe('when date format does not match input', () => {
      it('should return false', () => {
        result = dateUtils.isValid('01-01-2000', 'YYYY-DD-MM');
        expect(result).toBe(false);
      });
    });
    describe('when date format does not make sense', () => {
      it('should return false', () => {
        result = dateUtils.isValid('01-01-2000', 'AB-CD-EFGH');
        expect(result).toBe(false);
      });
    });
  }); // isValid

  describe('minimum', () => {
    describe('when two dates are the same', () => {
      it('should return the same date', () => {
        result = dateUtils.minimum(['01-01-2000', '01-01-2000']);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-2000');
      });
    });
    describe('when the first (of three) date is the min', () => {
      it('should return the min date', () => {
        result = dateUtils.minimum(['01-01-2000', '01-01-2001', '01-01-2002']);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-2000');
      });
    });
    describe('when the second (of three) date is the min', () => {
      it('should return the min date', () => {
        result = dateUtils.minimum(['01-01-2001', '01-01-2002', '01-01-2000']);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-2000');
      });
    });
    describe('when the third (of three) date is the min', () => {
      it('should return the min date', () => {
        result = dateUtils.minimum(['01-01-2001', '01-01-2002', '01-01-2000']);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-2000');
      });
    });
  }); // minimum

  describe('maximum', () => {
    describe('when two dates are the same', () => {
      it('should return the same date', () => {
        result = dateUtils.maximum(['01-01-2000', '01-01-2000']);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-2000');
      });
    });
    describe('when the first (of three) date is the max', () => {
      it('should return the max date', () => {
        result = dateUtils.maximum(['01-01-2002', '01-01-2000', '01-01-2001']);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-2002');
      });
    });
    describe('when the second (of three) date is the max', () => {
      it('should return the max date', () => {
        result = dateUtils.maximum(['01-01-2000', '01-01-2002', '01-01-2001']);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-2002');
      });
    });
    describe('when the third (of three) date is the max', () => {
      it('should return the max date', () => {
        result = dateUtils.maximum(['01-01-2000', '01-01-2001', '01-01-2002']);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-2002');
      });
    });
  }); // maximum

  describe('setDay', () => {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    today = dd + '-' + mm + '-' + yyyy;
    describe('when the month and year is now', () => {
      it('should only change the day', () => {
        result = dateUtils.setDay(today, 5);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe(`05-${mm}-${yyyy}`);
      });
    });
    describe('when the month and year is in the past', () => {
      it('should only change the day', () => {
        result = dateUtils.setDay('01-01-2000', 5);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('05-01-2000');
      });
    });
    describe('when the month and year is in the future', () => {
      it('should only change the day', () => {
        result = dateUtils.setDay('01-01-9999', 5);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('05-01-9999');
      });
    });
  }); // setDay

  describe('setMonth', () => {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    today = dd + '-' + mm + '-' + yyyy;
    describe('when the month and year is now', () => {
      it('should only change the day', () => {
        result = dateUtils.setMonth(today, 5);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe(`${dd}-05-${yyyy}`);
      });
    });
    describe('when the month and year is in the past', () => {
      it('should only change the day', () => {
        result = dateUtils.setMonth('01-01-2000', 5);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-05-2000');
      });
    });
    describe('when the month and year is in the future', () => {
      it('should only change the day', () => {
        result = dateUtils.setMonth('01-01-9999', 5);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-05-9999');
      });
    });
  }); // setMonth

  describe('setYear', () => {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    today = dd + '-' + mm + '-' + yyyy;
    describe('when the month and year is now', () => {
      it('should only change the day', () => {
        result = dateUtils.setYear(today, 1999);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe(`${dd}-${mm}-1999`);
      });
    });
    describe('when the month and year is in the past', () => {
      it('should only change the day', () => {
        result = dateUtils.setYear('01-01-2000', 1999);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-1999');
      });
    });
    describe('when the month and year is in the future', () => {
      it('should only change the day', () => {
        result = dateUtils.setYear('01-01-9999', 1999);
        expect(dateUtils.format(result, 'DD-MM-YYYY')).toBe('01-01-1999');
      });
    });
  }); // setYear

  describe('startOf', () => {
    describe('when granularity is Day', () => {
      it('should ', () => {
        result = dateUtils.startOf('01-01-2000', 'D');
        expect(result).toBe('idk');
      });
    });
    describe('when granularity is Month', () => {
      it('should ', () => {
        result = dateUtils.startOf('01-01-2000', 'M');
        expect(result).toBe('idk');
      });
    });
    describe('when granularity is Year', () => {
      it('should ', () => {
        result = dateUtils.startOf('01-01-2000', 'Y');
        expect(result).toBe('idk');
      });
    });
  }); // startOf

  describe('endOf', () => {
    describe('when granularity is Day', () => {
      it('should ', () => {
        result = dateUtils.endOf('01-01-2000', 'D');
        expect(result).toBe('idk');
      });
    });
    describe('when granularity is Month', () => {
      it('should ', () => {
        result = dateUtils.endOf('01-01-2000', 'M');
        expect(result).toBe('idk');
      });
    });
    describe('when granularity is Year', () => {
      it('should ', () => {
        result = dateUtils.endOf('01-01-2000', 'Y');
        expect(result).toBe('idk');
      });
    });
  }); // endOf

}); // dateUtilsRoutes
*/
