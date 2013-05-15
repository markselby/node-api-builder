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
var Util = require('util');
var _s = require('underscore.string');

var APIBuilder = function APIBuilder(options) {
  this.options = options || {};
  this.root = process.env.PWD;
};

var p = APIBuilder.prototype;

p.init = function () {
  this.loadModels();
  this.loadStructures();
  this.loadControllers();
  this.createApp();
  // this.loadRoutes();
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
  try {
    if (!fs.statSync(dir).isDirectory()) { return; }
  } catch (e) {
    return;
  }
  var name, files = fs.readdirSync(dir);
  files.forEach(function (file) {
    var fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      name = fullPath.split('/').pop();
      target[name] = { name: name };
      this.loadItems(fullPath, target[name]);
    } else {
      name = _s.capitalize(file.split('.')[0]);
      target[name] = require(path.join(dir, file.split('.')[0]));
    }
  }.bind(this));
};

p.loadRoutes = function () {
  var routes;
  try {
    routes = require(path.join(this.root, 'config/routes'));
  } catch (e) {
    throw 'Please define a routes file : /config/routes.js';
  }
  routes.forEach(function (r, i) {
    if (!r.handler) { this.badRoute('handler', r, i); }
    if (!r.path) { this.badRoute('path', r, i); }
    if (!r.method) { this.badRoute('method', r, i); }

    var target = r.handler.split('#');
    if (!(target.length === 2)) {
      throw 'Route ' + (i + 1) + ' handler should be Controller#method : ' + Util.inspect(r);
    }
    this.app[r.method](r.path, global.controllers[target[0]][target[1]]);
  }.bind(this));
};

p.badRoute = function (item, row, index) {
  throw 'Route ' + (index + 1) + ' ' + item + ' missing : ' + Util.inspect(row);
};

p.createApp = function () {
  var express = require('express');
  // // var passport = global.passport;
  // var passport = require('passport');

  this.app = express();
  this.app.configure(function () {
    // this.app.use(express.bodyParser());  // Handle POST requests
    this.app.use(require('connect').bodyParser());  // Handle POST requests
    this.app.use(express.cookieParser());
    // this.app.use(express.compress());
    this.app.use(express.methodOverride());
    this.app.use(express.session( { secret: '498f99f3bbee4ae3a075eada02488464' } ));
    this.app.use(passport.initialize());
    this.app.use(passport.session());
    this.app.use(this.app.router);
    this.app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
    this.app.set('view engine', 'jade');
  }.bind(this));

  // this.app.get('*', function(req, res, next) {
  //   console.log('Got req : ' + req.url);
  //   next();
  // });

  this.loadRoutes();
  var port = this.options.port || 3010;
  this.app.listen(port);
  console.log('Listening on port ' + port);
};

module.exports = APIBuilder;
