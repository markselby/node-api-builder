'require strict';

/**
 * Initialize. Uniform interface for loading startup stuff, making it easy to ensure they have all completed
 * before listening for connections.
 */

var async = require('async');

console.log('this.modules = ' + this.modules);

this.modules = [];
var initialize = function initialize(module) {
  this.modules.push(module);
}

module.exports = initialize;
