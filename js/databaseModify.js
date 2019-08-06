const _ = require('lodash');
const AWS = require('aws-sdk');
require('dotenv').config({
  silent: true
});

const STAGE = process.env.STAGE;

class databaseModify {
  constructor(name) {
    this.tableName = `${STAGE}-${name}`;
    AWS.config.apiVersions = {
      dynamodb: '2012-08-10'
      // other service API versions
    };
    AWS.config.update({
      region: 'us-east-1'
    });
  }

  /**
   * returns the value if it exists
   */
  findObjectInDB(primaryKey) {
    return this.readFromDB(primaryKey)
      .then(function(data) {
        if (_.first(data)) {
          return _.first(data);
        } else {
          let err = {
            code: 404,
            message: 'Entry not found in database'
          };
          throw err;
        }
      })
      .catch(function(err) {
        console.error(err);
        throw err; //Throw error and handle properly in crudRoutes
      });
  }

  /**
   * Add the entry to the database
   */
  addToDB(newDyanmoObj) {
    if (newDyanmoObj) {
      const params = {
        TableName: this.tableName,
        Item: newDyanmoObj
      };
      const documentClient = new AWS.DynamoDB.DocumentClient();
      return documentClient
        .put(params)
        .promise()
        .then(function() {
          return newDyanmoObj;
        })
        .catch(function(err) {
          console.error(err);
          throw err; //Throw error and handle properly in crudRoutes
        });
    } else {
      let err = {
        code: 406,
        message: 'ADD: Object already in system'
      };
      return Promise.reject(err);
    }
  }

