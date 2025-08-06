import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env', quiet: true });

import { expect, test } from '@jest/globals';

import { wakeUp } from '../src/queries/utilQueries';

// wakes up the database with a 'select 1' query with a 30 second timeout
test('wakeUp', async () => {
  expect(await wakeUp()).toEqual(1);
}, 30_000);
