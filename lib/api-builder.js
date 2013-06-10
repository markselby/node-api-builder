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
var grunt = require('grunt');

var APIBuilder = function APIBuilder(options) {
  this.options = options || {};
  this.root = process.env.PWD;
};

var p = APIBuilder.prototype;

p.init = function () {
  this.loadModels();
  this.loadStructures();
  this.loadControllers();
  this.initialize();
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
      name = _s.capitalize(_s.camelize(file.split('.')[0]));
      target[name] = require(path.join(dir, file.split('.')[0]));
    }
  }.bind(this));
};

p.loadRoutes = function (app) {
  var routes = grunt.file.readYAML(process.cwd() + '/config/routes.yml');

  routes.forEach(function (r, i) {
    if (!r.path) { this.badRoute('path', r, i); }
    if (!r.method) { this.badRoute('method', r, i); }
    if (!r.action) { this.badRoute('action', r, i); }

    var target = r.action.split('.');

    var pathItem, method, targetCtrl = [];
    var controller = global.controllers;
    while (controller[pathItem = target.shift()]) {
      if (typeof controller[pathItem] === 'function') {
        method = pathItem;
        break;
      }
      controller = controller[pathItem];
      targetCtrl.push(pathItem);
    }
    method = method || 'index';

    console.log('Resolved : ' + targetCtrl.join('.') + ' -> ' + method);

    app[r.method](r.path, controller[method]);
  }.bind(this));
};

p.badRoute = function (item, row, index) {
  throw 'Route ' + (index + 1) + ' ' + item + ' missing : ' + Util.inspect(row);
};

p.initialize = function (app) {
  if (!app) {
    var express = require('express');
    // // var passport = global.passport;
    // var passport = require('passport');

    app = express();
    app.configure(function () {
      app.use(express.bodyParser());  // Handle POST requests
      app.use(express.cookieParser());
      // this.app.use(express.compress());
      app.use(express.methodOverride());
      app.use(express.session({ secret: '498f99f3bbee4ae3a075eada02488464' }));
      // app.use(passport.initialize());
      // app.use(passport.session());
      app.use(app.router);
      app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
    });
  }

  // this.app.get('*', function(req, res, next) {
  //   console.log('Got req : ' + req.url);
  //   next();
  // });

  this.loadRoutes(app);
  var port = this.options.port || 3010;
  app.listen(port);
  console.log('Listening on port ' + port);
  this.app = app;
};

module.exports = APIBuilder;
