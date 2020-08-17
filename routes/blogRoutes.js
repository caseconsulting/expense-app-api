const Logger = require('../js/Logger');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const Crud = require('./crudRoutes');
const DatabaseModify = require('../js/databaseModify');
const BlogPost = require('../models/blogPost');
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const multer = require('multer');
const _ = require('lodash');

const logger = new Logger('blogRoutes');

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the signing keys provided by the JWKS
  // endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: process.env.VUE_APP_AUTH0_AUDIENCE,
  issuer: `https://${process.env.VUE_APP_AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

const STAGE = process.env.STAGE;
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const multerS3 = require('multer-s3');
const BUCKET = `case-consulting-portal-app-blog-attachments-${STAGE}`;
// const BUCKET = `case-consulting-portal-app-blog-posts-${STAGE}`;
const rekognition = new AWS.Rekognition({ apiVersion: '2016-06-27' });
const comprehend = new AWS.Comprehend({ apiVersion: '2017-11-27' });

const fileFilter = function (req, file, cb) {
  // log method
  logger.log(2, 'fileFilter', `Attempting to validate type of attachment ${file.originalname}`);

  // compute method
  // Content types that are allowed to be uploaded
  const ALLOWED_CONTENT_TYPES = [
    'image/gif', //.gif
    'image/jpeg', //.jpeg
    'image/png', //.png
  ];

  if (_.includes(ALLOWED_CONTENT_TYPES, file.mimetype)) {
    // valid file type
    logger.log(2, 'fileFilter', `Successfully validated Mimetype ${file.mimetype} of attachment ${file.originalname}`);

    cb(null, true);
  } else {
    // invalid file type
    logger.log(2, 'fileFilter', `Failed to validate Mimetype ${file.mimetype} of attachment ${file.originalname}`);

    cb(new Error(`Invalid file type ${file.mimetype}. View help menu for a list of valid file types.`));
  }
};

const limits = {
  files: 1, // allow only 1 file per request
  fileSize: 6 * 1024 * 1024 // 6 MB (max file size)
};

const storage = multerS3({
  s3: s3,
  bucket: BUCKET,
  acl: 'bucket-owner-full-control',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  serverSideEncryption: 'AES256',
  key: function (req, file, cb) {
    cb(null, `${file.originalname}`);
  }
});

// const storage = multerS3({
//   s3: s3,
//   bucket: BUCKET,
//   acl: 'bucket-owner-full-control',
//   contentType: multerS3.AUTO_CONTENT_TYPE,
//   serverSideEncryption: 'AES256',
//   key: function (req, file, cb) {
//     cb(null, `${req.params.authorId}/${req.params.id}/${file.originalname}`);
//   }
// });

// const upload = multer({
//   storage: storage,
//   limits:limits,
//   fileFilter: fileFilter //TODO: make filter for blog posts
// }).single('image');

// s3 file upload multer
const upload = multer({
  storage: storage,
  limits: limits,
  fileFilter: fileFilter
}).single('image');

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

      // return employee
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
  } // readAll
  /**
   * Prepares a blog post to be created. Returns the blog post if it can be successfully created.
   *
   * @param data - data of blog post - object for dynamo and file for s3
   * @return Employee - blog post prepared to create
   */
  async _create(data) {
    // log method
    logger.log(2, '_create', `Preparing to create employee ${data.id}`);

    // compute method
    try {
      let blogPost = new BlogPost(data);

      await this._validateBlogPost(blogPost); // validate employee
      await this._validateCreate(blogPost); // validate create

      // log success
      logger.log(2, '_create', `Successfully prepared to create blog post ${data.id}`);

      // return prepared employee
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
      logger.log(2, '_update', `Failed to prepare update for blogPost ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  } // _update

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

      // validate first name
      if (_.isNil(blogPost.authorId)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost authorId is empty');

        // throw error
        err.message = 'Invalid blogPost authorId.';
        throw err;
      }

      // validate first name
      if (_.isNil(blogPost.createDate)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost createDate is empty');
      
        // throw error
        err.message = 'Invalid blogPost createDate.';
        throw err;
      }

      // validate first name
      if (_.isNil(blogPost.fileName)) {
        // log error
        logger.log(3, '_validateBlogPost', 'BlogPost fileName is empty');

        // throw error
        err.message = 'Invalid blogPost fileName.';
        throw err;
      }

      // log success
      logger.log(3, '_validateBlogPost', `Successfully validated blogPost ${blogPost.id}`);

      // return employee on success
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
}


