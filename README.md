## Setup

The **Expense App API** is written in **Node.js** v14.x+.

Download and install Node.js v14.x from: https://nodejs.org/en/ or https://nodejs.org/dist/latest-v14.x/

Install required Node.js modules:

```bash
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

```bash
npm run download:local:env
```

To download a specific environment's .env file:

```bash
npm run download:{Stage}:env
```

Where Stage is the name of the environment (local, dev, test, prod, etc.)

## Application tasks

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

## Testing Lambda Functions Locally without Docker

In the main directory there should be a **testLocalScript.js** file. This file contains a script that helps test Lambda functions locally.

You can see all the current lambda function tests by running command:

```
npm run testLambdaLocal
```

To test a specific lambda function run the command:

```
npm run testLambdaLocal {LambdaOption}
```

Add a new test

1. In **testLocalScript.js** file in the Lambdas section add a new object key in the **lambdas** JSON object.

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

NOTE: When deleting a table and it is not recreated when deploying, you must change the table name in CloudFormation.yaml, deploy, delete the new temporary table, change the table name back, and deploy again

NOTE: After first time deployment of S3 'Remove Deleted Expense Attachments' lifecycle rule, need to enable clean up expired object delete markers from S3 console.

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

To download dev .env and claudia.json then deploy to the dev environment using Claudia.js and SAM/CloudFormation:

```bash
npm run deploy:dev
```

## Deployment (test)

To download test .env and claudia.json then deploy to the test environment using Claudia.js and SAM/CloudFormation:

```bash
npm run deploy:test
```

## Deployment (prod)

NOTE: Need to switch AWS credentials to production account.

To download prod .env and claudia.json then deploy to the prod environment using Claudia.js and SAM/CloudFormation:

```bash
npm run deploy:prod
```

## One time deployment for new environment

For Prod: configure .aws/credentials and .aws/config for prod profile
(e.g. .aws/config
[prod]
output = json
region = us-east-1
)

Temporarily comment out the entire 'ChronosFunction' configuration from CloudFormation.yaml

Create a .env set up for the new environment

Using the AWS CloudFormation Console:

1. Create stack with new resources
2. Upload a template file (CloudFormation.yaml)
3. Next
4. Enter stack name (expense-app-test)
5. Parameters:
   a) ApiCertificate: <ARN of test.api.consultwithcase.com certificate from Amazon Certificate Manager (ACM)>
   b) AppCertificate: <ARN of test.app.consultwithcase.com certificate from Amazon Certificate Manager (ACM)>
   c) AppDomain: test.app.consultwithcase.com (FOR PROD: app.consultwithcase.com)
   d) Stage: test
6. Next
7. Next
8. Acknowledge all three Capabilities and transforms
9. Create stack
10. Wait for stack creation to complete

Uncomment the 'ChronosFunction' configuration from CloudFormation.yaml

Upload .env to S3 bucket:

```bash
npm run upload:test:env
```

Claudia.js requires a one time initialization after the CloudFormation stack has been created. For example, run the following steps for the test environment:

Make sure you do not have a claudia.json file and that you do have a .env set up for the environment.

```bash
npm run package:cloudformation:test
npm run deploy:cloudformation:test
npm run create:claudia:test
```

In the API Gateway console

1. Select the API
2. Settings
3. Change Endpoint Type to Regional
4. Save Changes

```bash
npm run deploy:claudia #(FOR PROD: npm run deploy:claudia:prod)
npm run upload:test:claudia
```

Run the normal deployment

```bash
npm run deploy:test
```

Create a custom domain name to link to Netlify

Using the Amazon API Gateway Console:

1. Custom Domain Names
2. - Create Custom Domain Name
3. Parameters:
   a) Select REST
   b) Domain Name: test.api.consultwithcase.com (FOR PROD: api.consultwithcase.com)
   c) Security Policy: TLS 1.2
   d) Endpoint Configuration: Regional
   e) ACM Certificate: test.api.consultwithcase.com
4. Save
5. Edit
6. Add mapping
   a) Path: /
   b) Destination: expense-app-api-test
   c) Stage: latest
7. Save

Add the CNAME record in the Netlify DNS for test.api.consultwithcase.com

To reset for local development, after a deployment:

```bash
npm run download:local:env
```

## Error deploying

If getting this error

`Unable to upload artifact ./ referenced by CodeUri parameter of ChronosFunction resource. [Errno 2] No such file or directory: '/Users/austinlam/Documents/expense-app-case/expense-app-api/node_modules/.bin/babylon'`

Run the following commands:

```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Documentation

**AWS_SDK:**

https://docs.aws.amazon.com/sdk-for-javascript/

we're currently using version 2

**Axios:**

https://github.com/axios/axios

**Express:**

https://expressjs.com/

**Metascraper:**

https://metascraper.js.org/#/

**Lodash:**

https://lodash.com/

**Moment:**

https://momentjs.com/docs/

**Cloudformation:**

https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-template-resource-type-ref.html
