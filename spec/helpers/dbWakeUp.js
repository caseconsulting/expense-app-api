const dotenv = require('dotenv');
dotenv.config({ quiet: true });

const { UtilQueries } = require('expense-app-db/queries');

// wakes up the database before running tests to avoid the timeout
beforeAll(async () => {
  await UtilQueries.wakeUp();
}, 30_000);
