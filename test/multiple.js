'use strict';

var request = require('supertest');
var assert = require('assert');
var express = require('express');
var hbs = require('..');

describe('multiple directories', function() {
  var app;

  beforeEach(function() {
    app = express();
    app.engine('hbs', hbs.express3());
    app.set('view engine', 'hbs');
    app.get('/test1', function (req, res) {
      res.render('test1');
    });
    app.get('/test2', function (req, res) {
      res.render('test2');
    });
    app.get('/collide', function (req, res) {
      res.render('collide');
    });
    app.get('/error', function (req, res) {
      res.render('error');
    });
  });

  it('should handle single folder', function(done) {
    app.set('views', './test/views/multiple/views1');
    request(app)
      .get('/test1')
      .end(function (err, res) {
        assert.ifError(err);
        var expected = '<h1>test1</h1>\n';
        assert.equal(res.text, expected);
        done();
      });
  });

  it('should handle multiple folders', function(done) {
    app.set('views', ['./test/views/multiple/views1', './test/views/multiple/views2']);
    request(app)
      .get('/test2')
      .end(function (err, res) {
        assert.ifError(err);
        var expected = '<h1>test2</h1>\n';
        assert.equal(res.text, expected);
        done();
      });
  });

  describe('should handle multiple folders in specific order', function() {

    it('views1, views2', function(done) {
      app.set('views', ['./test/views/multiple/views1', './test/views/multiple/views2']);
      request(app)
        .get('/collide')
        .end(function (err, res) {
          assert.ifError(err);
          var expected = '<h1>collide1</h1>\n';
          assert.equal(res.text, expected);
          done();
        });
    });

    it('views2, views1', function(done) {
      app.set('views', ['./test/views/multiple/views2', './test/views/multiple/views1']);
      request(app)
        .get('/collide')
        .end(function (err, res) {
          assert.ifError(err);
          var expected = '<h1>collide2</h1>\n';
          assert.equal(res.text, expected);
          done();
        });
    });

  });

  /* eslint-disable no-unused-vars */
  describe('should report the filename in error', function() {

    it('should report from first folder', function(done) {
      app.set('views', ['./test/views/multiple/views1', './test/views/multiple/views2']);
      app.use(function(err, req, res, next) {
        res.status(500).send(err.stack);
      });

      request(app)
      .get('/error')
      .end(function(err, res) {
        assert.ifError(err);
        assert(res.error.text.indexOf('views1/error.hbs]') > 0);
        done();
      });
    });


    it('should report from second folder', function(done) {
      app.set('views', ['./test/views/multiple/views2', './test/views/multiple/views1']);
      app.use(function(err, req, res, next) {
        res.status(500).send(err.stack);
      });

      request(app)
      .get('/error')
      .end(function(err, res) {
        assert.ifError(err);
        assert(res.error.text.indexOf('views2/error.hbs]') > 0);
        done();
      });
    });
  });
  /* eslint-enable no-unused-vars */

});
