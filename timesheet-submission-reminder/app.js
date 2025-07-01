/////////////////////////////////////////////////////////////
// READ NOTE ABOVE TEST_EMPLOYEE_NUMBERS BEFORE DEVELOPING //
/////////////////////////////////////////////////////////////

const _filter = require('lodash/filter');
const _find = require('lodash/find');
const _map = require('lodash/map');

const { SNSClient, ListPhoneNumbersOptedOutCommand, PublishCommand } = require('@aws-sdk/client-sns');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const { _isCaseReminderDay, _shouldSendCaseEmployeeReminder } = require('./case-helpers.js');
const { asyncForEach } = require('utils');
const { getTodaysDate } = require('dateUtils');
const { AuroraClient } = require('auroraClient');
/** @type import('../models/audits/notification.js') */
const { NotificationAudit, NotificationReason } = require('notificationAudit');

const dbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbClient);
const snsClient = new SNSClient({});
/** @type import('../js/aurora/auroraClient.js').AuroraClient */
const auroraClient = new AuroraClient();
const STAGE = process.env.STAGE;

// only use your own employee number or people you know (don't send messages to random people/employees)
// make sure the phone number attached to the employee number is your own number
const TEST_EMPLOYEE_NUMBERS = [];

/**
 * Start of the timesheet submission reminder process.
 *
 * @param {Number} day - 1 or 2, 1 being first reminder day 2 being second reminder day
 * @returns Array - The array from employee numbers to send reminders to
 */
async function start(day) {
  let employeesReminded = [];
  let portalEmployees = await _getPortalEmployees();
  let portalContracts = await _getPortalContracts();
  await _manageEmployeesOptOutList(portalEmployees);

  let isCaseReminderDay = _isCaseReminderDay(day);
  if (isCaseReminderDay.any) {
    await asyncForEach(portalEmployees, async (e) => {
      try {
        let shouldSendReminder = await _shouldSendCaseEmployeeReminder(e, isCaseReminderDay, portalContracts);
        if (shouldSendReminder) {
          _sendReminder(e, isCaseReminderDay);
          employeesReminded.push(e.employeeNumber);
        }
      } catch (err) {
        console.log(`An error occurred for employee number ${e.employeeNumber}: ${JSON.stringify(err)}`);
      }
    });

    return employeesReminded;
  }
} // start

/**
 * Gets the portal employees objects.
 *
 * @returns Array - The array of portal employees
 */
async function _getPortalEmployees() {
  try {
    const basicCommand = new ScanCommand({
      ProjectionExpression:
        'id, employeeNumber, publicPhoneNumbers, workStatus, hireDate, cykAoid, timesheetReminders, contracts',
      TableName: `${STAGE}-employees`
    });

    const sensitiveCommand = new ScanCommand({
      ProjectionExpression: 'id, privatePhoneNumbers',
      TableName: `${STAGE}-employees-sensitive`
    });

    const [basicEmployees, sensitiveEmployees] = await Promise.all([
      docClient.send(basicCommand),
      docClient.send(sensitiveCommand)
    ]);

    // merge and organize data
    let employees = _map(basicEmployees.Items, (basicEmployee) => {
      let sensitiveEmployee = _find(sensitiveEmployees.Items, (e) => e.id === basicEmployee.id);
      let phoneNumbers = [
        ...(basicEmployee.publicPhoneNumbers || []),
        ...(sensitiveEmployee.privatePhoneNumbers || [])
      ];
      let phone = _find(phoneNumbers, (p) => p.type === 'Cell');
      let phoneNumber = _getSMSPhoneNumber(phone);
      let isOptedOut = phone?.smsOptedOut;
      return {
        ...basicEmployee,
        ...sensitiveEmployee,
        phoneNumber,
        isOptedOut
      };
    });

    // get only active employees
    employees = _filter(employees, (e) => e.workStatus > 0);
    console.log('Successfully retrieved Portal employees');
    return employees;
  } catch (err) {
    console.log(`Failed to get Portal employees with error: ${JSON.stringify(err)}`);
    return err;
  }
} // _getPortalEmployees

