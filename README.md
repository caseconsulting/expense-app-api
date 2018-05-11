## Setup

The **Expense App API** is written in **Node.js** v8.x+.

* Download and install Node.js from: https://nodejs.org/
* Install required Node.js modules:

```
npm install
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
