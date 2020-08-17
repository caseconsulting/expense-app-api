const Logger = require('../js/Logger');
const databaseModify = require('../js/databaseModify');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const multer = require('multer');
const multerS3 = require('multer-s3');
const _ = require('lodash');

const logger = new Logger('blogFileRoutes');
// const blogDynamo = new databaseModify('blog-posts');

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
const BUCKET = `case-consulting-portal-app-blog-posts-${STAGE}`;

const storage = multerS3({
  s3: s3,
  bucket: BUCKET,
  acl: 'bucket-owner-full-control',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  serverSideEncryption: 'AES256',
  key: function (req, file, cb) {
    cb(null, `${req.params.authorId}/${req.params.id}/${file.originalname}`);
  }
});

// file limits
const limits = {
  files: 1, // allow only 1 file per request
  fileSize: 6 * 1024 * 1024 // 6 MB (max file size)
};

// filter valid mimetypes
const fileFilter = function (req, file, cb) {
  // log method
  logger.log(2, 'fileFilter', `Attempting to validate type of attachment ${file.originalname}`);

  // compute method
  // Content types that are allowed to be uploaded
  const ALLOWED_CONTENT_TYPES = [
    'text/markdown'
  ];

  if (_.includes(ALLOWED_CONTENT_TYPES, file.mimetype)) {
    // valid file type
    logger.log(2, 'fileFilter', `Successfully validated Mimetype ${file.mimetype} of blogFile ${file.originalname}`);

    cb(null, true);
  } else {
    // invalid file type
    logger.log(2, 'fileFilter', `Failed to validate Mimetype ${file.mimetype} of blogFile ${file.originalname}`);

    cb(new Error(`Invalid file type ${file.mimetype}. View help menu for a list of valid file types.`));
  }
};

// s3 fild upload multer
const upload = multer({
  storage: storage,
  limits: limits,
  fileFilter: fileFilter
}).single('receipt');

class BlogFileRoutes{
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.delete(
      '/:authorId/:id/:fileName',
      this._checkJwt,
      this._getUserInfo,
      this.deleteBlogFileFromS3.bind(this)
    );
    this._router.get('/:authorId/:id', this._checkJwt, this._getUserInfo, this.getBlogFileFromS3.bind(this));
    this._router.post(
      '/:authorId/:id',
      this._checkJwt,
      this._getUserInfo,
      this.uploadBlogFileToS3.bind(this)
    );
    this.blogDynamo = new databaseModify('blog-posts');
  } // constructor

  /**
   * Deletes a blogFile from S3.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - file deleted from s3
   */
  async deleteBlogFileFromS3(req, res) {
    // log method
    logger.log(
      1,
      'deleteBlogFileFromS3',
      `Attempting to delete blogFile ${req.params.receipt} for blog ${req.params.id}`
    );

    // set up params
    let fileExt = req.params.fileName;
    let filePath = `${req.params.employeeId}/${req.params.expenseId}/${fileExt}`;
    let params = { Bucket: BUCKET, Key: filePath };

    // make delete call to s3
    s3.deleteObject(params, (err, data) => {
      if (err) {
        // log error
        logger.log(
          1,
          'deleteBlogFileFromS3',
          `Failed to delete blogFile for blog ${req.params.id} from S3 ${filePath}`
        );

        let error = {
          code: 403,
          message: `${err.message}`
        };

        // send error status
        res.status(error.code).send(error);

        // return error
        return error;
      } else {
        // log success
        logger.log(
          1,
          'deleteBlogFileFromS3',
          `Successfully deleted blogFile for blog ${req.params.id} from S3 ${filePath}`
        );

        // send successful 200 status
        res.status(200).send(data);

        // return file read
        return data;
      }
    });
  } // deleteBlogFileFromS3

  /**
   * Gets an blogFile from S3.

   * @param req - api request
   * @param res - api response
   * @return Object - file read from s3
   */
  async getBlogFileFromS3(req, res) {
    // log method
    logger.log(1, 'getBlogFileFromS3', `Getting blogFile for blog ${req.params.id}`);

    // compute method
    let expense = await this.expenseDynamo.getEntry(req.params.expenseId);
    let fileExt = expense.receipt;
    let filePath = `${req.params.employeeId}/${req.params.expenseId}/${fileExt}`;
    let params = { Bucket: BUCKET, Key: filePath, Expires: 60 };
    s3.getSignedUrl('getObject', params, (err, data) => {
      if (err) {
        // log error
        logger.log(1, 'getAttachmentFromS3', 'Failed to read attachment');

        let error = {
          code: 403,
          message: `${err.message}`
        };

        // send error status
        res.status(error.code).send(error);

        // return error
        return error;
      } else {
        // log success
        logger.log(1, 'getAttachmentFromS3', `Successfully read attachment from s3 ${filePath}`);

        // send successful 200 status
        res.status(200).send(data);

        // return file read
        return data;
      }
    });
  } // getAttachmentFromS3

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
   * Uploads a blogFile to s3.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - file uploaded
   */
  uploadBlogFileToS3(req, res) {
    // log method
    logger.log(1, 'uploadBlogFileToS3', `Attempting to upload blogFile for blog ${req.params.id}`);

    // compute method
    upload(req, res, async (err) => {
      if (err) {
        // log error
        logger.log(1, 'uploadBlogFileToS3', 'Failed to upload file');

        let error = {
          code: 403,
          message: `${err.message}`
        };

        // send error status
        res.status(error.code).send(error);

        // return error
        return error;
      } else {
        // log success
        logger.log(
          1,
          'uploadBlogFileToS3',
          `Successfully uploaded attachment ${req.file.originalname} with file key ${req.file.key}`,
          `to S3 bucket ${req.file.bucket}`
        );

        // set a successful 200 response with uploaded file
        res.status(200).send(req.file);

        // return file uploaded
        return req.file;
      }
    });
  } // uploadAttachmentToS3

}

module.exports = BlogFileRoutes;