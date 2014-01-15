var assert = require('assert');
var hbs = require('..');
var path = require('path');


function stripWs(s) {
  return s.replace(/\s+/g, '');
}

describe('issue-23', function() {

  it('should not pass an empty or missing partial to handlebars', function(done) {
    var dirname =  path.join(__dirname, 'issues/23');
    var render = hbs.express3({
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


