var crypto = require('crypto');
var grunt = require('grunt');
var redis = require('redis');
var zlib = require('zlib');
var redisClient;

/**
 * Make your final call through this, so that versioning and updates to data structures can be made without breaking
 * backwards compatibility.
 */
function storeInRedis(req, res) {
  var cacheKey = req.originalUrl;
  var lifetime = res.cache || 31536000; // 60 * 60 * 24 * 365
  var etag = crypto.createHash('md5').update(res.body).digest('hex');
  res.header('etag', etag);

  zlib.gzip(res.body, function(err, result) {
    // console.log(typeof result);
    // console.log('Before : ' + res.body.length + ', after : ' + result.length);
    // Metadata, stored under a separate key (*-meta)
    // #TODO Does it need to be separate keys? Then modify the Nginx LUA to read just the etag field first
    // and then the whole *one* hash afterwards as necessary. Bad for I/O compared to two separate keys?
    var hash = {
      etag: etag,
      max_age: lifetime,
      content_type: res._headers['content-type'],
      content_length: result.length,
      content_encoding: 'gzip'
    };

    // Stick the results into Redis
    redisClient.multi()
      .hmset(cacheKey + '-meta', hash)
      .set(cacheKey + '-content', result)
      .expire(cacheKey + '-meta', lifetime)
      .expire(cacheKey + '-content', lifetime)
      .exec();
  });
  console.log('Caching result');
};

/**
 * This provides a res.cache method for use in controllers when caching responses
 */
function cache(req, res, next) {
  var end = res.end;
  res.end = function(chunk, encoding) {
    res.body = chunk;
    storeInRedis(req, res);     // Compress the output and initiate the Redis conversation
    res.end = end;              // Restore the original end function to its rightful place
    res.end(chunk, encoding);   // Respond to the user with the compressed result
  }
  next();
};

/**
 * Reads the connection details from config/redis-cache.yml and connects to the server
 */
exports.init = function init(app) {
  if (!app) { throw 'api-builder\'s cache.init(app) needs the express app as a parameter' }
  try { var options = grunt.file.readYAML('config/redis-cache.yml')[process.env.NODE_ENV]; }
  catch (e) { throw 'Please define a config/redis-cache.yml'; }

  redisClient = redis.createClient(options.port, options.host, { auth_pass: options.password });
  redisClient.on('error', function (err) {
    console.log('Redis Client Error : ' + err);
  });

  app.use(cache);
}
