const Logger = require('../js/Logger');
const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const BlogPost = require('../models/blogPost');
const _ = require('lodash');

const logger = new Logger('blogRoutes');

class BlogRoutes extends Crud {
  constructor() {
    super();
    this.databaseModify = new DatabaseModify('blog-posts');
  } // constructor

  /**
   * Reads a blog post from the database. Returns the post read along with the blog data from the bucket.
   *
   * @param data - parameters of blog post
   * @return Blog post data
   */
  async _read(data) {
    // log method
    logger.log(2, '_read', `Attempting to read blogPost ${data.id}`);
    
    // compute method
    try {
      let blogPostRaw = await this.databaseModify.getEntry(data.id); // read from database
      let blogPost = new BlogPost(blogPostRaw);
      // log success
      logger.log(2, '_read', `Successfully read blogPost ${data.id}`);

      // return blogPost
      return blogPost;
    } catch (err) {
      // log error
      logger.log(2, '_read', `Failed to read blogPost ${data.id}`);

      // return error
      return Promise.reject(err);
    }
  } // _read

  /**
   * Reads all blogPosts from the database. Returns all blogPosts.
   *
   * @return Array - all blogPosts
   */
  async _readAll() {
    // log method
    logger.log(2, '_readAll', 'Attempting to read all blogPosts');

    // compute method
    try {
      let blogPostsData = await this.databaseModify.getAllEntriesInDB();
      let blogPosts = _.map(blogPostsData, blogPost => {
        return new BlogPost(blogPost);
      });

      // log success
      logger.log(2, '_readAll', 'Successfully read all blogPosts');

      // return all blogPosts
      return blogPosts;
    } catch (err) {
      // log error
      logger.log(2, '_readAll', 'Failed to read all blogPosts');

      // return error
      return Promise.reject(err);
    }
  } // _readAll

