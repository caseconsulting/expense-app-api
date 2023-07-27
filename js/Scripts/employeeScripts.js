/**
 * node ./js/Scripts/employeeScripts.js dev
 * node ./js/Scripts/employeeScripts.js test
 * node ./js/Scripts/employeeScripts.js prod (must set aws credentials for prod as default)
 *
 * npm run employeeScripts:dev
 * npm run employeeScripts:prod
 * npm run employeeScripts:test
 */

// handles unhandled rejection errors
process.on('unhandledRejection', (error) => {
  console.error('unhandledRejection', error);
});

// check for stage argument
if (process.argv.length < 3) {
  throw new Error('Must include a stage');
}

// set and validate stage
const STAGE = process.argv[2];
if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
  throw new Error('Invalid stage. Must be dev, test, or prod');
}

// set employee table
const TABLE = `${STAGE}-employees`;
const TABLE_SENS = `${STAGE}-employees-sensitive`;
const EMPLOYEES_TABLE = 'employees';
const SENSITIVE_TABLE = 'employees-sensitive';

// imports
const _ = require('lodash');
const readlineSync = require('readline-sync');

// set up AWS DynamoDB
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10', region: 'us-east-1' }));
const DatabaseModify = require('../databaseModify');

// colors for console logging
const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  CYAN: '\x1b[36m',
  YELLOW: '\x1b[33m',
  BOLD: '\x1b[1m',
  NC: '\x1b[0m' // clear
};

/**
 * =================================================
 * |                                               |
 * |            Begin helper functions             |
 * |                                               |
 * =================================================
 */

/**
 * helper to get all entries in dynamodb table
 */
const getAllEntriesHelper = (params, out = []) =>
  new Promise((resolve, reject) => {
    ddb
      .send(new ScanCommand(params))
      .then(({ Items, LastEvaluatedKey }) => {
        out.push(...Items);
        !LastEvaluatedKey
          ? resolve(out)
          : resolve(getAllEntriesHelper(Object.assign(params, { ExclusiveStartKey: LastEvaluatedKey }), out));
      })
      .catch(reject);
  });

/**
 * get all entries in dynamodb table
 *
 * @return - all the entries in the table
 */
