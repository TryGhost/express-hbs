// npm install express express-hbs

'use strict';

var express = require('express');
var app = express();
var hbs = require('..'); // should be `require('express-hbs')` outside of this example
var fs = require('fs');
var fp = require('path');

function relative(path) {
  return fp.join(__dirname, path);
}
var viewsDir = relative('views');

app.use(express.static(relative('public')));

// Hook in express-hbs and tell it where known directories reside
app.engine('hbs', hbs.express4({
  partialsDir: [relative('views/partials'), relative('views/partials-other')],
  layoutsDir: relative('views/layout'),
  defaultLayout: relative('views/layout/default.hbs'),
  restrictLayoutsTo: relative('views/layout')
}));
app.set('view engine', 'hbs');
app.set('views', relative('views'));


// Register sync helper
hbs.registerHelper('link', function(text, options) {
  var attrs = [];
  for (var prop in options.hash) {
    attrs.push(prop + '="' + options.hash[prop] + '"');
  }
  return new hbs.SafeString('<a ' + attrs.join(' ') + '>' + text + '</a>');
});

// Register Async helpers
hbs.registerAsyncHelper('readFile', function(filename, cb) {
  fs.readFile(fp.join(viewsDir, filename), 'utf8', function(err, content) {
    if (err) console.error(err);
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
  res.render('fruits/index-layoutsDir', {
    title: 'My favorite fruits',
    fruits: fruits
  });
});

app.get('/fruits/:name', function(req, res) {
    res.render('fruits/details-layoutsDir', {
        fruit: req.params.name
    });
});

app.get('/veggies', function(req, res) {
  res.render('veggies', {
    title: 'My favorite veggies',
    veggies: veggies,
    layout: 'veggie'
  });
});

app.get('/veggies/explicit-dir', function(req, res) {
  res.render('veggies', {
    title: 'My favorite veggies',
    veggies: veggies,
    layout: relative('views/layout/veggie')
  });
});

app.get('/veggies/:name', function(req, res) {
    res.render('veggies/details', {
        veggie: req.params.name,
        layout: 'veggie-details'
    });
});

if (require.main === module) {
  app.listen(3000);
  console.log('Express server listening on port 3000');
} else {
  module.exports = app;
}
