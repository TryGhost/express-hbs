var request = require('supertest');
var assert = require('assert');


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

    it('should render layout specified as locals', function(done) {
      request(app)
        .get('/veggies')
        .expect(/PROGRAMMATIC LAYOUT/, done);
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
