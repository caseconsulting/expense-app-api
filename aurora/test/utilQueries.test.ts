import { beforeAll, expect, test } from '@jest/globals';
import { initialize } from '../src';
import { wakeUp } from '../src/queries/utilQueries';

beforeAll(async () => {
  await initialize();
});

// wakes up the database with a 'select 1' query with a 30 second timeout
test('wakeUp', async () => {
  expect(await wakeUp()).toEqual(1);
}, 30_000);
