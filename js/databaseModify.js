const _ = require('lodash');
const AWS = require('aws-sdk');

class databaseModify {
    constructor(fileName) {
        this.filePath = fileName ? `json/${fileName}` : 'json/';
        // this.jsonFile = fileName ? fs.readFileSync(this.filePath) : '';
        // this.jsonParsed = fileName ? JSON.parse(this.jsonFile) : [];
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
                throw err; //Throw error and handle properly in crudRoutes
            });
    }

    /**
     * Add the entry to the database
     */
    addToDB(newJsonObj) {
        if (newJsonObj) {
            const params = {
                TableName: this.getTableName(),
                Item: newJsonObj
            };
            const documentClient = new AWS.DynamoDB.DocumentClient();
            return documentClient
                .put(params)
                .promise()
                .then(function() {
                    return newJsonObj;
                })
                .catch(function(err) {
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
        const tableName = this.getTableName();
        const params = {
            TableName: tableName,
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
                throw err;
            });
    }

    /**
     * Removes the object from the database according to its index key
     */
    removeFromDB(passedID) {
        const params = {
            TableName: this.getTableName(),
            Key: {
                id: passedID
            }
        };
        const documentClient = new AWS.DynamoDB.DocumentClient();
        return documentClient
            .delete(params)
            .promise()
            .then(function(data) {
                return data;
            })
            .catch(function(err) {
                throw err; //Throw error and handle properly in crudRoutes
            });
    }

    updateEntryInDB(newJsonObj) {
        const params = this.buildUpdateParams(newJsonObj);
        const documentClient = new AWS.DynamoDB.DocumentClient();
        return documentClient
            .update(params)
            .promise()
            .then(function(data) {
                return data.Attributes;
            })
            .catch(function(err) {
                throw err;
            });
    }

    getAllEntriesInDB() {
        const tableName = this.getTableName();
        var params = {
            TableName: tableName
        };
        const documentClient = new AWS.DynamoDB.DocumentClient();
        return documentClient
            .scan(params)
            .promise()
            .then(function(data) {
                return data.Items;
            })
            .catch(function(err) {
                throw err;
            });
    }

    getTableName() {
        let table = this.filePath.substring(5, this.filePath.indexOf('.json'));
        table = table.charAt(0).toUpperCase() + table.slice(1);
        return table;
    }

    /**
     * Builds the parameters for update depending on the tableName
     * @return the parameters for update
     */
    buildUpdateParams(objToUpdate) {
        const tableName = this.getTableName();
        switch (tableName) {
        case 'Expense':
            return {
                TableName: 'Expense',
                Key: {
                    id: objToUpdate.id
                },
                UpdateExpression:
                        'set purchaseDate = :pd, reimbursedDate = :rd, cost = :c, description = :d, note = :n, receipt = :r, expenseTypeId = :eti, userId = :ui',
                ExpressionAttributeValues: {
                    ':pd': objToUpdate.purchaseDate,
                    ':rd': objToUpdate.reimbursedDate,
                    ':c': objToUpdate.cost,
                    ':d': objToUpdate.description,
                    ':n': objToUpdate.note,
                    ':r': objToUpdate.receipt,
                    ':eti': objToUpdate.expenseTypeId,
                    ':ui': objToUpdate.userId
                },
                ReturnValues: 'ALL_NEW'
            };
        case 'Employee':
            return {
                TableName: 'Employee',
                Key: {
                    id: objToUpdate.id
                },
                UpdateExpression:
                        'set firstName = :fn, middleName = :mn, lastName = :ln, empId = :eid, hireDate = :hd, expenseTypes = :et',
                ExpressionAttributeValues: {
                    ':fn': objToUpdate.firstName,
                    ':mn': objToUpdate.middleName,
                    ':ln': objToUpdate.lastName,
                    ':eid': objToUpdate.empId,
                    ':hd': objToUpdate.hireDate,
                    ':et': objToUpdate.expenseTypes
                },
                ReturnValues: 'ALL_NEW'
            };
        case 'ExpenseType':
            return {
                TableName: 'ExpenseType',
                Key: {
                    id: objToUpdate.id
                },
                UpdateExpression:
                        'set budgetName = :bn, budget = :b, odFlag = :odf, description = :d',
                ExpressionAttributeValues: {
                    ':bn': objToUpdate.budgetName,
                    ':b': objToUpdate.budget,
                    ':odf': false,
                    ':d': objToUpdate.description
                },
                ReturnValues: 'ALL_NEW'
            };
        }
    }
}
module.exports = databaseModify;
