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
    }
  });

  // used mocked hbs in example
  var example = require('../example/app');
  var app = example.create(hbs, env);
  return {app: app, readCounts: readCounts};
}


describe('express-hbs', function() {

  describe('defaults', function() {
    var app;

    beforeEach(function() {
      var example = require('../example/app');
      var hbs = require('..');
      app = example.create(hbs);
    });


    it('should render using default layout', function(done) {
      request(app)
        .get('/')
        .expect(/DEFAULT LAYOUT/, done);
    });

    it('should render layout declared in markup', function(done) {
      request(app)
        .get('/fruits')
        .expect(/DECLARATIVE LAYOUT/, done);
    });

    it('should render nested declarative layouts correctly', function(done) {
      request(app)
        .get('/fruits/apple')
        .expect(/DECLARATIVE LAYOUT/)
        .expect(/NESTED LAYOUT/, done);
    });

    it('should render layout specified as locals', function(done) {
      request(app)
        .get('/veggies')
        .expect(/PROGRAMMATIC LAYOUT/, done);
    });

    it('should render nested layouts correctly when first layout is specified as locals', function(done) {
      request(app)
        .get('/veggies/carrot')
        .expect(/PROGRAMMATIC LAYOUT/)
        .expect(/NESTED LAYOUT/, done);
    });

    it('should render partial', function(done) {
      request(app)
        .get('/veggies')
        .expect(/jquery\.js/)
        .expect(/Other partial/, done);
    });

    it('should render sub partial', function(done) {
      request(app)
        .get('/veggies')
        .expect(/just a comment/, done);
    });

    it('should render block', function(done) {
      request(app)
        .get('/')
        .expect(/color: blue/, done);
    });

    it('should replace {{body}}', function(done) {
      request(app)
        .get('/')
        .expect(/Vegetables/, done);
    });

  });

  describe('layoutsDir', function() {
    var app;

    beforeEach(function() {
      app = require('../example/app-layoutsDir');
    });

    it('should render layout declared in markup', function(done) {
      request(app)
        .get('/fruits')
        .expect(/DECLARATIVE LAYOUT/, done);
    });

    it('should allow specifying layout in locals without dir', function(done) {
      request(app)
        .get('/veggies')
        .expect(/PROGRAMMATIC LAYOUT/, done);
    });

    it('should still allow specifying layout in locals with dir', function(done) {
      request(app)
        .get('/veggies/explicit-dir')
        .expect(/PROGRAMMATIC LAYOUT/, done);
    });

  });

  describe('instances', function() {
    it('should create isolated instances', function() {
      var hbs = require('..');
      var hbs2 = hbs.create();
      var hbs3 = hbs.create();

      assert(hbs !== hbs2 && hbs !== hbs3 && hbs2 !== hbs3);
    });
  });
});
