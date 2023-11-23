var assert = require('assert');
var hbs = require('..');
var path = require('path');
var H = require('./helpers');
var fs = require('fs');


describe('options', function() {
  var dirname =  path.join(__dirname, 'views/beautify');

  it('should pretty print HTML', function(done) {
    var hb = hbs.create();
    var render = hb.express3({beautify: true, restrictLayoutsTo: dirname});
    var locals = H.createLocals('express3', dirname, {});

    render(dirname + '/index.hbs', locals, function(err, html) {
      assert.ifError(err);
      var expected = fs.readFileSync(dirname + '/expected.hbs', 'utf8');
      assert.equal(html.trim(), expected.trim());
      done();
    });
  });
});

