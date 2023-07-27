const _ = require('lodash');
const express = require('express');
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { ComprehendClient, BatchDetectEntitiesCommand } = require('@aws-sdk/client-comprehend');
const {
  TextractClient,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand
} = require('@aws-sdk/client-textract');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');

const logger = new Logger('resumeRoutes');

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
let prodFormat = STAGE == 'prod' ? 'consulting-' : '';
const BUCKET = `case-${prodFormat}portal-resumes-${STAGE}`;
const s3Client = new S3Client({ apiVersion: '2006-03-01' });
const textractClient = new TextractClient({ apiVersion: '2018-06-27' });
const comprehendClient = new ComprehendClient({ apiVersion: '2017-11-27' });

// file limits
const limits = {
  files: 1, // allow only 1 file per request
  fileSize: 6 * 1024 * 1024 // 6 MB (max file size)
};

// filter valid mimetypes
const fileFilter = function (req, file, cb) {
  // log method
  logger.log(2, 'fileFilter', `Attempting to validate type of resume ${file.originalname}`);

  // compute method
  // Content types that are allowed to be uploaded
  const ALLOWED_CONTENT_TYPES = [
    'application/pdf', //.pdf
    'image/gif', //.gif
    'image/jpeg', //.jpeg
    'image/png', //.png
    'image/bmp', //.bmp
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', //xlsx
    'application/vnd.ms-excel', //.xls, .xlt, xla
    'application/msword', //.doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' //.docx
  ];

  if (_.includes(ALLOWED_CONTENT_TYPES, file.mimetype)) {
    // valid file type
    logger.log(2, 'fileFilter', `Successfully validated Mimetype ${file.mimetype} of resume ${file.originalname}`);

    cb(null, true);
  } else {
    // invalid file type
    logger.log(2, 'fileFilter', `Failed to validate Mimetype ${file.mimetype} of resume ${file.originalname}`);

    cb(new Error(`Invalid file type ${file.mimetype}. View help menu for a list of valid file types.`));
  }
};

