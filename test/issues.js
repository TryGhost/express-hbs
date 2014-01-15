var assert = require('assert');
var hbs = require('..');
var path = require('path');


function stripWs(s) {
  return s.replace(/\s+/g, '');
}

describe('issue-23', function() {

  it('should not pass an empty or missing partial to handlebars', function(done) {
    var dirname =  path.join(__dirname, 'issues/23');
    var render = hbs.create().express3({
      partialsDir: [dirname + '/partials']
    });

    function check(err, html) {
      assert.ifError(err);
      assert.equal('<html>Hello</html>', stripWs(html));
      done();
    }
    var result = render(dirname + '/index.hbs', {cache: true}, check);
  });

});


describe('issue-21', function() {
  var dirname =  path.join(__dirname, 'issues/21');
  var render = hbs.create().express3({
    layoutsDir: dirname + '/layouts'
  });

  it('should allow specifying layouts without the parent dir', function(done) {
    function check(err, html) {
      assert.ifError(err);
      assert.equal('<html>index</html>', stripWs(html));
      done();
    }

    var options = {cache: true, layout: 'default'};
    var result = render(dirname + '/views/index.hbs', options, check);
  });


  it('should allow specifying layouts without the parent dir in a sub view', function(done) {
    function check(err, html) {
      assert.ifError(err);
      assert.equal('<html>sub</html>', stripWs(html));
      done();
    }

    var options = {cache: true, layout: 'default'};
    var result = render(dirname + '/views/sub/sub.hbs', options, check);
  });


  it('should allow layouts in subfolders', function(done) {
    function check(err, html) {
      assert.ifError(err);
      assert.equal('<sub>useLayoutInDir</sub>', stripWs(html));
      done();
    }

    var options = {cache: true, layout: 'sub/child'};
    var result = render(dirname + '/views/useLayoutInDir.hbs', options, check);
  });

});


