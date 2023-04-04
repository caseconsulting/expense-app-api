const DB = require('./databaseModify');
const db = new DB('employees');
const sensitiveDB = new DB('employees-sensitive');
const _ = require('lodash');
const getUserInfo = (req, res, next) => {
  // JWT tokens created by auth0 have to conform to OIDC specification.
  // As a result of this, all custom namespaces have to begin with http or https.
  // see here for more detailed discussion: https://auth0.com/docs/api-auth/tutorials/adoption/scope-custom-claims
  const emailDomain = '@consultwithcase.com';
  let userEmail = _.find(req.user, (field) => {
    return _.endsWith(field, emailDomain);
  });
  db.querySecondaryIndexInDB('email-index', 'email', userEmail)
    .then(async (data) => {
      let sensitiveData = await sensitiveDB.getEntry(data[0].id);
      req.employee = { ...data[0], ...sensitiveData };
      next();
    })
    .catch((err) => {
      console.error(err);
      throw err;
    });

  //$$$ PROFIT $$$💰
};

module.exports = { getUserInfo };
