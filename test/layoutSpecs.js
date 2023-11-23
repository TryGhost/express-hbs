var request = require('supertest');
var assert = require('assert');
var path = require('path');
var hbs = require('..');


function stripWs(s) {
  return s.replace(/\s+/g, '');
}

function createLocals(which, viewsDir, locals) {
  if (!locals) locals = {};
  var opts = {};
  if (which === 'express3') {
    opts.settings = {
      views: viewsDir
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


  describe('options.layout', function() {
    var dirname = __dirname + '/views/disableLayoutDirective';

    it ('should process template-specified layout without option', function(done) {
      var render = hbs.create().express3({
        restrictLayoutsTo: dirname
      });
      var locals = createLocals('express3', dirname);

      render(dirname + '/index.hbs', locals, function(err, html) {
        assert.equal('<dld>dld</dld>', stripWs(html));
        done();
      });
    });

    it ('should allow options.layout to be specified', function(done) {
      var render = hbs.create().express3({
        restrictLayoutsTo: dirname
      });
      var locals = createLocals('express3', dirname, { layout: 'layouts/default' });

      render(dirname + '/aside.hbs', locals, function(err, html) {
        assert.equal('<dld>aside</dld>', stripWs(html));
        done();
      });
    });

    it('should error when using a layout outside of the restrictLayoutsTo', function(done) {
      var render = hbs.create().express3({
        restrictLayoutsTo: path.resolve(path.join(__dirname, '../'))
      });
      var locals = createLocals('express3', dirname, {layout: '/Users/egg/Code/Ghost/ghost/core/package.json'});

      render(dirname + '/aside.hbs', locals, function (err, html) {
        if (!err) {
          return done(new Error('We expect an error when reading'));
        }
        return done();
      });
    });

    it ('should not process template-specified layout when options.layout is falsy', function(done) {
      var render = hbs.create().express3({
        restrictLayoutsTo: dirname
      });
      var locals = createLocals('express3', dirname, { layout: false });

      render(dirname + '/index.hbs', locals, function(err, html) {
        assert.equal('dld', stripWs(html));
        done();
      });
    });
  });

});
