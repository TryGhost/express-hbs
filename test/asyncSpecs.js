'use stirct';

var request = require('supertest');
var assert = require('assert');
var hbs = require('..');
var asyncApp = require('./apps/async');
var resolver = require('../lib/resolver');
var H = require('./helpers');

function makeUserRequest(app, user, cb) {
  request(app)
    .get('/')
    .set('Cookie', 'user=' + user)
    .end(function (err, res) {
      if (err) cb(err);
      if (res.text.search('Hello, ' + user) <= 0) {
        return cb(new Error('Wrong template send for user ' + user + ': ' + res.text), user);
      }
      return cb(null, user, res.text);
    });
}

function requestAll(app, users, cb) {
  var status = {};
  for (var i = 0; i < users.length; i++) {
    status[users[i]] = 'Pending';
    makeUserRequest(app, users[i], function (err, user) {
      if (err) {
        status[user] = 'Error: ' + err.message;
      } else {
        status[user] = 'Completed';
      }
    });
  }
  var checkTimer = setInterval(function () {
    for (var i = 0; i < users.length; i++) {
      if (status[users[i]] === 'Pending') {
        return;
      }
    }
    clearInterval(checkTimer);
    cb(status);
  }, 100);
}

describe('async', function () {
  it('should render all async helpers', function (done) {
    var app = asyncApp.create(hbs.create(), 'production');
    requestAll(app, ['jt', 'anna', 'joe', 'jeff', 'jane'], function (results) {
      assert.equal(results.jt, 'Completed');
      assert.equal(results.anna, 'Completed');
      assert.equal(results.joe, 'Completed');
      assert.equal(results.jeff, 'Completed');
      assert.equal(results.jane, 'Completed');
      done();
    });
  });

  it('should render nested async helpers', function (done) {
    var app = asyncApp.create(hbs.create(), 'production');
    makeUserRequest(app, 'jt', function (err, user, results) {
      if (err) {
        return done(err);
      }
      assert.equal(false, resolver.hasResolvers(results));
      assert.equal(-1, results.search('This should not show!'));
      done();
    });
  });

  describe('literal async id prefix in data', function () {
    var dirname = __dirname + '/views/asyncPrefix';

    function createRender() {
      var hb = hbs.create();
      hb.registerAsyncHelper('async', function (s, cb) {
        setTimeout(function () {
          cb(new hb.SafeString('async-' + s));
        }, 1);
      });
      return hb.express4({ viewsDir: dirname });
    }

    function renderValue(file, locals, cb) {
      var render = createRender();
      render(dirname + '/' + file, H.createLocals('express4', dirname, locals), cb);
    }

    it('renders prefix text in the middle of data verbatim', function (done) {
      renderValue('body.hbs', { body: 'x __aSyNcId__ y' }, function (err, html) {
        if (err) return done(err);
        assert.equal(html.trim(), 'hello x __aSyNcId__ y');
        done();
      });
    });

    [
      '__aSyNcId__',
      '__aSyNcId__ start',
      'middle __aSyNcId__ text',
      '__aSyNcId__<_abcdefgh__',
      'x __aSyNcId__<_abcdefgh__ y',
    ].forEach(function (value) {
      it('renders ' + JSON.stringify(value) + ' escaped and unescaped', function (done) {
        renderValue('index.hbs', { value: value }, function (err, html) {
          if (err) return done(err);
          var escaped = hbs.Utils.escapeExpression(value);
          assert.equal(html.trim(), 'hello ' + escaped + '|' + value + '|async-a');
          done();
        });
      });
    });

    it('renders prefix text in data alongside nested async helpers', function (done) {
      var app = asyncApp.create(hbs.create(), 'production');
      request(app)
        .get('/')
        .set('Cookie', 'user=__aSyNcId__')
        .end(function (err, res) {
          if (err) return done(err);
          assert.notEqual(res.text.indexOf('Hello, __aSyNcId__'), -1);
          assert.notEqual(res.text.indexOf('This should welcome __aSyNcId__.'), -1);
          assert.notEqual(res.text.indexOf('Title 1 Comment 1'), -1);
          assert.equal(res.text.indexOf('This should not show!'), -1);
          done();
        });
    });
  });
});

