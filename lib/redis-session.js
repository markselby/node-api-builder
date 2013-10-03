var grunt = require('grunt');

module.exports = function (app, express) {
  if (!app) { throw 'api-builder\'s redisSession.init(app) needs the express app as a parameter' }
  try { var options = grunt.file.readYAML('config/redis-session.yml')[process.env.NODE_ENV]; }
  catch (e) { throw 'Please define a config/redis-session.yml'; }

  var RedisStore = require(process.cwd() + '/node_modules/connect-redis')(express);
  app.use(express.session({
    store: new RedisStore(options),
    secret: options.secret
  }));
}
