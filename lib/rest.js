
// var restFunctions = {
//   list:  { method: 'get' },
//   show:   { method: 'get', path: '/:id' },
//   create: { method: 'post' },
//   update: { method: 'put', path: '/:id' },
//   'delete': { method: 'delete', path: '/:id' }
// };

// p.restify = function restify() {
//   Object.keys(global.controllers).forEach(function (controller) {
//     var ctrl = global.controllers[controller];
//     Object.keys(restFunctions).forEach(function (func) {
//       if (typeof ctrl[func] === 'function') {
//         var method = restFunctions[func].method;
//         var path = '/' + controller.toLowerCase() + (restFunctions[func].path || '');
//         var target = ctrl[func];
//         console.log('Rest function : ' + controller + '#' + func + ' : ' + method + ' -> ' + path);
//         this.app[method](path, target);
//       }
//     }, this);
//   }, this);
// };

