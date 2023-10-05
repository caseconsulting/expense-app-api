// eslint-disable-next-line max-len
// https://developers.adp.com/build/api-explorer/hcm-offrg-wfn/hcm-offrg-wfn-hr-workers-business-communication-management-v2-workers-business-communication-management?operation=POST%2Fevents%2Fhr%2Fv1%2Fworker.business-communication.email.change
/**
 * Returns the data needed to update an ADP work email.
 *
 * @param {String} associateOID - The ADP worker AOID
 * @param {String} workEmailUri - The ADP work email uri
 * @returns Object - Data for the work email
 */
function getADPWorkEmailDataTemplate(associateOID, workEmailUri) {
  return _getADPRequestTemplate(associateOID, {
    businessCommunication: {
      email: {
        emailUri: workEmailUri
      }
    }
  });
} // getADPWorkEmailDataTemplate

// eslint-disable-next-line max-len
// https://developers.adp.com/build/api-explorer/hcm-offrg-wfn/hcm-offrg-wfn-hr-workers-personal-communication-management-v2-workers-personal-communication-management?operation=POST%2Fevents%2Fhr%2Fv1%2Fworker.personal-communication.email.add
/**
 * Returns the data needed to update an ADP personal email.
 *
 * @param {String} associateOID - The ADP worker AOID
 * @param {String} personalEmailUri - The ADP work email uri
 * @returns Object - Data for the personal email
 */
function getADPPersonalEmailDataTemplate(associateOID, personalEmailUri) {
  return _getADPRequestTemplate(associateOID, {
    person: {
      communication: {
        email: {
          emailUri: personalEmailUri
        }
      }
    }
  });
} // getADPPersonalEmailDataTemplate

// eslint-disable-next-line max-len
// https://developers.adp.com/build/api-explorer/hcm-offrg-wfn/hcm-offrg-wfn-hr-workers-personal-communication-management-v2-workers-personal-communication-management?operation=POST%2Fevents%2Fhr%2Fv1%2Fworker.personal-communication.landline.add
/**
 * Returns the data needed to update an ADP landline (home) phone number.
 *
 * @param {String} associateOID - The ADP worker AOID
 * @param {Object} landline - The landline object
 * @returns Object - Data for the landline
 */
function getADPLandlineDataTemplate(associateOID, landline) {
  return _getADPRequestTemplate(associateOID, {
    person: {
      communication: {
        landline
      }
    }
  });
} // getADPLandlineDataTemplate

// eslint-disable-next-line max-len
// https://developers.adp.com/build/api-explorer/hcm-offrg-wfn/hcm-offrg-wfn-hr-workers-personal-communication-management-v2-workers-personal-communication-management?operation=POST%2Fevents%2Fhr%2Fv1%2Fworker.personal-communication.mobile.add
/**
 * Returns the data needed to update an ADP mobile phone number.
 *
 * @param {String} associateOID - The ADP worker AOID
 * @param {Object} mobilePhone - The mobile phone object
 * @returns Object - Data for the mobile phone number
 */
function getADPMobilePhoneDataTemplate(associateOID, mobilePhone) {
  return _getADPRequestTemplate(associateOID, {
    person: {
      communication: {
        mobile: mobilePhone
      }
    }
  });
} // getADPMobilePhoneDataTemplate

// eslint-disable-next-line max-len
//https://developers.adp.com/build/api-explorer/hcm-offrg-wfn/hcm-offrg-wfn-hr-workers-personal-communication-management-v2-workers-personal-communication-management?operation=POST%2Fevents%2Fhr%2Fv1%2Fworker.legal-address.add
/**
 * Returns the data needed to update an ADP legal address.
 *
 * @param {String} associateOID - The ADP worker AOID
 * @param {Object} legalAddress - The legal address (street address, city, state, ZIP)
 * @returns
 */
function getADPLegalAddressDataTemplate(associateOID, legalAddress) {
  return _getADPRequestTemplate(associateOID, {
    person: {
      legalAddress
    }
  });
} // getADPLegalAddressDataTemplate

/**
 * Returns the entire data template used for updating a worker field in ADP.
 *
 * @param {String} aOID - The ADP worker AOID
 * @param {Object} data - The data field to update
 * @returns Object - The entire data template to update an ADP worker
 */
function _getADPRequestTemplate(aOID, data) {
  return {
    events: [
      {
        data: {
          eventContext: {
            worker: {
              associateOID: aOID
            }
          },
          transform: {
            worker: {
              ...data
            }
          }
        }
      }
    ]
  };
} // _getADPRequestTemplate

module.exports = {
  getADPWorkEmailDataTemplate,
  getADPPersonalEmailDataTemplate,
  getADPLandlineDataTemplate,
  getADPMobilePhoneDataTemplate,
  getADPLegalAddressDataTemplate
};
