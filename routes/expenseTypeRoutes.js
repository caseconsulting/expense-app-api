const Crud = require('./crudRoutes');

class ExpenseTypeRoutes extends Crud {
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;
  }

  _add(uuid, {
    name,
    budget,
    odFlag,
    description
  }) {

    let found = this.jsonModify._specificFind("name", name);
    console.log(name, budget, odFlag, description);
    if (found) {
      return null;
    } else {
      return {
        id: uuid,
        name,
        budget,
        odFlag,
        description
      };
    }
  }

  _update(id, {
    name,
    budget,
    odFlag,
    description
  }) {
    console.log(id, name, budget, odFlag, description);
    return {
      id,
      name,
      budget,
      odFlag,
      description
    };
  }
}
module.exports = ExpenseTypeRoutes;
