const express = require('express');

function crud(jsonModify, _add, _update,uuid) {

  const router = express.Router();

  function _handleResponse(errorCode, res) {
    return (err, sendBack) => {
      if (err) {
        res.status(errorCode).send({
          error: err.message
        });
      } else {
        res.status(200).send(sendBack);
      }
    };
  }

  function create(req, res) {
    const newObject = _add(uuid,req.body);
    jsonModify.addToJson(newObject, _handleResponse(409, res));
  }

  function read(req, res) {
    console.log("get request recieved");
    const output = jsonModify.readFromJson(req.params.id);
    if (output) {
      res.status(200).send(output);
    } else {
      const err = {
        message: 'READ: Object not found'
      };
      res.status(404).send({
        error: err.message
      });
    }
  }

  function update(req, res) {
    const newObject = _update(req.params.id, req.body);
    jsonModify.updateJsonEntry(newObject, _handleResponse(404, res));
  }

  function onDelete(req, res) {
    jsonModify.removeFromJson(req.params.id, _handleResponse(404, res));
  }

  function showList(req, res) {
    console.log("get request recieved for everything");
    const output = jsonModify.getJson();
    res.status(200).send(output);
  }

  router.get('/', showList);
  router.post('/', create);
  router.get('/:id', read);
  router.put('/:id', update);
  router.delete('/:id', onDelete);

  return {
    _handleResponse,
    create,
    onDelete,
    read,
    router,
    showList,
    update
  };
}

module.exports = crud;
