var request = require('supertest');
var assert = require('assert');
var hbs = require('..');

describe('express-hbs', function() {

  describe('defaults', function() {
    var app;

    beforeEach(function() {
      var example = require('../example/app');
      app = example.create(hbs.create());
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

    it('should render block default content', function(done) {
      request(app)
        .get('/')
        .expect(/Default block content/, done);
    });

    it('should render block content instead of default content when contentFor is declared', function(done) {
      request(app)
        .get('/')
        .expect(/Non-default block content/, done);
    });

    it('should replace {{body}}', function(done) {
      request(app)
        .get('/')
        .expect(/Vegetables/, done);
    });

  });

  describe('instances', function() {
    it('should create isolated instances', function() {
      var hbs2 = hbs.create();
      var hbs3 = hbs.create();

      assert(hbs !== hbs2 && hbs !== hbs3 && hbs2 !== hbs3);
    });
  });
});
