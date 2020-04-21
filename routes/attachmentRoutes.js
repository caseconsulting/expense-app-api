const express = require('express');
const databaseModify = require('../js/databaseModify');
const expenseDynamo = new databaseModify('expenses');
const _ = require('lodash');
const Logger = require('../js/Logger');
const logger = new Logger('attachmentRoutes');

const multer = require('multer');
const multerS3 = require('multer-s3');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
// Authentication middleware. When used, the
// Access Token must exist and be verified against
// the Auth0 JSON Web Key Set
const checkJwt = jwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
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
const BUCKET = `case-consulting-expense-app-attachments-${STAGE}`;

var storage = multerS3({
  s3: s3,
  bucket: BUCKET,
  acl: 'bucket-owner-full-control',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  serverSideEncryption: 'AES256',
  key: function(req, file, cb) {
    cb(null, `${req.params.employeeId}/${req.params.expenseId}/${file.originalname}`);
  }
});

var limits = {
  files: 1, // allow only 1 file per request
  fileSize: 6 * 1024 * 1024 // 6 MB (max file size)
};

/**
 * Filter valid mimetypes
 */
var fileFilter = function(req, file, cb) {
  logger.log(1, 'fileFilter', `Attempting to upload attachment ${file.originalname}`);

  // Content types that are allowed to be uploaded
  const ALLOWED_CONTENT_TYPES = [
    'application/pdf', //.pdf
    'image/gif', //.gif
    'image/jpeg', //.jpeg
    'image/png', //.png
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', //xlsx
    'application/vnd.ms-excel', //.xls, .xlt, xla
    'application/xml', //.xml
    'application/msword', //.doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' //.docx
  ];

  if (_.includes(ALLOWED_CONTENT_TYPES, file.mimetype)) {
    // allow supported image files
    logger.log(2, 'fileFilter', `Mimetype ${file.mimetype} accepted`);

    cb(null, true);
  } else {
    // throw error for invalid files
    logger.log(1, 'fileFilter', `Mimetype ${file.mimetype} rejected`);

    cb(new Error(`Invalid file type ${file.mimetype}. View help menu for a list of valid file types.`));
  }
};

var upload = multer({
  storage: storage,
  limits: limits,
  fileFilter: fileFilter
}).single('receipt');

class Attachment {
  constructor() {
    this.expenseData = expenseDynamo;
    this._router = express.Router();
    this._router.post('/:employeeId/:expenseId', checkJwt, getUserInfo, this.uploadAttachmentToS3.bind(this));
    this.router.get('/:employeeId/:expenseId', checkJwt, getUserInfo, this.getAttachmentFromS3.bind(this));
    this.router.delete('/:employeeId/:expenseId/:receipt',
      checkJwt,
      getUserInfo,
      this.deleteAttachmentFromS3.bind(this)
    );
  }

  get router() {
    return this._router;
  }

  /**
   * Uploads an object to S3.
   */
  uploadAttachmentToS3(req, res) {

    upload(req, res, (err) => {
      if (err) {
        // if there is an error from validating the file
        logger.log(1, 'uploadAttachmentToS3', 'Failed to upload file');

        let error = {
          code: 403,
          message:
            `${err.message}`
        };
        res.status(error.code).send(error);
        return error;
      } else {
        // successfully validated file
        logger.log(1, 'uploadAttachmentToS3',
          `Successfully uploaded attachment ${req.file.originalname} with file key ${req.file.key}`,
          `to S3 bucket ${req.file.bucket}`
        );

        res.status(200).send(req.file);
        return req.file;
      }
    });
  }

  /**
   * Gets an object from S3.
   */
  async getAttachmentFromS3(req, res) {
    logger.log(1, 'getAttachmentFromS3', `Getting attachment for expense ${req.params.expenseId}`);

    let expense = await this.expenseData.getEntry(req.params.expenseId);
    let fileExt = expense.receipt;
    let filePath = `${req.params.employeeId}/${req.params.expenseId}/${fileExt}`;
    var params = { Bucket: BUCKET, Key: filePath, Expires: 60 };
    s3.getSignedUrl('getObject', params, (err, data) => {
      if (err) throw err;
      else res.status(200).send(data);
    });
  }

  /**
   * Deletes an object from S3.
   */
  async deleteAttachmentFromS3(req, res) {
    logger.log(1, 'deleteAttachmentFromS3', `Attempting to delete attachment for expense ${req.params.expenseId}`);

    // set up params
    let fileExt = req.params.receipt;
    let filePath = `${req.params.employeeId}/${req.params.expenseId}/${fileExt}`;
    let params = { Bucket: BUCKET, Key: filePath};
    // make delete call to s3
    s3.deleteObject(params, (err, data) => {
      if (err) {
        // if there is an error deleting the file
        logger.log(1, 'deleteAttachmentFromS3',
          `Failed to delete attachment for expense ${req.params.expenseId} from S3 ${filePath}`
        );

        let error = {
          code: 403,
          message:
            `${err.message}`
        };

        res.status(error.code).send(error);
        return error;
      } else {
        // successfully deleted the file
        logger.log(1, 'deleteAttachmentFromS3',
          `Successfully deleted attachment for expense ${req.params.expenseId} from S3 ${filePath}`
        );

        res.status(200).send(data);
      }
    });
  }
}

module.exports = Attachment;