/**
 * Gets the portal contract objects.
 *
 * @returns Array - The array of portal contracts
 */
async function _getPortalContracts() {
  try {
    const basicCommand = new ScanCommand({
      ProjectionExpression: 'id, contractName, #ddb_status, settings',
      TableName: `${STAGE}-contracts`,
      ExpressionAttributeNames: { '#ddb_status': 'status' }
    });

    let contracts = await docClient.send(basicCommand);

    // get only active contracts and make them an O(1) indexable object
    let contractsObj = {};
    for (let contract of contracts.Items) {
      if (contract.status === 'active') {
        contractsObj[contract.id] = contract;
      }
    }
    console.log('Successfully retrieved Portal contracts');
    return contractsObj;
  } catch (err) {
    console.log(`Failed to get Portal contracts with error: ${JSON.stringify(err)}`);
    return err;
  }
} // _getPortalContracts

/**
 * Logs that a message was sent to an employee
 *
 * @param {*} employee The entire employee object to whom the message was sent
 * @param {'month' | 'week'} type The type of reminder that was sent
 */
async function _logMessageReminder(employee, type) {
  // fetch old timesheetReminders array from employee (or make new empty one)
  let newTimesheetReminders = employee.timesheetReminders ?? [];

  // add on the current reminder log
  newTimesheetReminders.push({
    timestamp: getTodaysDate('YYYY-MM-DD HH:mm'),
    phoneNumber: employee.phoneNumber
  });

  // make a new employee for submitting to DB
  let newEmployeeObject = {
    ...employee,
    timesheetReminders: newTimesheetReminders
  };

  // return the result of updating the attribute
  let attribute = 'timesheetReminders';
  let tableName = `${STAGE}-employees`;
  await _updateAttributeInDB(newEmployeeObject, attribute, tableName);

  // audit in aurora database
  const reason = type == 'month' ? NotificationReason.MONTHLY_TIME_REMINDER : NotificationReason.WEEKLY_TIME_REMINDER;
  const notifAudit = NotificationAudit.toCreate(new Date(), employee.id, employee.phoneNumber, reason);

  try {
    const response = await auroraClient.send(notifAudit.buildCreateCommand());
    console.log('Logged audit to aurora. Response:', JSON.stringify(response));
  } catch (err) {
    console.log('Error logging audit to aurora:', err);
  }
} // _logMessageReminder

/**
 * Formats a phone number from how it is stored in the portal, to SMS format.
 *
 * @param {String} phone - The Portal formatted phone number
 * @returns - The SMS formatted phone number
 */
function _getSMSPhoneNumber(phone) {
  return phone?.number ? `+1${phone.number?.replace(/-/g, '')}` : null;
} // _getSMSPhoneNumber

/**
 * Gets the list of opted out phone numbers, and updates an employees phone number object to be opted-out
 * if they are listed as opted-in. This essentially serves as a data sync.
 *
 * @param {Array} portalEmployees - The array of portal employee objects
 */
async function _manageEmployeesOptOutList(portalEmployees) {
  const command = new ListPhoneNumbersOptedOutCommand({});
  const response = await snsClient.send(command);
  let promises = [];

  portalEmployees.forEach(async (e) => {
    let pubNum = _find(e.publicPhoneNumbers, (phone) => response?.phoneNumbers?.includes(_getSMSPhoneNumber(phone)));
    let privNum = _find(e.privatePhoneNumbers, (phone) => response?.phoneNumbers?.includes(_getSMSPhoneNumber(phone)));

    if (pubNum && !pubNum.smsOptedOut) {
      pubNum.smsOptedOut = true;
      e.isOptedOut = true;
      promises.push(_updateAttributeInDB(e, 'publicPhoneNumbers', `${STAGE}-employees`));
    } else if (privNum && !privNum.smsOptedOut) {
      privNum.smsOptedOut = true;
      e.isOptedOut = true;
      promises.push(_updateAttributeInDB(e, 'privatePhoneNumbers', `${STAGE}-employees-sensitive`));
    }
  });

  if (promises.length > 0) await Promise.all(promises);
  console.log('Successfully managed employees opt out list');
} // _manageEmployeesOptOutList

