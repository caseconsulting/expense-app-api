import * as crud from './crudAuditQueries';
import * as notif from './notifAuditQueries';

// Exports queries bundled together in separate objects. Note that utils is intentionally not included
module.exports = {
  CrudAuditQueries: crud,
  NotifAuditQueries: notif
};
