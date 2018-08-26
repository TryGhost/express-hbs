var request = require('supertest');
var assert = require('assert');
var hbs = require('..');
var asyncApp = require('./apps/async');

function makeUserRequest(app, user, cb) {
  request(app)
    .get('/')
    .set('Cookie', 'user=' + user)
    .end(function(err, res) {
      if (err) cb(err);
      if (res.text.search('Hello, ' + user) <= 0) {
        cb(new Error('Wrong template send for user ' + user + ': ' + res.text), user);
      }
      cb(null, user);
    });
}

function requestAll(app, users, cb) {
  const status = {};
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
      assert(results.jt, 'Completed');
      assert(results.anna, 'Completed');
      assert(results.joe, 'Completed');
      assert(results.jeff, 'Completed');
      assert(results.jane, 'Completed');
      done();
    });
  });
});
