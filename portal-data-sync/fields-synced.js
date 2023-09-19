const { APPLICATIONS } = require('./fields-shared');
const {
  getADPWorkEmailDataTemplate,
  getADPPersonalEmailDataTemplate,
  getADPLandlineDataTemplate,
  getADPMobilePhoneDataTemplate,
  getADPLegalAddressDataTemplate
} = require('./adp-templates');
const Getters = require('./getters');
const Modifiers = require('./modifiers');
const Empty = require('./empty');

const EMPLOYEE_NUMBER = {
  name: 'Employee Number',
  [APPLICATIONS.CASE]: 'employeeNumber',
  [APPLICATIONS.BAMBOO]: 'employeeNumber',
  [APPLICATIONS.ADP]: 'customFieldGroup.stringFields[0].stringValue',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

const WORK_EMAIL = {
  name: 'Work Email',
  [APPLICATIONS.CASE]: 'email',
  [APPLICATIONS.BAMBOO]: 'workEmail',
  [APPLICATIONS.ADP]: 'businessCommunication.emails[0].emailUri',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue,
  adpUpdatePath: '/events/hr/v1/worker.business-communication.email.change',
  adpUpdateDataTemplate: getADPWorkEmailDataTemplate
};

const PERSONAL_EMAIL = {
  name: 'Personal Email',
  [APPLICATIONS.BAMBOO]: 'homeEmail',
  //[APPLICATIONS.ADP]: 'person.communication.emails[0].emailUri',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue,
  adpUpdatePath: '/events/hr/v1/worker.personal-communication.email.change',
  adpUpdateDataTemplate: getADPPersonalEmailDataTemplate
};

const FIRST_NAME = {
  name: 'First Name',
  [APPLICATIONS.CASE]: 'firstName',
  [APPLICATIONS.BAMBOO]: 'firstName',
  //[APPLICATIONS.ADP]: 'person.legalName.givenName',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

const MIDDLE_NAME = {
  name: 'Middle Name',
  [APPLICATIONS.CASE]: 'middleName',
  [APPLICATIONS.BAMBOO]: 'middleName',
  //[APPLICATIONS.ADP]: 'person.legalName.middleName',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

const LAST_NAME = {
  name: 'Last Name',
  [APPLICATIONS.CASE]: 'lastName',
  [APPLICATIONS.BAMBOO]: 'lastName',
  //[APPLICATIONS.ADP]: 'person.legalName.familyName1',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

const NICKNAME = {
  name: 'Nickname',
  [APPLICATIONS.CASE]: 'nickname',
  [APPLICATIONS.BAMBOO]: 'preferredName',
  //[APPLICATIONS.ADP]: 'person.legalName.nickName',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

const CURRENT_STREET = {
  name: 'Current Street',
  [APPLICATIONS.CASE]: 'currentStreet',
  [APPLICATIONS.BAMBOO]: 'address1',
  [APPLICATIONS.ADP]: 'person.legalAddress.lineOne',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue,
  adpUpdatePath: '/events/hr/v1/worker.legal-address.change',
  adpUpdateDataTemplate: getADPLegalAddressDataTemplate,
  fieldType: 'Address'
};

const CURRENT_STREET_2 = {
  name: 'Current Street 2',
  [APPLICATIONS.CASE]: 'currentStreet2',
  [APPLICATIONS.BAMBOO]: 'address2',
  [APPLICATIONS.ADP]: 'person.legalAddress.lineTwo',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue,
  adpUpdatePath: '/events/hr/v1/worker.legal-address.change',
  adpUpdateDataTemplate: getADPLegalAddressDataTemplate,
  fieldType: 'Address'
};

const CURRENT_CITY = {
  name: 'Current City',
  [APPLICATIONS.CASE]: 'currentCity',
  [APPLICATIONS.BAMBOO]: 'city',
  [APPLICATIONS.ADP]: 'person.legalAddress.cityName',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue,
  adpUpdatePath: '/events/hr/v1/worker.legal-address.change',
  adpUpdateDataTemplate: getADPLegalAddressDataTemplate,
  fieldType: 'Address'
};

const CURRENT_STATE = {
  name: 'Current State',
  [APPLICATIONS.CASE]: 'currentState',
  [APPLICATIONS.BAMBOO]: 'state',
  [APPLICATIONS.ADP]: 'person.legalAddress.countrySubdivisionLevel1.codeValue', // must be abbreviate (VA, MD)
  getter: Getters.getState,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue,
  adpUpdatePath: '/events/hr/v1/worker.legal-address.change',
  adpUpdateDataTemplate: getADPLegalAddressDataTemplate,
  fieldType: 'Address'
};

const CURRENT_ZIP = {
  name: 'Current ZIP',
  [APPLICATIONS.CASE]: 'currentZIP',
  [APPLICATIONS.BAMBOO]: 'zipcode',
  [APPLICATIONS.ADP]: 'person.legalAddress.postalCode',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue,
  adpUpdatePath: '/events/hr/v1/worker.legal-address.change',
  adpUpdateDataTemplate: getADPLegalAddressDataTemplate,
  fieldType: 'Address'
};

const HOME_PHONE = {
  name: 'Home Phone',
  [APPLICATIONS.CASE]: 'privatePhoneNumbers',
  [APPLICATIONS.BAMBOO]: 'homePhone',
  [APPLICATIONS.ADP]: 'person.communication.landlines[0]',
  getter: Getters.getPhone,
  isEmpty: Empty.isPhoneEmpty,
  updateValue: Modifiers.updatePhone,
  adpUpdatePath: '/events/hr/v1/worker.personal-communication.landline.change',
  adpUpdateDataTemplate: getADPLandlineDataTemplate,
  phoneType: 'Home' // used for the Portal
};

const MOBILE_PHONE = {
  name: 'Mobile Phone',
  [APPLICATIONS.CASE]: 'privatePhoneNumbers',
  [APPLICATIONS.BAMBOO]: 'mobilePhone',
  [APPLICATIONS.ADP]: 'person.communication.mobiles[0]',
  getter: Getters.getPhone,
  isEmpty: Empty.isPhoneEmpty,
  updateValue: Modifiers.updatePhone,
  adpUpdatePath: '/events/hr/v1/worker.personal-communication.mobile.change',
  adpUpdateDataTemplate: getADPMobilePhoneDataTemplate,
  phoneType: 'Cell' // used for the Portal
};

const WORK_PHONE = {
  name: 'Work Phone',
  [APPLICATIONS.CASE]: 'privatePhoneNumbers',
  [APPLICATIONS.BAMBOO]: 'workPhone',
  getter: Getters.getPhone,
  isEmpty: Empty.isPhoneEmpty,
  updateValue: Modifiers.updatePhone,
  phoneType: 'Work' // used for the Portal
};

const WORK_PHONE_EXT = {
  name: 'Work Phone Ext',
  [APPLICATIONS.CASE]: 'privatePhoneNumbers',
  [APPLICATIONS.BAMBOO]: 'workPhoneExtension',
  getter: Getters.getPhoneExt,
  isEmpty: Empty.isPhoneExtEmpty,
  updateValue: Modifiers.updatePhone,
  extra: WORK_PHONE,
  phoneType: 'Work' // used for the Portal
};

const DATE_OF_BIRTH = {
  name: 'Date Of Birth',
  [APPLICATIONS.CASE]: 'birthday',
  [APPLICATIONS.BAMBOO]: 'dateOfBirth',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

const GENDER = {
  name: 'Gender',
  [APPLICATIONS.CASE]: 'eeoGender',
  [APPLICATIONS.BAMBOO]: 'gender',
  getter: Getters.getGender,
  isEmpty: Empty.isEEOEmpty,
  updateValue: Modifiers.updateValue
};

const ETHNICITY = {
  name: 'Ethnicity',
  [APPLICATIONS.CASE]: 'eeoRaceOrEthnicity',
  [APPLICATIONS.BAMBOO]: 'ethnicity',
  getter: Getters.getEthnicity,
  isEmpty: Empty.isEEOEmpty,
  updateValue: Modifiers.updateEthnicity
};

const DISABILITY = {
  name: 'Disability',
  [APPLICATIONS.CASE]: 'eeoHasDisability',
  [APPLICATIONS.BAMBOO]: 'customDisability',
  getter: Getters.getDisability,
  isEmpty: Empty.isEEOEmpty,
  updateValue: Modifiers.updateValue,
  type: Boolean
};

const VETERAN_STATUS = {
  name: 'Veteran Status',
  [APPLICATIONS.CASE]: 'eeoIsProtectedVeteran',
  [APPLICATIONS.BAMBOO]: '4001', // no alias for the field, use id
  getter: Getters.getVeteranStatus,
  isEmpty: Empty.isEEOEmpty,
  updateValue: Modifiers.updateValue,
  type: Boolean
};

const HIRE_DATE = {
  name: 'Hire Date',
  [APPLICATIONS.CASE]: 'hireDate',
  [APPLICATIONS.BAMBOO]: 'hireDate',
  //[APPLICATIONS.ADP]: 'workerDates.originalHireDate',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

const WORK_STATUS = {
  name: 'Work Status',
  [APPLICATIONS.CASE]: 'workStatus',
  [APPLICATIONS.BAMBOO]: 'employmentHistoryStatus',
  //[APPLICATIONS.ADP]: 'workerStatus.statusCode.codeValue',
  getter: Getters.getWorkStatus,
  isEmpty: Empty.isWorkStatusEmpty,
  updateValue: Modifiers.updateValue,
  extra: 'deptDate' // departure date for the Portal
};

const TWITTER = {
  name: 'Twitter',
  [APPLICATIONS.CASE]: 'twitter',
  [APPLICATIONS.BAMBOO]: 'twitterFeed',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

const LINKEDIN = {
  name: 'LinkedIn',
  [APPLICATIONS.CASE]: 'linkedIn',
  [APPLICATIONS.BAMBOO]: 'linkedIn',
  getter: Getters.getFieldValue,
  isEmpty: Empty.isEmpty,
  updateValue: Modifiers.updateValue
};

module.exports = {
  EMPLOYEE_NUMBER,
  WORK_EMAIL,
  PERSONAL_EMAIL,
  FIRST_NAME,
  MIDDLE_NAME,
  LAST_NAME,
  NICKNAME,
  CURRENT_STREET,
  CURRENT_STREET_2,
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
};
