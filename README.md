# api-builder [![Build Status](https://secure.travis-ci.org/mark.selby/node-api-builder.png?branch=master)](http://travis-ci.org/mark.selby/node-api-builder)

Build API's in Node. It loads controllers, models and structures into global.controllers.blah, global.models.blah and global.structures.blah, sets up an Express application on the desired port and initializes routes from config/routes.js.

## Getting Started
Install the module with: `npm install api-builder`

## Examples
Start the API with :
```javascript
  // defaults shown
  var APIBuilder = require('api-builder');
  api = new APIBuilder({
    controllers: 'app/controllers',
    models: 'app/models',
    structures: 'app/structures',
    port: 3001
  });
  api.init();
```

Routes (/config/routes.js) looks like this :
```javascript
module.exports = [
  { path:'/', method: 'get', controller: 'welcome', action: 'index' },
  { path:'/user/:id', method: 'get', controller: 'users', action: 'view_profile' },
];
```

/app/controllers/homepage.js might look like :
```javascript
module.exports = {
  index: function (req, res) {
    // Normal express request handling goes here
  },
  foo: function(req, res) {
    res.json({
      foo: 'bar',
      cheese: 'camembert'
    });
  }
};
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_v0.1.0_

## License
Copyright (c) 2013 Mark Selby  
Licensed under the MIT license.
