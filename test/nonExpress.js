var assert = require('assert');
var hbs = require('..');
var H = require('./helpers');

describe('non-express', function() {

  describe('viewsDir', function() {
    var dirname = __dirname + '/views/viewsDir';

    it ('should use viewsDir options', function(done) {
      var render = hbs.create().express3({
        viewsDir: dirname
      });
      var locals = H.createLocals('express3', dirname);

      render(dirname + '/sub/directive.hbs', locals, function(err, html) {
        assert.equal('<vd>directive</vd>', H.stripWs(html));
        done();
      });
    });

    it ('should work with layoutsDir', function(done) {
      var render = hbs.create().express3({
        viewsDir: dirname,
        layoutsDir: dirname + '/layouts'
      });
      var locals = H.createLocals('express3', dirname, {layout: 'default.hbs'});

      render(dirname + '/sub/lay.hbs', locals, function(err, html) {
        assert.equal('<vd>lay</vd>', H.stripWs(html));
        done();
      });
    });
  });
});
