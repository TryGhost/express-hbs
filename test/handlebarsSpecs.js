var request = require('supertest');
var app;

describe('express-hbs', function() {

  describe('defaults', function() {
    app = require('../example/app');

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
    var app = require('../example/app-layoutsDir');

    it('should render layout declared in markup', function(done) {
      request(app)
        .get('/fruits')
        .expect(/DECLARATIVE LAYOUT/, done);
    });
  });

});
