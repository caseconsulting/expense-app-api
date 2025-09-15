const Crud = require(process.env.AWS ? 'crudRoutes' : './crudRoutes');
const DatabaseModify = require(process.env.AWS ? 'databaseModify' : '../js/databaseModify');
const Logger = require(process.env.AWS ? 'Logger' : '../js/Logger');

const logger = new Logger('settings');
class Settings extends Crud {
  constructor() {
    super();
    this.databaseModify = new DatabaseModify('settings');
  }

  /**
   * Updates an attribute of an object. Returns the object updated.
   *
   * @param body - data of object
   * @return Object - object updated
   */
  async _updateAttribute(req) {
    let data = req.body;
    logger.log(2, '_update', `Preparing to update setting with id: ${data.id}`);

    try {
      let oldSettings = await this.databaseModify.getEntry(data.id);
      let newSettings = { ...oldSettings, ...data };


      return { objectUpdated: newSettings };

    } catch (err) {
      // log error
      logger.log(2, '_update', `Failed to prepare update for setting with id: ${data.id}`);

      // return rejected promise
      return Promise.reject(err);
    }
  }
}

module.exports = Settings;