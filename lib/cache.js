var crypto = require('crypto');
var grunt = require('grunt');
var redis = require('redis');
var zlib = require('zlib');
var redisClient;

function storeInPostgres(cacheKey, hash, body) {
  console.log('Storing in postgres with : ' + config.server.name);
  db.named('page-cache-update', [
    config.server.name, cacheKey, hash.etag, hash.max_age, hash.content_type, hash.content_length, hash.content_encoding, body
  ])
  .on('error', function(e) { console.log('Page cache error : ' + e); })
  .execute();
}

function storeInRedis(cacheKey, hash, body) {
  redisClient.multi()
    .hmset(cacheKey + '-meta', hash)
    .set(cacheKey + '-content', body)
    .expire(cacheKey + '-meta', hash.max_age)
    .expire(cacheKey + '-content', hash.max_age)
    .exec();
}

/**
 * Make your final call through this, so that versioning and updates to data structures can be made without breaking
 * backwards compatibility.
 */
function storeInCache(req, res, body, cb) {
  var hash = ((typeof res._cache === 'number') ? { max_age: res._cache } : res._cache) || {};
  var cacheKey = req.originalUrl;

  if(isNaN(hash.max_age) || (res.statusCode !== 200 && res.statusCode !== 304)) {
    cb(hash, body);
    return;
  }

  hash.content_type = res.get('Content-Type');
  hash.content_length = res.get('Content-Length');
  hash.etag = res.get('ETag');

  if(config.server.gzip_cache) {
    zlib.gzip(body, function(err, zipped) {
      var len = Buffer.isBuffer(zipped) ? zipped.length : Buffer.byteLength(zipped)
      res.set('Content-Length', len);
      res.set('Content-Encoding', 'gzip');
      hash.content_length = len;
      hash.content_encoding = 'gzip';
      config.server.cache_to == 'postgres' ? storeInPostgres(cacheKey, hash, zipped) : storeInRedis(cacheKey, hash, zipped);
      cb(hash, zipped);
    });
  }
  else {
    config.server.cache_to == 'postgres' ? storeInPostgres(cacheKey, hash, body) : storeInRedis(cacheKey, hash, body);
    cb(hash, body);
  }
};

// Use our own ETag
var etag = function etag(body) {
  return crypto.createHash('md5').update(body).digest('hex');
}

var send = function send(body){
  var req = this.req;
  var head = 'HEAD' == req.method;
  var len;

  // settings
  var app = this.app;

  // allow status / body
  if (2 == arguments.length) {
    // res.send(body, status) backwards compat
    if ('number' != typeof body && 'number' == typeof arguments[1]) {
      this.statusCode = arguments[1];
    } else {
      this.statusCode = body;
      body = arguments[1];
    }
  }

  switch (typeof body) {
    // response status
    case 'number':
      this.get('Content-Type') || this.type('txt');
      this.statusCode = body;
      body = http.STATUS_CODES[body];
      break;
    // string defaulting to html
    case 'string':
      if (!this.get('Content-Type')) {
        this.charset = this.charset || 'utf-8';
        this.type('html');
      }
      break;
    case 'boolean':
    case 'object':
      if (null == body) {
        body = '';
      } else if (Buffer.isBuffer(body)) {
        this.get('Content-Type') || this.type('bin');
      } else {
        return this.json(body);
      }
      break;
  }

  // populate Content-Length
  if (undefined !== body && !this.get('Content-Length')) {
    this.set('Content-Length', len = Buffer.isBuffer(body)
      ? body.length
      : Buffer.byteLength(body));
  }

  // ETag support
  // TODO: W/ support
  if (app.settings.etag && len > 1024 && 'GET' == req.method) {
    if (!this.get('ETag')) {
      this.set('ETag', etag(body));
    }
  }

  // freshness
  if (req.fresh) this.statusCode = 304;

  storeInCache(req, this, body, function(hash, body) {
    if(hash.content_encoding) this.set('Content-Encoding', hash.content_encoding);
    if(hash.etag) this.set('ETag', hash.etag);
    if(hash.max_age) this.set('Max-Age', hash.max_age);

    // strip irrelevant headers and remove the body here after caching
    // so that we don't prime a half empty cache if the first client
    // came back with a matching etag
    if (204 == this.statusCode || 304 == this.statusCode) {
      this.removeHeader('Content-Type');
      this.removeHeader('Content-Length');
      this.removeHeader('Transfer-Encoding');
      body = '';
    }

    this.end(head ? null : body);
  }.bind(this));

  // respond
  return this;
};

/**
 * This hooks res.end. If the controller sets "res.cache = seconds" the response is cached in Redis for that many seconds.
 * Cache entries are keyed by URL, and the content is always gzipped.
 */

function cache(lifetime) {
  var url = this.req.originalUrl;
  if(config.server.cache_to == 'postgres') {
    db.named('page-cache-pending', [
      config.server.name, url
    ]).execute();
  }
  this._cache = lifetime;
  this.send = send;
}

// 
function caching(req, res, next) {
  res.cache = cache;
  next();
};

/**
 * Reads the connection details from config/redis-cache.yml and connects to the server
 */
exports.init = function init(app) {
  if (!app) { throw 'api-builder\'s cache.init(app) needs the express app as a parameter' }
  try { var options = grunt.file.readYAML('config/redis-cache.yml')[process.env.NODE_ENV]; }
  catch (e) { throw 'Please define a config/redis-cache.yml'; }
  if (isNaN(parseInt(options.db))) { throw 'Please set a db: x value in config/redis-cache.yml'; }
  redisClient = redis.createClient(options.port, options.host, { auth_pass: options.password });
  redisClient.select(options.db);
  redisClient.on('error', function (err) {
    console.log('Redis client error : ' + err);
  });

  app.use(caching);
}
