'use strict';

var express = require('express');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var path = require('path');
var url = require('url');

function getRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function create(hbs, env) {
  if (env) process.env.NODE_ENV = env;
  var app = express();
  var viewsDir = path.join(__dirname, 'views');

  // Hook in express-hbs and tell it where known directories reside
  app.engine('hbs', hbs.express4({
    defaultLayout: path.join(viewsDir, "layout.hbs")
  }));
  app.set('view engine', 'hbs');
  app.set('views', viewsDir);

  app.use(cookieParser());

  app.get('/', function (req, res) {
    res.render('index', {
      message: 'Hello,',
      username: req.cookies.user
    });
  });

  hbs.registerAsyncHelper('user', function(username, resultcb) {
    setTimeout(function() {
      resultcb(username);
    }, getRandomNumber(100, 900))
  });

  return app;
}

exports.create = create;
