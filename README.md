### Table of Contents

- [Setup](#setup)
- [AWS SSO Configuration](#aws-sso-configuration)
- [Environment Variables](#environment-variables)
- [Application Tasks](#application-tasks)
- [Testing Lambda Functions Locally Without Docker](#testing-lambda-functions-locally-without-docker)
- [Deployment Notes](#read-notes-before-deployment)
  - [Deploying Dev](#deployment-dev)
  - [Deploying Test](#deployment-test)
  - [Deploying Prod](#deployment-prod)
  - [One Time Deployment for New Environment](#one-time-deployment-for-new-environment)
  - [Error Deploying](#error-deploying)
- [Lambda Functions](#lambda-functions)
  - [Chiron](#chiron) (removed)
  - [Chronos](#chronos)
  - [Thanos](#thanos)
  - [Portal Data Sync](#portal-data-sync)
- [Documentation](#documentation)

## Setup

The **Expense App API** is written in **Node.js** v20.x+.

Download and install **Node.js** v20.x from: https://nodejs.org/en/ or https://nodejs.org/dist/latest-v20.x/

Install required **Node.js** modules:

```bash
npm run reinstall
```

Deployment of the **Expense App API** requires the **AWS Command Line Interface (CLI)** and
**AWS IAM Identity Center** (formerly AWS Single Sign-On [SSO]).

Download and install **AWS CLI** version 2 following instructions from:
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

## AWS SSO Configuration

_NOTE_: On Windows, the commands from this section can only be run from the Windows Command Prompt [`cmd`]. All other commands can be executed from a Windows Git Bash terminal.

### AWS Dev Account - _default_ Profile

You must first configure (one-time) AWS SSO using the **AWS CLI**.

```bash
aws configure sso
```

When prompted, enter the following information:

- **SSO session name**: _dev_
- **SSO start URL**: _https://d-90676ba57e.awsapps.com/start_
- **SSO region**: _us-east-1_
- **SSO registration scopes**: _leave blank to accept default value of sso:account:access_

Your web browser will open a new tab and you will be required to login to Google with your **@consultwithcase.com**
email address and then press the _Allow_ button to explicitly permit the authorize request.
Close the web browser tab. Return to your command prompt and continue answering questions:

- Use keyboard to select _Case Consulting Dev_ AWS account
- Use keyboard to select AdministratorAccess role
- **CLI default client Region**: _us-east-1_
- **CLI default output format**: _json_
- **CLI profile name**: _default_

### AWS Prod Account - _prod_ Profile

If you have been given access to the company's AWS Prod account, run the `aws configure sso` command (one-time)
to configure a _prod_ profile.
Choose the same values, except select _Case Consulting Prod_ AWS account and enter _prod_ as **CLI profile name**.

### AWS SSO Login

To explicitly obtain AWS credentials from AWS SSO, running `aws sso login`.
Your web browser should open a new tab, where you should be required to login to Google with your **@consultwithcase.com**
email address (unless you recently did so) and then press the _Allow_ button to explicitly permit the authorize request.

To remove AWS credentials run `aws sso logout`. This will also clear any authorization.
Therefore, a subsequent login will launch the web browser again for a new authorization request.

## Environment Variables

The following environment variables are required to use **Auth0** authentication:

- **VITE_AUTH0_AUDIENCE**
- **VITE_AUTH0_DOMAIN**

The following environment variables are required to support multiple environments:

- **EXPRESS_PORT**
- **STAGE**

The following environment variable is required to support deployments using `~/.aws/config` to
[configure credentials](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-configured-credential-process.html])
for **AWS SSO**:

- **AWS_SDK_LOAD_CONFIG** (with a value of 1 [true])

The **dotenv** Node.js module picks up environment variables from a `.env` file in the project root directory.
The `.env` file in the S3 bucket in the company's AWS Dev account has up-to-date values to run locally.
Download this file to the project root directory:

```bash
npm run download:local:env
```

To download a specific environment's `.env` file,
where _{Stage}_ is the name of the environment (e.g., local, dev, test, prod):

```bash
npm run download:{Stage}:env
```

## Application Tasks

To run locally (using pm2 configuration defined in `services.yml`):

```bash
npm run start
```

To stop running locally (using pm2):

```bash
npm run stop
```

To run locally (using pm2 configuration defined in `services.yml`, but on a different port):

```bash
EXPRESS_PORT=8081 npm run start
```

To run locally (using nodemon, with debug enabled):

```bash
npm run debug
```

To stop running locally (using nodemon), press CTRL-C in same window.

To run unit tests, first download the dev environment files:

```bash
npm run download:dev
```

To run unit tests (with Jasmine):

```bash
npm run test
```

To run unit tests coverage (with Jasmine):

```bash
npm run test-coverage
```

To upgrade to the latest version of a specific Node.js module:

```bash
npm update --save <module-name>@latest
```

To upgrade to the latest version of a specific Node.js module, which is a development dependency only:

```bash
npm update --save-dev <module-name>@latest
```

To sync expense receipt names with S3 bucket file names:

```bash
npm run receiptSync:dev
npm run receiptSync:test
npm run receiptSync:prod
```

## Testing Lambda Functions Locally Without Docker

You can see all the current lambda function tests by running command:

```
npm run testLambdaLocal
```

To test a specific lambda function run the command:

```
npm run testLambdaLocal {LambdaOption}
```

Add a new test

1. In **test-local.js** file in the Lambdas section add a new object key in the **lambdas** JSON object.

- For that new key create a JSON object with 2 key pairs: function and event.
- **function** should be set to the pathTo the file location of the Lambda function you want to test
- **event** should be set a String value with the value of the path location to the event file that you want to test against your Lambda function.

Example:

```node.js
const lambdas = {
  template: { function: pathTo('lambda-template/app.js'), event: 'lambda-template/event.json' }
};
```

To run the template example the command would be:

```
npm run testLambdaLocal template
```

## READ NOTES BEFORE DEPLOYMENT

_NOTE_: When deleting a table and it is not recreated when deploying, you must change the table name in
`CloudFormation.yaml`, deploy, delete the new temporary table, change the table name back, and deploy again

_NOTE_: After first time deployment of S3 'Remove Deleted Expense Attachments' lifecycle rule,
need to enable clean up expired object delete markers from S3 console.

In the S3 Console:

1. Navigate to case-expense-app-attachment-{dev/test} or case-consulting-expense-app-attachment-{prod} bucket
2. Click the Management tab
3. Select the 'Remove Deleted Expense Attachments' lifecycle rule
4. Click Edit
5. Next
6. Next
7. Check the box for 'Clean up expired object delete markers'
8. Next
9. Save

## Deployment (dev)

To download dev `.env` and `claudia.json` and then deploy to the dev environment using **Claudia.js**
and **SAM**/**CloudFormation**:

```bash
npm run deploy:dev
```

## Deployment (test)

To download test `.env` and `claudia.json` and then deploy to the test environment using **Claudia.js**
and **SAM**/**CloudFormation**:

```bash
npm run deploy:test
```

## Deployment (prod)

_NOTE_: Need to switch AWS credentials to AWS Prod account.

To download prod `.env` and `claudia.json` and then deploy to the prod environment using **Claudia.js**
and **SAM**/**CloudFormation**:

```bash
npm run deploy:prod
```

## One Time Deployment for New Environment
1. Request certificates through AWS Certificate Manager

   1. App Certificate: sandbox-app.consultwithcase.com
   2. Api Certificate: sandbox-api.consultwithcase.com

2. Add CNAME records to Netlify for certificates

   1. Notice that consultwithcase.com will be appended to the name, so when copying from AWS, remove that before saving

3. Add sandbox to stage options

   1. Add to AllowedValues of CloudFormation parameters
      1. Stage: sandbox
      2. AppDomain: sandbox-app.consultwithcase.com
   2. Add to Stages constant cloudformation.js

4. Create the support stack

   1. **_npm run deploy:cloudformation support sandbox_**

5. Update environment resource files

   1. Create and upload a new .env file
   2. Remove claudia.json file

6. Create network CloudFormation stack

   1. **_npm run deploy:cloudformation network sandbox_**

7. Create database CloudFormation stack

   1. **_npm run deploy:cloudformation database sandbox_**

8. Create the app CloudFormation stack

   1. Comment out all AWS::Serverless resources (functions and layers) as well as anything that depends on them (like log groups) from the template
   2. Upload the template to the CloudFormation console
   3. Use the ARNs from certificates made in Step 1 to fill in the parameters

9. Deploy the app CloudFormation stack

   1. Uncomment the resources from Step 8
   2. **_npm run deploy:cloudformation app sandbox_**

10. Create API Gateway

    1. **_npm run create:claudia:sandbox_**

11. Upload claudia.json file to S3

    1. **_aws s3 cp claudia.json s3://case-expense-app-resources-sandbox/claudia.json_**

12. Update API Gateway in console

    1. Change Endpoint Type to Regional
    2. Create a custom domain name and API mapping for the API Gateway

13. Add CNAME records to Netlify for for app and api

    1. Again, notice that consultwithcase.com will be appended to the name, so when copying from AWS, remove that before saving

14. Add callback URL to Auth0 settings

    1. Sign in to Auth0 account
    2. Add https://sandbox-app.consultwithcase.com/callback under Allowed Callback URLs and Allowed Web Origins settings

15. Add lamda role ARN to KMS employees-sensitive-key key policy

16. Create or import user records

    1. For a user to be able to login they need to have a record in the employees and employees-sensitive tables

## Error Deploying

If getting this error

`Unable to upload artifact ./ referenced by CodeUri parameter of ChronosFunction resource. [Errno 2] No such file or directory: '/Users/austinlam/Documents/expense-app-case/expense-app-api/node_modules/.bin/babylon'`

Run the following commands:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm run reinstall
```

## Lambda Functions

### Chiron

> This function was removed. If any references to it (or other training url scraping functionality) are found, they should be removed.

A nightly function that scrapes metadata from URLs provided in all employee expenses. Database entries will be made from the scraped URL data, the expense category, and the number of times a URL was used.

### Chronos

A nightly function that will create new budgets for recurring (yearly) expense types <u>**IF**</u> an employee overdrafted from the previous year on an employee's anniversary

### Thanos

A monthly function that updates durations for an employee. Durations that are updated are:

- Technology experiences that are currently being used by the employee
- Customer Organization experience that the employee is currently under

### Portal Data Sync

A nightly function that syncs data between the Portal and external applications. The Portal is the main/predominant source of data. Data will only be synced under specific scenarios:

- Data will be added to the Portal <u>**ONLY IF**</u> the field is empty on the Portal <u>**AND**</u> the external application's field is <u>**NOT**</u> empty
- Data will be added/modified on the external application under two scenarios:
  - There is a data mismatch between the Portal's and the external application's field
  - The data exists on the Portal's field and does <u>**NOT**</u> exist on the external application's field

External applications being synced with the Portal are:

- BambooHR
- ADP

Fields being synced between the Portal and external applications:

- First Name
- Middle Name
- Last Name
- Nickname
- Current Street
- Current City
- Current State
- Current ZIP
- Mobile Phone
- Home Phone
- Work Phone
- Work Phone Extension
- Date Of Birth
- Gender
- Ethnicity
- Disability
- Veteran Status
- Hire Date
- Twitter
- LinkedIn

## Documentation

**AWS SDK V3:**

https://docs.aws.amazon.com/sdk-for-javascript/

**AWS CLI V2:**

https://docs.aws.amazon.com/cli/index.html

**AWS SSO:**

https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html

**AWS CloudFormation:**

https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html

**Axios:**

https://github.com/axios/axios

**Claudia.js**

https://claudiajs.com/

**Express:**

https://expressjs.com/

**Metascraper:**

https://metascraper.js.org/

**Lodash:**

https://lodash.com/

**Day.js:**

https://day.js.org/en/
