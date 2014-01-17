var request = require('supertest');
var assert = require('assert');
var hbs = require('..');


function stripWs(s) {
  return s.replace(/\s+/g, '');
}

function createLocals(which, viewsDir, locals) {
  if (!locals) locals = {};
  var opts = {};
  if (which === 'express3') {
    opts.settings = {
      views: viewsDir,
    };
    opts.cache = process.env.NODE_ENV === 'production';
    opts.settings.views = viewsDir;
    for (var k in locals) {
      if (!locals.hasOwnProperty(k)) continue;
      opts[k] = locals[k];
    }
  }
  return opts;
}

describe('layouts', function() {
  var app;

  beforeEach(function() {
    var example = require('../example/app');
    app = example.create(hbs.create());
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

  describe('disableLayoutDirective', function() {
    var dirname = __dirname + '/views/disableLayoutDirective';

    it ('should process directive without option', function(done) {
      var render = hbs.create().express3({
      });
      var locals = createLocals('express3', dirname);

      render(dirname + '/index.hbs', locals, function(err, html) {
        assert.equal('<dld>dld</dld>', stripWs(html));
        done();
      });
    });

    it ('should not process directive with option set', function(done) {
      var render = hbs.create().express3({
        disableLayoutDirective: true
      });
      var locals = createLocals('express3', dirname);
      render(dirname + '/index.hbs', locals, function(err, html) {
        assert.equal('dld', stripWs(html));
        done();
      });
    });
  });

});
