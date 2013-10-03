/**
 *  General functions used by this module
 */
var grunt = require('grunt');
var path = require('path');

/**
 *  Synchronously recurse a given directory and pass each matching file to a callback along with any specified context
 *  and the file require path 
 */
exports.loadFiles = function (dir, ctx, cb) {
  if (ctx && !(typeof ctx === 'object')) throw new Error('Context must be an object');
  grunt.file.expand({ cwd: dir }, '**/*.js').forEach(function(file) {
    cb(file, ctx, path.join(process.cwd(), dir, path.dirname(file), path.basename(file, '.js')));
  });
}
