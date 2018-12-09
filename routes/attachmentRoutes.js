const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwt = require('express-jwt');
// const jwtAuthz = require('express-jwt-authz');
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
      cb(null, `${req.body.userId}/${req.body.expenseId}/${file.originalname}`);
    }
  })
});

class Attachment {
  constructor() {
    this._router = express.Router();
    // this._router.post('/', upload.single('receipt'), this.onUpload.bind(this));
    this._router.post('/', checkJwt, getUserInfo, upload.single('receipt'), this.onUpload.bind(this));
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
}

module.exports = Attachment;
