'use strict';
// npm install express express-hbs

function create(hbs, env) {

  if (env) process.env.NODE_ENV = env;

  var express = require('express');
  var app = express();
  var fs = require('fs');
  var path = require('path');
  var viewsDir = __dirname + '/views';

  app.use(express.static(__dirname + '/public'));

// Hook in express-hbs and tell it where known directories reside
  app.engine('hbs', hbs.express3({
    partialsDir: [__dirname + '/views/partials', __dirname + '/views/partials-other'],
    defaultLayout: __dirname + '/views/layout/default.hbs'
  }));
  app.set('view engine', 'hbs');
  app.set('views', viewsDir);


// Register sync helper
  hbs.registerHelper('link', function(text, options) {
    var attrs = [];
    for (var prop in options.hash) {
      attrs.push(prop + '="' + options.hash[prop] + '"');
    }
    return new hbs.SafeString(
      "<a " + attrs.join(" ") + ">" + text + "</a>"
    );
  });

// Register Async helpers
  hbs.registerAsyncHelper('readFile', function(filename, cb) {
    fs.readFile(path.join(viewsDir, filename), 'utf8', function(err, content) {
      cb(new hbs.SafeString(content));
    });
  });


  var fruits = [
    {name: 'apple'},
    {name: 'orange'},
    {name: 'pear'}
  ];


  var veggies = [
    {name: 'asparagus'},
    {name: 'carrot'},
    {name: 'spinach'}
  ];

  app.get('/', function(req, res) {
    res.render('index', {
      title: 'express-hbs example'
    });
  });

  app.get('/fruits', function(req, res) {
    res.render('fruits/index', {
      title: 'My favorite fruits',
      fruits: fruits
    });
  });

  app.get('/fruits/:name', function(req, res) {
    res.render('fruits/details', {
      fruit: req.params.name
    })
  });

  app.get('/veggies', function(req, res) {
    res.render('veggies', {
      title: 'My favorite veggies',
      veggies: veggies,
      layout: 'layout/veggie'
    });
  });

  app.get('/veggies/:name', function(req, res) {
    res.render('veggies/details', {
      veggie: req.params.name,
      layout: 'layout/veggie-details'
    })
  });

  return app;
}



if (require.main === module) {
  var hbs = require('..');
  var app = create(hbs);
  app.listen(3000);
  console.log('Express server listening on port 3000');
}
else {
  exports.create = create;
}
