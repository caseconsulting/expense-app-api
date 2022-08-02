/*
 * node ./js/Scripts/employeeScripts.js dev
 * node ./js/Scripts/employeeScripts.js test
 * node ./js/Scripts/employeeScripts.js prod (must set aws credentials for prod as default)
 *
 * npm run employeeScripts:dev
 * npm run employeeScripts:prod
 * npm run employeeScripts:test
 */

// LIST OF ACTIONS
const actions = [
  '0. Cancel',
  "1. Sets all employee's work status active = 100 (Full Time) or inactive = 0",
  '2. Removes isInactive attribute from all employees',
  '3. Removes expenseTypes attribute from all employees',
  '4. Set any null birthdayFeed attributes to true',
  '5. Add years attribute to all employee technologies',
  '6. Convert existing jobs object to updated JSON structure (AKA companies)',
  '7. Remove old BI date structure (AKA make them single dates not ranges)',
  '8. Convert existing education entries to updated JSON structure',
  '9. Remove old degrees attribute from database',
  '10. Remove unused contract data left from old JSON structure',
  '11. Migrate phoneNumber attribute to private phone number array column',
  '12. Remove phoneNumber attribute from database',
  '13. Remove unused clearance expiration date left from old JSON structure',
  '14. Change wording in level of proficiency for basic',
  '15. Update Github/Twitter profile URLs to just names',
  '17. Update awards with no dates to have dates'
];

// check for stage argument
if (process.argv.length < 3) {
  throw new Error('Must include a stage');
}

process.on('unhandledRejection', (error) => {
  //Won't execute
  console.error('unhandledRejection', error);
});

// set and validate stage
const STAGE = process.argv[2];
if (STAGE != 'dev' && STAGE != 'test' && STAGE != 'prod') {
  throw new Error('Invalid stage. Must be dev, test, or prod');
}

// set employee table
const TABLE = `${STAGE}-employees`;

const _ = require('lodash');
const readlineSync = require('readline-sync');

const AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-1' });
const ddb = new AWS.DynamoDB.DocumentClient();

// helper to get all entries in dynamodb table
const getAllEntriesHelper = (params, out = []) =>
  new Promise((resolve, reject) => {
    ddb
      .scan(params)
      .promise()
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
function getAllEntries() {
  console.log('Getting all entries in dynamodb employees table');
  let params = {
    TableName: TABLE
  };
  let entries = getAllEntriesHelper(params);
  console.log('Finished getting all entries');
  return entries;
} // getAllEntries

/**
 * Sets all employee's work status active = 100 (Full Time) or inactive = 0
 */
async function workStatusActive() {
  let employees = await getAllEntries();
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
    ddb.update(params, function (err, data) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Item Updated\n  Employee ID: ${employee.id}\n  Work Status: ${data.Attributes.workStatus}`);
      }
    });
  });
} // workStatusActive

/**
 * Migrates the single phone number to the private phone numbers list.
 */
async function migratePhoneNumbers() {
  let employees = await getAllEntries();
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
      ddb.update(params, function (err) {
        if (err) {
          console.error('Unable to migrate phone number. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(
            `Number Migrated\n  Employee ID: ${employee.id}\n
              Private Phone Numbers: ${employee.phoneNumber}`
          );
        }
      });
    }
  });
} // migratePhoneNumbers

/**
 * Removes the old phoneNumber attribute
 */
async function removePhoneNumberAttribute() {
  removeAttribute('phoneNumber');
}

/**
 * Removes given attribute from all employee data
 *
 * @param attribute - the given attribute
 */
async function removeAttribute(attribute) {
  let employees = await getAllEntries();
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
    ddb.update(params, function (err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Refreshed Employee ID: ${employee.id}`);
      }
    });
  });
} // removeAttribute

/**
 * Used to convert the previous jobs attribute to a different JSON structure titled companies
 */
async function convertJobsToCompanies() {
  let employees = await getAllEntries();
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
      ddb.update(params, function (err) {
        if (err) {
          console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Item Updated\n  Employee ID: ${employee.id}\n`);
        }
      });
    }
  });
} //convertJobsToCompanies

/**
 * Used to convert the attribute 'degrees' JSON structure to an updated structure titled 'schools' in
 * the employees table
 */
async function convertEducation() {
  let employees = await getAllEntries();
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
      ddb.update(params, function (err) {
        if (err) {
          console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Item Updated\n  Employee ID: ${employee.id}\n`);
        }
      });
    }
  });
} // convertEducation

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
 * Removes the degrees list attribute from the database. Degrees is now found under the schools attribute.
 */
