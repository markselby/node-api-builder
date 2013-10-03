var grunt = require('grunt');
var util = require('util');

var badRoute = function (item, row, index) {
  throw 'Route ' + (index + 1) + ' ' + item + ' missing : ' + util.inspect(row);
};

exports.load = function load (app, filename, controllers) {
  if (!app) { throw 'api-builder\'s routes.load(app, filename, controllers) needs the express app as the app parameter' }
  controllers = controllers || global.controllers;
  if (!(typeof controllers === 'object')) {
    throw new Error('controllers is not an object');
  }

  filename = filename || 'config/routes.yml';
  var routes = grunt.file.readYAML(process.cwd() + '/' + filename);

  routes.forEach(function (r, i) {
    if (!r.path) { badRoute('path', r, i); }
    if (!r.method) { badRoute('method', r, i); }
    if (!r.action) { badRoute('action', r, i); }

    var parts = r.action.split('.');
    var ctx = controllers;

    try {
      while((parts.length > 1) && (item = parts.shift())) { ctx = ctx[item]; }
    }
    catch (e) {
      throw new Error('Route ' + (i + 1) + ', missing controller : ' + r.action);
    }

    var method = parts.shift();
    if (!(typeof ctx[method] === 'function')) {
      throw new Error('Route ' + (i + 1) + ', missing controller function : ' + r.action);
    }

    console.log('Resolved : ' + r.path + ' [' + r.method + '] -> ' + r.action);

    app[r.method](r.path, ctx[method]);
  }.bind(this));
};
