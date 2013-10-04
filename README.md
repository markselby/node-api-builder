# api-builder [![Build Status](https://secure.travis-ci.org/mark.selby/node-api-builder.png?branch=master)](http://travis-ci.org/mark.selby/node-api-builder)

Build API's in Node.

Load controllers, models and structures into optionally namespaced target(s).
Initialize routes from config/routes.js.
Easily add Redis backed sessions and gzipped Redis response caching.

## Getting Started
Install the module with: `npm install api-builder`

## Examples
Start the API with :
```javascript
var apiBuilder = require('api-builder');
var express = require('express');
app = express();

app.use(express.cookieParser());

// Use Redis for sessions
// Requires a config/redis-cache.yml, something like :
```yaml
defaults: &defaults
  db: 2
  host: localhost
  port: 6379

development:
  <<: *defaults
  secret: qwertyuiop-dev:-)

production:
  <<: *defaults
  secret: qwertyuiop-prod:-)
```
_then in your server.js_
apiBuilder.redisSession(app, express);

// Optionally cache responses in Redis, to be defined per controller function
// See sample controllers below for usage
// Requires a config/redis-cache.yml, something like :
```yaml
defaults: &defaults
  host: localhost
  port: 6379

development:
  <<: *defaults
  password: redis

production:
  <<: *defaults
  password: hard-password
```
_then in your server.js say_
apiBuilder.cache.init(app, express);

// Some default Express stuff
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));

// Models available from the top level global namespace
apiBuilder.models.load('app/models', global);

// Controllers namespaced by "controllers", eg. controllers.blah.blah
apiBuilder.controllers.load('app/controllers', global.controllers = {});

// Connect some defined routes to your controller functions
apiBuilder.routes.load(app, 'config/routes.yml', global.controllers);
```

Routes (/config/routes.yml) might look like this :
```yaml
- { path: '/',                            method: get,    action: Home.index }
- { path: '/:slug/:id/blogs',             method: get,    action: Blogs.show }
- { path: '/users/details',               method: get,    action: Users.details }
- { path: '/contact-us',                  method: post,   action: Messages.contactUs }
```

/app/controllers/home.js might look like :
```javascript
module.exports = {
  index: function (req, res) {
    res.cache = 3600; // Cache this in Redis for one hour
    res.json({
      cheese: 'camembert'
    });
  },
  foo: function(req, res) {
    // This won't cache because we haven't defined a res.cache lifetime
    res.render('some/template', { cheese: 'edam' });
  }
};
```

_Given_ :  
/app/models/user.js  
/app/models/user/roles.js  
/app/models/user/profile.js

_loaded as_ :
apiBuilder.models.load('app/models', global.models = {});

_models are then accessed as_ :  
models.User.someAttribute  
models.User.Roles.someAttribute  
models.User.Profile.someAttribute  

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## License
Copyright (c) 2013 Mark Selby  
Licensed under the MIT license.
