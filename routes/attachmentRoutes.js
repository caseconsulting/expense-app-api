const Logger = require('../js/Logger');
const databaseModify = require('../js/databaseModify');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');
const multer = require('multer');
const multerS3 = require('multer-s3');
const _ = require('lodash');

const logger = new Logger('attachmentRoutes');
const expenseDynamo = new databaseModify('expenses');

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
const BUCKET = `case-consulting-expense-app-attachments-${STAGE}`;
// const TEXTRACT_BUCKET = `case-consulting-portal-app-textract-attachments-${STAGE}`;
const textract = new AWS.Textract({ apiVersion: '2018-06-27' });
const comprehend = new AWS.Comprehend({ apiVersion: '2017-11-27' });

const storage = multerS3({
  s3: s3,
  bucket: BUCKET,
  acl: 'bucket-owner-full-control',
  contentType: multerS3.AUTO_CONTENT_TYPE,
  serverSideEncryption: 'AES256',
  key: function (req, file, cb) {
    cb(null, `${req.params.employeeId}/${req.params.expenseId}/${file.originalname}`);
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
    // valid file type
    logger.log(2, 'fileFilter', `Successfully validated Mimetype ${file.mimetype} of attachment ${file.originalname}`);

    cb(null, true);
  } else {
    // invalid file type
    logger.log(2, 'fileFilter', `Failed to validate Mimetype ${file.mimetype} of attachment ${file.originalname}`);

    cb(new Error(`Invalid file type ${file.mimetype}. View help menu for a list of valid file types.`));
  }
};

// s3 fild upload multer
const upload = multer({
  storage: storage,
  limits: limits,
  fileFilter: fileFilter
}).single('receipt');

class Attachment {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
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
    this._router.put('/:fileName', this._checkJwt, this._getUserInfo, this.extractText.bind(this));
    this.expenseDynamo = expenseDynamo;
  } // constructor

  /**
   * Deletes an attachment from S3.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - file deleted from s3
   */
  async deleteAttachmentFromS3(req, res) {
    // log method
    logger.log(
      1,
      'deleteAttachmentFromS3',
      `Attempting to delete attachment ${req.params.receipt} for expense ${req.params.expenseId}`
    );

    // set up params
    let fileExt = req.params.receipt;
    let filePath = `${req.params.employeeId}/${req.params.expenseId}/${fileExt}`;
    let params = { Bucket: BUCKET, Key: filePath };

    // make delete call to s3
    s3.deleteObject(params, (err, data) => {
      if (err) {
        // log error
        logger.log(
          1,
          'deleteAttachmentFromS3',
          `Failed to delete attachment for expense ${req.params.expenseId} from S3 ${filePath}`
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
          'deleteAttachmentFromS3',
          `Successfully deleted attachment for expense ${req.params.expenseId} from S3 ${filePath}`
        );

        // send successful 200 status
        res.status(200).send(data);

        // return file read
        return data;
      }
    });
  } // deleteAttachmentFromS3

  timeout(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extracts text from a file using AWS Textract.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - text data
   */
  // async extractText(req, res) {
  //   // log method
  //   logger.log(1, 'extractText', `Attempting to upload attachment and extract text`);
  //
  //   const textractStorage = multerS3({
  //     s3: s3,
  //     bucket: TEXTRACT_BUCKET,
  //     acl: 'bucket-owner-full-control',
  //     contentType: multerS3.AUTO_CONTENT_TYPE,
  //     serverSideEncryption: 'AES256',
  //     key: function (req, file, cb) {
  //       cb(null, `${req.params.employeeId}/${file.originalname}`);
  //     }
  //   });
  //
  //   // s3 fild upload multer
  //   const textractUpload = multer({
  //     storage: textractStorage,
  //     limits: limits,
  //     fileFilter: fileFilter
  //   }).single('receipt');
  //
  //   // compute method
  //   try {
  //     textractUpload(req, res, async (err) => {
  //       if (err) {
  //         // log error
  //         logger.log(2, 'extractText', 'Failed to upload file');
  //
  //         throw err;
  //       } else {
  //         // log success
  //         logger.log(
  //           1,
  //           'extractText',
  //           `Successfully uploaded attachment ${req.file.originalname} with file key ${req.file.key}`,
  //           `to S3 bucket ${req.file.bucket}`
  //         );
  //
  //         //////
  //         ////// Asynchronous Document Analysis
  //         ////// Supports pdf, takes ~25 seconds
  //         //////
  //
  //         // let startAnalysisParams = {
  //         //   DocumentLocation: {
  //         //     /* required */
  //         //     S3Object: {
  //         //       Bucket: req.file.bucket,
  //         //       Name: req.file.key
  //         //     }
  //         //   },
  //         //   FeatureTypes: [
  //         //     'FORMS'
  //         //   ]
  //         // };
  //         //
  //         // let startAnalysisData = await textract.startDocumentAnalysis(startAnalysisParams).promise();
  //         // let jobId = startAnalysisData.JobId;
  //         //
  //         // console.log('startAnalysisData');
  //         // console.log(startAnalysisData);
  //         //
  //         // let getAnalysisParams = {
  //         //   JobId: jobId
  //         // };
  //         //
  //         //
  //         // let textExtracted;
  //         //
  //         // do {
  //         //   await this.timeout(5000);
  //         //   textExtracted = await textract.getDocumentAnalysis(getAnalysisParams).promise();
  //         //   console.log('getAnalysisData');
  //         //   console.log(textExtracted);
  //         // } while (textExtracted.JobStatus === 'IN_PROGRESS');
  //
  //         //////
  //         ////// End Asynchronous Document Analysis
  //         //////
  //
  //
  //         //////
  //         ////// Synchronous Document Analysis
  //         ////// Does not support pdf, takes ~5 seconds
  //         //////
  //
  //         let params = {
  //           Document: {
  //             S3Object: {
  //               Bucket: req.file.bucket,
  //               Name: req.file.key
  //             }
  //           },
  //           FeatureTypes: ['TABLES', 'FORMS']
  //         };
  //
  //         let textExtracted = await textract.analyzeDocument(params).promise();
  //
  //         //let textExtracted = "hello world";
  //         console.log('textExtracted');
  //         console.log(textExtracted);
  //
  //         //////
  //         ////// End Synchronous Document Analysis
  //         //////
  //
  //         logger.log(1, 'extractText', `Successfully uploaded and extracted text from ${req.file.originalname}`);
  //
  //         // set a successful 200 response with uploaded file
  //         res.status(200).send(textExtracted);
  //
  //         // return text extracted from attachment
  //         return textExtracted;
  //       }
  //     });
  //   } catch (err) {
  //     logger.log(1, 'extractText', `Failed to upload attachment and extract text`);
  //
  //     let error = {
  //       code: 403,
  //       message: `${err.message}`
  //     };
  //
  //     res.status(error.code).send(error);
  //   }
  // } // extractText

  /**
   *
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

    return comprehend.detectEntities(comprehendParams).promise();
  } // comprehendText

  /**
   * Extracts text from a file using AWS Textract.
   *
   * @param req - api request
   * @param res - api response
   * @return Object - text data
   */
  async extractText(req, res) {
    // log method
    logger.log(2, 'extractText', `Attempting to extract text from ${req.params.fileName}`);

    // compute method

    // filter valid mimetypes
    let mFileFilter = function (req, file, cb) {
      // log method
      logger.log(2, 'fileFilter', `Attempting to validate ${file.originalname} for text extraction`);

      // compute method
      // Content types that can be text extracted
      const ALLOWED_CONTENT_TYPES = [
        'image/jpeg', //.jpeg
        'image/png', //.png
      ];

      if (_.includes(ALLOWED_CONTENT_TYPES, file.mimetype)) {
        // valid file type
        logger.log(
          2,
          'fileFilter',
          `Successfully validated Mimetype ${file.mimetype} of attachment ${file.originalname}`
        );

        cb(null, true);
      } else {
        // invalid file type
        logger.log(2, 'fileFilter', `Failed to validate Mimetype ${file.mimetype} of attachment ${file.originalname}`);

        cb(new Error(`Invalid file type ${file.mimetype}. Text can only be extracted from jpg or png files.`));
      }
    };

    let mStorage = multer.memoryStorage();
    let mUpload = multer({
      storage: mStorage,
      limits: limits,
      fileFilter: mFileFilter
    }).single('receipt');

    mUpload(req, res, async (err) => {
      if (err) {
        // failed to get file bytes
        logger.log(2, 'extractText', `Failed to extract text from ${req.params.fileName}. ${err.message}`);

        let error = {
          code: 404,
          message: err.message
        };

        // send and return error
        res.status(error.code).send(error);
        return error;
      } else {
        // successfully got file bytes
        try {
          let params = {
            Document: {
              Bytes: req.file.buffer
            },
            FeatureTypes: ['TABLES', 'FORMS']
          };

          let textExtracted = await textract.analyzeDocument(params).promise();

          logger.log(2, 'extractText', `Successfully extracted text from ${req.params.fileName}`);
          let textEntities = await this.comprehendText(textExtracted);

          let words = [];
          _.forEach(textExtracted.Blocks, (block) => {
            if (block.BlockType === 'WORD') {
              words.push({ Text: block.Text, Confidence: block.Confidence });
            }
          });
          // # get key and value maps
          // key_map = {}
          // value_map = {}
          // block_map = {}
          // for block in blocks:
          //     block_id = block['Id']
          //     block_map[block_id] = block
          //     if block['BlockType'] == "KEY_VALUE_SET":
          //         if 'KEY' in block['EntityTypes']:
          //             key_map[block_id] = block
          //         else:
          //             value_map[block_id] = block
      
          // return key_map, value_map, block_map
          
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

          // def get_kv_relationship(key_map, value_map, block_map):
          // kvs = {}
          // for block_id, key_block in key_map.items():
          //     value_block = find_value_block(key_block, value_map)
          //     key = get_text(key_block, block_map)
          //     val = get_text(value_block, block_map)
          //     kvs[key] = val
          // return kvs

          let keyValueSets = [];
          for(let key in keyMap){
            console.log('run through');
            let valueBlock = this.findValueBlock(keyMap[key], valueMap);
            let KVSkey = this.getText(keyMap[key], blockMap);
            let KVSval = this.getText(valueBlock, blockMap);
            //keyValueSets[KVSkey] = KVSval;
            let keys = {};
            let values = {};
            console.log('KVSKey + val');
            console.log(KVSkey);
            console.log(KVSval);
            for(let i = 0; i < KVSkey.ids.length; i++){
              keys[KVSkey.ids[i]] = {Text: KVSkey.Text[i], Confidence: KVSkey.Confidences[i]};
            }
            for(let i = 0; i < KVSval.ids.length; i++){
              values[KVSval.ids[i]] = {Text: KVSval.Text[i], Confidence: KVSval.Confidences[i]};
            }

            keyValueSets.push({ Keys: keys, Values: values});
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
          console.log(words);
          console.log(keyValueSets);

          let payload = { comprehend: textEntities, textract: textExtracted, KeyValueSets: keyValueSets, Words: words};
          // send successful 200 status with the uploaded file and text
          res.status(200).send(payload);

          // return text entries
          return payload;
        } catch (err) {
          // failed to extract text
          logger.log(2, 'extractText', `Failed to extract text from ${req.params.fileName}. ${err.message}`);

          let error = {
            code: 404,
            message: err.message
          };

          // send and return error
          res.status(error.code).send(error);
          return error;
        }
      }
    });
  } // extractText

  findValueBlock(keyBlock, valueMap) {
    // for relationship in key_block['Relationships']:
    //     if relationship['Type'] == 'VALUE':
    //         for value_id in relationship['Ids']:
    //             value_block = value_map[value_id]
    // return value_block
    let valueBlock;
    _.forEach(keyBlock.Relationships, (relationship)=> {
      if(relationship.Type === 'VALUE'){
        _.forEach(relationship.Ids, (valueId) => {
          valueBlock = valueMap[valueId];
        });
      }
    });
    return valueBlock;
  }

  getText(result, blocksMap) {
    // def get_text(result, blocks_map):
    // text = ''
    // if 'Relationships' in result:
    //     for relationship in result['Relationships']:
    //         if relationship['Type'] == 'CHILD':
    //             for child_id in relationship['Ids']:
    //                 word = blocks_map[child_id]
    //                 if word['BlockType'] == 'WORD': 
    //                     text += word['Text'] + ' '
    //                 if word['BlockType'] == 'SELECTION_ELEMENT':
    //                     if word['SelectionStatus'] == 'SELECTED':
    //                         text += 'X '    

                                
    // return text
    let text = [];
    let Ids = [];
    let confidences = [];
    if (Object.prototype.hasOwnProperty.call(result, 'Relationships')) {
      _.forEach(result.Relationships, (relationship) => {
        if  (relationship.Type === 'CHILD'){
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
    return {ids: Ids, Text: text, Confidences: confidences};
  }
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
        logger.log(1, 'uploadAttachmentToS3', 'Failed to upload file');

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
          'uploadAttachmentToS3',
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
} // Attachment

module.exports = Attachment;
