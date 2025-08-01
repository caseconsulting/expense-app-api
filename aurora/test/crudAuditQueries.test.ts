import * as dotenv from 'dotenv';
dotenv.config({ path: '../.env', quiet: true });

import { expect, test } from '@jest/globals';
import { SqlParameter } from '@aws-sdk/client-rds-data';

import { db } from '../src';
import { CrudAudit, DynamoTable, PortalRole } from '../src/models';
import { selectAudits } from '../src/queries/utils';
import { fixTimeString } from './utils';

test('Parse env file', () => {
  expect(process.env.STAGE).toEqual('dev');
});

// largely to ensure that basic package setup is working, and that camelCase plugin is enabled
test('Generic select all on a crud audit without filters', () => {
  const query = db.selectFrom('crudAudits').selectAll().compile();
  expect(query.sql).toEqual('select * from "crud_audits"');
});

// tests utils.selectAudits() on a crud audit, without using crud-specific filters
test('utils.selectAudits() on a crud audit', () => {
  const startDate = new Date('2025-07-20');
  const endDate = new Date('2025-07-27');
  const limit = 5;

  let query = db.selectFrom('crudAudits').selectAll();
  query = selectAudits(query, { limit, startDate, endDate });
  const compiled = query.compile();

  expect(compiled.sql).toEqual(
    'select * from "crud_audits" where "created_at" between :0 and :1 order by "created_at" desc limit :2'
  );

  expect(compiled.parameters).toEqual([
    { name: '0', value: { stringValue: fixTimeString(startDate) }, typeHint: 'TIMESTAMP' },
    { name: '1', value: { stringValue: fixTimeString(endDate) }, typeHint: 'TIMESTAMP' },
    // kysely-data-api uses rds-data-api's "longValue" for integer values
    { name: '2', value: { longValue: limit } }
  ] as SqlParameter[]);
});

// simulates creating a new employee without supplying a date
test('CrudAudit.asInsertable without date', () => {
  const creator = { id: 'actor-uuid', employeeRole: PortalRole.admin };
  const created = { id: 'receiver-uuid' };
  const table = DynamoTable.employees;

  const audit = new CrudAudit(
    1, // id should always be ignored when creating
    undefined, // undefined should send to database without created_at
    creator.id,
    creator.employeeRole,
    table,
    created.id,
    null,
    created
  );

  const query = db.insertInto('crudAudits').values(audit.asInsertable).returning('id').compile();

  expect(query.sql).toEqual(
    'insert into "crud_audits" ("actor_id", "actor_role", "origin_table", "table_item_id", "old_image", "new_image") values (:0, :1::portal_role, :2::dynamo_table, :3, :4, :5) returning "id"'
  );

  expect(query.parameters).toEqual([
    { name: '0', value: { stringValue: creator.id }, typeHint: 'UUID' },
    { name: '1', value: { stringValue: creator.employeeRole } },
    { name: '2', value: { stringValue: table } },
    { name: '3', value: { stringValue: created.id }, typeHint: 'UUID' },
    { name: '4', value: { isNull: true } },
    { name: '5', value: { stringValue: JSON.stringify(created) }, typeHint: 'JSON' }
  ] as SqlParameter[]);
});

// simulates creating a new employee with a supplied date
test('CrudAudit.asInsertable without date', () => {
  const creator = { id: 'actor-uuid', employeeRole: PortalRole.admin };
  const created = { id: 'receiver-uuid' };
  const table = DynamoTable.employees;

  const audit = new CrudAudit(
    1, // id should always be ignored when creating
    new Date(),
    creator.id,
    creator.employeeRole,
    table,
    created.id,
    null,
    created
  );

  const query = db.insertInto('crudAudits').values(audit.asInsertable).returning('id').compile();

  expect(query.sql).toEqual(
    'insert into "crud_audits" ("actor_id", "created_at", "actor_role", "origin_table", "table_item_id", "old_image", "new_image") values (:0, :1, :2::portal_role, :3::dynamo_table, :4, :5, :6) returning "id"'
  );

  expect(query.parameters).toEqual([
    { name: '0', value: { stringValue: creator.id }, typeHint: 'UUID' },
    { name: '1', value: { stringValue: fixTimeString(audit.createdAt) }, typeHint: 'TIMESTAMP' },
    { name: '2', value: { stringValue: creator.employeeRole } },
    { name: '3', value: { stringValue: table } },
    { name: '4', value: { stringValue: created.id }, typeHint: 'UUID' },
    { name: '5', value: { isNull: true } },
    { name: '6', value: { stringValue: JSON.stringify(created) }, typeHint: 'JSON' }
  ] as SqlParameter[]);
});