function getAllEntries(table) {
  console.log('Getting all entries in dynamodb employees table');
  let params = {
    TableName: table
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
} // getAllEntries

/**
 * Removes given attribute from all employee data
 *
 * @param attribute - the given attribute
 */
async function removeAttribute(attribute) {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: employee.id
      },
      UpdateExpression: `remove ${attribute}`,
      ReturnValues: 'UPDATED_NEW'
    };

    // update employee
    ddb
      .send(new UpdateCommand(params))
      .then(() => console.log(`Refreshed Employee ID: ${employee.id}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // removeAttribute

/**
 * Used to convert degrees to the updated companies JSON structure
 *
 * @param degrees - an employee's education history (prior to v3.3)
 * @return - a newly structured JSON titled companies, consisting of the same data previously in degrees
 */
function calculateEducation(degrees) {
  //updated degrees value
  let schools = [];
  //iterate thru every degree in a profile
  _.forEach(degrees, (degree) => {
    let found = false;
    //iterate thru all entries in schools to see if the degree entry's school has already been added
    _.forEach(schools, (school) => {
      //if we found the school, then add its degree-related data (majors, degreeType, etc.) to the school.degrees field
      if (degree.school === school.name) {
        found = true;
        let deg = {
          degreeType: degree.name,
          completionDate: degree.date,
          majors: degree.majors,
          minors: degree.minors,
          concentrations: degree.concentrations
        };
        school.degrees.push(deg);
        //add to school.degrees
        //set found to true
      }
    });
    //if we didn't find the degree in the schools object, we will add a brand new school entry
    if (!found) {
      let school = {
        name: degree.school,
        degrees: [
          {
            degreeType: degree.name,
            completionDate: degree.date,
            majors: degree.majors,
            minors: degree.minors,
            concentrations: degree.concentrations
          }
        ]
      };
      schools.push(school);
      //add new school entry to schools
    }
  });
  return schools;
} // calculateEducation

/**
 * updates the new discreet bi dates based on previous range values
 *
 * @param clearances
 * @return - Converted clearances where if there was a range for the bi dates, it takes the
 *  start date
 */
function updateBIDates(clearances) {
  _.forEach(clearances, (clearance, clearanceIndex) => {
    if (clearance.biDates) {
      _.forEach(clearance.biDates, (biDate, biDateIndex) => {
        if (biDate.range) {
          clearances[clearanceIndex].biDates[biDateIndex] = biDate.range[0];
        }
      });
    }
  });
  return clearances;
} // updateBIDates

/**
 * Receives jobs object and converts its JSON structure to match the structure used on version 3.3,
 * which is titled companies
 *
 * @param jobs - jobs object
 * @return - companies new structure
 */
function calculateCompanies(jobs) {
  let companies = [];
  _.forEach(jobs, (job) => {
    let found = false;
    _.forEach(companies, (company) => {
      if (company.companyName === job.company) {
        let isPresent = job.endDate === null ? true : false;
        let pos = {
          title: job.position,
          startDate: job.startDate,
          endDate: job.endDate,
          presentDate: isPresent
        };
        company.positions.push(pos);
        found = true;
      }
    });
    //company not already in the array of companies
    if (!found) {
      let isPresent = job.endDate === null ? true : false;
      let company = {
        companyName: job.company,
        positions: [
          {
            title: job.position,
            startDate: job.startDate,
            endDate: job.endDate,
            presentDate: isPresent
          }
        ]
      };
      companies.push(company);
    }
  });
  return companies;
} // calculateCompanies

/**
 * Takes the technologies object for each employee and calculates the date intervals
 * and creates a new key called years, which is the sum of all of the years for the
 * list of dateIntervals. Also, it adds a field called currentStartDate which is used
 * to update current technologies years field as time passes
 *
 * @param technologies
 * @return - new object not containing dateIntervals, rather contains years
 */
function calculateYears(technologies) {
  _.forEach(technologies, (technology) => {
    let totalDiff = 0;
    technology.current = false;
    _.forEach(technology.dateIntervals, (dateInterval) => {
      let startDate = new Date(dateInterval.startDate);
      let endDate;
      if (dateInterval.endDate === null) {
        endDate = new Date();
        technology.current = true;
        totalDiff -= 1 / 12;
      } else {
        endDate = new Date(dateInterval.endDate);
      }
      delete technology.currentStartDate;
      let yearDiff = endDate.getFullYear() - startDate.getFullYear();
      totalDiff += yearDiff + (endDate.getMonth() - startDate.getMonth()) / 12;
    });
    //delete technology.dateIntervals;  //TODO uncomment once dateIntervals are no longer supported
    technology.years = Number(totalDiff.toFixed(2));
  });
  return technologies;
} // calculateYears

/**
 * =================================================
 * |                                               |
 * |             End helper functions              |
 * |                                               |
 * =================================================
 */

/**
 * =================================================
 * |                                               |
 * |            Begin runnable scripts             |
 * |                                               |
 * =================================================
 */

/**
 * Sets all employee's work status active = 100 (Full Time) or inactive = 0
 */
async function workStatusActive() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    let params = {
      TableName: TABLE,
      Key: {
        id: employee.id
      },
      UpdateExpression: 'set workStatus = :ws',
      ExpressionAttributeValues: {
        ':ws': 100
      },
      ReturnValues: 'UPDATED_NEW'
    };

    if (employee.isInactive) {
      params.ExpressionAttributeValues = {
        ':ws': 0
      };
    }

    // update employee
    ddb
      .send(new UpdateCommand(params))
      .then((data) =>
        console.log(`Item Updated\n  Employee ID: ${employee.id}\n  Work Status: ${data.Attributes.workStatus}`)
      )
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // workStatusActive

/**
 * Removes isInactive attribute form all employees
 */
async function removeIsInactive() {
  await removeAttribute('isInactive');
} // removeIsInactive

/**
 * Removes expenseTypes attribute
 */
async function removeExpenseTypes() {
  await removeAttribute('expenseTypes');
} // removeExpenseTypes

/**
 * Removes given attribute from all employee data
 *
 * @param attribute - attribute to be removed
 */
async function setBirthdayFeed(attribute) {
  let employees = await getAllEntries(TABLE);
  let showBirthday = true;
  _.forEach(employees, (employee) => {
    showBirthday = true;
    if (!employee.birthday) {
      showBirthday = false;
    }
    if (employee.birthdayFeed != null) {
      showBirthday = employee.birthdayFeed;
    }
    let params = {
      TableName: TABLE,
      Key: {
        id: employee.id
      },
      UpdateExpression: `set ${attribute} = :a`,
      ExpressionAttributeValues: {
        ':a': showBirthday
      },
      ReturnValues: 'UPDATED_NEW'
    };

    // update employee
    ddb
      .send(new UpdateCommand(params))
      .then(() => console.log(`Refreshed Employee ID: ${employee.id}`))
      .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
  });
} // setBirthdayFeed

/**
 * Used to replace the old technologies field with a new object excluding dateIntervals
 */
async function addYearsToTechnologies() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    if (employee.technologies) {
      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set technologies = :tech',
        ExpressionAttributeValues: {
          ':tech': calculateYears(employee.technologies)
        },
        ReturnValues: 'UPDATED_NEW'
      };
      //update employee
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // addYearsToTechnologies

/**
 * Used to convert the previous jobs attribute to a different JSON structure titled companies
 */
async function convertJobsToCompanies() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    if (employee.jobs) {
      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set companies = :comp',
        ExpressionAttributeValues: {
          ':comp': calculateCompanies(employee.jobs)
        },
        ReturnValues: 'UPDATED_NEW'
      };
      //update employee

      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} //convertJobsToCompanies

/**
 * Converts the BI dates so that if there was a range, the bidate gets replaced with just
 * the start date.
 */
async function convertBIDates() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    if (employee.clearances) {
      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set clearances = :clearance ',
        ExpressionAttributeValues: {
          ':clearance': updateBIDates(employee.clearances)
        },
        ReturnValues: 'UPDATED_NEW'
      };

      //update employee
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // convertBIDates

/**
 * Used to convert the attribute 'degrees' JSON structure to an updated structure titled 'schools' in
 * the employees table
 */
async function convertEducation() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    if (employee.degrees) {
      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set schools = :deg',
        ExpressionAttributeValues: {
          ':deg': calculateEducation(employee.degrees)
        },
        ReturnValues: 'UPDATED_NEW'
      };
      //update employee
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // convertEducation

/**
 * Removes the degrees list attribute from the database. Degrees is now found under the schools attribute.
 */
async function deleteDegreesAttribute() {
  await removeAttribute('degrees');
} // deleteDegreesAttribute

/**
 * Delete old contract data that is no longer used due to a new JSON data structure.
 */
async function deleteUnusedContractData() {
  await removeAttribute('contract');
  await removeAttribute('prime');
} // deleteUnusedContractData

/**
 * Migrates the single phone number to the private phone numbers list.
 */
async function migratePhoneNumbers() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    if (employee.phoneNumber) {
      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set privatePhoneNumbers = :pr',
        ExpressionAttributeValues: {
          ':pr': [{ type: 'Cell', number: employee.phoneNumber, private: true, valid: false }]
        }
      };

      // update employee
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // migratePhoneNumbers

/**
 * Removes the old phoneNumber attribute
 */
async function removePhoneNumberAttribute() {
  await removeAttribute('phoneNumber');
} // removePhoneNumberAttribute

/**
 * Deletes the clearance expiration date for each employee's clearances.
 */
async function deleteUnusedClearanceExpirationDate() {
  console.log('before call');
  let employees = await getAllEntries(TABLE);
  console.log('after call');
  let hasChanged = false;
  _.forEach(employees, (employee) => {
    if (employee.clearances) {
      _.forEach(employee.clearances, (clearance) => {
        if (clearance.expirationDate) {
          delete clearance.expirationDate;
          hasChanged = true;
        }
      });

      if (hasChanged) {
        let params = {
          TableName: TABLE,
          Key: {
            id: employee.id
          },
          UpdateExpression: 'set clearances = :a',
          ExpressionAttributeValues: {
            ':a': employee.clearances
          },
          ReturnValues: 'UPDATED_NEW'
        };

        console.log('before doc client');
        // update employee
        ddb
          .send(new UpdateCommand(params))
          .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
          .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
      }
      hasChanged = false;
    }
  });
} // deleteUnusedClearanceExpirationDate

/**
 * Change wording in level of proficiency for basic.
 */
async function changeWordingForBasicProficiencyLevel() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    if (employee.languages) {
      _.forEach(employee.languages, (language) => {
        if (language.proficiency.includes('Basic')) {
          language.proficiency = language.proficiency.toLowerCase();
          language.proficiency = language.proficiency.charAt(0).toUpperCase() + language.proficiency.slice(1);
        }
      });
      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set languages = :s',
        ExpressionAttributeValues: {
          ':s': employee.languages
        }
      };
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // changeWordingForBasicProficiencyLevel

/**
 * Updates Github/Twitter profile information to replace URLs with just usernames.
 */
async function replaceGithubTwitterUrls() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    // set values and command
    let eaVals = {};
    let updateExp = '';
    let update = false;
    if (employee.github && employee.github.indexOf('/') != -1) {
      update = true;
      updateExp += 'set github = :gh';
      if (employee.github.slice(-1) === '/') employee.github = employee.github.slice(0, -1);
      eaVals[':gh'] = employee.github.substring(employee.github.lastIndexOf('/') + 1, employee.github.length);
    }
    if (employee.twitter && employee.twitter.indexOf('/') != -1) {
      update = true;
      let and = updateExp === '' ? 'set ' : ', ';
      updateExp += `${and}twitter = :tw`;
      if (employee.twitter.slice(-1) === '/') employee.twitter = employee.twitter.slice(0, -1);
      eaVals[':tw'] = employee.twitter.substring(employee.twitter.lastIndexOf('/') + 1, employee.twitter.length);
    }

    // build and execute command
    if (update) {
      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: updateExp,
        ExpressionAttributeValues: eaVals,
        ReturnValues: 'UPDATED_NEW'
      };

      // update employee
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // replaceGithubTwitterUrls

/**
 * Removes the old schools attribute
 */
async function removeSchoolsAttribute() {
  removeAttribute('schools');
} // removeSchoolsAttribute

/**
 * Moves school attribute to education, adding type
 */
async function moveSchoolsToEducation() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    if (employee.schools) {
      let education = _.map(employee.schools, (s) => {
        return {
          ...s,
          type: 'university'
        };
      });

      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set education = :edu',
        ExpressionAttributeValues: {
          ':edu': education
        },
        ReturnValues: 'UPDATED_NEW'
      };

      //update employee
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // moveSchoolsToEducation

/**
 * Replaces all employee's single prime string with a list of primes.
 */
async function createPrimesList() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    if (employee.contracts) {
      // copy old data and turn prime into a primes list
      let newContracts = _.map(employee.contracts, (contract) => {
        return {
          ...contract,
          primes: [contract.prime]
        };
      });
      // go back and remove the single prime string
      _.forEach(newContracts, (contract) => {
        delete contract.prime;
      });

      console.log(newContracts);
      console.log(employee.firstName);

      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set contracts = :c',
        ExpressionAttributeValues: {
          ':c': newContracts
        },
        ReturnValues: 'UPDATED_NEW'
      };

      // //update employee
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // createPrimesList

/**
 * Updates awards to have dates if they have no dates, fixing the stuck on activity feed issue.
 * This would be easily portable to expenses if needed.
 */
async function addAwardDates() {
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (employee) => {
    let update = false;
    _.forEach(employee.awards, (award, i) => {
      if (_.isEmpty(award.dateReceived)) {
        employee.awards[i].dateReceived = '1970-01'; // set to beginning of time
        update = true;
      }
    });

    // build and execute command
    if (update) {
      let params = {
        TableName: TABLE,
        Key: {
          id: employee.id
        },
        UpdateExpression: 'set awards = :aw',
        ExpressionAttributeValues: { ':aw': employee.awards },
        ReturnValues: 'UPDATED_NEW'
      };

      // update employee
      ddb
        .send(new UpdateCommand(params))
        .then(() => console.log(`Item Updated\n  Employee ID: ${employee.id}\n`))
        .catch((err) => console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2)));
    }
  });
} // addAwardDates

/**
 * Migrates sensitive PII data from the employees table to the new sensitive employees table.
 */
async function migrateSensitiveData() {
  let databaseModify = new DatabaseModify(SENSITIVE_TABLE);
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (e) => {
    let sens_data = {
      id: e.id,
      employeeRole: e.employeeRole,
      deptDate: e.deptDate,
      birthday: e.birthday,
      birthdayFeed: e.birthdayFeed,
      city: e.city,
      st: e.st,
      country: e.country,
      currentCity: e.currentCity,
      currentState: e.currentState,
      currentStreet: e.currentStreet,
      currentZIP: e.currentZIP,
      lastLogin: e.lastLogin,
      privatePhoneNumbers: e.privatePhoneNumbers,
      eeoDeclineSelfIdentify: e.eeoDeclineSelfIdentify,
      eeoAdminHasFilledOutEeoForm: e.eeoAdminHasFilledOutEeoForm,
      eeoGender: e.eeoGender,
      eeoHispanicOrLatino: e.eeoHispanicOrLatino,
      eeoJobCategory: e.eeoJobCategory,
      eeoRaceOrEthnicity: e.eeoRaceOrEthnicity,
      eeoHasDisability: e.eeoHasDisability,
      eeoIsProtectedVeteran: e.eeoIsProtectedVeteran
    };
    databaseModify.addToDB(sens_data);
  });
} // migrateSensitiveData

/**
 * Migrates sensitive PII data from the employees table to the new sensitive employees table.
 */
async function removeSensitiveDataFromEmployees() {
  let databaseModify = new DatabaseModify(EMPLOYEES_TABLE);
  let employees = await getAllEntries(TABLE);
  _.forEach(employees, (e) => {
    delete e.employeeRole;
    delete e.birthday;
    delete e.city;
    delete e.st;
    delete e.country;
    delete e.currentCity;
    delete e.currentState;
    delete e.currentStreet;
    delete e.currentZIP;
    delete e.privatePhoneNumbers;
    delete e.eeoDeclineSelfIdentify;
    delete e.eeoAdminHasFilledOutEeoForm;
    delete e.eeoGender;
    delete e.eeoHispanicOrLatino;
    delete e.eeoJobCategory;
    delete e.eeoRaceOrEthnicity;
    delete e.eeoHasDisability;
    delete e.eeoIsProtectedVeteran;
    databaseModify.updateEntryInDB(e);
  });
} // migrateSensitiveData

/**
 * Moves three fields from the sensitive table to the regular employees table.
 */
async function moveLoginDepartureAndBirthdayFeed() {
  let databaseModify = new DatabaseModify(EMPLOYEES_TABLE);
  let sensitiveModify = new DatabaseModify(SENSITIVE_TABLE);
  let employees = await getAllEntries(TABLE);
  let sens_employees = await getAllEntries(TABLE_SENS);
  _.forEach(sens_employees, (sens_emp) => {
    let emp = _.find(employees, (e) => sens_emp.id === e.id);
    emp['birthdayFeed'] = _.clone(sens_emp.birthdayFeed);
    emp['deptDate'] = _.clone(sens_emp.deptDate);
    emp['lastLogin'] = _.clone(sens_emp.lastLogin);
    delete sens_emp.birthdayFeed;
    delete sens_emp.deptDate;
    delete sens_emp.lastLogin;
    databaseModify.updateEntryInDB(emp);
    sensitiveModify.updateEntryInDB(sens_emp);
  });
} // moveLoginDepartureAndBirthdayFeed

/**
 * Update employee EEO data to fix "Offcial" typo.
 */
async function changeOffcialToOfficial() {
  let sens_employees = await getAllEntries(TABLE_SENS);
  let sensitiveModify = new DatabaseModify(SENSITIVE_TABLE);
  _.forEach(sens_employees, (sens_emp) => {
    let jobCatVal =
      sens_emp['eeoJobCategory'] && sens_emp['eeoJobCategory'].value ? sens_emp['eeoJobCategory'].value : -1;
    if (jobCatVal == 1 || jobCatVal == 2) {
      switch (jobCatVal) {
        case 1:
          sens_emp = {
            ...sens_emp,
            eeoJobCategory: {
              value: 1,
              text: 'Executive/Senior Level Official and Manager'
            }
          };
          break;
        case 2:
          sens_emp = {
            ...sens_emp,
            eeoJobCategory: {
              value: 2,
              text: 'First/Mid Level Official and Manager'
            }
          };
          break;
      }

      // now update the employee
      console.log(`Updating employee with ID ${sens_emp['id']}`);
      sensitiveModify.updateEntryInDB(sens_emp);
    }
  });
} // changeOffcialToOfficial

/**
 * =================================================
 * |                                               |
 * |             End runnable scripts              |
 * |                                               |
 * =================================================
 */

/**
 * Asks user for script to run until they choose a valid script
 *
 * @param n - length items in actions array
 * @return - the user input
 */
function chooseAction(n) {
  let prompt = `Select an action number [0-${n - 1}]`;

  let input;
  let valid = false;
  while (!valid) {
    input = readlineSync.question(`${prompt}: `);
    input = parseInt(input);
    valid = !isNaN(input) && input >= 0 && input < n;
    if (!valid) console.log(`${colors.RED}Invalid input.${colors.NC}\n`);
  }

  return input;
} // chooseAction

/**
 * Prompts the user and confirm action
 *
 * @param scriptNum - the script number that is being confirmed
 * @return boolean - if the action was confirmed
 */
function confirmAction(scriptNum, scriptDesc) {
  let input;
  let affirmatives = ['y', 'yes'];
  let rejectives = ['n', 'no'];

  // build and ask prompt
  let prompt = `\n${colors.YELLOW}Are you sure you want to `;
  prompt += `run script ${colors.BOLD}${scriptNum}${colors.NC}:\n  ${scriptDesc}? [y/n] `;
  if (scriptNum == 0) prompt = `${colors.YELLOW}Are you sure you want to ${colors.BOLD}cancel${colors.NC}? [y/n] `;

  // get user input from prompt
  input = readlineSync.question(prompt);
  input = input.toLowerCase();
  while (!affirmatives.includes(input) && !rejectives.includes(input)) {
    input = readlineSync.question(`${colors.RED}Invalid input.${colors.NC}\n\n${prompt}`);
    input = input.toLowerCase();
  }

  if (affirmatives.includes(input)) {
    return true;
  } else {
    console.log('Action Canceled');
    return false;
  }
} // confirmAction

/**
 * main - script selector and runner
 */
async function main() {
  // array of scripts the user can run
  const actions = [
    { desc: 'Cancel', action: () => {} },
    {
      desc: "Set all employee's work status active = 100 (Full Time) or inactive = 0",
      action: async () => {
        await workStatusActive();
      }
    },
    {
      desc: 'Remove isInactive attribute from all employees',
      action: async () => {
        await removeIsInactive();
      }
    },
    {
      desc: 'Remove expenseTypes attribute from all employees',
      action: async () => {
        await removeExpenseTypes();
      }
    },
    {
      desc: 'Set any null birthdayFeed attributes to true',
      action: async () => {
        await setBirthdayFeed('birthdayFeed');
      }
    },
    {
      desc: 'Add years attribute to all employee technologies',
      action: async () => {
        await addYearsToTechnologies();
      }
    },
    {
      desc: 'Convert existing jobs object to updated JSON structure (AKA companies)',
      action: async () => {
        await convertJobsToCompanies();
      }
    },
    {
      desc: 'Remove old BI date structure (AKA make them single dates not ranges)',
      action: async () => {
        await convertBIDates();
      }
    },
    {
      desc: 'Convert existing education entries to updated JSON structure',
      action: async () => {
        await convertEducation();
      }
    },
    {
      desc: 'Remove old degrees attribute from database',
      action: async () => {
        await deleteDegreesAttribute();
      }
    },
    {
      desc: 'Remove unused contract data left from old JSON structure',
      action: async () => {
        await deleteUnusedContractData();
      }
    },
    {
      desc: 'Migrate phoneNumber attribute to private phone number array column',
      action: async () => {
        await migratePhoneNumbers();
      }
    },
    {
      desc: 'Remove phoneNumber attribute from database',
      action: async () => {
        await removePhoneNumberAttribute();
      }
    },
    {
      desc: 'Remove unused clearance expiration date left from old JSON structure',
      action: async () => {
        await deleteUnusedClearanceExpirationDate();
      }
    },
    {
      desc: 'Change wording in level of proficiency for basic',
      action: async () => {
        await changeWordingForBasicProficiencyLevel();
      }
    },
    {
      desc: 'Update Github/Twitter profile URLs to just names',
      action: async () => {
        await replaceGithubTwitterUrls();
      }
    },
    {
      desc: 'Update awards with no dates to have dates',
      action: async () => {
        await addAwardDates();
      }
    },
    {
      desc: 'Migrate schools attribute into education',
      action: async () => {
        await moveSchoolsToEducation();
      }
    },
    {
      desc: 'Remove old schools attribute',
      action: async () => {
        await removeSchoolsAttribute();
      }
    },
    {
      desc: 'Change contract prime to a list of primes',
      action: async () => {
        await createPrimesList();
      }
    },
    {
      desc: 'Migrate sensitive employee PII data to different DynamoDB table',
      action: async () => {
        await migrateSensitiveData();
      }
    },
    {
      desc: 'Remove sensitive employee PII data from Employees table (DO NOT RUN SCRIPT UNTIL THE MIGRATION IS DONE)',
      action: async () => {
        await removeSensitiveDataFromEmployees();
      }
    },
    {
      desc: 'Move lastLogin, departureDate, and birthdayFeed back to the regular employees table',
      action: async () => {
        await moveLoginDepartureAndBirthdayFeed();
      }
    },
    {
      desc: 'Update employee EEO data to fix "Offcial" typo',
      action: async () => {
        await changeOffcialToOfficial();
      }
    }
  ];

  // print all actions for user
  _.forEach(actions, (action, index) => {
    console.log(`${index}. ${action.desc}`);
  });

  // get user input and run specified script
  let scriptNum = chooseAction(actions.length);
  if (confirmAction(scriptNum, actions[scriptNum].desc)) {
    actions[scriptNum].action();
    console.log(`${colors.GREEN}\nDone!${colors.NC}`);
  }
}

main();
