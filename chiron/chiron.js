const got = require('got');
const Logger = require('./js/Logger');
const DatabaseModify = require('./js/databaseModify');
const TrainingUrl = require('./models/trainingUrls');
const ExpenseType = require('./models/expenseType');
const Expense = require('./models/expense');
const _ = require('lodash');
const urlExist = require('url-exist');

const trainingUrlDynamo = new DatabaseModify('training-urls');
const expenseTypeDynamo = new DatabaseModify('expense-types');
const expenseDynamo = new DatabaseModify('expenses');

const metascraper = require('metadata-scraper');

const logger = new Logger('TrainingSync');

/**
 * Gets all expensetype data and then parses the categories
 *
 * @return - the expense types
 */
async function getAllExpenseTypes() {
  let expenseTypesData = await expenseTypeDynamo.getAllEntriesInDB();
  let expenseTypes = _.map(expenseTypesData, expenseTypeData => {
    expenseTypeData.categories = _.map(expenseTypeData.categories, category => {
      return JSON.parse(category);
    });
    return new ExpenseType(expenseTypeData);
  });
  return expenseTypes;
} // getAllExpenseTypes

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
  logger.log(2, 'deleteAllTrainingUrls', `Deleting all entries in ${expenseTypeDynamo.tableName}`);

  let trainingUrls = await trainingUrlDynamo.getAllEntriesInDB();
  await asyncForEach(trainingUrls, async (entry) => {
    await trainingUrlDynamo.removeFromDBUrl(entry.id, entry.category);
  });
  logger.log(2, 'deleteAllTrainingUrls', `Finished deleting all entries in ${expenseTypeDynamo.tableName}`);
} // deleteAllTrainingUrls

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
  try {
    if (await urlExist(id)) {
      const { body: html, url } = await got(id);
      return { html, url };
    } else {
      throw 'invalid url';
    }
  } catch (err) {
    return err;
  }
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
} // _metascraper

/**
 * repopulate all expense training urls
 */
async function getAllTrainingUrls() {
  logger.log(2, 'getAllTrainingUrls', 'Attempting to update all Training Urls');

  // delete all old entries in training table
  await deleteAllTrainingUrls();

  // get training expense type
  let expenseTypes = await getAllExpenseTypes();

  let trainingET = _.find(expenseTypes, (expenseType) => {
    return expenseType.budgetName === 'Training';
  });

  // generate training hits from expenses
  let expensesData = await expenseDynamo.getAllEntriesInDB();
  let expenses = _.map(expensesData, expenseData => {
    return new Expense(expenseData);
  });

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
  await asyncForEach(keys, async (key) => {
    let metadata = await _getMetaData(key.url);
    metadata.id = key.url;
    metadata.category = key.category;
    metadata.hits = key.hits;
    let trainingUrl = new TrainingUrl(metadata);

    await trainingUrlDynamo.addToDB(trainingUrl);
  });

  logger.log(2, 'getAllTrainingUrls', 'Finished updating all Training Urls');
} // getAllTrainingUrls

/**
 * Handler to execute lamba function.
 * 
 * @param event - request
 */
async function handler(event) {
  console.info(JSON.stringify(event)); // eslint-disable-line no-console

  await getAllTrainingUrls();
} // handler

module.exports = { handler };
