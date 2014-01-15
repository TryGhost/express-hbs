// npm install express express-hbs

var express = require('express');
var app = express();
var hbs = require('..'); // should be `require('express-hbs')` outside of this example
var fs = require('fs');
var path = require('path');
var viewsDir = __dirname + '/views';

app.use(express.static(__dirname + '/public'));

// Hook in express-hbs and tell it where known directories reside
app.engine('hbs', hbs.express3({
  partialsDir: [__dirname + '/views/partials', __dirname + '/views/partials-other'],
  layoutsDir: __dirname + '/views/layout',
  defaultLayout: __dirname + '/views/layout/default.hbs'
}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');


// Register sync helper
hbs.registerHelper('link', function(text, options) {
  var attrs = [];
  for (var prop in options.hash) {
    attrs.push(prop + '="' + options.hash[prop] + '"');
  }
  return new hbs.SafeString("<a " + attrs.join(" ") + ">" + text + "</a>");
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
  res.render('fruits/index-layoutsDir', {
    title: 'My favorite fruits',
    fruits: fruits
  });
});

app.get('/fruits/:name', function(req, res) {
    res.render('fruits/details-layoutsDir', {
        fruit: req.params.name
    })
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
    layout: __dirname + '/views/layout/veggie'
  });
});

app.get('/veggies/:name', function(req, res) {
    res.render('veggies/details', {
        veggie: req.params.name,
        layout: 'veggie-details'
    })
});


if (require.main === module) {
  app.listen(3000);
  console.log('Express server listening on port 3000');
} else {
  module.exports = app;
}
