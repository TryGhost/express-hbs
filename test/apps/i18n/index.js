/**
 * This example is intended to show a cookie usage in express setup
 * with handlebars (hbs) template engine and also to be run
 * as integration test for concurrency issues.
 *
 * Please remove setTimeout(), if you intend to use it as a blueprint!
 *
 */


function create(hbs, env) {
  'use strict';

  if (env) process.env.NODE_ENV = env;

  var express = require('express');
  var cookieParser = require('cookie-parser');
  var app = express();
  var fs = require('fs');
  var path = require('path');
  var viewsDir = __dirname + '/views';
  var i18n = require('i18n');
  var url = require('url');

  // minimal config
  i18n.configure({
    locales: ['en', 'fr'],
    cookie: 'locale',
    directory: __dirname + '/locales'
  });

  // Hook in express-hbs and tell it where known directories reside
  app.engine('hbs', hbs.express3({
    i18n: i18n
  }));
  app.set('view engine', 'hbs');
  app.set('views', viewsDir);

  // you'll need cookies
  app.use(cookieParser());

  // init i18n module for this loop
  app.use(i18n.init);

  app.get('/', function (req, res) {
    res.render('index', {
      array: [1, 2]
    });
  });

  return app;
}

exports.create = create;
