var grunt = require('grunt');
var redis = require('redis');
var zlib = require('zlib');
var redisClient;

function storeInRedis(req, res) {
  var cacheKey = req.originalUrl;
  var lifetime = res.cache || 31536000; // 60 * 60 * 24 * 365

  zlib.gzip(res.body, function(err, result) {
    if (err) return;

    // Metadata, stored under a separate key (/url-meta)
    var hash = {
      etag: res._headers['etag'],
      max_age: lifetime,
      content_type: res._headers['content-type'],
      content_length: res._headers['content-length'],
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
};

function cache(req, res, next) {
  var end = res.end;
  res.end = function(chunk, encoding) {
    if(res.cache) {
      res.body = chunk;
      storeInRedis(req, res);
    }
    res.end = end;
    res.end(chunk, encoding);
  };
  next();
};

exports.init = function init(app, express) {
  if (!express) { throw 'api-builder\'s cache.init(app) needs the express app as a parameter' }
  try { var options = grunt.file.readYAML('config/redis-cache.yml')[process.env.NODE_ENV]; }
  catch (e) { throw 'Please define a config/redis-cache.yml'; }

  redisClient = redis.createClient(options.port, options.host, { auth_pass: options.password });
  redisClient.on('error', function (err) {
    console.log('Redis Client Error : ' + err);
  });

  app.use(cache);
}
