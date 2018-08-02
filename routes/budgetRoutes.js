const express = require('express');
// const _ = require('lodash');
const databaseModify = require('../js/databaseModify');
const budgetDynamo = databaseModify('Budgets');
class Budgets {
  constructor(databaseModify){
    this.databaseModify = databaseModify;
    this.budgetDynamo = budgetDynamo;
    this._router = express.Router();
  }
  get router() {
    return this._router;
  }


}

module.exports = Budgets;
