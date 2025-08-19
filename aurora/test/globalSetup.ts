import { config as dotenv } from 'dotenv';

// global setup that runs once before the entire test suite
export default async () => {
  dotenv({ path: '../.env', quiet: true });
};