/**
 * Sends an SMS reminder to an employee.
 *
 * @param {Object} employee - The employee to send a reminder to
 * @param {Object} isCaseReminderDay - result of _isCaseReminderDay() to decide which message to send
 * @returns Object - The SNS client response
 */
async function _sendReminder(employee, isCaseReminderDay) {
  // decide on reminder text based on type of reminder being sent
  let reminders = {
    week:
      'CASE Alerts: Your contract requires time entries to be submitted each week. ' +
      'Please log into QuickBooks and complete your time entries for this week as soon as possible.',
    month:
      'This is a reminder that you have not met the minimum hour requirement for this month. ' +
      'Please be sure to enter and submit your hours as soon as possible to keep payroll running smoothly.'
  };
  const type = isCaseReminderDay.monthly ? 'month' : 'week';
  let reminderText = reminders[type];

  try {
    if (STAGE === 'prod' || (STAGE !== 'prod' && TEST_EMPLOYEE_NUMBERS.includes(employee.employeeNumber))) {
      if (!employee.phoneNumber) {
        console.log(employee.phoneNumber);
        throw { message: `Phone number does not exist for employee number ${employee.employeeNumber}` };
      }
      if (employee.isOptedOut) {
        console.log(`Employee number ${employee.employeeNumber} has opted-out of receiving text messages`);
        return;
      }

      let publishCommand = new PublishCommand({
        PhoneNumber: employee.phoneNumber,
        Message: reminderText
      });

      console.log(`Attempting to send message to employee number ${employee.employeeNumber}`);
      let resp = await snsClient.send(publishCommand);
      console.log(`Successfully sent text message to employee number ${employee.employeeNumber}`);

      console.log(`Logging that message was sent to employee number ${employee.employeeNumber}`);
      await _logMessageReminder(employee, type);
      console.log(`Successfully logged that message was sent to employee number ${employee.employeeNumber}`);
      return resp;
    }
  } catch (err) {
    console.log(
      `Failed to send text message to employee number ${employee.employeeNumber}. Error: ${JSON.stringify(err)}`
    );
    return err;
  }
} // _sendReminder

/**
 * Updates an entry in the dynamodb table.
 *
 * @param dynamoObj - new object to update dynamodb entry to
 * @param attribute - attribute that will be updated
 * @param tableName - name of table in which the dynamoObj is in
 * @return Object - object updated in dynamodb
 */
async function _updateAttributeInDB(dynamoObj, attribute, tableName) {
  let params = { TableName: tableName, Key: { id: dynamoObj.id } };
  if (dynamoObj[attribute]) {
    params['UpdateExpression'] = `set ${attribute} = :a`;
    params['ExpressionAttributeValues'] = { ':a': dynamoObj[attribute] };
  } else {
    params['UpdateExpression'] = `remove ${attribute}`;
  }

  const updateCommand = new UpdateCommand(params);
  try {
    let retVal = await docClient.send(updateCommand);
    console.log(`Successfully updated entry attribute ${attribute} in ${tableName} with ID ${dynamoObj.id}`);
    return retVal;
  } catch (err) {
    // log error
    console.log(`Failed to update entry attribute ${attribute} in ${tableName} with ID ${dynamoObj.id}`);

    // throw error
    return err;
  }
} // updateEntryInDB

/**
 * Lambda function entrypoint
 *
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *          https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 */
async function handler(event) {
  try {
    console.log(`Handler Event: ${JSON.stringify(event)}`);
    // only send reminders on last work day at 8pm
    // only send reminders on day after last work day at 7am and 4pm
    let resourceArr = event.resources?.[0]?.split('-');
    let reminderDay = Number(resourceArr?.[resourceArr.length - 1]);
    return await start(reminderDay);
  } catch (err) {
    return err;
  }
}

module.exports = { handler };
