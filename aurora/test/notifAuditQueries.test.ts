import { expect, test } from '@jest/globals';
import { SqlParameter } from '@aws-sdk/client-rds-data';

import { db } from '../src';
import { NotificationAudit, NotificationReason } from '../src/models';
import { fixTimeString } from './utils';

test('NotificationAudit.asInsertable without date', () => {
  const employee = { id: 'receiver-uuid' };
  const notif = new NotificationAudit(
    1,
    undefined,
    employee.id,
    'email@email.com',
    NotificationReason.monthly_timesheet_reminder
  );

  const query = db.insertInto('notifications').values(notif.asInsertable).returning('id').compile();

  expect(query.sql).toEqual(
    'insert into "notifications" ("receiver_id", "sent_to", "reason") values (:0, :1, :2::notification_reason) returning "id"'
  );

  expect(query.parameters).toEqual([
    { name: '0', value: { stringValue: employee.id }, typeHint: 'UUID' },
    { name: '1', value: { stringValue: notif.sentTo } },
    { name: '2', value: { stringValue: notif.reason } }
  ] as SqlParameter[]);
});

test('NotificationAudit.asInsertable with date', () => {
  const employee = { id: 'receiver-uuid' };
  const notif = new NotificationAudit(
    1,
    new Date(),
    employee.id,
    'email@email.com',
    NotificationReason.monthly_timesheet_reminder
  );

  const query = db.insertInto('notifications').values(notif.asInsertable).returning('id').compile();

  expect(query.sql).toEqual(
    'insert into "notifications" ("created_at", "receiver_id", "sent_to", "reason") values (:0, :1, :2, :3::notification_reason) returning "id"'
  );

  expect(query.parameters).toEqual([
    { name: '0', value: { stringValue: fixTimeString(notif.createdAt) }, typeHint: 'TIMESTAMP' },
    { name: '1', value: { stringValue: employee.id }, typeHint: 'UUID' },
    { name: '2', value: { stringValue: notif.sentTo } },
    { name: '3', value: { stringValue: notif.reason } }
  ] as SqlParameter[]);
});