function deleteDegreesAtrribute() {
  removeAttribute('degrees');
} // deleteDegreesAtrribute

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
 * Converts the BI dates so that if there was a range, the bidate gets replaced with just
 * the start date.
 */
async function convertBIDates() {
  let employees = await getAllEntries();
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
      ddb.update(params, function (err) {
        if (err) {
          console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Item Updated\n  Employee ID: ${employee.id}\n`);
        }
      });
    }
  });
} // convertBIDates

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
 * Used to replace the old technologies field with a new object excluding dateIntervals
 */
async function addYearsToTechnologies() {
  let employees = await getAllEntries();
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
      ddb.update(params, function (err) {
        if (err) {
          console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Item Updated\n  Employee ID: ${employee.id}\n`);
        }
      });
    }
  });
} // addYearsToTechnologies

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
 * Removes given attribute from all employee data
 *
 * @param attribute - attribute to be removed
 */
async function setBirthdayFeed(attribute) {
  let employees = await getAllEntries();
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
    ddb.update(params, function (err) {
      if (err) {
        console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
      } else {
        console.log(`Refreshed Employee ID: ${employee.id}`);
      }
    });
  });
} // setBirthdayFeed

/*
 * Delete old contract data that is no longer used due to a new JSON data structure.
 */
function deleteUnusedContractData() {
  removeAttribute('contract');
  removeAttribute('prime');
} // deleteUnusedContractData

/**
 * Deletes the clearance expiration date for each employee's clearances.
 */
async function deleteUnusedClearanceExpirationDate() {
  console.log('before call');
  let employees = await getAllEntries();
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
        ddb.update(params, function (err) {
          if (err) {
            console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
          } else {
            console.log(`Refreshed Employee ID: ${employee.id}`);
          }
        });
      }
      hasChanged = false;
    }
  });
} // deleteUnusedClearanceExpirationDate

/**
 * Change wording in level of proficiency for basic.
 */
async function changeWordingForBasicProficiencyLevel() {
  let employees = await getAllEntries();
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
      ddb.update(params, function (err) {
        if (err) {
          console.error('Failed to update basic language proficiency. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Basic language proficiency updated\n  Employee ID: ${employee.id}\n`);
        }
      });
    }
  });
} // changeWordingForBasicProficiencyLevel

/**
 * User chooses an action
 *
 * @return - the user input
 */
function chooseAction() {
  let input;
  let valid;

  let prompt = `ACTIONS - ${STAGE}\n`;
  actions.forEach((item) => {
    prompt += `${item}\n`;
  });
  prompt += `Select an action number [0-${actions.length - 1}]`;

  input = readlineSync.question(`${prompt} `);
  valid = !isNaN(input);
  if (valid) {
    input = parseInt(input);
    if (input < 0 || input > actions.length) {
      valid = false;
    }
  }

  while (!valid) {
    input = readlineSync.question(`\nInvalid Input\n${prompt} `);
    valid = !isNaN(input);
    if (valid) {
      input = parseInt(input);
      if (input < 0 || input > actions.length - 1) {
        valid = false;
      }
    }
  }
  return input;
} // chooseAction

/**
 * Updates Github/Twitter profile information to replace URLs with just usernames.
 */
