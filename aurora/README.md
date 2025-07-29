# The Aurora Database Module

Contains code for interacting with the [Aurora Serverless](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html) database, which uses [PostgreSQL](https://www.postgresql.org/docs/current/index.html) and the [RDS Data API](https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/Welcome.html)

## Todo List

- Tests! The testing framework is already set up with some examples
  - Might be good to use some kind of local dummy database (using docker?), so we can test actual postgres queries and have known database data for specific tests
- (long term) Connect directly to the database instead of using data api. The direct connection would return clearer error messages and is generally more portable
  - Requires knowledge of how to set up secure access into the vpc
  - Migrating kysely requires using the pg driver instead of kysely-data-api, and some of the querying functionality (like `CrudAudit.asInsertable`) would need to be modified or ideally removed
  - This could make it easier to use a better type-adapting system

## Usage

### Installation

This module is a local npm package. It's in package.json for the entire project as well as in the shared lambda layer. The script `install-aurora.sh` packages this module and installs it without using a symlink (which caused issues with running lambda layers locally). It's already in `npm run reinstall`, so you shoudln't need to run the script directly.

You should use this package like:

```js
const { db } = require('expense-app-db');
```

> Note that the above code isn't very useful, as you'll see in the later sections

This module depends on the following environment variables:

- `AURORA_CLUSTER_ARN`
- `AURORA_SECRET_ARN`
- `AURORA_DB_NAME`

These must exist before importing/requiring this module.

### Querying

```js
const { CrudAuditQueries, NotifAuditQueries } = require('expense-app-db/queries');

const results = await CrudAuditQueries.select(...);
```

### Types

To access the types to type-annotate functions and variables, you can import the types using a JSDoc import:

```js
/** @import { CrudAuditQueryFilters } from 'expense-app-db/types' */
```

The models folder contains the real class definitions and some 'enums'

```js
const { DynamoTable, CrudAudit } = require('expense-app-db/models');
const audit = new CrudAudit(...);
```

When writing code, vscode will give you suggestions for types that use these enums. It will suggest the literal string values. Instead of using those, you should still use the enum object and access the corresponding key.

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

After making changes to this package, run `npm run reinstall` in the project root (not this directory).

When adding files, make sure to expose them as exports in the `index.ts` file found _in the same folder_. Some of them have different structures intentionally, make sure to follow that consistently.

### Creating tables in the database

1. To be added to the `Database` type in `types.ts`
2. Their own type defined similarly to the existing tables
3. A class in the `models/` folder, and enums if applicable
4. Queries for the backend to use (refer to the [examples](#examples))

### Creating enums

- keys and their corresponding values should be the same, and they should exactly match the enum value from the database
- define a corresponding type in types.js based on the other examples

### Installing into lambda functions

Lambda functions don't install dependencies of symlinked packages. To run a lambda function that depends on this module, you need to install without linking. Reference `timesheet-submission-reminder/invoke-local.sh` to see how this is done. You can copy and modify this script for any new lambda function that uses this module (and add it to .npmignore).

## Dependencies and Documentation

- [Aurora Serverless](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html) - the compute and storage resources for the database
- [RDS Data API](https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/Welcome.html) - interact with aurora through an http endpoint
- [PostgreSQL](https://www.postgresql.org/docs/current/index.html) - the database engine
- [TypeScript](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [Kysely](https://kysely.dev/docs/intro) - builds queries and interacts with the database
- [Kysely Data API Adapter](https://www.npmjs.com/package/kysely-data-api) - provides support for using kysely via the rds data api
  - Note: this depends on Kysely version `0.27.x`. The latest version of Kysely cannot be used unless this is updated or a fork is made

## Other Notes

### Why TypeScript?

To integrate better with kysely's type system. While it's possible to use kysely with js and jsdoc, it gets very messy and convoluted. Using typescript simplified the code when compared to writing in in js, and is possible since this is an entirely separate module.

### Why a Separate Module?

The file in this module are very interdependent on each other. While this is fine for the backend as a whole, it was very messy when trying to install it into the lambda layers.
