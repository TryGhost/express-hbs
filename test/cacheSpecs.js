var request = require('supertest');
var path = require('path');
var rewire = require('rewire');
var assert = require('assert');
var fs = require('fs');


/**
 * Creates instance of example app using an injected version of express-hbs to track the number of times a
 * file is read. Additionally, the $NODE_ENV environment variable may be set.
 *
 * @param env
 * @returns {{app: hbs, readCounts: {}}}
 */
function createApp(env) {
  var readCounts = {};
  var hbs = rewire('../lib/hbs');
  hbs.__set__('fs', {
    readFileSync: function(filename, encoding) {
      if (typeof readCounts[filename] === 'undefined') {
        readCounts[filename] = 1;
      } else {
        readCounts[filename] += 1;
      }

      return fs.readFileSync(filename, encoding);
    },

    readFile: function(filename, encoding, cb) {
      if (typeof readCounts[filename] === 'undefined') {
        readCounts[filename] = 1;
      } else {
        readCounts[filename] += 1;
      }

      fs.readFile(filename, encoding, cb);
    },
    existsSync: function(filename, encoding) {
      return fs.existsSync(filename, encoding);
    }
  });

  // used mocked hbs in example
  var example = require('../example/app');
  var app = example.create(hbs, env);
  return {app: app, readCounts: readCounts};
}


describe('express-hbs', function() {
  describe('cache', function() {

    it('should not cache layout in `development`', function(done) {
      var mock = createApp('development');

      request(mock.app)
        .get('/')
        .end(function(err) {
          assert.ifError(err);

          request(mock.app)
            .get('/')
            .expect(/DEFAULT LAYOUT/)
            .end(function(err) {
              assert.ifError(err);

              var filename = path.resolve(__dirname, '../example/views/layout/default.hbs');
              assert.equal(mock.readCounts[filename], 2);
              done();
            });
        });
    });

    it('should cache layout in `production` reading file once', function(done) {
      var mock = createApp('production');

      // reads layout from fs once
      request(mock.app)
        .get('/')
        .end(function(err) {
          assert.ifError(err);

          request(mock.app)
            .get('/')
            .expect(/DEFAULT LAYOUT/)
            .end(function(err, res) {
              assert.ifError(err);

              var filename = path.resolve(__dirname, '../example/views/layout/default.hbs');
              assert.equal(mock.readCounts[filename], 1);
              done();
            });
        });
    });

    it('should not cache partials in `development`', function(done) {
      var mock = createApp('development');

      request(mock.app)
        .get('/veggies')
        .expect(/just a comment/)
        .end(function(err) {
          assert.ifError(err);
          request(mock.app)
            .get('/veggies')
            .expect(/just a comment/)
            .end(function(err) {
              assert.ifError(err);

              var filename = path.resolve(__dirname, '../example/views/partials/sub/comment.hbs');
              assert.equal(mock.readCounts[filename], 2);
              done();
            });
        });
    });

    it('should cache partials in `production', function (done) {
      var mock = createApp('production');

      request(mock.app)
        .get('/veggies')
        .expect(/just a comment/)
        .end(function(err) {
          assert.ifError(err);
          request(mock.app)
            .get('/veggies')
            .expect(/just a comment/)
            .end(function(err) {
              assert.ifError(err);

              var filename = path.resolve(__dirname, '../example/views/partials/sub/comment.hbs');
              assert.equal(mock.readCounts[filename], 1);
              done();
            });
        });
    });
  });
});
