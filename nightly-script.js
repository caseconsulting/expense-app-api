// let start, end;
// if (expenseType.recurringFlag) {
//   let hireDate = moment(employee.hireDate);
//   let hireYear = hireDate.year();
//   let currentYear = moment().year();
//   let yearDiff = currentYear - hireYear;
//   let fiscalStartDate = hireDate.add(yearDiff, 'years');
//   let fiscalEndDate = fiscalStartDate.add(1, 'years');
//
//   fiscalEndDate = fiscalEndDate.subtract(1, 'days');
//   start = moment(fiscalStartDate).format('MM-DD-YYYY');
//   end = moment(fiscalEndDate).format('MM-DD-YYYY');
// } else {
//   start = expenseType.fiscalStartDate;
//   end = expenseType.fiscalEndDate;
// }
// return {
//   startDate: start,
//   endDate: end
// };
