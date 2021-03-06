# api-builder [![Build Status](https://secure.travis-ci.org/mark.selby/node-api-builder.png?branch=master)](http://travis-ci.org/mark.selby/node-api-builder)

Build API's in Node.

Load controllers, models and structures into optionally namespaced target(s).  
Initialize routes from config/routes.js.  
Easily add Redis backed sessions and gzipped Redis response caching.

## Getting Started
Install the module with: `npm install api-builder`

## Building your server.js

```javascript
var apiBuilder = require('api-builder');
var express = require('express');
app = express();
app.use(express.cookieParser());
```

Use Redis for sessions  
Requires a _config/redis-session.yml_, something like :
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
then in your server.js

```javascript
apiBuilder.redisSession(app, express);
```

Optionally cache responses in Redis, to be defined per controller function.  
See sample controllers below for usage.  
Requires a _config/redis-cache.yml_, something like :

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

```javascript
apiBuilder.cache.init(app, express);
```

Now some default Express stuff
```javascript
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.errorHandler({ showStack: true, dumpExceptions: true }));
```

Make models available from the top level global namespace
```javascript
apiBuilder.models.load('app/models', global);
```

Controllers namespaced by "controllers", eg. controllers.blah.blah
```javascript
apiBuilder.controllers.load('app/controllers', global.controllers = {});
```

Now you can connect some defined routes to your controller functions
```javascript
apiBuilder.routes.load(app, 'config/routes.yml', global.controllers);
```

Routes (config/routes.yml) might look like this :
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

Given :  
/app/models/user.js  
/app/models/user/roles.js  
/app/models/user/profile.js

loaded as :  
```javascript
apiBuilder.models.load('app/models', global.models = {});
```

models are then accessed as :  
```javascript
models.User.someAttribute  
models.User.Roles.someAttribute  
models.User.Profile.someAttribute  
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## License
Copyright (c) 2013 Mark Selby  
Licensed under the MIT license.
