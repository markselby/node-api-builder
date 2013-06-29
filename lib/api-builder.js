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
var zlib = require('zlib');
var redis = require('redis');
var redisClient = redis.createClient();
var crypto = require('crypto');

redisClient.on("error", function (err) {
  console.log("Redis Client Error : " + err);
});

var APIBuilder = function APIBuilder(options) {
  this.options = options || {};
  this.root = process.env.PWD;
};

var p = APIBuilder.prototype;

p.init = function () {
  this.initialize();
  this.loadModels();
  this.loadStructures();
  this.loadControllers();
  this.loadRoutes();
};

var restFunctions = {
  list:  { method: 'get' },
  show:   { method: 'get', path: '/:id' },
  create: { method: 'post' },
  update: { method: 'put', path: '/:id' },
  'delete': { method: 'delete', path: '/:id' }
};

p.restify = function restify() {
  Object.keys(global.controllers).forEach(function (controller) {
    var ctrl = global.controllers[controller];
    Object.keys(restFunctions).forEach(function (func) {
      if (typeof ctrl[func] === 'function') {
        var method = restFunctions[func].method;
        var path = '/' + controller.toLowerCase() + (restFunctions[func].path || '');
        var target = ctrl[func];
        console.log('Rest function : ' + controller + '#' + func + ' : ' + method + ' -> ' + path);
        this.app[method](path, target);
      }
    }, this);
  }, this);
};

p.loadControllers = function () {
  global.controllers = {};
  var dir = path.join(this.root, this.options.controllers || '/app/controllers');
  this.loadItems(dir, global.controllers);
  this.restify();
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

p.loadRoutes = function () {
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
    method = method || 'list';

    console.log('Resolved : ' + targetCtrl.join('.') + ' -> ' + method);

    this.app[r.method](r.path, controller[method]);
  }.bind(this));
};

p.badRoute = function (item, row, index) {
  throw 'Route ' + (index + 1) + ' ' + item + ' missing : ' + Util.inspect(row);
};

function cached(body, lifetime, type) {
  var key = this.req.originalUrl;
  var res = this;
  var etag, len;

  if (typeof body === 'object') {
    body = JSON.stringify(body);
  }
  zlib.gzip(body, function(err, result) {
    if (err) return;
    len = result.length;
    etag = crypto.createHash('md5').update(result).digest('hex');

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'max-age=' + lifetime); 
    res.setHeader('Content-Encoding', 'gzip'); 
    res.setHeader('Content-Length', len); 
    res.setHeader('Content-Type', type); 
    res.end(result, 'binary');

    var hash = {
      etag: etag,
      max_age: lifetime,
      content_type: type,
      content_length: len,
      content_encoding: 'gzip'
    };

    redisClient.hmset(key + '-meta', hash, redis.print);
    redisClient.set(key + '-content', result, redis.print);
    redisClient.expire(key + '-meta', lifetime);
    redisClient.expire(key + '-content', lifetime);
  });
};

p.initialize = function (app) {  if (!app) {
    var express = require('express');
    var response = express.response;
    response.cached = cached;

    // var passport = global.passport;
    // var passport = require('passport');

    app = express();
    app.configure(function () {
      app.use(express.bodyParser());  // Handle POST requests
      app.use(express.cookieParser());
      // app.use(express.compress());
      app.use(express.methodOverride());
      app.use(express.session({ secret: '498f99f3bbee4ae3a075eada02488464' }));
      // app.use(passport.initialize());
      // app.use(passport.session());
      app.use(app.router);
      app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
    });
  }

  var port = this.options.port || 3010;
  app.listen(port);
  console.log('Listening on port ' + port);
  this.app = app;
};

module.exports = APIBuilder;
