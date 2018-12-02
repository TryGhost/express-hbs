'use strict';

var express = require('express');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var path = require('path');
var url = require('url');

var pages = [
  {
    id: 1,
    title: 'Title 1'
  },
  {
    id: 2,
    title: 'Title 2'
  },
  {
    id: 3,
    title: 'Title 3'
  }
]

var comments = [
  {
    id: 1,
    page: 1,
    subject: 'Title 1 Comment 1',
    auther: 'JT'
  },
  {
    id: 2,
    page: 1,
    subject: 'Title 1 Comment 2',
    auther: 'Anna'
  },
  {
    id: 3,
    page: 1,
    subject: 'Title 1 Comment 3',
    auther: 'Jane'
  },
  {
    id: 4,
    page: 1,
    subject: 'Title 1 Comment 4',
    auther: 'Bob'
  },
  {
    id: 5,
    page: 4,
    subject: 'This should not show!',
    auther: 'Jill'
  }
]

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

  app.get('/fail', function (req, res) {
    res.render('failer');
  });

  hbs.registerAsyncHelper('user', function(username, resultcb) {
    setTimeout(function() {
      resultcb(username);
    }, getRandomNumber(100, 900))
  });

  hbs.registerAsyncHelper('pages', function(options, resultcb) {
    var self = this;
    setTimeout(function() {
      var result = [];
      for(var i = 0; i < pages.length; i++) {
        options.data.page = pages[i];
        result.push(options.fn.call(self, pages[i], options));
      }
      resultcb(result.join(''));
    }, getRandomNumber(100, 900))
  });

  hbs.registerAsyncHelper('comments', function(options, resultcb) {
    var self = this;
    setTimeout(function() {
      var result = [];
      for(var i = 0; i < comments.length; i++) {
        if (options.hash.page === comments[i].page) {
          result.push(options.fn(comments[i]));
        }
      }
      resultcb(result.join(''));
    }, getRandomNumber(100, 300))
  });

  hbs.registerAsyncHelper('failer', function(_, resultcb) {
    setTimeout(function() {
      resultcb(options.fn());
    }, 100);
  })

  return app;
}

exports.create = create;