async function replaceGithubTwitterUrls() {
  let employees = await getAllEntries();
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
      ddb.update(params, function (err) {
        if (err) {
          console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Updated Employee ID: ${employee.id}`);
        }
      });
    }
  });
} // deleteUnusedClearanceExpirationDate

/**
 * Updates awards to have dates if they have no dates, fixing the stuck on activity feed issue.
 * This would be easily portable to expenses if needed.
 */
async function addAwardDates() {
  let employees = await getAllEntries();
  _.forEach(employees, (employee) => {
    let update = false;
    _.forEach(employee.awards, (award, i) => {
      if ([undefined, null].includes(award.dateReceived)) {
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
      ddb.update(params, function (err) {
        if (err) {
          console.error('Unable to update item. Error JSON:', JSON.stringify(err, null, 2));
        } else {
          console.log(`Updated Employee ID: ${employee.id}`);
        }
      });
    }
  });
} // addAwardDates

/**
 * Prompts the user and confirm action
 *
 * @param prompt - the string of the choice the user is confirming
 * @return boolean - if the action was confirmed
 */
function confirmAction(prompt) {
  let input;

  input = readlineSync.question(`\nAre you sure you want to ${prompt}[y/n] `);
  input = input.toLowerCase();

  while (input != 'y' && input != 'yes' && input != 'n' && input != 'no') {
    input = readlineSync.question(`\nInvalid Input\nAre you sure you want to ${prompt} [y/n] `);
    input = input.toLowerCase();
  }
  if (input == 'y' || input == 'yes') {
    return true;
  } else {
    console.log('Action Canceled');
    return false;
  }
} // confirmAction

/**
 * main - action selector
 */
async function main() {
  switch (chooseAction()) {
    case 0:
      break;
    case 1:
      if (confirmAction("set all employee's work status active = 100 (Full Time) or inactive = 0?")) {
        console.log("Setting all employee's work status active = 100 (Full Time) or inactive = 0");
        workStatusActive();
      }
      break;
    case 2:
      if (confirmAction('remove isInactive attribute from all employees?')) {
        console.log('Removing isInactive attribute from all employees');
        removeAttribute('isInactive');
      }
      break;
    case 3:
      if (confirmAction('remove expenseType attribute from all employees?')) {
        console.log('Removing expenseTypes attribute from all employees');
        removeAttribute('expenseTypes');
      }
      break;
    case 4:
      if (confirmAction('Set null birthdayFeed attributes to true?')) {
        console.log('Setting null birthdayFeed attributes to true');
        setBirthdayFeed('birthdayFeed');
      }
      break;
    case 5:
      if (confirmAction('Add years attribute to all employee technologies?')) {
        console.log('Adding years attribute to all employee technologies');
        addYearsToTechnologies();
      }
      break;
    case 6:
      if (confirmAction('Convert jobs to companies (the JSON is structured differently on the job exp tab for v3.3)')) {
        console.log('Converted jobs attribute to companies');
        convertJobsToCompanies();
      }
      break;
    case 7:
      if (confirmAction('7. Remove old BI date structure (AKA make them single dates not ranges)')) {
        console.log('Converted BI date structure to single dates');
        convertBIDates();
      }
      break;
    case 8:
      if (confirmAction('8. Convert existing education entries to updated JSON structure')) {
        console.log('Converted education structure to updated JSON structure');
        convertEducation();
      }
      break;
    case 9:
      if (confirmAction('9. Remove old degrees attribute from database')) {
        console.log('Removed old degrees attribute from database');
        deleteDegreesAtrribute();
      }
      break;
    case 10:
      if (confirmAction('10. Remove unused contract data left from old JSON structure')) {
        console.log('Removed unused contract data left from old JSON structure');
        deleteUnusedContractData();
      }
      break;
    case 11:
      if (confirmAction('11. Migrate phoneNumber attribute to private phone number array column')) {
        console.log('Migrated phoneNumber attribute to private phone number array column.');
        migratePhoneNumbers();
      }
      break;
    case 12:
      if (confirmAction('12. Remove phoneNumber attribute from database')) {
        console.log('`phoneNumber` attribute removed from the database.');
        removePhoneNumberAttribute();
      }
      break;
    case 13:
      if (confirmAction('13. Remove unused clearance expiration date left from old JSON structure')) {
        console.log('Removed unused clearance expiration date left from old JSON structure');
        deleteUnusedClearanceExpirationDate();
      }
      break;
    case 14:
      if (confirmAction('14. Change wording in level of proficiency for basic')) {
        console.log('Changed wording in level of proficiency for basic');
        changeWordingForBasicProficiencyLevel();
      }
      break;
    case 15:
      if (confirmAction('15. Update Github/Twitter profile URLs to just names')) {
        console.log('Updated Github/Twitter proflie URLs to just names');
        replaceGithubTwitterUrls();
      }
      break;
    case 17:
      if (confirmAction('17. Update awards with no dates to have dates')) {
        console.log('Updated dateless awards to have a date');
        addAwardDates();
      }
      break;
    default:
      throw new Error('Invalid Action Number');
  }
} // main

main();
