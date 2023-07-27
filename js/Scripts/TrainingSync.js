// validate the stage (dev, test, prod)
let STAGE;
if (process.argv.length > 2) {
  STAGE = process.argv[2];
  if (STAGE !== 'dev' && STAGE !== 'test' && STAGE !== 'prod') {
    console.log('stage env must be dev, test, or prod');
    throw new Error();
  }
} else {
  console.log('must include a stage env');
  throw new Error();
}

const got = require('got');
const Logger = require('../Logger');
const metascraper = require('metadata-scraper');
const TrainingUrl = require('../../models/trainingUrls');
const _ = require('lodash');

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' }));
const logger = new Logger('TrainingSync');
const EXPENSE_TABLE = `${STAGE}-expenses`;
const TRAINING_TABLE = `${STAGE}-training-urls`;
const EXPENSE_TYPE_TABLE = `${STAGE}-expense-types`;

// get all the entries in dynamo the given table
const getAllEntries = (params, out = []) =>
  new Promise((resolve, reject) => {
    ddb
      .send(new ScanCommand(params))
      .then(({ Items, LastEvaluatedKey }) => {
        out.push(...Items);
        !LastEvaluatedKey
          ? resolve(out)
          : resolve(getAllEntries(Object.assign(params, { ExclusiveStartKey: LastEvaluatedKey }), out));
      })
      .catch(reject);
  });

/**
 * Async function to loop an array.
 *
 * @param array - Array of elements to iterate over
 * @param callback - callback function
 */
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
} // asyncForEach

/**
 * Deletes all training urls from the training table.
 */
async function deleteAllTrainingUrls() {
  logger.log(2, 'deleteAllTrainingUrls', `Deleting all entries in ${TRAINING_TABLE}`);

  let entries = await getAllEntriesInDB(TRAINING_TABLE);

  await asyncForEach(entries, async (entry) => {
    let params = {
      TableName: TRAINING_TABLE,
      Key: {
        id: entry.id,
        category: entry.category
      },
      ReturnValues: 'ALL_OLD'
    };

    // delete entry
    await ddb
      .send(new DeleteCommand(params))
      .then((data) => {
        logger.log(
          2,
          'deleteAllTrainingUrls',
          `Successfully deleted training url ${data.Attributes.id} with category ${data.Attributes.category} from`,
          `${TRAINING_TABLE}`
        );
      })
      .catch((err) => {
        logger.log(
          2,
          'deleteAllTrainingUrls',
          `Failed to delete training url ${entry.id} with category ${entry.category} from ${TRAINING_TABLE}. Error`,
          'JSON:',
          JSON.stringify(err, null, 2)
        );
      });
  });
  logger.log(2, 'deleteAllTrainingUrls', `Finished deleting all entries in ${TRAINING_TABLE}`);
} // deleteAllTrainingUrls

/**
 * Get all expenses in a given table.
 *
 * @param table - Dynamo table to get entries from
 * @return Array - List of entries in table
 */
function getAllEntriesInDB(table) {
  logger.log(2, 'getAllEntriesInDB', `Getting all entries in table ${table}`);

  let params = {
    TableName: table
  };
  return getAllEntries(params);
} // getAllEntriesInDB

/**
 * Scrapes metadata from a website url. Returns the url title, description, image, logo, and publisher.
 *
 * @param id - website url
 * @return object - url metadata
 */
async function _getMetaData(id) {
  // log method
  logger.log(2, '_getMetaData', `Attempting to scrape metadata from ${id}`);

  // compute method
  return _got(id)
    .then((data) => _metascraper(data))
    .then((metaData) => {
      // log success
      logger.log(2, '_getMetaData', `Successfully scraped metadata from ${id}`);

      return metaData;
    })
    .catch(() => {
      // log error
      logger.log(2, '_getMetaData', `Failed to scrape metadata from ${id}`);

      return {};
    });
} // _getMetaData

/**
 * Executes a http request to a url and returns information about the request. (Helper function for testing)
 *
 * @param id - url
 * @return Object - html request body and url
 */
async function _got(id) {
  // log method
  logger.log(2, '_got', `Getting http request for ${id}`);

  // compute method
  const { body: html, url } = await got(id);
  return { html, url };
} // _got

/**
 * Scrapes a url http request and returns an object with metadata from the url: title, description, image, logo,
 * and publisher. (Helper function for testing)
 *
 * @param data - object containing the html data and url
 * @return Object - url metadata
 */
async function _metascraper(data) {
  // log method
  logger.log(2, '_metascraper', `Scraping ${data.url} for metadata`);

  // compute method
  return metascraper(data);
  // return {};
} // _metascraper

/**
 * gets all training urls
 */
async function getAllTrainingUrls() {
  logger.log(2, 'getAllTrainingUrls', 'Attempting to update all Training Urls');
  // delete all old entries in training table
  await deleteAllTrainingUrls();

  // get training expense type
  let expenseTypes = await getAllEntriesInDB(EXPENSE_TYPE_TABLE);
  let trainingET = _.find(expenseTypes, (expenseType) => {
    return expenseType.budgetName === 'Training';
  });

  // generate training hits from expenses
  let expenses = await getAllEntriesInDB(EXPENSE_TABLE);
  let keys = [];
  for (let i = 0; i < expenses.length; i++) {
    if (expenses[i].expenseTypeId === trainingET.id && !_.isNil(expenses[i].url) && !_.isNil(expenses[i].category)) {
      let key = {
        url: expenses[i].url,
        category: expenses[i].category
      };

      let index = _.findIndex(keys, key);
      if (index !== -1) {
        keys[index].hits = keys[index].hits + 1;
      } else {
        key.hits = 1;
        keys.push(key);
      }
    }
  }

  // create entry in dynamo table
  _.forEach(keys, async (key) => {
    let metadata = await _getMetaData(key.url);
    metadata.id = key.url;
    metadata.category = key.category;
    metadata.hits = key.hits;

    let trainingUrl = new TrainingUrl(metadata);

    // add budget to budgets table
    let params = {
      TableName: TRAINING_TABLE,
      Item: trainingUrl
    };

    await ddb
      .send(new PutCommand(params))
      .promise()
      .then(() => {
        logger.log(
          1,
          'getAllTrainingUrls',
          `Successfully created ${key.hits} hit(s) for training url '${key.url}' with category '${key.category}'`
        );
      })
      .catch((err) => {
        logger.log(
          1,
          'getAllTrainingUrls',
          `Unable to create ${key.hits} hit(s) for training url '${key.url}' with category '${key.category}'. Erro`,
          'JSON:',
          JSON.stringify(err, null, 2)
        );
      });
  });
  logger.log(2, 'getAllTrainingUrls', 'Finished updating all Training Urls');
} // getAllTrainingUrls

getAllTrainingUrls();
