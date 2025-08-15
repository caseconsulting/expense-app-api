// one-time setup for the entire database schema

import { config as dotenv } from 'dotenv';
import { Kysely, sql } from 'kysely';
import { getDb, getLog, initialize } from '../src';
import { wakeUp } from '../src/queries/utilQueries';
import { Database } from '../src/types';

dotenv({ path: '../.env', quiet: true });

// these are initialized in main
let db: Kysely<Database>;
let log: (priority: number, func: string, ...args: any[]) => void;

async function crudAuditSchema() {
  log(5, 'crudAuditSchema', 'Setting up crud audits schema...');

  await db.transaction().execute(async (trx) => {
    await trx.schema
      .createType('dynamo_table')
      .asEnum([
        'budgets',
        'contracts',
        'employees',
        'employees_sensitive',
        'expense_types',
        'expenses',
        'gift_cards',
        'pto_cashouts',
        'tags',
        'timesheets'
      ])
      .execute();

    await trx.schema.createType('portal_role').asEnum(['intern', 'user', 'manager', 'admin']).execute();

    // create the table

    await trx.schema
      .createTable('crud_audits')
      .ifNotExists()
      .addColumn('id', 'bigint', (col) => col.primaryKey().generatedAlwaysAsIdentity())
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addColumn('actor_id', 'uuid', (col) => col.notNull())
      .addColumn('actor_role', sql`portal_role`, (col) => col.notNull())
      .addColumn('origin_table', sql`dynamo_table`, (col) => col.notNull())
      .addColumn('table_item_id', 'uuid', (col) => col.notNull())
      .addColumn('old_image', 'jsonb')
      .addColumn('new_image', 'jsonb')
      .execute();

    // create indexes

    // most queries will be ordered by recent first
    await trx.schema
      .createIndex('crud_created_idx')
      .ifNotExists()
      .on('crud_audits')
      .column('created_at desc')
      .execute();

    // e.g. selecting all actions by a particular user
    // select * from "crud_audits"
    // where "actor_id" = 'uuid'
    // order by "created_at" desc
    await trx.schema
      .createIndex('crud_actor_idx')
      .ifNotExists()
      .on('crud_audits')
      .columns(['actor_id', 'created_at desc'])
      .execute();

    // e.g. selecting all actions on a particular expense
    // select * from "crud_audits"
    // where "origin_table" = 'expenses'
    //   and "table_item_id" = 'uuid'
    // order by "created_at" desc
    await trx.schema
      .createIndex('crud_table_idx')
      .ifNotExists()
      .on('crud_audits')
      .columns(['origin_table', 'table_item_id', 'created_at desc'])
      .execute();
  });

  log(5, 'crudAuditSchema', 'Successfully set up crud audits schema');
}

async function notifAuditSchema() {
  log(5, 'notifAuditSchema', 'Setting up notification audits schema...');

  await db.transaction().execute(async (trx) => {
    await trx.schema
      .createType('notification_reason')
      .asEnum([
        'expense_revisal_request',
        'expense_rejection',
        'weekly_timesheet_reminder',
        'monthly_timesheet_reminder',
        'training_hour_exchange',
        'high_five'
      ])
      .execute();

    await trx.schema
      .createTable('notification_audits')
      .ifNotExists()
      .addColumn('id', 'bigserial', (col) => col.primaryKey())
      .addColumn('created_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
      .addColumn('receiver_id', 'uuid', (col) => col.notNull())
      .addColumn('sent_to', 'text', (col) => col.notNull())
      .addColumn('reason', sql`notification_reason`, (col) => col.notNull())
      .execute();

    await trx.schema.createIndex('notif_created_idx').on('notification_audits').column('created_at desc').execute();

    await trx.schema
      .createIndex('notif_receiver_idx')
      .on('notification_audits')
      .columns(['receiver_id', 'created_at desc'])
      .execute();

    await trx.schema
      .createIndex('notif_reason_idx')
      .on('notification_audits')
      .columns(['reason', 'created_at desc'])
      .execute();
  });

  log(5, 'notifAuditSchema', 'Successfully set up notification audits schema');
}

async function main() {
  await initialize();
  db = getDb();
  log = getLog();
  await wakeUp();
  await Promise.all([crudAuditSchema(), notifAuditSchema()]);
}

main();
