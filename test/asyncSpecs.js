'use stirct';

var request = require('supertest');
var assert = require('assert');
var hbs = require('..');
var asyncApp = require('./apps/async');
var resolver = require('../lib/resolver');
var H = require('./helpers');

function makeUserRequest(app, user, cb) {
  request(app)
    .get('/')
    .set('Cookie', 'user=' + user)
    .end(function(err, res) {
      if (err) cb(err);
      if (res.text.search('Hello, ' + user) <= 0) {
        return cb(new Error('Wrong template send for user ' + user + ': ' + res.text), user);
      }
      return cb(null, user, res.text);
    });
}

function requestAll(app, users, cb) {
  var status = {};
  for(var i = 0; i < users.length; i++) {
    status[users[i]] = 'Pending';
    makeUserRequest(app, users[i], function(err, user) {
      if (err) {
        status[user] = 'Error: ' + err.message;
      } else {
        status[user] = 'Completed'
      }
    });
  }
  var checkTimer = setInterval(function() {
    for(var i = 0; i < users.length; i++) {
      if (status[users[i]] === 'Pending') {
        return;
      }
    }
    clearInterval(checkTimer);
    cb(status);
  }, 100);
}

describe('async', function() {
  it('should render all async helpers', function(done) {
    var app = asyncApp.create(hbs.create(), 'production');
    requestAll(app, ['jt','anna','joe','jeff','jane'], function(results) {
      assert.equal(results.jt, 'Completed');
      assert.equal(results.anna, 'Completed');
      assert.equal(results.joe, 'Completed');
      assert.equal(results.jeff, 'Completed');
      assert.equal(results.jane, 'Completed');
      done();
    });
  });

  it('should render nested async helpers', function(done) {
    var app = asyncApp.create(hbs.create(), 'production');
    makeUserRequest(app, 'jt', function(err, user, results) {
      if (err) {
        return done(err);
      }
      assert.equal(false, resolver.hasResolvers(results));
      assert.equal(-1, results.search('This should not show!'))
      done();
    });
  });

  describe('literal async id prefix in data', function () {
    var dirname = __dirname + '/views/asyncPrefix';

    function createRender() {
      var hb = hbs.create();
      hb.registerAsyncHelper('async', function (s, cb) {
        setTimeout(function () {
          cb(new hb.SafeString('async-' + s));
        }, 1);
      });
      return hb.express4({ viewsDir: dirname });
    }

    function renderValue(file, locals, cb) {
      var render = createRender();
      render(dirname + '/' + file, H.createLocals('express4', dirname, locals), cb);
    }

    it('renders prefix text in the middle of data verbatim', function (done) {
      renderValue('body.hbs', { body: 'x __aSyNcId__ y' }, function (err, html) {
        if (err) return done(err);
        assert.equal(html.trim(), 'hello x __aSyNcId__ y');
        done();
      });
    });

    [
      '__aSyNcId__',
      '__aSyNcId__ start',
      'middle __aSyNcId__ text',
      '__aSyNcId__<_abcdefgh__',
      'x __aSyNcId__<_abcdefgh__ y',
    ].forEach(function (value) {
      it('renders ' + JSON.stringify(value) + ' escaped and unescaped', function (done) {
        renderValue('index.hbs', { value: value }, function (err, html) {
          if (err) return done(err);
          var escaped = hbs.Utils.escapeExpression(value);
          assert.equal(html.trim(), 'hello ' + escaped + '|' + value + '|async-a');
          done();
        });
      });
    });

    it('renders prefix text in data alongside nested async helpers', function (done) {
      var app = asyncApp.create(hbs.create(), 'production');
      request(app)
        .get('/')
        .set('Cookie', 'user=__aSyNcId__')
        .end(function (err, res) {
          if (err) return done(err);
          assert.notEqual(res.text.indexOf('Hello, __aSyNcId__'), -1);
          assert.notEqual(res.text.indexOf('This should welcome __aSyNcId__.'), -1);
          assert.notEqual(res.text.indexOf('Title 1 Comment 1'), -1);
          assert.equal(res.text.indexOf('This should not show!'), -1);
          done();
        });
    });
  });
});
