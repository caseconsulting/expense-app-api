# The Aurora Database Module

Contains code for interacting with the [Aurora Serverless](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html) database, which uses [PostgreSQL](https://www.postgresql.org/docs/current/index.html) and the [RDS Data API](https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/Welcome.html)

## Todo List

Tests! Write tests in this module, not in the parent folder.

## Usage

### Installation

This module is a local npm package. It's in package.json for the entire project as well as in the shared lambda layer. You should use this package like:

```js
const { db } = require('expense-app-db');
```

This module depends on the following environment variables:

- `AURORA_CLUSTER_ARN`
- `AURORA_SECRET_ARN`
- `AURORA_DB_NAME`

If using a package like `dotenv` (which we use) you must import all environment variables (e.g. via `require('dotenv').config()`) _before_ importing anything from this package. In general, it's a good idea to setup environment variables before anything else.

### Querying

Using the pre-built queries:

```js
const { CrudAuditQueries, NotifAuditQueries } = require('expense-app-db/queries');
// other code...
const results = await CrudAuditQueries.select(...);

// Note: this is more clear than importing functions like select directly. e.g. don't do this:
const { select } = require('expense-app-db/queries/crudAuditQueries');
```

### Types

To get type completion, you can import all the types using a JSDoc import:

```js
// Note that this is a jsdoc comment! It follows similar syntax to an es module import. I find it nice to include these at the top of your file, near your other imports
/** @import AuroraTypes from './aurora/types' */

// or unwrap what you want:
/** @import { Database, CrudAudit } from './aurora/types' */
```

The models folder contains the real class definitions and some 'enums'

```js
const { DynamoTable } = require('expense-app-db/models');
```

Note: when creating models for enums, they keys should exactly match the values (which should be a string) and should come directly from the enum values in the database. Reference the other enum types, copy the jsdoc tags. When creating a function that takes an enum value as a parameter, use `keyof typeof <enum object>` as the type annotation (I know it's weird). Since the keys and values are the same, you can supply `<enum object>.<key>` in as an argument so as not to hardcode any values.

## Examples

- `routes/auditRoutesV2`
- anything within this folder
- the `initializeAurora.js` script (specifically for using transactions)
- [Kysely's recipes](https://kysely.dev/docs/category/recipes)
- [Kysely's examples](https://kysely.dev/docs/category/examples)
- [kysely-data-api tests](https://github.com/sst/kysely-data-api/blob/master/test/data-api-query-compiler.test.ts)

## Modifying the Databse

If you want to add (or modify) a table or type, a useful place to do that is the `initializeAurora.js` script (you can comment out the existing commands and put in your own, and run it with `npm run init:aurora`), or directly in the RDS console. If you do, save the commands in the `initializeAurora.js` script so that they can be used later if needed, or deployed to a new environment.

## Contributing

After making changes to this package, run `npm run build` in this folder. Then, in the `expense-app-api` root directory, run `npm run reinstall`.

When adding files, make sure they are included in the `index.ts` in the same folder as the file added. Some of them have different structures intentionally, make sure to follow that consistently.

## Dependencies and Documentation

- [Aurora Serverless](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html) - the compute and storage resources for the database
- [RDS Data API](https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/Welcome.html) - interact with aurora through an http endpoint
- [PostgreSQL](https://www.postgresql.org/docs/current/index.html) - the database engine
- [Kysely](https://kysely.dev/docs/intro) - builds queries and interacts with the database
- [Kysely Data API Adapter](https://www.npmjs.com/package/kysely-data-api) - provides support for using kysely via the rds data api
  - Note: this depends on Kysely version `0.27.x`. The latest version of Kysely cannot be used unless this is updated or a fork is made
