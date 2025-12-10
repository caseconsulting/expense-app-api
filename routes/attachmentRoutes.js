const _ = require('lodash');
const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { ComprehendClient, DetectEntitiesCommand } = require('@aws-sdk/client-comprehend');
const {
  TextractClient,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand
} = require('@aws-sdk/client-textract');
const getUserInfo = require(process.env.AWS ? 'GetUserInfoMiddleware' : '../js/GetUserInfoMiddleware').getUserInfo;
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');
const databaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const { getExpressJwt } = require(process.env.AWS ? 'utils' : '../js/utils');

const STAGE = process.env.STAGE;
let prodFormat = STAGE == 'prod' ? 'consulting-' : '';
const BUCKET = `case-${prodFormat}expense-app-attachments-${STAGE}`;
const s3Client = new S3Client({ apiVersion: '2006-03-01' });
const textractClient = new TextractClient({ apiVersion: '2018-06-27' });
const comprehendClient = new ComprehendClient({ apiVersion: '2017-11-27' });
const logger = new Logger('attachmentRoutes');
const expenseDynamo = new databaseModify('expenses');

// Authentication middleware. When used, the Access Token must exist and be verified against the Auth0 JSON Web Key Set
const checkJwt = getExpressJwt();

const storage = multerS3({
  s3: s3Client,
  bucket: BUCKET,
  acl: 'bucket-owner-full-control',
  serverSideEncryption: 'AES256',
  key: function (req, file, cb) {
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, `${req.params.employeeId}/${req.params.expenseId}/${file.originalname}`);
  }
});

// file limits
const limits = {
  fileSize: 6 * 1024 * 1024 // 6 MB (max file size)
};

// filter valid mimetypes
const fileFilter = function (req, file, cb) {
  // log method
  logger.log(2, 'fileFilter', `Attempting to validate type of attachment ${file.originalname}`);

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
    logger.log(2, 'fileFilter', `Successfully validated Mimetype ${file.mimetype} of attachment ${file.originalname}`);

    cb(null, true);
  } else {
    // invalid file type
    logger.log(2, 'fileFilter', `Failed to validate Mimetype ${file.mimetype} of attachment ${file.originalname}`);

    cb(new Error(`Invalid file type ${file.mimetype}. View help menu for a list of valid file types.`));
  }
};

// s3 file upload multer
const upload = multer({
  storage: storage,
  limits: limits,
  fileFilter: fileFilter
}).array('receipt');

class Attachment {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this.expenseDynamo = expenseDynamo;

