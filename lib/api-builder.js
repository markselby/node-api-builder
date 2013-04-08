/*
 * api-builder
 * https://github.com/mark.selby/node-api-builder
 *
 * Copyright (c) 2013 Mark Selby
 * Licensed under the MIT license.
 */

'use strict';

var path = require('path');

console.log('api builder : ' + process.env.PWD);

var api_builder = function(options) {
  this.options = options || {};
  this.root = process.env.PWD;
  this.models = path.join(this.root, this.options.models || '/app/models');
  this.structures = path.join(this.root, this.options.structures || '/app/structures');
  this.init();
};

var p = api_builder.prototype;

p.init = function() {
  this.Structure = require('structures');
  log('this.Structure : ');
  log(this.Structure);

  this.loadModels();
  this.loadStructures();

  this.createApp();
}

p.loadModels = function() {

}

p.loadStructures = function() {

}

p.createApp = function() {
  var express = require('express');
  this.app = express();
  this.app.configure(function() {
    this.use(express.compress());
  });

  this.app.listen(this.options.port || 3010);
}

module.exports = api_builder;