  readFromDB(passedID) {
    const params = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':id': passedID
      },
      KeyConditionExpression: 'id = :id'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .query(params)
      .promise()
      .then(function(data) {
        if (!_.isEmpty(data.Items)) {
          return data.Items;
        } else {
          let err = {
            code: 404,
            message: 'Item not found'
          };
          throw err;
        }
      })
      .catch(function(err) {
        console.error(err);
        throw err;
      });
  }

  readFromDBURL(passedID) {
    const params = {
      TableName: this.tableName,
      ExpressionAttributeValues: {
        ':id': passedID
      },
      KeyConditionExpression: 'id = :id'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .query(params)
      .promise()
      .then(function(data) {
        if (!_.isEmpty(data.Items)) {
          return data.Items;
        } else {
          return null;
        }
      })
      .catch(function(err) {
        console.error(err);
        throw err;
      });
  }

  queryWithTwoIndexesInDB(userId, expenseTypeId) {
    const params = {
      TableName: this.tableName,
      IndexName: 'userId-expenseTypeId-index',
      ExpressionAttributeValues: {
        ':expenseTypeId': expenseTypeId,
        ':userId': userId
      },
      KeyConditionExpression: 'expenseTypeId = :expenseTypeId and userId = :userId'
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .query(params)
      .promise()
      .then(data => {
        if (!_.isEmpty(data.Items)) {
          return data.Items;
        } else {
          return null;
        }
      })
      .catch(err => {
        console.error(err);
        throw err;
      });
  }

  querySecondaryIndexInDB(secondaryIndex, queryKey, queryParam) {
    const params = {
      TableName: this.tableName,
      IndexName: secondaryIndex,
      ExpressionAttributeValues: {
        ':queryKey': queryParam
      },
      KeyConditionExpression: `${queryKey} = :queryKey`
    };

    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .query(params)
      .promise()
      .then(data => {
        return data.Items;
      })
      .catch(err => {
        console.error(err);
        throw err;
      });
  }

  // querySecondaryIndexInDB2(secondaryIndex, queryKey, queryParam) {
  //   const params = {
  //     TableName: this.tableName,
  //     IndexName: secondaryIndex,
  //     ExpressionAttributeValues: {
  //       ':queryKey': queryParam
  //     },
  //     KeyConditionExpression: `${queryKey} = :queryKey`
  //   };

  //   const documentClient = new AWS.DynamoDB.DocumentClient();
  //   return documentClient
  //     .query(params)
  //     .promise()
  //     .then(data => {
  //       if (!_.isEmpty(data.Items)) {
  //         return data.Items;
  //       } else {
  //         return null;
  //       }
  //     })
  //     .catch(err => {
  //       console.error(err);
  //       throw err;
  //     });
  // }

  /**
   * Removes the object from the database according to its index key
   */
  removeFromDB(passedID) {
    const params = {
      TableName: this.tableName,
      Key: {
        id: passedID
      },
      ReturnValues: 'ALL_OLD'
    };
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .delete(params)
      .promise()
      .then(data => data.Attributes)
      .catch(function(err) {
        console.error(err);
        throw err;
      }); //Throw error and handle properly in crudRoutes
  }

  updateEntryInDB(newDyanmoObj) {
    const params = this.buildUpdateParams(newDyanmoObj);
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .update(params)
      .promise()
      .then(function(data) {
        return data.Attributes;
      })
      .catch(function(err) {
        console.error(err);
        throw err;
      });
  }

  getAllEntriesInDB() {
    var params = {
      TableName: this.tableName
    };
    const documentClient = new AWS.DynamoDB.DocumentClient();
    return documentClient
      .scan(params)
      .promise()
      .then(function(data) {
        return _.sortBy(data.Items, ['lastName', 'middleName', 'firstName', 'budgetName', 'purchaseDate']);
      })
      .catch(function(err) {
        console.error(err);
        throw err;
      });
  }

  buildExpressionAttributeValues(objToUpdate) {
    return _.pickBy(
      {
        ':pd': objToUpdate.purchaseDate,
        ':rd': objToUpdate.reimbursedDate,
        ':c': objToUpdate.cost,
        ':d': objToUpdate.description,
        ':n': objToUpdate.note,
        ':r': objToUpdate.receipt,
        ':eti': objToUpdate.expenseTypeId,
        ':ui': objToUpdate.userId,
        ':cat': objToUpdate.createdAt,
        ':rurl': objToUpdate.url,
        ':cate': objToUpdate.categories
      },
      _.identity
    );
  }

  /**
   * Builds the parameters for update depending on the this.tablePath
   * @return the parameters for update
   */
  buildUpdateParams(objToUpdate) {
    switch (this.tableName) {
      case `${STAGE}-expenses`: {
        let ExpressionAttributeValues = {},
          UpdateExpression = 'set ';
        let params = {
          TableName: `${STAGE}-expenses`,
          Key: {
            id: objToUpdate.id
          },
          ReturnValues: 'ALL_NEW'
        };
        if (objToUpdate.purchaseDate) {
          ExpressionAttributeValues[':pd'] = objToUpdate.purchaseDate;
          UpdateExpression += 'purchaseDate = :pd,';
        }
        if (objToUpdate.reimbursedDate) {
          ExpressionAttributeValues[':rd'] = objToUpdate.reimbursedDate;
          UpdateExpression += 'reimbursedDate = :rd,';
        }
        if (objToUpdate.cost) {
          ExpressionAttributeValues[':c'] = objToUpdate.cost;
          UpdateExpression += 'cost = :c,';
        }
        if (objToUpdate.description) {
          ExpressionAttributeValues[':d'] = objToUpdate.description;
          UpdateExpression += 'description = :d,';
        }
        if (objToUpdate.note) {
          ExpressionAttributeValues[':n'] = objToUpdate.note;
          UpdateExpression += 'note = :n,';
        }
        if (objToUpdate.receipt) {
          ExpressionAttributeValues[':r'] = objToUpdate.receipt;
          UpdateExpression += 'receipt = :r,';
        }
        if (objToUpdate.expenseTypeId) {
          ExpressionAttributeValues[':eti'] = objToUpdate.expenseTypeId;
          UpdateExpression += 'expenseTypeId = :eti,';
        }
        if (objToUpdate.userId) {
          ExpressionAttributeValues[':ui'] = objToUpdate.userId;
          UpdateExpression += 'userId = :ui,';
        }
        if (objToUpdate.createdAt) {
          ExpressionAttributeValues[':cat'] = objToUpdate.createdAt;
          UpdateExpression += 'createdAt = :cat,';
        }
        if (objToUpdate.url) {
          ExpressionAttributeValues[':url'] = objToUpdate.url;
          UpdateExpression += '#url = :url,';
          _.set(params, 'ExpressionAttributeNames', { '#url': 'url' });
        }
        if (objToUpdate.cate) {
          ExpressionAttributeValues[':cate'] = objToUpdate.categories;
          UpdateExpression += 'categories = :cate,';
        }
        UpdateExpression = `${_.trimEnd(UpdateExpression, ',')}`;
        _.set(params, 'ExpressionAttributeValues', ExpressionAttributeValues);
        _.set(params, 'UpdateExpression', UpdateExpression);
        return params;
      }
      case `${STAGE}-employees`:
        return {
          TableName: `${STAGE}-employees`,
          Key: {
            id: objToUpdate.id
          },
          UpdateExpression: `set firstName = :fn, middleName = :mn, lastName = :ln,
                               employeeNumber = :eid, hireDate = :hd, isInactive = :ia,
                               employeeRole = :er, email = :eml, birthday = :br, jobRole = :jr, prime = :pr,
                               contract = :ct, github = :gh, twitter = :tt, city = :cty, st = :st, country = :cry`,
          ExpressionAttributeValues: {
            ':fn': objToUpdate.firstName,
            ':mn': objToUpdate.middleName,
            ':ln': objToUpdate.lastName,
            ':eid': objToUpdate.employeeNumber,
            ':hd': objToUpdate.hireDate,
            ':ia': objToUpdate.isInactive,
            ':er': objToUpdate.employeeRole,
            ':eml': objToUpdate.email,
            // New Fields
            ':br': objToUpdate.birthday,
            ':jr': objToUpdate.jobRole,
            ':pr': objToUpdate.prime,
            ':ct': objToUpdate.contract,
            ':gh': objToUpdate.github || ' ',
            ':tt': objToUpdate.twitter,
            ':cty': objToUpdate.city,
            ':st': objToUpdate.st,
            ':cry': objToUpdate.country
          },
          ReturnValues: 'ALL_NEW'
        };
      case `${STAGE}-expense-types`:
        return {
          TableName: `${STAGE}-expense-types`,
          Key: {
            id: objToUpdate.id
          },
          UpdateExpression: `set budgetName = :bn, budget = :b, odFlag = :odf, description = :d,
                                 startDate = :sd, endDate= :ed, recurringFlag = :rf, requiredFlag = :rqf,
                                  isInactive = :ia, categories = :c`,
          ExpressionAttributeValues: {
            ':bn': objToUpdate.budgetName,
            ':b': objToUpdate.budget,
            ':odf': objToUpdate.odFlag,
            ':d': objToUpdate.description,
            ':sd': objToUpdate.startDate,
            ':ed': objToUpdate.endDate,
            ':rf': objToUpdate.recurringFlag,
            ':rqf': objToUpdate.requiredFlag,
            ':ia': objToUpdate.isInactive,
            ':c': objToUpdate.categories
          },
          ReturnValues: 'ALL_NEW'
        };
      case `${STAGE}-budgets`:
        return {
          TableName: `${STAGE}-budgets`,
          Key: {
            id: objToUpdate.id
          },
          UpdateExpression: `set expenseTypeId = :eti, userId = :ui, reimbursedAmount = :ra,
                                 fiscalStartDate = :fsd, fiscalEndDate = :fed, pendingAmount = :pa`,
          ExpressionAttributeValues: {
            ':eti': objToUpdate.expenseTypeId,
            ':ui': objToUpdate.userId,
            ':ra': objToUpdate.reimbursedAmount,
            ':pa': objToUpdate.pendingAmount,
            ':fsd': objToUpdate.fiscalStartDate,
            ':fed': objToUpdate.fiscalEndDate
          },
          ReturnValues: 'ALL_NEW'
        };
      case `${STAGE}-training-urls`:
        console.warn('here we are');
        return {
          TableName: `${STAGE}-training-urls`,
          Key: {
            id: objToUpdate.id
          },

          UpdateExpression: 'set hits = :ht, category = :ct',
          ExpressionAttributeValues: {
            ':ht': objToUpdate.hits,
            ':ct': objToUpdate.category
          },
          ReturnValues: 'ALL_NEW'
        };
    }
  }
}
module.exports = databaseModify;
