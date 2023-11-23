'use strict';
var assert = require('assert');
var hbs = require('..');
var path = require('path');
var H = require('./helpers');


// MEANJS is using custom extension .server.view.html instead of .hbs 
// https://github.com/meanjs/mean
describe('custom extension for partials view', function() {
  var dirname = path.join(__dirname, 'views/customExtension');
  var render = hbs.create().express4({
      extname: '.server.view.html',
      partialsDir: dirname + '/partialsDir',
      restrictLayoutsTo: dirname
  });

  it('should allow rendering multiple partials with custom extension', function(done) {
    function check(err, html) {
      assert.ifError(err);
      assert.equal(
        '<html>' + 
          '<subpartial>1</subpartial>' + 
          '<partial>1</partial>' + 
          '<subpartial>2</subpartial>' + 
          '<partial>2</partial>' + 
        '</html>', 
      H.stripWs(html));
      done();
    }

    var options = {cache: true, settings: {views: dirname }};
    render(dirname + '/template.server.view.html', options, check);
  });

});
