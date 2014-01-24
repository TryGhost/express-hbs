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
        var expected = '<span id="text">text to test</span>\n<br>\n<span id="onecat">1 cat</span>\n<br>\n<span id="twocats">2 cats</span>\n';
        assert.equal(res.text, expected);
        done();
      });
  });

  it('should render fr', function(done) {
    request(app)
      .get('/')
      .set('Cookie', 'locale=fr')
      .end(function(req, res) {
        var expected = '<span id="text">Texte à tester</span>\n<br>\n<span id="onecat">1 chat</span>\n<br>\n<span id="twocats">2 chats</span>\n';
        assert.equal(res.text, expected);
        done();
      });
  });
});
