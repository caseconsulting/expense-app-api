// A script to set up the database. Useful if deploying to a new environment or performing one-off database
// modifications, but also serves as a helpful reference.

/** @import { Database } from 'expense-app-db/types' */
require('dotenv').config();
const { db } = require('expense-app-db');
const { DatabaseResumingException } = require('@aws-sdk/client-rds-data');

// Note: here we use literal sql strings because they are constant and don't need the robutst type-checking that kysely
// provides
const cmds = [
  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*
  // ❃                                                  ❃
  // ❇                  NOTIFICATIONS                   ❇
  // ❉                                                  ❉
  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*

  // create notification type enum
  `CREATE TYPE notification_reason AS ENUM(
    'expense_revisal_request',
    'expense_rejection',
    'weekly_timesheet_reminder',
    'monthly_timesheet_reminder',
    'training_hour_exchange',
    'high_five'
  );`,

  // create the table
  `CREATE TABLE IF NOT EXISTS notifications(
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    receiver_id UUID NOT NULL,
    sent_to TEXT NOT NULL,
    reason notification_reason NOT NULL
  );`,

  // indexes
  // recent first
  'CREATE INDEX IF NOT EXISTS index_notifications_created ON notifications(created_at DESC);',

  // employee who received it
  'CREATE INDEX IF NOT EXISTS index_notifications_receiver ON notifications(receiver_id, created_at DESC);',

  // notification type
  'CREATE INDEX IF NOT EXISTS index_notifications_reason ON notifications(reason, created_at DESC);',

  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*
  // ❃                                                  ❃
  // ❇                       CRUD                       ❇
  // ❉                                                  ❉
  // *✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫✮❆✦✯✿✧✩❄✬✭❀✫*

  // create type for dynamo table of origin
  ` CREATE TYPE dynamo_table AS ENUM(
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
  );`,

  // create type for user role
  "CREATE TYPE portal_role AS ENUM('intern', 'user', 'manager','admin');",

  // create table
  `CREATE TABLE IF NOT EXISTS crud_audits(
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    actor_id UUID NOT NULL,
    actor_role portal_role NOT NULL,
    origin_table dynamo_table NOT NULL,
    table_item_id UUID NOT NULL,
    old_image JSONB,
    new_image JSON
  );`,

  // indexes
  'CREATE INDEX IF NOT EXISTS index_crud_created ON crud_audits(created_at DESC);',

  // who caused the change
  'CREATE INDEX IF NOT EXISTS index_crud_actor ON crud_audits(actor_id, created_at DESC);',

  // dynamo table, specific item within the table
  'CREATE INDEX IF NOT EXISTS index_crud_table ON crud_audits(origin_table, table_item_id, created_at DESC);'
];

/**
 * Sends a query and automatically retries if the database is resuming (taken and modified from aurora/queries/utils.js)
 *
 * @param {Transaction<Database>} trx
 * @param {string} sql
 * @throws Any error thrown other than a DatabaseResumingException
 */
async function execute(trx, sql) {
  const waitFor = 5;
  let retry;
  do {
    retry = false;

    try {
      await trx.executeQuery({ sql });
    } catch (err) {
      // if database is resuming, retry
      if (err instanceof DatabaseResumingException) {
        console.log(`Database is resuming, trying again in ${waitFor} seconds...`);

        retry = true;
        await new Promise((resolve) => setTimeout(resolve, waitFor * 1000));
      } else throw err; // else propagate the error
    }
  } while (retry);
}

async function main() {
  try {
    db.transaction().execute(async (trx) => {
      for (const cmd of cmds) await execute(trx, cmd);
    });
  } catch (err) {
    console.err(err?.message ?? err);
  }
}

main();
