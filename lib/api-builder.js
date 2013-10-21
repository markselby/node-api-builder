/*
 * api-builder
 * https://github.com/mark.selby/node-api-builder
 *
 * Copyright (c) 2013 Mark Selby
 * Licensed under the MIT license.
 */

'use strict';


/**
 * Export the Redis cache feature.
 * @constructor
 * @param {string} title - The title of the book.
 * @param {string} author - The author of the book.
 */
exports.cache = require('./cache');

exports.controllers = require('./controllers');
exports.models = require('./models');
exports.redisSession = require('./redis-session');
exports.rest = require('./rest');
exports.routes = require('./routes');