class BlogAttachments {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.post('/getModerationLabel/:img', this._checkJwt, this._getUserInfo, this.detectModeration.bind(this));
    this._router.post('/getKeyPhrases', this._checkJwt, this._getUserInfo, this.detectKeyPhrases.bind(this));
    this._router.post(
      '/uploadBlogAttachmentToS3/:img',
      this._checkJwt,
      this._getUserInfo,
      this.uploadBlogAttachmentToS3.bind(this)
    );
  } // constructor

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
   * Detect key phrases using AWS comprehend.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - file uploaded
   */
  detectKeyPhrases(req, res) {
    var params = {
      LanguageCode: 'en' /* required */,
      Text: req.body.inputText
    };
    comprehend.detectKeyPhrases(params, function (err, data) {
      if (err) {
        console.log(err, err.stack);

        let error = {
          code: 403,
          message: `${err.message}`
        };

        // send error status
        res.status(error.code).send(error);
        // an error occurred
      } else {
        console.log(data); // successful response
        res.status(200).send(data);
      }
    });
  } // detectKeyPhrases

  /**
   * Extracts labels from an image using AWS Rekognition.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - text data
   */
  detectModeration(req, res) {
    var params = {
      Image: {
        // /* required Bytes: Buffer.from('...') || 'STRING_VALUE' Strings will be Base-64 encoded on your behalf */,
        S3Object: {
          Bucket: BUCKET,
          Name: req.params.img
        }
      },
      MinConfidence: 60
    };
    rekognition.detectModerationLabels(params, function (err, data) {
      if (err) {
        console.log(err, err.stack);

        let error = {
          code: 403,
          message: `${err.message}`
        };

        // send error status
        res.status(error.code).send(error);
        // an error occurred
      } else {
        console.log(data); // successful response
        res.status(200).send(data);
      }
    });
  } // detectModeration

  /*
  async deleteBlogAttachmentFromS3(req, res) {
    logger.log(1, 'deleteBlogAttachmentFromS3', `Attempting to delete attachment ${req.params.img}`);

    let fileExt = req.params.img;
    let filePath = `${req.params.e}`;
    let params = { Bucket: BUCKET: key: filePath };

    s3.deleteObject(params, (err, data) => {
      if (err) {
        logger.log(1, 'deleteAttachmentFromS3', `Failed to delete attachment ${req.params.img} from S3 ${filePath}`);
        let error = {
          code: 403,
          message: `${err.message}`
        };
        res.status(error.code).send(error);

        // return error
        return error;
      }
      else {
        logger.log(1, 'deleteAttachmentFromS3', `Successfully deleted attachment ${req.params.img}`
            + `from S3 ${filePath}`);
        res.status(200).send(data);
        return data;
      }
    });
  } // deleteBlogAttachmentFromS3*/

  uploadBlogAttachmentToS3(req, res) {
    logger.log(1, 'uploadBlogAttachmentToS3', `Attempting to upload blog attachment ${req.params.img}`);

    // compute method
    upload(req, res, async (err) => {
      if(err) {
        // log error
        logger.log(1, 'uploadBlogAttachmentToS3', 'Failed to upload file');

        let error = {
          code: 403,
          message: `${err.message}`
        };

        // send error status
        res.status(error.code).send(error);
        
        // return error
        return error;
      }
      else {
        // log success
        logger.log(
          1, 
          'uploadBlogAttachmentToS3',
          `Successfully uploaded blog attachment ${req.file.originalname} with file key ${req.file.key}`,
          `to S3 bucket ${req.file.bucket}`
        );

        // set a successful 200 response with uploaded file
        res.status(200).send(req.file);

        // return file uploaded
        return req.file;

      }
    });
  } // uploadBlogAttachmentToS3

} // BlogAttachments

module.exports = {
  BlogAttachments: BlogAttachments,
  BlogRoutes: BlogRoutes
};