describe('registerPromiseHelper', function () {
  var dirname = __dirname + '/views/promiseHelpers';

  function render(hb, file, locals, cb) {
    var engine = hb.express4({ viewsDir: dirname });
    engine(dirname + '/' + file, H.createLocals('express4', dirname, locals), function (err, html) {
      cb(err, html && html.trim());
    });
  }

  function delay(value) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve(value);
      }, 1);
    });
  }

  it('renders resolved promises, plain values, and empty output for null/undefined', function (done) {
    var hb = hbs.create();
    hb.registerPromiseHelper('later', async function (name) {
      await delay();
      return 'hi ' + name;
    });
    hb.registerPromiseHelper('plain', function () {
      return 42;
    });
    hb.registerPromiseHelper('nothing', async function () {});
    render(hb, 'output.hbs', { name: 'ann' }, function (err, html) {
      if (err) return done(err);
      assert.equal(html, 'hi ann|42||');
      done();
    });
  });

  it('escapes strings in {{ }} but not in {{{ }}}, and never escapes SafeString', function (done) {
    var hb = hbs.create();
    hb.registerPromiseHelper('html', function () {
      return delay('<b>&</b>');
    });
    hb.registerPromiseHelper('safe', function () {
      return delay(new hb.SafeString('<i>safe</i>'));
    });
    render(hb, 'escape.hbs', {}, function (err, html) {
      if (err) return done(err);
      assert.equal(html, '&lt;b&gt;&amp;&lt;/b&gt;|<b>&</b>|<i>safe</i>|<i>safe</i>');
      done();
    });
  });

  it('resolves nested promise helpers inside block output', function (done) {
    var hb = hbs.create();
    hb.registerPromiseHelper('outer', async function (options) {
      await delay();
      return new hb.SafeString(options.fn(this));
    });
    hb.registerPromiseHelper('inner', async function (value) {
      await delay();
      return 'in-' + value;
    });
    render(hb, 'nested.hbs', {}, function (err, html) {
      if (err) return done(err);
      assert.equal(html, '[in-x|in-y]');
      done();
    });
  });

  it('calls the helper with the template context as `this`', function (done) {
    var hb = hbs.create();
    hb.registerPromiseHelper('whoami', async function () {
      return this.name;
    });
    render(hb, 'context.hbs', { user: { name: 'joe' } }, function (err, html) {
      if (err) return done(err);
      assert.equal(html, 'joe');
      done();
    });
  });

  it('passes params and options like a sync helper', function (done) {
    var hb = hbs.create();
    hb.registerPromiseHelper('join', async function (a, b, options) {
      return [a, b].join(options.hash.sep);
    });
    hb.registerPromiseHelper('noParams', async function (options) {
      return options.name;
    });
    render(hb, 'params.hbs', {}, function (err, html) {
      if (err) return done(err);
      assert.equal(html, 'a-b|noParams');
      done();
    });
  });

  it('fails the render when the promise rejects', function (done) {
    var hb = hbs.create();
    hb.registerPromiseHelper('ok', function () {
      return delay('fine');
    });
    hb.registerPromiseHelper('fail', async function () {
      await delay();
      throw new Error('rejected');
    });
    render(hb, 'error.hbs', {}, function (err, html) {
      assert.equal(err && err.message, 'rejected');
      assert.equal(html, undefined);
      done();
    });
  });

  [undefined, null, 0, '', false].forEach(function (reason) {
    it('fails the render when the promise rejects with ' + String(reason), function (done) {
      var hb = hbs.create();
      hb.registerPromiseHelper('ok', function () {
        return 'fine';
      });
      hb.registerPromiseHelper('fail', function () {
        return Promise.reject(reason);
      });
      render(hb, 'error.hbs', {}, function (err, html) {
        assert.ok(err instanceof Error);
        assert.equal(err.message, 'Async helper failed with ' + String(reason));
        assert.equal(html, undefined);
        done();
      });
    });
  });

  it('fails the render when the helper throws synchronously', function (done) {
    var hb = hbs.create();
    hb.registerPromiseHelper('ok', function () {
      return 'fine';
    });
    hb.registerPromiseHelper('fail', function () {
      throw new Error('thrown');
    });
    render(hb, 'error.hbs', {}, function (err) {
      assert.equal(err && err.message, 'thrown');
      done();
    });
  });

  // Handlebars evaluates subexpressions and block conditions synchronously, so they
  // see the (truthy) placeholder id, never the resolved value. Output only.
  it('does not resolve before subexpressions or block conditions see the value', function (done) {
    var hb = hbs.create();
    hb.registerPromiseHelper('enabled', async function () {
      return false;
    });
    hb.registerHelper('kind', function (value) {
      return typeof value;
    });
    render(hb, 'subexpression.hbs', {}, function (err, html) {
      if (err) return done(err);
      assert.equal(html, 'yes|string');
      done();
    });
  });

  it('throws when no resolver cache is available', function () {
    var hb = hbs.create();
    hb.registerPromiseHelper('later', function () {
      return 'x';
    });
    assert.throws(function () {
      hb.handlebars.compile('{{later}}')({});
    }, /Could not find resolver cache in async helper later/);
  });

  it('fails the render when a callback helper throws a falsy value', function (done) {
    var hb = hbs.create();
    hb.registerAsyncHelper('legacy', function () {
      throw undefined;
    });
    render(hb, 'legacy.hbs', {}, function (err) {
      assert.ok(err instanceof Error);
      assert.equal(err.message, 'Async helper failed with undefined');
      done();
    });
  });

  // Why this is a separate method: callback-style async helpers are often `async`
  // functions whose returned promise settles (to undefined) before `cb` is called.
  // registerAsyncHelper must keep ignoring that promise or those helpers would
  // silently render nothing.
  it('leaves registerAsyncHelper ignoring the promise an async callback helper returns', function (done) {
    var hb = hbs.create();
    var returned;
    hb.registerAsyncHelper('legacy', function (value, cb) {
      returned = (async function () {
        setTimeout(function () {
          cb('cb-' + value);
        }, 5);
      })();
      return returned;
    });
    render(hb, 'legacy.hbs', {}, function (err, html) {
      if (err) return done(err);
      assert.equal(html, 'cb-x');
      returned.then(function (value) {
        assert.equal(value, undefined);
        done();
      }, done);
    });
  });
});
