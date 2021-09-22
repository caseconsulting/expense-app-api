const moment = require('moment-timezone');
moment.tz.setDefault('America/New_York');

const LOG_LEVEL = 5; // 1 for highest priority (most important)

class Logger {
  constructor(name) {
    this.className = name;
  } // constructor

  /**
   * log(priorty, caller, description...)
   *
   * @param priority - first argument is the priority level
   * @param caller - second argument is the method caller
   * @param description -  all following arguments make up the description
   *
   * [TIMESTAMP] [description] | Processing handled by function [caller]
   */
  log (priorty, method, ...args) {
    if (LOG_LEVEL >= priorty) {
      let fullDescription = priorty == 1 ? '>>> ' : '';

      for (let i = 0; i < args.length; i++) {
        fullDescription += `${args[i]} `;
      }

      console.log(
        `[${moment().format()}] ${fullDescription.trim()} | Processing handled by function ${this.className}.${method}`
      );
    }
  } // log
} // Logger

module.exports = Logger;