    this._router.delete(
      '/:employeeId/:expenseId/:receipt',
      this._checkJwt,
      this._getUserInfo,
      this.deleteAttachmentFromS3.bind(this)
    );
    this._router.get('/:employeeId/:expenseId', this._checkJwt, this._getUserInfo, this.getAttachmentFromS3.bind(this));
    this._router.post(
      '/:employeeId/:expenseId',
      this._checkJwt,
      this._getUserInfo,
      this.uploadAttachmentToS3.bind(this)
    );
    this._router.put('/:employeeId/:fileName', this._checkJwt, this._getUserInfo, this.extractText.bind(this));
  } // constructor

  /**
   * Deletes all attachments from S3 folder. Deletes all objects in the folder `employeeId/expenseId/`
   *
   * @param req - api request
   * @param res - api response
   * @return Object - file deleted from s3 or error
   */
  async deleteAttachmentFromS3(req, res) {
    // log method
    logger.log(
      1,
      'deleteAttachmentFromS3',
      `Attempting to delete attachments ${req.params.receipt} for expense ${req.params.expenseId}`
    );

    let folderPath = `${req.params.employeeId}/${req.params.expenseId}/`;
    try {
      //get all attachments from S3 folder
      const [fileContents, keyCount] = await this.listObjectsFromS3Folder(folderPath);
      
      // set up params
      const params = { Bucket: BUCKET, Delete: { Objects: fileContents } };

      // make delete call to s3 on all file objects
      const command = new DeleteObjectsCommand(params);
      const data = await s3Client.send(command);
      //log success for all attachments
      logger.log(
        1,
        'deleteAttachmentFromS3',
        `Successfully deleted ${keyCount} attachments for expense ${req.params.expenseId} from S3 ${folderPath}`
      );
      // send successful 200 status
      res.status(200).send(data);

      // return file read
      return data;
    } catch (err) {
      // log error
      logger.log(
        1,
        'deleteAttachmentFromS3',
        `Failed to delete attachment for expense ${req.params.expenseId} from S3 ${folderPath}`
      );

      let error = {
        code: 403,
        message: `${err.message}`
      };

      // send error status
      res.status(error.code).send(error);

      // return error
      return error;
    }
  } // deleteAttachmentFromS3

  /**
   *
   * @param {string} folderPath - filepath key to folder in S3 Bucket
   * @returns {[object[], number]} [Content, KeyCount] - array of objects and count
   * @throws err
   */
  async listObjectsFromS3Folder(folderPath) {
    try {
      // set up params
      const params = {
        Bucket: BUCKET,
        Prefix: folderPath
      };

      //make call to s3
      const command = new ListObjectsV2Command(params);
      const response = await s3Client.send(command);

      logger.log(
        1,
        'listObjectsFromS3Folder',
        `Listing ${response.KeyCount} keys from ${folderPath}:`,
        response.Contents.reduce((str, content) => (str += ' ' + content.Key), '')
      );
      return [response.Contents, response.KeyCount];
    } catch (err) {
      logger.log(1, 'listObjectsFromS3Folder', `Failed to list objects from ${folderPath}`);
      throw err;
    }
  } //listObjectsFromS3Folder

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
    logger.log(1, 'extractText', 'Attempting to upload attachment and extract text');

    const textractStorage = multerS3({
      s3: s3Client,
      bucket: BUCKET,
      acl: 'bucket-owner-full-control',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      serverSideEncryption: 'AES256',
      key: function (req, file, cb) {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${req.params.employeeId}/${file.originalname}`);
      }
    });

    // s3 fild upload multer
    const textractUpload = multer({
      storage: textractStorage,
      limits: limits,
      fileFilter: fileFilter
    }).array('receipt');

    // compute method
    try {
      textractUpload(req, res, async (err) => {
        req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        if (err) {
          // log error
          logger.log(2, 'extractText', 'Failed to upload file');

          throw err;
        } else {
          // log success
          logger.log(
            1,
            'extractText',
            `Successfully uploaded attachment ${req.file.originalname} with file key ${req.file.key}`,
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

          let textEntities = await this.comprehendText(textExtracted);
          let words = [];
          _.forEach(textExtracted.Blocks, (block) => {
            if (block.BlockType === 'WORD') {
              words.push({ Text: block.Text, Confidence: block.Confidence });
            }
          });

          let keyMap = {};
          let valueMap = {};
          let blockMap = {};

          _.forEach(textExtracted.Blocks, (block) => {
            let blockId = block.Id;
            blockMap[blockId] = block;
            if (block.BlockType === 'KEY_VALUE_SET') {
              if (_.includes(block.EntityTypes, 'KEY')) {
                keyMap[blockId] = block;
              } else {
                valueMap[blockId] = block;
              }
            }
          });

          let keyValueSets = [];
          for (let key in keyMap) {
            let valueBlock = this.findValueBlock(keyMap[key], valueMap);
            let KVSkey = this.getText(keyMap[key], blockMap);
            let KVSval = this.getText(valueBlock, blockMap);
            let keys = {};
            let values = {};

            for (let i = 0; i < KVSkey.ids.length; i++) {
              keys[KVSkey.ids[i]] = { Text: KVSkey.Text[i], Confidence: KVSkey.Confidences[i] };
            }
            for (let i = 0; i < KVSval.ids.length; i++) {
              values[KVSval.ids[i]] = { Text: KVSval.Text[i], Confidence: KVSval.Confidences[i] };
            }

            keyValueSets.push({ Keys: keys, Values: values });
          }
          /**
           * {
           *   Keys: {
           *     id: {Text: 'Total', Confidence: 99.9871273912}
           *   }
           *   Values: {
           *     id: {Text: '$100', Confidence: 99.1237187237}
           * }
           *
           */
          let payload = { comprehend: textEntities, textract: textExtracted, KeyValueSets: keyValueSets, Words: words };
          // send successful 200 status with the uploaded file and text

          //////
          ////// End Synchronous Document Analysis
          //////

          logger.log(1, 'extractText', `Successfully uploaded and extracted text from ${req.file.originalname}`);

          // set a successful 200 response with uploaded file
          res.status(200).send(payload);

          // return text extracted from attachment
          return payload;
        }
      });
    } catch (err) {
      logger.log(1, 'extractText', 'Failed to upload attachment and extract text');

      let error = {
        code: 403,
        message: `${err.message}`
      };

      res.status(error.code).send(error);
    }
  } // extractText

  /**
   * returns detected entities from extracted text
   *
   * @param textExtracted - the extracted text from the image
   * @return - the detected entities
   */
  async comprehendText(textExtracted) {
    let text = '';

    _.forEach(textExtracted.Blocks, (block) => {
      if (block.BlockType === 'LINE') {
        text += block.Text + '\n';
      }
    });

    let comprehendParams = {
      LanguageCode: 'en',
      Text: text
    };

    const command = new DetectEntitiesCommand(comprehendParams);
    return await comprehendClient.send(command);
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
   * Gets an attachment from S3.

   * @param req - api request
   * @param res - api response
   * @return Object - file read from s3
   */
  async getAttachmentFromS3(req, res) {
    // log method
    logger.log(1, 'getAttachmentFromS3', `Getting attachment for expense ${req.params.expenseId}`);

    // compute method
    let expense = await this.expenseDynamo.getEntry(req.params.expenseId);
    let urls = [];
    let length = Array.isArray(expense.receipt) ? expense.receipt.length : 1; //checks for single or multiple files
    for (let i = 0; i < length; i++) {
      let fileExt = length == 1 ? expense.receipt : expense.receipt[i];
      let filePath = `${req.params.employeeId}/${req.params.expenseId}/${fileExt}`;
      let params = { Bucket: BUCKET, Key: filePath };
      let command = new GetObjectCommand(params);
      urls[i] = await getSignedUrl(s3Client, command, { expiresIn: 60 })
        .catch((err) => {
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
        });  
      // log success
      logger.log(1, 'getAttachmentFromS3', `Successfully read attachment from s3 ${filePath}`);
    }

    // send successful 200 status
    res.status(200).send(urls);

    return urls;
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
   * Uploads an attachment to s3.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - file uploaded
   */
  uploadAttachmentToS3(req, res) {
    // log method
    logger.log(1, 'uploadAttachmentToS3', `Attempting to upload attachment for expense ${req.params.expenseId}`);

    // compute method
    upload(req, res, async (err) => {
      if (err) {
        // log error  
        logger.log(1, 'uploadAttachmentToS3', 'Failed to upload file(s)');

        let error = {
          code: 403,
          message: `${err.message}`
        };

        // send error status
        res.status(error.code).send(error);

        // return error
        return error;
      } else {
        for (let i = 0; i < req.files.length; i++) {
          req.files[i].originalname = req.files[i].originalname.replace(/[^a-zA-Z0-9 \.]/, '');
          req.files[i].originalname = Buffer.from(req.files[i].originalname, 'latin1').toString('utf8');
          // log success
          logger.log(
            1,
            'uploadAttachmentToS3',
            `Successfully uploaded attachment ${req.files[i].originalname} with file key ${req.files[i].key}`,
            `to S3 bucket ${req.files[i].bucket}`
          );
        }
        // set a successful 200 response with uploaded file
        res.status(200).send(req.files);

        // return file uploaded
        return req.files;
      }
    });
  } // uploadAttachmentToS3
} // Attachment

module.exports = Attachment;