  /**
   * Prepares a blog post to be created. Returns the blog post if it can be successfully created.
   *
   * @param data - data of blog post - object for dynamo and file for s3
   * @return blogPost - blog post prepared to create
   */
  async _create(data) {
    // log method
    logger.log(2, '_create', `Preparing to create blogPost ${data.id}`);

    // compute method
    try {
      let blogPost = new BlogPost(data);

      await this._validateBlogPost(blogPost); // validate blogPost
      await this._validateCreate(blogPost); // validate create

      // log success
      logger.log(2, '_create', `Successfully prepared to create blog post ${data.id}`);

      // return prepared blogPost
      return blogPost;
    } catch (err) {
      // log error
      logger.log(2, '_create', `Failed to prepare create for blog post ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _create

  /**
   * Prepares an blogPost to be deleted. Returns the blogPost if it can be successfully deleted.
   *
   * @param id - id of blogPost
   * @return BlogPost - blogPost prepared to delete
   */
  async _delete(id) {
    // log method
    logger.log(2, '_delete', `Preparing to delete blogPost ${id}`);

    // compute method
    try {
      let blogPost = new BlogPost(await this.databaseModify.getEntry(id));
      //TODO: do a validate?

      // log success
      logger.log(2, '_delete', `Successfully prepared to delete blogPost ${id}`);

      // return blogPost deleted
      return blogPost;
    } catch (err) {
      // log error
      logger.log(2, '_delete', `Failed to prepare delete for blogPost ${id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _delete

  /**
   * Prepares an blogPost to be updated. Returns the blogPost if it can be successfully updated.
   *
   * @param data - data of blogPost
   * @return BlogPost - blogPost prepared to update
   */
  async _update(data) {
    // log method
    logger.log(2, '_update', `Preparing to update blogPost ${data.id}`);

    // compute method
    try {
      let newBlogPost = new BlogPost(data);
      let oldBlogPost = new BlogPost(await this.databaseModify.getEntry(data.id));

      await this._validateBlogPost(newBlogPost);
      await this._validateUpdate(oldBlogPost, newBlogPost);

      // log success
      logger.log(2, '_update', `Successfully prepared to update blogPost ${data.id}`);

      // return blogPost to update
      return newBlogPost;

    } catch (err) {
      // log error
      console.log(err);
      logger.log(2, '_update', `Failed to prepare update for blogPost ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

  /**
   * Returns the instace express router.
   *
   * @return Router Object - express router
   */
  get router() {
    // log method
    logger.log(5, 'router', 'Getting router');

    return this._router;
  } // router
  
  /**
   * Validate that a blogPost is valid. Returns the blogPost if successfully validated, otherwise returns an error.
   *
   * @param blogPost - BlogPost object to be validated
   * @return BlogPost - validated blogPost
   */
  async _validateBlogPost(blogPost) {
    // log method
    logger.log(3, '_validateBlogPost', `Validating blogPost ${blogPost.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating blogPost.'
      };

      // validate id
      if (_.isNil(blogPost.id)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost id is empty');

        // throw error
        err.message = 'Invalid blogPost id.';
        throw err;
      }

      // validate blogNumber
      if (_.isNil(blogPost.blogNumber)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost blogNumber is empty');

        // throw error
        err.message = 'Invalid blogPost blogNumber.';
        throw err;
      }

      // validate title
      if (_.isNil(blogPost.title)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost title is empty');

        // throw error
        err.message = 'Invalid blogPost title.';
        throw err;
      }

      // validate mainPicture
      if (_.isNil(blogPost.mainPicture)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost mainPicture is empty');

        // throw error
        err.message = 'Invalid blogPost mainPicture.';
        throw err;
      }

      // validate authorId
      if (_.isNil(blogPost.authorId)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost authorId is empty');

        // throw error
        err.message = 'Invalid blogPost authorId.';
        throw err;
      }

      // validate category
      if (_.isNil(blogPost.category)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost category is empty');

        // throw error
        err.message = 'Invalid blogPost category.';
        throw err;
      }

      // validate description
      if (_.isNil(blogPost.description)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost description is empty');

        // throw error
        err.message = 'Invalid blogPost description.';
        throw err;
      }

      // validate createDate
      if (_.isNil(blogPost.createDate)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost createDate is empty');
      
        // throw error
        err.message = 'Invalid blogPost createDate.';
        throw err;
      }

      // validate lastModifiedDate
      if (_.isNil(blogPost.lastModifiedDate)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost lastModifiedDate is empty');
      
        // throw error
        err.message = 'Invalid blogPost lastModifiedDate.';
        throw err;
      }

      // validate fileName
      if (_.isNil(blogPost.fileName)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost fileName is empty');

        // throw error
        err.message = 'Invalid blogPost fileName.';
        throw err;
      }

      // log success
      logger.log(3, '_validateBlogPost', `Successfully validated blogPost ${blogPost.id}`);

      // return blogPost on success
      return Promise.resolve(blogPost);
    } catch (err) {
      // log error
      logger.log(3, '_validateBlogPost', `Failed to validate blogPost ${blogPost.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateBlogPost

  /**
   * Validate that an blogPost can be created. Returns the blogPost if the blogPost can be created.
   *
   * @param blogPost - BlogPost to be created
   * @return BlogPost - validated blogPost
   */
  async _validateCreate(blogPost) {
    // log method
    logger.log(3, '_validateCreate', `Validating create for blogPost ${blogPost.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating create for blogPost.'
      };

      let blogPosts = await this.databaseModify.getAllEntriesInDB();

      // validate duplicate blogPost id
      if (blogPosts.some((e) => e.id === blogPost.id)) {
        // log error
        logger.log(3, '_validateCreate', `BlogPost ID ${blogPost.id} is duplicated`);

        // throw error
        err.message = 'Unexpected duplicate id created. Please try submitting again.';
        throw err;
      }

      // log success
      logger.log(3, '_validateCreate', `Successfully validated create for blogPost ${blogPost.id}`);

      // return blogPost on success
      return Promise.resolve(blogPost);
    } catch (err) {
      // log error
      logger.log(3, '_validateCreate', `Failed to validate create for blogPost ${blogPost.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateCreate

  /**
   * Validates that an blogPost can be updated. Returns the blogPost if the blogPost being updated is valid.
   *
   * @param oldBlogPost - BlogPost being updated from
   * @param newBlogPost - BlogPost being updated to
   * @return BlogPost - validated blogPost
   */
  async _validateUpdate(oldBlogPost, newBlogPost) {
    // log method
    logger.log(3, '_validateUpdate', `Validating update for blogPost ${oldBlogPost.id}`);

    // compute method
    try {
      let err = {
        code: 403,
        message: 'Error validating update for blogPost.'
      };

      // validate blogPost id
      if (oldBlogPost.id != newBlogPost.id) {
        // log error
        logger.log(3, '_validateUpdate',
          `Old blogPost id ${oldBlogPost.id} does not match new BlogPost id ${newBlogPost.id}`
        );

        // throw error
        err.message = 'Error validating blogPost IDs.';
        throw err;
      }

      // validate blogPost authorId
      if (oldBlogPost.authorId != newBlogPost.authorId) {
        // log error
        logger.log(3, '_validateUpdate',
          `Old blogPost authorId ${oldBlogPost.authorId} does not match new BlogPost authorId ${newBlogPost.authorId}`
        );

        // throw error
        err.message = 'Error validating blogPost authorIDs.';
        throw err;
      }

      // log success
      logger.log(3, '_validateUpdate', `Successfully validated update for blogPost ${oldBlogPost.id}`);

      // return new blogPost on success
      return Promise.resolve(newBlogPost);
    } catch (err) {
      // log error
      logger.log(3, '_validateUpdate', `Failed to validate update for blogPost ${oldBlogPost.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _validateUpdate
} // BlogRoutes

module.exports = BlogRoutes;
