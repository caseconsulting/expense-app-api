// Packages and deploys a cloudformation template.

const proc = require('process');
const { spawn } = require('child_process');

const Templates = /** @type {const} */ ({
  app: 'app',
  database: 'database',
  network: 'network',
  support: 'support'
}); 

const Stages = /** @type {const} */ ({
  sandbox: 'sandbox',
  dev: 'dev',
  test: 'test',
  prod: 'prod'
});

/**
 * @type {[
 *   never,
 *   never,
 *   typeof Templates[keyof Templates],
 *   typeof Stages[keyof Stages]
 * ]}
 */

const [node, script, template, stage] = proc.argv;

// validate args
if (!template || !stage || !inEnum(Templates, template) || !inEnum(Stages, stage)) {
  console.log(
    `Usage: npm run deploy:cloudformation -- <${Object.values(Templates).join(' | ')}> <${Object.values(Stages).join(
      ' | '
    )}>`
  );
  proc.exit(1);
}

const templateFile = `${template}.yaml`;
const packagedFile = `${template}.packaged.yaml`;

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

/**
 * Waits for the process to exit and returns the exit code
 *
 * @param {childproc.ChildProcess} proc The child process
 * @returns {Promise<void>}
 */
async function wait(proc) {
  return await new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code === 0) resolve();
      proc.exitCode = code; // use the child process's error code
      reject(code);
    });
  });
}

/**
 * Runs the command to package a template
 */
async function pack() {
  await wait(
    spawn(
      'aws',
      [
        'cloudformation',
        'package',

        '--template-file',
        templateFile,

        '--s3-bucket',
        `case-expense-app-resources-${stage}`,

        '--s3-prefix',
        'expense-app-api',

        '--output-template-file',
        packagedFile
      ],
      { stdio: 'inherit' }
    )
  );
}

/**
 * Runs the command to deploy a template
 */
async function deploy() {
  await wait(spawn('npm', ['run', `predeploy:${stage}`], { stdio: 'inherit' }));

  await wait(
    spawn(
      'aws',
      [
        'cloudformation',
        'deploy',

        '--template-file',
        packagedFile,

        '--s3-bucket',
        `case-expense-app-deployments-${stage}`,

        '--s3-prefix',
        'cloudformation',

        '--capabilities',
        'CAPABILITY_IAM',
        'CAPABILITY_NAMED_IAM',

        '--stack-name',
        template == Templates.app ? `expense-app-${stage}` : `expense-app-${template}-${stage}`,

        '--region',
        'us-east-1',

        '--parameter-overrides',
        `Stage=${stage}`
      ],
      { stdio: 'inherit' }
    )
  );

  await wait(spawn('npm', ['run', `postdeploy:${stage}`], { stdio: 'inherit' }));
}

async function main() {
  await pack();
  await deploy();
}

main();
