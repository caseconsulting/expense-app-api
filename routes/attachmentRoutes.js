const express = require('express');
const databaseModify = require('../js/databaseModify');
const expenseDynamo = new databaseModify('expenses');
const moment = require('moment');

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

var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: BUCKET,
    acl: 'bucket-owner-full-control',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    serverSideEncryption: 'AES256',
    key: function(req, file, cb) {
      cb(null, `${req.params.userId}/${req.params.expenseId}/${file.originalname}`);
    }
  })
});

class Attachment {
  constructor() {
    this.expenseData = expenseDynamo;
    this._router = express.Router();
    this._router.post('/:userId/:expenseId', checkJwt, getUserInfo, upload.single('receipt'), this.onUpload.bind(this));
    this.router.get('/:userId/:expenseId', checkJwt, getUserInfo, this.getAttachmentFromS3.bind(this));
  }

  get router() {
    return this._router;
  }

  /**
   * Post-processing after file upload
   */
  onUpload(req, res) {
    res.send('Successfully uploaded file:' + req.file.key);
  }
  async getAttachmentFromS3(req, res) {
    console.warn(moment().format(), 'Attachment _getAttachmentFromS3', `for attachment ${req.params.expenseId}`);

    let expense = await this.expenseData.findObjectInDB(req.params.expenseId);
    let fileExt = expense.receipt;
    let filePath = `${req.params.userId}/${req.params.expenseId}/${fileExt}`;
    var params = { Bucket: BUCKET, Key: filePath, Expires: 60 };
    s3.getSignedUrl('getObject', params, (err, data) => {
      if (err) throw err;
      else res.status(200).send(data);
    });
  }
}

module.exports = Attachment;
