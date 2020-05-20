var generateId = require('./generate-id');

var ID_LENGTH = 8;
var ID_PREFIX = '__aSyNcId_<_';
var ID_SUFFIX = '__';

function resolve(cache, fn, context) {
  var id = ID_PREFIX + generateId(ID_LENGTH) + ID_SUFFIX;
  cache[id] = new Promise(function(passed, failed) {
    try {
      fn(context, function(res) {
        passed(res);
      });
    } catch (error) {
      failed(error);
    }
  });
  return id;
}

function done(cache, callback) {
  var list = Object.entries(cache);
  Promise.all(list.map(e => e[1])).then(function(values) {
    callback(null, list.reduce((o,e,i) => {
      o[e[0]] = values[i]; return o;
    }, {}));
  }).catch(function(error) {
    callback(error);
  });
}

function hasResolvers(text) {
  if (text.search(ID_PREFIX) > 0) {
    return true;
  }
  return false;
}

module.exports = {
  done: done,
  hasResolvers: hasResolvers,
  resolve: resolve
};
