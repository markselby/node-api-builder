var crypto = require('crypto');
var grunt = require('grunt');
var redis = require('redis');
var redisClient;
var zlib = require('zlib');

function cache(body, type, lifetime) {
  var key = this.req.originalUrl;
  var res = this;
  var etag, len;
  var lifetime = lifetime || 31536000; // 60 * 60 * 24 * 365

  if (typeof body === 'object') {
    body = JSON.stringify(body);
  }

  zlib.gzip(body, function(err, result) {
    if (err) return;
    len = result.length;
    etag = crypto.createHash('md5').update(result).digest('hex');

    // Stick the result into Redis first so that other requests might use it
    var hash = {
      etag: etag,
      max_age: lifetime,
      content_type: type,
      content_length: len,
      content_encoding: 'gzip'
    };

    redisClient.hmset(key + '-meta', hash);
    redisClient.set(key + '-content', result);
    redisClient.expire(key + '-meta', lifetime);
    redisClient.expire(key + '-content', lifetime);

    // Send the gzipped result to the client
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'max-age=' + lifetime); 
    res.setHeader('Content-Encoding', 'gzip'); 
    res.setHeader('Content-Length', len); 
    res.setHeader('Content-Type', type); 
    res.end(result, 'binary');
  });
};

exports.init = function init(express) {
  var response = express.response;
  response.cache = cache;

  if (!express) { throw 'api-builder\'s cache.init(app) needs the express app as a parameter' }
  try { var options = grunt.file.readYAML('config/redis-cache.yml')[process.env.NODE_ENV]; }
  catch (e) { throw 'Please define a config/redis-cache.yml'; }

  redisClient = redis.createClient(options.port, options.host, { auth_pass: options.password });
  redisClient.on('error', function (err) {
    console.log('Redis Client Error : ' + err);
  });
}
