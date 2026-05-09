'use stirct';

var request = require('supertest');
var assert = require('assert');
var hbs = require('..');
var asyncApp = require('./apps/async');
var resolver = require('../lib/resolver');

describe.only('async', function () {
  it('should render nested async helpers', function (done) {
    var app = asyncApp.create(hbs.create(), 'production');
    request(app)
      .get('/')
      .set('Cookie', 'user=' + 'eggmonster')
      .end(function (err, res) {
        if (err) {
          return done(err);
        }
        var rendered = res.text;
        console.log(rendered);
        assert.equal(false, resolver.hasResolvers(rendered));
        assert.equal(-1, rendered.search('This should not show!'));
        assert.equal(-1, rendered.search('__aSyNcId_'));
        done();
      });
  });

  it('should render nested async helpers 2', function (done) {
    var app = asyncApp.create(hbs.create(), 'production');
    request(app)
      .get('/broken')
      .set('Cookie', 'user=' + 'eggmonster')
      .end(function (err, res) {
        if (err) {
          return done(err);
        }
        var rendered = res.text;
        console.log(rendered);
        assert.equal(false, resolver.hasResolvers(rendered));
        assert.equal(-1, rendered.search('This should not show!'));
        assert.equal(-1, rendered.search('__aSyNcId_'));
        done();
      });
  });
});
