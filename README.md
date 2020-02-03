## Setup

The **Expense App API** is written in **Node.js** v12.x+.

Download and install Node.js v12.x from: https://nodejs.org/en/ or https://nodejs.org/dist/latest-v12.x/

Install required Node.js modules:

```
npm ci
```

## Environment variables

In order to use **Auth0** authentication, you will need to define some environment variables:

- **VUE_APP_AUTH0_AUDIENCE**
- **VUE_APP_AUTH0_DOMAIN**

The following environment variables are required to support multiple environments:

- **EXPRESS_PORT**
- **STAGE**

The **dotenv** Node.js module is used to pick up environment variables from a `.env` file in the project root directory.
The `.env` file in the **case-expense-app** S3 bucket in the company AWS account has up-to-date values to run locally.
Download this file to the project root directory:

```
npm run download:local:env
```

## Application tasks

To run locally (using pm2 configuration defined in `services.yml`):

```
npm run start
```

To stop running locally (using pm2):

```
npm run stop
```

To run locally (using pm2 configuration defined in `services.yml`, but on a different port):

```
EXPRESS_PORT=8081 npm run start
```

To run locally (using nodemon, with debug enabled):

```
npm run debug
```

To stop running locally (using nodemon), press CTRL-C in same window.

To run unit tests (with Jasmine):

```
npm run test
```

To upgrade to the latest version of a specific Node.js module:

```
npm update --save <module-name>@latest
```

To upgrade to the latest version of a specific Node.js module, which is a development dependency only:

```
npm update --save-dev <module-name>@latest
```

## Deployment (dev)

To download dev .env and claudia.json then deploy to the dev environment using Claudia.js and SAM/CloudFormation:

```
npm run deploy:dev
```

## Deployment (test)

To download test .env and claudia.json then deploy to the test environment using Claudia.js and SAM/CloudFormation:

```
npm run deploy:test
```

## Deployment (prod)

NOTE: Need to switch AWS credentials to production account.

To download prod .env and claudia.json then deploy to the prod environment using Claudia.js and SAM/CloudFormation:

```
npm run deploy:prod
```

## One time deployment for new environment

Claudia.js requires a one time initialization. For example, run the following steps for the test environment:

```
npm run create:claudia:test
```

In the API Gateway console
1) Select the API
2) Settings
3) Change Endpoint type to Regional
4) Save Changes

```
npm run deploy:claudia
npm run upload:test:claudia
```

Run the normal deployment

```
npm run deploy:test
```