class Resume {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.delete('/:employeeId', this._checkJwt, this._getUserInfo, this.deleteResumeFromS3.bind(this));
    this._router.get('/:employeeId', this._checkJwt, this._getUserInfo, this.getResumeFromS3.bind(this));
    this._router.post('/:employeeId', this._checkJwt, this._getUserInfo, this.uploadResumeToS3.bind(this));
    this._router.put('/:employeeId', this._checkJwt, this._getUserInfo, this.extractText.bind(this));
  } // constructor

  /**
   * Deletes a resume from S3.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - file deleted from s3
   */
  async deleteResumeFromS3(req, res) {
    // log method
    logger.log(1, 'deleteResumeFromS3', `Attempting to delete resume for employee ${req.params.employeeId}`);

    // set up params
    let filePath = `${req.params.employeeId}/resume`;
    let params = { Bucket: BUCKET, Key: filePath };

    // make delete call to s3
    const command = new DeleteObjectCommand(params);
    await s3Client
      .send(command)
      .then((data) => {
        // log success
        logger.log(
          1,
          'deleteResumeFromS3',
          `Successfully deleted resume for employee ${req.params.employeeId} from S3 ${filePath}`
        );

        // send successful 200 status
        res.status(200).send(data);

        // return file read
        return data;
      })
      .catch((err) => {
        // log error
        logger.log(
          1,
          'deleteResumeFromS3',
          `Failed to delete resume for employee ${req.params.employeeId} from S3 ${filePath}`
        );

        let error = {
          code: 403,
          message: `${err.message}`
        };

        // send error status
        res.status(error.code).send(error);

        // return error
        return error;
      });
  } // deleteResumeFromS3

  /**
   *
   * @param ms - time in milliseconds to timeout
   * @return promise - a timeout
   */
  timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  } // timeout

  /**
   * Extracts text from a file using AWS Textract.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - text data
   */
  async extractText(req, res) {
    // log method
    logger.log(1, 'extractText', 'Attempting to upload resume and extract text');

    const textractStorage = multerS3({
      s3: s3Client,
      bucket: BUCKET,
      acl: 'bucket-owner-full-control',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      serverSideEncryption: 'AES256',
      key: function (req, file, cb) {
        cb(null, `${req.params.employeeId}/resume`);
      }
    });

    // s3 file upload multer
    const textractUpload = multer({
      storage: textractStorage,
      limits: limits,
      fileFilter: fileFilter
    }).single('resume');

    // compute method
    try {
      textractUpload(req, res, async (err) => {
        if (err) {
          // log error
          logger.log(2, 'extractText', 'Failed to upload file');

          throw err;
        } else {
          // log success
          logger.log(
            1,
            'extractText',
            `Successfully uploaded resume ${req.file.originalname} with file key ${req.file.key}`,
            `to S3 bucket ${req.file.bucket}`
          );

          //////
          ////// Asynchronous Document Analysis
          ////// Supports pdf, takes ~25 seconds
          //////

          let startAnalysisParams = {
            DocumentLocation: {
              /* required */
              S3Object: {
                Bucket: req.file.bucket,
                Name: req.file.key
              }
            },
            FeatureTypes: ['FORMS']
          };
          const startCommand = new StartDocumentAnalysisCommand(startAnalysisParams);
          let startAnalysisData = await textractClient.send(startCommand);
          let jobId = startAnalysisData.JobId;

          let getAnalysisParams = {
            JobId: jobId
          };

          let textExtracted;

          do {
            const getCommand = new GetDocumentAnalysisCommand(getAnalysisParams);
            textExtracted = await textractClient.send(getCommand);
            // We should wait for a little bit of time so we don't get provision issues
            await new Promise((resolve) => setTimeout(resolve, 200));
          } while (textExtracted.JobStatus === 'IN_PROGRESS');

          //////
          ////// End Asynchronous Document Analysis
          //////

          //////
          ////// Synchronous Document Analysis
          ////// Does not support pdf, takes ~5 seconds
          //////

          let threshold = 0.7;
          let textEntities = await this.comprehendText(textExtracted);
          textEntities = _.filter(textEntities, (textEntity) => {
            return (
              textEntity.Score > threshold &&
              (textEntity.Type === 'LOCATION' ||
                textEntity.Type === 'TITLE' ||
                textEntity.Type === 'ORGANIZATION' ||
                textEntity.Type === 'PERSON' ||
                textEntity.Type === 'OTHER')
            );
          });
          let payload = { comprehend: textEntities };

          //////
          ////// End Synchronous Document Analysis
          //////

          logger.log(1, 'extractText', `Successfully uploaded and extracted text from ${req.file.originalname}`);

          // set a successful 200 response with uploaded file
          res.status(200).send(payload);

          // return text extracted from resume
          return payload;
        }
      });
    } catch (err) {
      logger.log(1, 'extractText', 'Failed to upload resume and extract text');

      let error = {
        code: 403,
        message: `${err.message}`
      };

      res.status(error.code).send(error);
    }
  } // extractText

  /**
   * Convert the text to categories
   *
   * @param textExtracted - extracted text
   * @return array - the entities
   */
  async comprehendText(textExtracted) {
    let returnEntities = [];

    while (textExtracted.Blocks.length > 0) {
      let text = [];

      //Get 25 LINE blocks (comprehend has a max of 25 per batch)
      for (let i = 0; i < (textExtracted.Blocks.length && 25); i++) {
        let block = textExtracted.Blocks.shift();
        if (block.BlockType === 'LINE') {
          text.push(block.Text + ' ');
        }
      }

      // We should only comprehend text if there were LINE blocks
      if (text.length > 0) {
        let comprehendParams = {
          LanguageCode: 'en',
          TextList: text
        };

        //Get the entities for this batch of 25 items
        const command = new BatchDetectEntitiesCommand(comprehendParams);
        let entities = await comprehendClient.send(command);
        _.forEach(entities.ResultList, (entity) => {
          returnEntities.push(...entity.Entities);
        });
      }
    }
    return returnEntities;
  } // comprehendText

  /**
   * returns the value block
   *
   * @param keyBlock - array containing relationships
   * @param valueMap - map of values
   * @return - value block from value map based on key block
   */
  findValueBlock(keyBlock, valueMap) {
    let valueBlock;
    _.forEach(keyBlock.Relationships, (relationship) => {
      if (relationship.Type === 'VALUE') {
        _.forEach(relationship.Ids, (valueId) => {
          valueBlock = valueMap[valueId];
        });
      }
    });
    return valueBlock;
  } // findValueBlock

  /**
   * gets the text from the the result whether it is a key or value
   *
   * @param result - the part of the relationship that you want the string text for
   * @param blocksMap - the map of relationship blocks
   * @return - the text of the result
   */
  getText(result, blocksMap) {
    // return text
    let text = [];
    let Ids = [];
    let confidences = [];
    if (Object.prototype.hasOwnProperty.call(result, 'Relationships')) {
      _.forEach(result.Relationships, (relationship) => {
        if (relationship.Type === 'CHILD') {
          _.forEach(relationship.Ids, (childId) => {
            let word = blocksMap[childId];
            if (word.BlockType === 'WORD') {
              text.push(word.Text);
              Ids.push(word.Id);
              confidences.push(word.Confidence);
            }
            if (word.BlockType === 'SELECTION_ELEMENT') {
              if (word.SelectionStatus === 'SELECTED') {
                text.push('X ');
                Ids.push(word.Id);
                confidences.push(word.Confidence);
              }
            }
          });
        }
      });
    }
    return { ids: Ids, Text: text, Confidences: confidences };
  } // getText

  /**
   * Gets a resume from S3.

   * @param req - api request
   * @param res - api response
   * @return Object - file read from s3
   */
  async getResumeFromS3(req, res) {
    // log method
    logger.log(1, 'getResumeFromS3', `Getting resume for employee ${req.params.employeeId}`);

    // compute method
    let filePath = `${req.params.employeeId}/resume`;
    let params = { Bucket: BUCKET, Key: filePath };
    let headParams = { Bucket: BUCKET, Key: filePath };
    // We check if resume exists, if it does, then we get the resume
    const command = new HeadObjectCommand(headParams);
    await s3Client
      .send(command)
      .then(async () => {
        const objCommand = new GetObjectCommand(params);
        await getSignedUrl(s3Client, objCommand, { expiresIn: 60 })
          .then((data) => {
            // log success
            logger.log(1, 'getResumeFromS3', `Successfully read resume from s3 ${filePath}`);

            // send successful 200 status
            res.status(200).send(data);

            // return file read
            return data;
          })
          .catch((err) => {
            // log error
            logger.log(1, 'getResumeFromS3', 'Failed to read resume');

            let error = {
              code: 403,
              message: `${err.message}`
            };

            // send error status
            res.status(error.code).send(error);

            // return error
            return error;
          });
      })
      .catch(() => {
        // No object found
        logger.log(1, 'getResumeFromS3', `No resume found for ${req.params.employeeId}`);
        let error = {
          code: 404,
          message: `No resume found for ${req.params.employeeId}`
        };
        res.status(error.code).send(error);
        return error;
      });
  } // getResumeFromS3

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
   * Uploads an resume to s3.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - file uploaded
   */
  uploadResumeToS3(req, res) {
    const textractStorage = multerS3({
      s3: s3Client,
      bucket: BUCKET,
      acl: 'bucket-owner-full-control',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      serverSideEncryption: 'AES256',
      key: function (req, file, cb) {
        cb(null, `${req.params.employeeId}/resume`);
      }
    });
    // s3 file upload multer
    const textractUpload = multer({
      storage: textractStorage,
      limits: limits,
      fileFilter: fileFilter
    }).single('resume');
    // log method
    logger.log(1, 'uploadResumeToS3', `Attempting to upload resume for employee ${req.params.employeeId}`);

    // compute method
    textractUpload(req, res, async (err) => {
      if (err) {
        // log error
        logger.log(1, 'uploadResumeToS3', 'Failed to upload file');

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
          'uploadResumeToS3',
          `Successfully uploaded resume ${req.file.originalname} with file key ${req.file.key}`,
          `to S3 bucket ${req.file.bucket}`
        );

        // set a successful 200 response with uploaded file
        res.status(200).send(req.file);

        // return file uploaded
        return req.file;
      }
    });
  } // uploadResumeToS3
} // Resume

module.exports = Resume;
