const { config: dotenv } = require('dotenv');
dotenv({ quiet: true });

const { initialize } = require('expense-app-db');
const { UtilQueries } = require('expense-app-db/queries');

// wakes up the database before running tests to avoid the timeout
beforeAll(async () => {
  await initialize();
  await UtilQueries.wakeUp();
}, 30_000);
