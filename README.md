## Setup

The **Expense App API** is written in **Node.js** v14.x+.

Download and install **Node.js** v18.x from: https://nodejs.org/en/ or https://nodejs.org/dist/latest-v18.x/

Install required **Node.js** modules:

```bash
npm run reinstall
```

Deployment of the **Expense App API** requires the **AWS Command Line Interface (CLI)** and
**AWS Single Sign-On (SSO)**. We use the **aws-sso-util** utility to simplify AWS SSO configuration and usage.

Download and install **AWS CLI** version 2 following instructions from:
https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

**aws-sso-util** is built with **Python**, so first install Python 3.x from: https://www.python.org/downloads/

Download and install **aws-sso-util**, after first installing **pipx** (if not already installed),
following instructions from: https://github.com/benkehoe/aws-sso-util#quickstart

## AWS SSO Configuration

_NOTE_: On Windows, the commands from this section can only be run from the Windows Command Prompt [`cmd`]. All other commands can be executed from a Windows Git Bash terminal.

### AWS Dev Account - _default_ Profile

You must first configure (one-time) AWS SSO using the **AWS CLI**.

```bash
aws configure sso
```

When prompted, enter the following information:

- **SSO start URL**: _https://consultwithcase.awsapps.com/start_
- **SSO Region**: _us-east-1_

Your web browser will open a new tab and you will be required to login to Google with your **@consultwithcase.com**
email address and then press the _Allow_ button to explicitly permit the authorize request.
Close the web browser tab. Return to your command prompt and continue answering questions:

- Use keyboard to select _Case Consulting Dev_ AWS account
- **CLI default client Region**: _us-east-1_
- **CLI default output format**: _json_
- **CLI profile name**: _default_

In the `~/.aws/config` file, add the following line to the end of your _default_ configuration to use **aws-sso-util**
to [obtain AWS credentials using an external process](https://docs.aws.amazon.com/cli/latest/topic/config-vars.html#sourcing-credentials-from-external-processes):

```
credential_process = aws-sso-util credential-process
```

### AWS Prod Account - _prod_ Profile

If you have been given access to the company's AWS Prod account, run the `aws configure sso` command (one-time)
to configure a _prod_ profile.
Choose the same values, except select _Case Consulting Prod_ AWS account and enter _prod_ as **CLI profile name**.

In the `~/.aws/config` file, add the following line to the end of your _profile prod_ configuration to use **aws-sso-util** to obtain AWS credentials for the _prod_ profile:

```
credential_process = aws-sso-util credential-process --profile prod
```

_NOTE_: You can alternatively run `aws-sso-util configure profile prod` to accomplish the same result.

### AWS SSO Login

To explicitly obtain AWS credentials from AWS SSO, use **aws-sso-util** by running `aws-sso-util login`.
If your web browser opens a new tab, you will be required to login to Google with your **@consultwithcase.com**
email address and then press the _Allow_ button to explicitly permit the authorize request.

To remove AWS credentials run `aws-sso-util logout`. This will also clear any authorization.
Therefore, a subsequent login will launch the web browser again for a new authorization request.

## Environment variables

The following environment variables are required to use **Auth0** authentication:

- **VUE_APP_AUTH0_AUDIENCE**
- **VUE_APP_AUTH0_DOMAIN**

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

In the main directory there should be a **testLocalScript.js** file.
This file contains a script that helps test Lambda functions locally.

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

## One time deployment for new environment

Temporarily comment out the entire 'ChronosFunction' configuration from `CloudFormation.yaml`

Create a `.env` set up for the new environment

Using the AWS CloudFormation Console, where _{Stage}_ is the name of the new environment (e.g., test):

1. Create stack with new resources
2. Upload a template file (`CloudFormation.yaml`)
3. Next
4. Enter stack name (_expense-app-{Stage}_)
5. Parameters:
   1. **ApiCertificate**: <ARN of _{Stage}.api.consultwithcase.com_ certificate from Amazon Certificate Manager (ACM)>
   2. **AppCertificate**: <ARN of _{Stage}.app.consultwithcase.com_ certificate from Amazon Certificate Manager (ACM)>
   3. **AppDomain**: _{Stage}.app.consultwithcase.com_ (_NOTE_: PROD uses _app.consultwithcase.com_)
   4. **Stage**: _{Stage}_
6. Next
7. Next
8. Acknowledge all three Capabilities and transforms
9. Create stack
10. Wait for stack creation to complete

Uncomment the 'ChronosFunction' configuration from `CloudFormation.yaml`

Upload `.env` to S3 bucket, where _{Stage}_ is the name of the new environment (e.g., test):

```bash
npm run upload:{Stage}:env
```

**Claudia.js** requires a one time initialization after the CloudFormation stack has been created.
For example, run the following steps for the new environment,
where _{Stage}_ is the name of the new environment (e.g., test):

_NOTE_: Make sure you do not have a `claudia.json` file and that you do have a `.env` set up for the environment.

```bash
npm run package:cloudformation:{Stage}
npm run deploy:cloudformation:{Stage}
npm run create:claudia:{Stage}
```

In the **API Gateway** console

1. Select the API
2. Settings
3. Change Endpoint Type to Regional
4. Save Changes

Run commands to deploy using **Claudia.js**, where _{Stage}_ is the name of the new environment (e.g., test):

```bash
npm run deploy:claudia #(PROD uses: npm run deploy:claudia:prod)
npm run upload:{Stage}:claudia
```

Run the normal deployment, where _{Stage}_ is the name of the new environment (e.g., test):

```bash
npm run deploy:{Stage}
```

Create custom domain name to link to **Netlify DNS**

Using the **Amazon API Gateway** Console:

1. Custom Domain Names
2. Create Custom Domain Name
3. Parameters:
   1. Select REST
   2. **Domain Name**: _{Stage}.api.consultwithcase.com_ (_NOTE_: PROD uses _api.consultwithcase.com_)
   3. **Security Policy**: _TLS 1.2_
   4. **Endpoint Configuration**: _Regional_
   5. **ACM Certificate**: _{Stage}.api.consultwithcase.com_
4. Save
5. Edit
6. Add mapping
   1. **Path**: _/_
   2. **Destination**: _expense-app-api-{Stage}_
   3. **Stage**: _latest_
7. Save

Add the CNAME record in the **Netlify DNS** for _{Stage}.api.consultwithcase.com_

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
npm run reinstall
```

## Documentation

**AWS SDK:** (we're currently using version 2)

https://docs.aws.amazon.com/sdk-for-javascript/

**AWS CLI:** (we're currently using version 2)

https://docs.aws.amazon.com/cli/index.html

**AWS SSO:**

https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html

**aws-sso-util:**

https://github.com/benkehoe/aws-sso-util

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
