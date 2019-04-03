'use strict';
var assert = require('assert');
var path = require('path');
var hbs = require('..');
var H = require('./helpers');

describe('local template options', function () {
  var dirname = path.join(__dirname, 'localTemplateOptions');

  describe('express3', function () {

    it('merges res.locals._templateOptions with the self._templateOptions', function (done) {
      var instance = hbs.create();
      var render = instance.express3({});
      instance.updateTemplateOptions({
          data: {
            greeting: 'Hello,',
            firstName: 'Freddy',
            lastName: 'Krueger'
          } 
      });

      var locals = H.createLocals('express3', dirname, {
        _templateOptions: {
          data: {
            lastName: 'Mercury'
          } 
        } 
      });

      render(path.join(dirname, 'template.hbs'), locals, function (err, html) {
        assert.ifError(err);
        assert.strictEqual(H.stripWs(html), H.stripWs('Hello, Freddy Mercury')); 
        done(err);
      });
    });

    it('removes _templateOptions from the locals data', function (done) {
      var instance = hbs.create();
      var render = instance.express3({});
      instance.updateTemplateOptions({
          data: {
            greeting: 'Hello,',
            firstName: 'Freddy',
            lastName: 'Krueger'
          } 
      });

      var locals = H.createLocals('express3', dirname, {
        _templateOptions: {
          data: {
            lastName: 'Mercury'
          } 
        } 
      });

      render(path.join(dirname, 'data-access-template.hbs'), locals, function (err, html) {
        assert.ifError(err);
        assert.strictEqual(H.stripWs(html), H.stripWs('')); 
        done(err);
      });
    });
  });

  describe('express4', function () {

    it('merges res.locals._templateOptions with the self._templateOptions', function (done) {
      var instance = hbs.create();
      var render = instance.express4({});
      instance.updateTemplateOptions({
          data: {
            greeting: 'Hello,',
            firstName: 'Freddy',
            lastName: 'Krueger'
          } 
      });

      var locals = H.createLocals('express4', dirname, {
        _templateOptions: {
          data: {
            lastName: 'Mercury'
          } 
        } 
      });

      render(path.join(dirname, 'template.hbs'), locals, function (err, html) {
        assert.ifError(err);
        assert.strictEqual(H.stripWs(html), H.stripWs('Hello, Freddy Mercury')); 
        done(err);
      });
    });

    it('removes _templateOptions from the locals data', function (done) {
      var instance = hbs.create();
      var render = instance.express3({});
      instance.updateTemplateOptions({
          data: {
            greeting: 'Hello,',
            firstName: 'Freddy',
            lastName: 'Krueger'
          } 
      });

      var locals = H.createLocals('express3', dirname, {
        _templateOptions: {
          data: {
            lastName: 'Mercury'
          } 
        } 
      });

      render(path.join(dirname, 'data-access-template.hbs'), locals, function (err, html) {
        assert.ifError(err);
        assert.strictEqual(H.stripWs(html), H.stripWs('')); 
        done(err);
      });
    });
  });
});
