const request = require('request');
const DB = require('./databaseModify');
const db = new DB('Employee');
const getUserInfo = (req, res, next) => {
  let options = {
    method: 'GET',
    url: 'https://consultwithcase.auth0.com/userInfo',
    headers: {
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      Authorization: req.headers.authorization
    }
  };

  request(options, (error, response, body) => {
    if (error) {
      throw new Error(error);
    }
    let obj = JSON.parse(body);

    db.querySecondaryIndexInDB('email-index','email',obj.email).then(data => {
      req.employee = data;
    }).catch( err => { throw err; });

  });
  next(); //$$$ PROFIT $$$💰
};


module.exports = { getUserInfo };
