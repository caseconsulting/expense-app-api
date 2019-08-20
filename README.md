## Setup

The **Expense App API** is written in **Node.js** v8.x+.

Download and install Node.js v8.x from: https://nodejs.org/dist/latest-v8.x/

Install required Node.js modules:

```
npm install --no-optional
npm prune
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

To run locally (using pm2 configuration defined in services.yml):

```
npm run start
```

To stop running locally (using pm2):

```
npm run stop
```

To run locally (using pm2 configuration defined in services.yml, but on a different port):

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
npm update --save <module-name>
```

To upgrade to the latest version of a specific Node.js module, which is a development dependency only:

```
npm update --save-dev <module-name>
```

## Deployment (dev)

```
npm run update
```

## Deployment (test & prod)

Application deployment occurs when an EC2 instance is built.  To update an existing server, ssh to that server using the appropriate key pair.  For example:

```
ssh -i ~/projects/expense-app-dev.pem centos@ec2-12-345-67-89.compute-1.amazonaws.com
```

Run the following commands to update and restart the server, making sure to substitute the proper environment for "<env>" in the bucket name:

test
```
cd app
git checkout -- package-lock.json
git pull
npm install --no-optional
npm prune
npm dedupe
aws s3 cp s3://case-consulting-expense-app-resources-test/.env .env
npm run restart
```

prod
```
cd app
git checkout -- package-lock.json
git pull
npm install --no-optional
npm prune
npm dedupe
aws s3 cp s3://case-consulting-expense-app-resources-prod/.env .env
npm run restart
```
