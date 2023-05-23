const Tag = require('./../models/tag');
const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const Logger = require('../js/Logger');
const _ = require('lodash');

const logger = new Logger('tagRoutes');

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
      await this._validateDelete(tag);

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
   * Prepares a Tag to be updated. Returns the Tag if it can be successfully updated.
   *
   * @param req - request
   * @return Tag - Tag prepared to update
   */
  async _update(data) {
    // log method
    logger.log(2, '_update', `Preparing to update Tag ${data.id}`);

    // compute method
    try {
      let oldTag = new Tag(await this.databaseModify.getEntry(data.id));
      let newTag = new Tag(data);
      await Promise.all([this._validateTag(newTag), this._validateUpdate(oldTag, newTag)]);

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
} // TagRoutes

module.exports = TagRoutes;
