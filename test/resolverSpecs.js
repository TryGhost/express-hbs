'use strict';

var assert = require('assert');
var generateId = require('../lib/generate-id');
var resolver = require('../lib/resolver');

describe('resolver', function () {
  it('detects an unresolved helper at the start of rendered output', function () {
    assert.equal(resolver.hasResolvers('__aSyNcId__<_12345678__'), true);
  });

  it('does not report rendered output without a resolver marker', function () {
    assert.equal(resolver.hasResolvers('rendered output'), false);
  });

  it('resolves asynchronous helper output with its context', function (done) {
    var cache = {};
    var id = resolver.resolve(
      cache,
      function (context, callback) {
        callback(context.value);
      },
      { value: 'resolved' },
    );

    resolver.done(cache, function (err, values) {
      assert.ifError(err);
      assert.equal(values[id], 'resolved');
      done();
    });
  });

  it('reports synchronous helper failures', function (done) {
    var cache = {};
    resolver.resolve(cache, function () {
      throw new Error('helper failed');
    });

    resolver.done(cache, function (err) {
      assert.equal(err.message, 'helper failed');
      done();
    });
  });
});

describe('generateId', function () {
  it('uses an eight-character default', function () {
    assert.match(generateId(), /^[A-Za-z_]{8}$/);
  });

  it('uses the requested length', function () {
    assert.match(generateId(16), /^[A-Za-z_]{16}$/);
  });
});
