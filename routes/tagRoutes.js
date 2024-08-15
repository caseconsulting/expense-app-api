const _ = require('lodash');
const Tag = require(process.env.AWS ? 'tag' : '../models/tag');
const Budget = require(process.env.AWS ? 'budget' : '../models/budget');
const Crud = require(process.env.AWS ? 'crudRoutes' : './crudRoutes');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const dateUtils = require(process.env.AWS ? 'dateUtils' : '../js/dateUtils');

const logger = new Logger('tagRoutes');
const IsoFormat = 'YYYY-MM-DD';

class TagRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new DatabaseModify('tags');
  } // constructor

  /**
   * Prepares a Tag to be created. Returns the Tag if it can be successfully created.
   *
   * @param data - data of Tag
   * @return Tag - Tag prepared to create
   */
  async _create(data) {
    // log method
    logger.log(2, '_create', `Preparing to create Tag ${data.id}`);

    // compute method
    try {
      let tag = new Tag(data);

      await this._validateTag(tag); // validate tag
      await this._validateCreate(tag); // validate create

      // log success
      logger.log(2, '_create', `Successfully prepared to create Tag ${data.id}`);

      // return prepared Tag
      return tag;
    } catch (err) {
      // log error
      logger.log(2, '_create', `Failed to prepare create for Tag ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _create

  /**
   * Prepares a Tag to be deleted. Returns the Tag if it can be successfully deleted.
   *
   * @param id - id of Tag
   * @return Tag - Tag prepared to delete
   */
  async _delete(id) {
    // log method
    logger.log(2, '_delete', `Preparing to delete Tag ${id}`);

    // compute method
    try {
      let tag = new Tag(await this.databaseModify.getEntry(id));
      let [expenseTypes] = await Promise.all([this.expenseTypeDynamo.getAllEntriesInDB(), this._validateDelete(tag)]);

      // remove deleted tag instances in all expense types
      await this._removeTagFromExpenseTypes(tag, expenseTypes);

      // log success
      logger.log(2, '_delete', `Successfully prepared to delete Tag ${id}`);

      // return Tag deleted
      return tag;
    } catch (err) {
      // log error
      logger.log(2, '_delete', `Failed to prepare delete for Tag ${id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _delete

  /**
   * Updates the budgets from a list of employees that were added/removed from a tag.
   *
   * @param employeesIds - The list of employee IDs to update
   * @param newTag - The tag that is being updated
   */
  async _updateEmployeesBudgets(employeesIds, newTag) {
    let [employees, tags, expenseTypes] = await Promise.all([
      this.employeeDynamo.getAllEntriesInDB(),
      this.tagDynamo.getAllEntriesInDB(),
      this.expenseTypeDynamo.getAllEntriesInDB()
    ]);
    // tags db has not yet been updated, change old instance of tag that is about to be updated
    tags[_.findIndex(tags, (t) => t.id === newTag.id)] = newTag;
    let promises = [];
    _.forEach(employeesIds, (eId) => {
      let employee = _.find(employees, (emp) => emp.id === eId);
      if (employee) {
        // check if an expense type has a tag that was affected by the update
        let needsUpdate = _.find(
          expenseTypes,
          (e) => e.tagBudgets && _.find(e.tagBudgets, (tb) => _.find(tb.tags, (t) => t === newTag.id))
        );
        if (needsUpdate) {
          // update budget for employee
          promises.push(this._updateBudgets(employee, newTag, tags, expenseTypes));
        }
      }
    });
    await Promise.all(promises);
  } // _updateEmployeesBudgets

  /**
   * Updates budgets when updating the list of employees on a tag.
   *
   * @param employee - Employee to update
   * @param newTag - The tag that is being updated
   * @param tags - The list of tags
   * @param expenseTypes - The list of all expense types
   * @return Array - Array of employee Budgets
   */
  async _updateBudgets(employee, newTag, tags, expenseTypes) {
    // log method
    logger.log(2, '_updateBudgets', `Attempting to update budgets for employee ${employee.id}`);

    // compute method
    try {
      let budgets = [];

      // need to update budgets
      let budgetsData = await this.budgetDynamo.querySecondaryIndexInDB(
        'employeeId-expenseTypeId-index',
        'employeeId',
        employee.id
      );

      budgets = _.map(budgetsData, (budgetData) => {
        return new Budget(budgetData);
      });

      let i; // index of budgets
      let promises = [];
      for (i = 0; i < budgets.length; i++) {
        // update budget amount
        let start = dateUtils.format(budgets[i].fiscalStartDate, null, IsoFormat); // budget start date
        let end = dateUtils.format(budgets[i].fiscalEndDate, null, IsoFormat); // budget end date
        if (dateUtils.isBetween(dateUtils.getTodaysDate(), start, end, 'day', '[]')) {
          // only update active budgets
          let expenseType = _.find(expenseTypes, ['id', budgets[i].expenseTypeId]);
          if (
            expenseType.tagBudgets &&
            _.find(expenseType.tagBudgets, (tb) => _.find(tb.tags, (t) => t === newTag.id))
          ) {
            // update budget amount if expense type includes tag being changed
            let adjustedAmount = this.calcAdjustedAmount(employee, expenseType, tags);
            budgets[i].legacyCarryover = this.calcLegacyCarryover(budgets[i], adjustedAmount);
            budgets[i].amount = adjustedAmount;
            logger.log(2, '_updateBudgets', `Budget: ${expenseType}, Amount: ${budgets[i].amount}`);
            // update budget in database
            try {
              promises.push(this.budgetDynamo.updateEntryInDB(budgets[i]));

              // log budget update success
              logger.log(2, '_updateBudgets', `Successfully updated budget ${budgets[i].id}`);
            } catch (err) {
              // log and throw budget update failure
              logger.log(2, '_updateBudgets', `Failed updated budget ${budgets[i].id}`);
              throw err;
            }
          }
        }
      }
      await Promise.all(promises);

      // log success
      logger.log(2, '_updateBudgets', `Successfully updated budgets for employee ${employee.id}`);

      // return updated bugets
      return budgets;
    } catch (err) {
      // log error
      logger.log(2, '_updateBudgets', `Failed to update budgets for employee ${employee.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _updateBudgets

  /**
   * Prepares a Tag to be updated. Returns the Tag if it can be successfully updated.
   *
   * @param req - request
   * @return Tag - Tag prepared to update
   */
  async _update(req) {
    let data = req.body;

    // log method
    logger.log(2, '_update', `Preparing to update Tag ${data.id}`);

    // compute method
    try {
      let oldTag = new Tag(await this.databaseModify.getEntry(data.id));
      let newTag = new Tag(data);
      await Promise.all([this._validateTag(newTag), this._validateUpdate(oldTag, newTag)]);
      // get symmetric difference for employees affected by tag update
      let employeesToUpdate = _.xor(oldTag.employees, newTag.employees);
      if (employeesToUpdate && employeesToUpdate.length > 0) {
        logger.log(2, '_update', `Preparing to update budgets for employees: ${JSON.stringify(employeesToUpdate)}`);
        // Overview of what happens here: The list of employees changed on the tag will have their budget amounts
        // changed IF an expense type includes the tag that was changed and IF the budget is active
        await this._updateEmployeesBudgets(employeesToUpdate, newTag);
      }

      // log success
      logger.log(2, '_update', `Successfully prepared to update Tag ${data.id}`);
      // return Tag to update
      return newTag;
    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for Tag ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

  /**
   * Validate that a Tag can be created. Returns the Tag if the Tag can be created.
   *
   * @param tag - tag to be created
   * @return Tag - validated Tag
   */
  async _validateCreate(tag) {
    // log method
    logger.log(3, '_validateCreate', `Validating create for Tag ${tag.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating create for Tag.'
      };

      let tags = await this.databaseModify.getAllEntriesInDB();

      // validate duplicate tag id
      if (tags.some((t) => t.id === tag.id)) {
        // log error
        logger.log(3, '_validateCreate', `tag ID ${tag.id} is duplicated`);

        // throw error
        err.message = 'Unexpected duplicate id created. Please try submitting again.';
        throw err;
      }

      // validate duplicate name
      if (tags.some((t) => t.tagName == tag.tagName)) {
        // log error
        logger.log(3, '_validateCreate', `tag name ${tag.tagName} is duplicated`);

        // throw error
        err.message = `Tag name ${tag.tagName} is already taken. Please specify a new tag name.`;
        throw err;
      }

      // log success
      logger.log(3, '_validateCreate', `Successfully validated create for tag ${tag.id}`);

      // return tag on success
      return Promise.resolve(tag);
    } catch (err) {
      // log error
      logger.log(3, '_validateCreate', `Failed to validate create for tag ${tag.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateCreate

  /**
   * Validate that a tag can be deleted. Returns the tag if successfully validated, otherwise returns an
   * error.
   *
   * @param tag - tag to validate delete
   * @return Tag - validated tag
   */
  async _validateDelete(tag) {
    // log method
    logger.log(3, '_validateDelete', `Validating delete for tag ${tag.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating create for Tag.'
      };

      // validate empty employees list attached to tag
      if (!_.isEmpty(tag.employees)) {
        // log error
        logger.log(3, '_validateDelete', 'All employees must be removed from a tag before deleting tag');

        // throw error
        err.message = 'All employees must be removed from tag before deleting tag';
        throw err;
      }
      // log success
      logger.log(3, '_validateDelete', `Successfully validated delete for tag ${tag.id}`);

      // return tag on success
      return Promise.resolve(tag);
    } catch (err) {
      // log error
      logger.log(3, '_validateDelete', `Failed to validate delete for tag ${tag.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateDelete

  /**
   * Validate that a tag is valid. Returns the tag if successfully validated, otherwise returns an error.
   *
   * @param tag - tag object to be validated
   * @return Tag - validated Tag
   */
  async _validateTag(tag) {
    // log method
    logger.log(3, '_validateTag', `Validating tag ${tag.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating tag.'
      };

      // validate id
      if (_.isNil(tag.id)) {
        // log error
        logger.log(3, '_validateTag', 'Tag id is empty');

        // throw error
        err.message = 'Invalid tag id.';
        throw err;
      }

      // validate tagName
      if (_.isNil(tag.tagName)) {
        // log error
        logger.log(3, '_validateTag', 'tagName is empty');

        // throw error
        err.message = 'Invalid tag name.';
        throw err;
      }

      // log success
      logger.log(3, '_validateTag', `Successfully validated tag ${tag.id}`);

      // return tag on success
      return Promise.resolve(tag);
    } catch (err) {
      // log error
      logger.log(3, '_validateTag', `Failed to validate tag ${tag.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateTag

  /**
   * Validates that a tag can be updated. Returns the tag if the tag being updated is valid.
   *
   * @param oldTag - Tag being updated from
   * @param newTag - Tag being updated to
   * @return Tag - validated tag
   */
  async _validateUpdate(oldTag, newTag) {
    // log method
    logger.log(3, '_validateUpdate', `Validating update for tag ${oldTag.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating update for tag.'
      };

      // validate tag id
      if (oldTag.id != newTag.id) {
        // log error
        logger.log(3, '_validateUpdate', `old Tag id ${oldTag.id} does not match new Tag id ${newTag.id}`);

        // throw error
        err.message = 'Error validating tag IDs.';
        throw err;
      }

      let tags = await this.databaseModify.getAllEntriesInDB();

      // validate duplicate name
      if (tags.some((t) => t.id !== newTag.id && t.tagName == newTag.tagName)) {
        // log error
        logger.log(3, '_validateUpdate', `tag name ${newTag.tagName} is duplicated`);

        // throw error
        err.message = `Tag name ${newTag.tagName} is already taken. Please specify a new tag name.`;
        throw err;
      }

      // log success
      logger.log(3, '_validateUpdate', `Successfully validated update for tag ${oldTag.id}`);

      // return new Tag on success
      return Promise.resolve(newTag);
    } catch (err) {
      // log error
      logger.log(3, '_validateUpdate', `Failed to validate update for Tag ${oldTag.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate

  /**
   * Removes any instance of the tag being deleted in all expense types.
   *
   * @param tag - The tag being deleted
   * @param expenseTypes - The list of all expense types
   * @returns Array - All of the modified expense types
   */
  async _removeTagFromExpenseTypes(tag, expenseTypes) {
    let promises = [];
    let modified = false;
    _.forEach(expenseTypes, (expenseType) => {
      if (expenseType.tagBudgets) {
        _.forEach(expenseType.tagBudgets, (tagBudget) => {
          // check if tag being deleted exists in an expense type's budget tags
          let tagIndex = _.findIndex(tagBudget.tags, (t) => t === tag.id);
          if (tagIndex !== -1) {
            // remove budget tag from expense type
            tagBudget.tags.splice(tagIndex, 1);
            modified = true;
          }
        });
        expenseType.tagBudgets = _.filter(expenseType.tagBudgets, (tb) => !_.isEmpty(tb.tags));
      }
      if (modified) {
        // update entry in dynamodb
        promises.push(this.expenseTypeDynamo.updateEntryInDB(expenseType));
      }
      modified = false;
    });
    let modifiedExpenseTypes = await Promise.all(promises);
    return modifiedExpenseTypes;
  } // _removeTagFromExpenseTypes
} // TagRoutes

module.exports = TagRoutes;
