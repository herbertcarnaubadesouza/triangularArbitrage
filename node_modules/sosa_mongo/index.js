var sosa = require('sosa')
  , backend = require('./mongo_backend')

module.exports = function (backend_options) {
  return sosa(backend, backend_options);
};
module.exports.backend = backend;
