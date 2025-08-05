const dotenv = require('dotenv');
dotenv.config({ quiet: true });

const { UtilQueries } = require('expense-app-db/queries');

// wakes up the database before running tests to avoid the timeout
beforeAll(async () => {
  // increase timeout for this function
  const timeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 30 * 1000;

  await UtilQueries.wakeUp();
  // reset timeout for remaining tests
  jasmine.DEFAULT_TIMEOUT_INTERVAL = timeout;
}, 30000);
