'use stirct';

var request = require('supertest');
var assert = require('assert');
var hbs = require('..');
var asyncApp = require('./apps/async');
var resolver = require('../lib/resolver');

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
});
