const Logger = require('../js/Logger');
const express = require('express');
const getUserInfo = require('../js/GetUserInfoMiddleware').getUserInfo;
const jwksRsa = require('jwks-rsa');
const jwt = require('express-jwt');

const logger = new Logger('attachmentRoutes');
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
const BUCKET = `case-consulting-portal-app-blog-attachments-${STAGE}`;
const rekognition = new AWS.Rekognition({ apiVersion: '2016-06-27' });
const comprehend = new AWS.Comprehend({ apiVersion: '2017-11-27' });

class BlogAttachments {
  constructor() {
    this._router = express.Router();
    this._checkJwt = checkJwt;
    this._getUserInfo = getUserInfo;
    this._router.post('/getModerationLabel', this._checkJwt, this._getUserInfo, this.detectModeration.bind(this));
    this._router.post('/getKeyPhrases', this._checkJwt, this._getUserInfo, this.detectKeyPhrases.bind(this));
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
      Text:
        'With the world half on lock down due to a pandemic, that did not stop Case Consulting from launching' +
        ' an internship program, welcoming 6 new awesome interns this summer. Although we could not host the program' +
        ' in MakeOffices as we have had for the last 3 year, the internship cadre has put together a program to' +
        ' continue 100% remotely. Using AWS Workspace, we were able to set up an environment for the interns to do' +
        ' their training and continue improving our intern project from day one, the Expense App. As normal,' +
        ' stand-ups and talks persist on a daily basis through the use of Google-Meets as we drop in and say hello.' +
        ' Welcome to the team Helen, Zertash, Pablo, Diego, Charles, and Rachel!' /* required */
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
          Name: 'purge.jpg'
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
} // BlogAttachments

module.exports = BlogAttachments;
