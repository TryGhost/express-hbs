var request = require('supertest');
var assert = require('assert');
var hbs = require('..');

describe('i18n', function() {
  var app;

  beforeEach(function() {
    var apper = require('./apps/i18n');
    app = apper.create(hbs.create());
  });

  it('should render en', function(done) {
    request(app)
      .get('/')
      .set('Cookie', 'locale=en')
      .end(function(req, res) {
        var expected = '<span id="text">text to test</span>\n<br>\n<span class="each">1 cat</span><span class="each">2 cats</span>';
        assert.equal(res.text, expected);
        done();
      });
  });

  it('should render fr', function(done) {
    request(app)
      .get('/')
      .set('Cookie', 'locale=fr')
      .end(function(req, res) {
        var expected = '<span id="text">Texte à tester</span>\n<br>\n<span class="chaque">1 chat</span><span class="chaque">2 chats</span>';
        assert.equal(res.text, expected);
        done();
      });
  });
});
