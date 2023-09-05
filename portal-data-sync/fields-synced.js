const { APPLICATIONS } = require('./fields-shared');
const getters = require('./getters');
const modifiers = require('./modifiers');
const empty = require('./empty');

// FIELD CONSTANTS
const EMPLOYEE_NUMBER = {
  name: 'Employee Number',
  [APPLICATIONS.CASE]: 'employeeNumber',
  [APPLICATIONS.BAMBOO]: 'employeeNumber',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
// FIELD CONSTANTS
const EMAIL = {
  name: 'Email',
  [APPLICATIONS.CASE]: 'email',
  [APPLICATIONS.BAMBOO]: 'workEmail',
  [APPLICATIONS.ADP]: 'businessCommunication.emails[0]',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const FIRST_NAME = {
  name: 'First Name',
  [APPLICATIONS.CASE]: 'firstName',
  [APPLICATIONS.BAMBOO]: 'firstName',
  [APPLICATIONS.ADP]: 'person.legalName.givenName',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const MIDDLE_NAME = {
  name: 'Middle Name',
  [APPLICATIONS.CASE]: 'middleName',
  [APPLICATIONS.BAMBOO]: 'middleName',
  [APPLICATIONS.ADP]: 'person.legalName.middleName',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const LAST_NAME = {
  name: 'Last Name',
  [APPLICATIONS.CASE]: 'lastName',
  [APPLICATIONS.BAMBOO]: 'lastName',
  [APPLICATIONS.ADP]: 'person.legalName.familyName1',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const NICKNAME = {
  name: 'Nickname',
  [APPLICATIONS.CASE]: 'nickname',
  [APPLICATIONS.BAMBOO]: 'preferredName',
  [APPLICATIONS.ADP]: 'person.legalName.nickName',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const CURRENT_STREET = {
  name: 'Current Street',
  [APPLICATIONS.CASE]: 'currentStreet',
  [APPLICATIONS.BAMBOO]: 'address1',
  [APPLICATIONS.ADP]: 'person.legalAddress.lineOne',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const CURRENT_CITY = {
  name: 'Current City',
  [APPLICATIONS.CASE]: 'currentCity',
  [APPLICATIONS.BAMBOO]: 'city',
  [APPLICATIONS.ADP]: 'person.legalAddress.cityName',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const CURRENT_STATE = {
  name: 'Current State',
  [APPLICATIONS.CASE]: 'currentState',
  [APPLICATIONS.BAMBOO]: 'state',
  [APPLICATIONS.ADP]: 'person.legalAddress.countrySubdivisionLevel1.codeValue', // must be abbreviate (VA, MD)
  getter: getters.getState,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const CURRENT_ZIP = {
  name: 'Current ZIP',
  [APPLICATIONS.CASE]: 'currentZIP',
  [APPLICATIONS.BAMBOO]: 'zipcode',
  [APPLICATIONS.ADP]: 'person.legalAddress.postalCode',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const HOME_PHONE = {
  name: 'Home Phone',
  [APPLICATIONS.CASE]: 'privatePhoneNumbers',
  [APPLICATIONS.BAMBOO]: 'homePhone',
  [APPLICATIONS.ADP]: 'person.communication.landlines[0]',
  getter: getters.getPhone,
  isEmpty: empty.isPhoneEmpty,
  updateValue: modifiers.updatePhone
};
const MOBILE_PHONE = {
  name: 'Mobile Phone',
  [APPLICATIONS.CASE]: 'privatePhoneNumbers',
  [APPLICATIONS.BAMBOO]: 'mobilePhone',
  [APPLICATIONS.ADP]: 'person.communication.mobiles[0]',
  getter: getters.getPhone,
  isEmpty: empty.isPhoneEmpty,
  updateValue: modifiers.updatePhone
};
const WORK_PHONE = {
  name: 'Work Phone',
  [APPLICATIONS.CASE]: 'privatePhoneNumbers',
  [APPLICATIONS.BAMBOO]: 'workPhone',
  getter: getters.getPhone,
  isEmpty: empty.isPhoneEmpty,
  updateValue: modifiers.updatePhone
};
const WORK_PHONE_EXT = {
  name: 'Work Phone Ext',
  [APPLICATIONS.CASE]: 'privatePhoneNumbers',
  [APPLICATIONS.BAMBOO]: 'workPhoneExtension',
  getter: getters.getPhoneExt,
  isEmpty: empty.isPhoneExtEmpty,
  updateValue: modifiers.updatePhone,
  extra: WORK_PHONE
};
const DATE_OF_BIRTH = {
  name: 'Date Of Birth',
  [APPLICATIONS.CASE]: 'birthday',
  [APPLICATIONS.BAMBOO]: 'dateOfBirth',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const GENDER = {
  name: 'Gender',
  [APPLICATIONS.CASE]: 'eeoGender',
  [APPLICATIONS.BAMBOO]: 'gender',
  getter: getters.getGender,
  isEmpty: empty.isEEOEmpty,
  updateValue: modifiers.updateValue
};
const ETHNICITY = {
  name: 'Ethnicity',
  [APPLICATIONS.CASE]: 'eeoRaceOrEthnicity',
  [APPLICATIONS.BAMBOO]: 'ethnicity',
  getter: getters.getEthnicity,
  isEmpty: empty.isEEOEmpty,
  updateValue: modifiers.updateEthnicity
};
const DISABILITY = {
  name: 'Disability',
  [APPLICATIONS.CASE]: 'eeoHasDisability',
  [APPLICATIONS.BAMBOO]: 'customDisability',
  getter: getters.getDisability,
  isEmpty: empty.isEEOEmpty,
  updateValue: modifiers.updateValue,
  type: Boolean
};
const VETERAN_STATUS = {
  name: 'Veteran Status',
  [APPLICATIONS.CASE]: 'eeoIsProtectedVeteran',
  [APPLICATIONS.BAMBOO]: '4001', // no alias for the field, use id
  getter: getters.getVeteranStatus,
  isEmpty: empty.isEEOEmpty,
  updateValue: modifiers.updateValue,
  type: Boolean
};
const HIRE_DATE = {
  name: 'Hire Date',
  [APPLICATIONS.CASE]: 'hireDate',
  [APPLICATIONS.BAMBOO]: 'hireDate',
  [APPLICATIONS.ADP]: 'workerDates.originalHireDate',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const WORK_STATUS = {
  name: 'Work Status',
  [APPLICATIONS.CASE]: 'workStatus',
  [APPLICATIONS.BAMBOO]: 'employmentHistoryStatus',
  [APPLICATIONS.ADP]: 'workerStatus.statusCode.codeValue',
  getter: getters.getWorkStatus,
  isEmpty: empty.isWorkStatusEmpty,
  updateValue: modifiers.updateValue
};
const TWITTER = {
  name: 'Twitter',
  [APPLICATIONS.CASE]: 'twitter',
  [APPLICATIONS.BAMBOO]: 'twitterFeed',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};
const LINKEDIN = {
  name: 'LinkedIn',
  [APPLICATIONS.CASE]: 'linkedIn',
  [APPLICATIONS.BAMBOO]: 'linkedIn',
  getter: getters.getFieldValue,
  isEmpty: empty.isEmpty,
  updateValue: modifiers.updateValue
};

const FIELDS = [
  EMPLOYEE_NUMBER,
  EMAIL,
  FIRST_NAME,
  MIDDLE_NAME,
  LAST_NAME,
  NICKNAME,
  CURRENT_STREET,
  CURRENT_CITY,
  CURRENT_STATE,
  CURRENT_ZIP,
  TWITTER,
  LINKEDIN,
  HIRE_DATE,
  HOME_PHONE,
  WORK_PHONE,
  MOBILE_PHONE,
  WORK_PHONE_EXT,
  DISABILITY,
  VETERAN_STATUS,
  GENDER,
  ETHNICITY,
  DATE_OF_BIRTH,
  WORK_STATUS
];

module.exports = {
  EMPLOYEE_NUMBER,
  EMAIL,
  FIRST_NAME,
  MIDDLE_NAME,
  LAST_NAME,
  NICKNAME,
  CURRENT_STREET,
  CURRENT_CITY,
  CURRENT_STATE,
  CURRENT_ZIP,
  TWITTER,
  LINKEDIN,
  HIRE_DATE,
  HOME_PHONE,
  WORK_PHONE,
  MOBILE_PHONE,
  WORK_PHONE_EXT,
  DISABILITY,
  VETERAN_STATUS,
  GENDER,
  ETHNICITY,
  DATE_OF_BIRTH,
  WORK_STATUS,
  FIELDS
};
