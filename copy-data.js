// TODO folder?
// TODO rename file?
// TODO share code with cloudformation.js

// Script to copy data from one DynamoDB table to another
const proc = require('process');
const { spawn } = require('child_process');

const Stages = /** @type {const} */ ({
  dev: 'dev',
  test: 'test',
  prod: 'prod'
});

/**
 * @type {[
 *   never,
 *   never,
 *   typeof Stages[keyof Stages]
 * ]}
 */

const [node, script, stage] = proc.argv;

// validate args
if (!template || !stage || !inEnum(Templates, template) || !inEnum(Stages, stage)) {
  console.log(
    `Usage: npm run deploy:cloudformation -- <${Object.values(Templates).join(' | ')}> <${Object.values(Stages).join(
      ' | '
    )}>`
  );
  proc.exit(1);
}

/**
 * Whether the given value is in the enum
 *
 * @template E The type of the enum object (usually `typeof enumObj`)
 * @param {E} enumObj The enum-like javascript object
 * @param {*} value The value to test
 */
function inEnum(enumObj, value) {
  return Object.values(enumObj).includes(value);
}
