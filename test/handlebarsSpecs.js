var request = require('supertest');
var app;

describe('express-hbs', function() {

  describe('defaults', function() {

    beforeEach(function() {
      app = require('../example/app');
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
        .expect(/jquery\.js/, done);
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

});
