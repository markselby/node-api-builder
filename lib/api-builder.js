/*
 * api-builder
 * https://github.com/mark.selby/node-api-builder
 *
 * Copyright (c) 2013 Mark Selby
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');
var fs = require('fs');
var util = require('util');

var APIBuilder = function APIBuilder(options) {
  this.options = options || {};
  this.root = process.env.PWD;
};

var p = APIBuilder.prototype;

p.init = function () {
  this.loadControllers();
  this.loadModels();
  this.loadStructures();
  this.createApp();
  this.loadRoutes();
};

p.loadControllers = function () {
  global.controllers = {};
  var dir = path.join(this.root, this.options.controllers || '/app/controllers');
  this.loadItems(dir, global.controllers);
};

p.loadModels = function () {
  global.models = {};
  var dir = path.join(this.root, this.options.models || '/app/models');
  this.loadItems(dir, global.models);
};

p.loadStructures = function () {
  global.structures = {};
  var dir = path.join(this.root, this.options.structures || '/app/structures');
  this.loadItems(dir, global.structures);
};

// Helper for loading controllers, models and structures
p.loadItems = function (dir, target) {
  if (!fs.statSync(dir).isDirectory()) { return; }
  var files = fs.readdirSync(dir);

  files.forEach(function (file) {
    var name = file.split('.')[0];
    // target[name.titleize().camelize()] = require(path.join(dir, name));
    target[name] = require(path.join(dir, name));
  });
};

p.loadRoutes = function () {
  var routes;
  try {
    routes = require(path.join(this.root, 'config/routes'));
  } catch (e) {
    throw 'Please define a routes file : /config/routes.js';
  }
  routes.forEach(function (r, i) {
    if (!r.controller) { this.badRoute('controller', r, i); }
    if (!r.action) { this.badRoute('action', r, i); }
    if (!r.path) { this.badRoute('path', r, i); }
    if (!r.method) { this.badRoute('method', r, i); }
    this.app[r.method](r.path, global.controllers[r.controller][r.action]);
  }.bind(this));
};

p.badRoute = function (item, row, index) {
  throw 'Route ' + (index + 1) + ' ' + item + ' missing : ' + util.inspect(row);
};

p.createApp = function () {
  var express = require('express');
  this.app = express();
  this.app.configure(function () {
    this.use(express.bodyParser());  // Handle POST requests
    this.use(express.cookieParser());
    this.use(express.compress());
  });
  this.loadRoutes();
  var port = this.options.port || 3010;
  this.app.listen(port);
  console.log('Listening on port ' + port);
};

module.exports = APIBuilder;
