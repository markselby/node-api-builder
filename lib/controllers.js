var helpers = require('./helpers');
var path = require('path');

var controller = function (filename, ctx, requireName) {
  var parts = filename.split('/'), item;
  while((parts.length > 1) && (item = parts.shift().camelize())) { ctx = ctx[item] || {}; }
  ctx[path.basename(parts.shift(), '.js').camelize()] = require(requireName);
};

exports.load = function (path, ctx) {
  helpers.loadFiles(path, ctx || global, controller);
};
