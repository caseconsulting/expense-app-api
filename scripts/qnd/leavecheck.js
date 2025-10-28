import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
const lambdaClient = new LambdaClient();
import fs from 'fs';
import path from 'path';


/**
 * Invokes lambda function with given params
 *
 * @param params - params to invoke lambda function with
 * @return object if successful, error otherwise
 */
async function invokeLambda(params) {
  const command = new InvokeCommand(params);
  const resp = await lambdaClient.send(command);
  return JSON.parse(Buffer.from(resp.Payload));
} // invokeLambda

/**
 * Parses a CSV file in the local folder.
 * @param {string} fileName - Name of the CSV file (e.g., 'data.csv')
 * @returns {Promise<Array<Object>>} Parsed CSV data as an array of objects
 */
export async function parseCsv(fileName) {
  // "","Ahlstrand, Jason","10103","CASE_CARES","0.00","4.00"
  const filePath = path.resolve(process.cwd(), fileName);
  const data = await fs.promises.readFile(filePath, 'utf-8');

  const lines = data.trim().split('\n');
  lines.splice(0, 3);

  let stp = (v) => v.substring(1, v.length-1);
  let num = (n) => Number(stp(n));
  let str = (s) => `${stp(s)}`;
  return lines.reduce((acc, curr) => {
    let line = curr.split(',');
    let [_0, _1, _2, id, project, _3, balance] = line;
    
    acc[num(id)] ??= {};
    acc[num(id)][str(project)] = num(balance);
    return acc;
  }, {});
}

async function getTimesheet(id) {
  // payload for individual user
  let payload = {
    employeeNumber: id,
    periods: [
      {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
        title: 'Oct'
      }
    ]
  };
  let params = {
    FunctionName: 'mysterio-get-timesheet-data-prod',
    Payload: JSON.stringify(payload),
    Qualifier: '$LATEST'
  };
  return await invokeLambda(params);
}

let round = (n) => (Math.round(n * 1000) / 1000);
async function main() {
  let csvData = await parseCsv('csv.csv');

  for (let [id, csvBals] of Object.entries(csvData)) {
    let lambdaData = await getTimesheet(id);
    lambdaData = lambdaData.body.leaveBalances;
    if (!lambdaData) {
      console.log('wrong version');
      break;
    }

    let balEntries = Object.entries(csvBals);
    let hasBad = false;
    for (let i in balEntries) {
      let [name, csvBal] = balEntries[i];
      let lambdaBal = lambdaData[name] ?? 0;
      lambdaBal = round(lambdaBal / 60 / 60);
      csvBal = round(csvBal);

      if (lambdaBal !== csvBal) {
        hasBad = true;
        let diff = Math.abs(csvBal - lambdaBal);
        console.log('\n--------------------------');
        console.log(`${id}: BAD`);
        console.log(`  For project ${name}: csvBal ${csvBal} != ${lambdaBal} lambdaBal; diff: ${diff}`);
        console.log('--------------------------\n');
      }
    }
    if (!hasBad) console.log(`${id}: GOOD`);
    hasBad = false;
  }
}

await main();
