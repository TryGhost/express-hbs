var assert = require('assert');
var hbs = require('..');
var H = require('./helpers');

describe('helpers', function() {

  describe('sync', function() {
    var dirname = __dirname + '/views/helpers';

    function sync(s, options) {
      return new hbs.SafeString("-sync-" + s);
    }

    it ('should register functions', function(done) {
      var hb = hbs.create();
      hb.registerHelper("sync", sync);
      var render = hb.express3({
        viewsDir: dirname
      });
      var locals = H.createLocals('express3', dirname);

      render(dirname + '/home/index.hbs', locals, function(err, html) {
        assert.equal('<default>index-sync-index</default>', H.stripWs(html));
        done();
      });
    });
  });

  describe('async', function() {
    var dirname = __dirname + '/views/helpers';
    it ('should register functions', function(done) {
      var hb = hbs.create();
      function async(s, cb) {
        setTimeout(function() {
          cb(new hb.SafeString("-async-" + s));
        }, Math.floor((Math.random()*10)+1));
      }
      hb.registerAsyncHelper("async", async);

      var render = hb.express3({
        viewsDir: dirname
      });
      var locals = H.createLocals('express3', dirname);

      render(dirname + '/home/async.hbs', locals, function(err, html) {
        assert.equal('<default>asynctemplate-async-foo-async-bar-async-bah-async-baz</default>', H.stripWs(html));
        done();
      });
    });


  });

});
