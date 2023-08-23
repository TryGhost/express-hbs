'use strict';

var Promise = require('bluebird');

var generateId = require('./generate-id');

var ID_LENGTH = 8;
var ID_PREFIX = '__aSyNcId__';

// NOTE: We must include a character which is escaped by Handlebars in the "async id"
// This is so that when using an async helper "inline", such as {{asyncHelper "foo"}}
// the content is correctly escaped depending on whether double or triple braces.
var ID_ESCAPED_STRING = '<_';

var ID_SUFFIX = '__';

function resolve(cache, fn, context) {
  var id = ID_PREFIX + ID_ESCAPED_STRING + generateId(ID_LENGTH) + ID_SUFFIX;
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
  Promise.props(cache).then(function(values) {
    callback(null, values);
  }).catch(function(error) {
    callback(error);
  });
}

function hasResolvers(text) {
  // NOTE: We specifically search the text for the ID_PREFIX **NOT** including the escapable character
  // This is because that character can be escaped in the text, and lead us to not finding unresolved
  // async helper outputs.
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
