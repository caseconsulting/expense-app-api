const Crud = require('./crudRoutes');

class ExpenseTypeRoutes extends Crud {
  constructor(jsonModify, uuid) {
    super(jsonModify, uuid);
    this.jsonModify = jsonModify;

  }

 _add(uuid,{
  name,
  budget,
  odFlag
}) {

  let found = this.jsonModify._specificFind("name", name);
  console.log(name, budget, odFlag);
  if (found)
  {
    return null;
  }
  else {
    return {
      id: uuid,
      name,
      budget,
      odFlag
    };
  }
}

 _update(id, {
  name,
  budget,
  odFlag
}) {
  console.log(id, name, budget, odFlag);
  return {
    id,
    name,
    budget,
    odFlag
  };
}
}
module.exports = ExpenseTypeRoutes;
