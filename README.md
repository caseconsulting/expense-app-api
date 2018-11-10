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

* **VUE_APP_AUTH0_AUDIENCE**
* **VUE_APP_AUTH0_DOMAIN**

The following environment variables are required to support multiple environments:

* **EXPRESS_PORT**
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

## Deployment

Application deployment occurs when an EC2 instance is built.  To update an existing server, ssh to that server using the appropriate key pair.  For example:

```
ssh -i ~/projects/expense-app-dev.pem centos@ec2-12-345-67-89.compute-1.amazonaws.com
```

Run the following commands to update and restart the server, making sure to substitute the proper environment for "<env>" in the bucket name:

```
cd app
git pull
npm install
npm prune
aws s3 cp s3://case-consulting-expense-app-resources-<env>/.env .env
npm run restart
```
