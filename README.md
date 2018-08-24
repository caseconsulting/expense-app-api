## Setup

The **Expense App API** is written in **Node.js** v8.x+.

Download and install Node.js from: https://nodejs.org/.

Install required Node.js modules:

```
npm install --no-optional
npm dedupe
```

## Environment variables

In order to use **Auth0** authentication, you will need to define some environment variables:

* **AUTH0_AUDIENCE**
* **AUTH0_DOMAIN**

The following environment variables are required to support multiple environments:

* **EXPRESS_PORT**
* **NODE_ENV**
* **STAGE**

The **dotenv** Node.js module is used to pick up environment variables from a `.env` file in the project root directory.
The `.env` file in the **case-expense-app** S3 bucket in the company AWS account has up-to-date values to run locally.
Download this file to the project root directory:

```
aws s3 cp s3://case-expense-app/.env .env
```

## Application tasks

To run locally (on default port of 3000):

```
npm run start
```

To run locally (on a different port):

```
EXPRESS_PORT=8081 npm run start
```

To run unit tests (with Jasmine):

```
npm run test
```

To upgrade to the latest version of a specific Node.js module:

```
npm install <module-name> --save
```

To upgrade to the latest version of a specific Node.js module, which is a development dependency only:

```
npm install <module-name> --save-dev
```
