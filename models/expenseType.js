/*
budgetName: 'Technology',
odFlag: false,
endDate: null,
budget: '1800.00',
recurringFlag: true,
startDate: null,
description: 'For Computers',
id: '1caf4050-bf52-4d62-a025-a2acd93a12db'
*/

class ExpenseType {
  constructor(data) {
    this.id = data.id;
    this.budgetName = data.budgetName;
    this.odFlag = data.odFlag;
    this.endDate = data.endDate;
    this.budget = Number(data.budget);
    this.recurringFlag = data.recurringFlag;
    this.startDate = data.startDate;
    this.description = data.description;
  }
}

module.exports = ExpenseType;
