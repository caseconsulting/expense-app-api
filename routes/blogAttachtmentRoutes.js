const Logger = require('../js/Logger');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const multer = require('multer');
const _ = require('lodash');

const logger = new Logger('blogAttachmentRoutes');

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

//s3 file upload multer
const upload = multer({
  storage: storage,
  limits: limits,
  fileFilter: fileFilter
}).single('image');

class BlogAttachmentRoutes {
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

  /**
   * uploads attachment for rekognition and comprehend analysis
   * 
   * @param req - api request
   * @param res - api response
   */
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

module.exports = BlogAttachmentRoutes;