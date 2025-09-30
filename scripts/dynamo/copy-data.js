const { DynamoDBClient, ScanCommand, PutItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { fromIni } = require('@aws-sdk/credential-providers');

const SOURCE_PROFILE = 'prod';
const SOURCE_STAGE = 'prod';
const TARGET_PROFILE = 'dev';
const TARGET_STAGE = 'test';

const REGION = 'us-east-1';
const TABLES = ['budgets', 'contracts', 'employees', 'leaderboard', 'pto-cashouts', 'tags'];

const TABLE_KEYS = {
  leaderboard: 'employeeId'
};
const sourceClient = new DynamoDBClient({
  region: REGION,
  credentials: fromIni({ profile: SOURCE_PROFILE })
});

const targetClient = new DynamoDBClient({
  region: REGION,
  credentials: fromIni({ profile: TARGET_PROFILE })
});

async function getAllItemsFromSource(sourceTable) {
  console.log(`Getting data from ${sourceTable}...`);
  let items = [];
  let ExclusiveStartKey = undefined;

  do {
    const command = new ScanCommand({
      TableName: sourceTable,
      ExclusiveStartKey
    });

    const response = await sourceClient.send(command);
    items = items.concat(response.Items);
    ExclusiveStartKey = response.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  console.log(`Found ${items.length} items in ${sourceTable}.`);
  return items;
}

async function emptyTargetTable(targetTable) {
  console.log(`Emptying table: ${targetTable}...`);

  let ExclusiveStartKey = undefined;
  let tableKey = TABLE_KEYS[targetTable.replace(`${TARGET_STAGE}-`, '')] || 'id';

  do {
    const scanCommand = new ScanCommand({
      TableName: targetTable,
      ExclusiveStartKey
    });

    const response = await targetClient.send(scanCommand);
    ExclusiveStartKey = response.LastEvaluatedKey;

    for (const item of response.Items) {
      try {
        await targetClient.send(
          new DeleteItemCommand({
            TableName: targetTable,
            Key: {
              [tableKey]: item[tableKey]
            }
          })
        );
      } catch (err) {
        console.error(`Error deleting item in ${targetTable}:`, err);
      }
    }
  } while (ExclusiveStartKey);

  console.log(`${targetTable} emptied.`);
}

async function writeItemsToTarget(targetTable, items) {
  console.log(`Writing data to ${targetTable}...`);
  for (const item of items) {
    try {
      const putCommand = new PutItemCommand({
        TableName: targetTable,
        Item: item
      });

      await targetClient.send(putCommand);
    } catch (err) {
      console.error(`Error copying item to ${targetTable}:`, err);
    }
  }

  console.log(`Data written to ${targetTable}...`);
}

async function writeItemsToEmployeeSensitive(items) {
  let tableName = `${TARGET_STAGE}-employees-sensitive`;
  console.log(`Writing data to ${tableName}...`);
  for (const item of items) {
    let sanitizedItem = {
      id: item.id,
      employeeRole: item.employeeRole
    };
    try {
      const putCommand = new PutItemCommand({
        TableName: tableName,
        Item: sanitizedItem
      });

      await targetClient.send(putCommand);
    } catch (err) {
      console.error(`Error copying item to ${tableName}:`, err);
    }
  }

  console.log(`Data written to ${tableName}...`);
}

async function writeItemsToExpenses(items) {
  let tableName = `${TARGET_STAGE}-expenses`;
  console.log(`Writing data to ${tableName}...`);
  for (const item of items) {
    if (item.category && item.category.S.toLowerCase().includes('hours')) {
      continue; // Skip hour conversion expenses
    }
    try {
      const putCommand = new PutItemCommand({
        TableName: tableName,
        Item: item
      });

      await targetClient.send(putCommand);
    } catch (err) {
      console.error(`Error copying item to ${tableName}:`, err);
    }
  }

  console.log(`Data written to ${tableName}...`);
}

async function writeItemsToExpenseTypes(items) {
  let tableName = `${TARGET_STAGE}-expense-types`;
  console.log(`Writing data to ${tableName}...`);
  for (const item of items) {
    let sanitizedItem = {
      ...item,
      to: { S: '' },
      cc: { S: '' },
      bcc: { S: '' },
      replyTo: { S: '' }
    }; // do not copy email fields
    try {
      const putCommand = new PutItemCommand({
        TableName: tableName,
        Item: sanitizedItem
      });

      await targetClient.send(putCommand);
    } catch (err) {
      console.error(`Error copying item to ${tableName}:`, err);
    }
  }

  console.log(`Data written to ${tableName}...`);
}

(async () => {
  try {
    TABLES.forEach(async (table) => {
      const items = await getAllItemsFromSource(`${SOURCE_STAGE}-${table}`);
      let targetTable = `${TARGET_STAGE}-${table}`;
      await emptyTargetTable(targetTable);
      await writeItemsToTarget(targetTable, items);
    });

    // employee-sensitive
    const employeeSensitiveItems = await getAllItemsFromSource(`${SOURCE_STAGE}-employees-sensitive`);
    await emptyTargetTable(`${TARGET_STAGE}-employees-sensitive`);
    await writeItemsToEmployeeSensitive(employeeSensitiveItems);

    // expenses
    const expenseItems = await getAllItemsFromSource(`${SOURCE_STAGE}-expenses`);
    await emptyTargetTable(`${TARGET_STAGE}-expenses`);
    await writeItemsToExpenses(expenseItems);

    // expense-types
    const expenseTypeItems = await getAllItemsFromSource(`${SOURCE_STAGE}-expense-types`);
    await emptyTargetTable(`${TARGET_STAGE}-expense-types`);
    await writeItemsToExpenseTypes(expenseTypeItems);
  } catch (err) {
    console.error('Error during copy:', err);
  }
})();
