// npm install express express-hbs

var express = require('express');
var app = express();
var hbs = require('..'); // should be `require('express-hbs')` outside of this example

app.use(express.static(__dirname + '/public'));

// Hook in express-hbs and tell it where known directories reside
app.engine('hbs', hbs.express3({
    partialsDir: __dirname + '/views/partials',
    layoutsDir: __dirname + '/views/layout',
    defaultLayout: __dirname + '/views/layout/default.hbs'
}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

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

app.get('/veggies', function(req, res) {
  res.render('veggies', {
    title: 'My favorite veggies',
    veggies: veggies,
    layout: 'layout/veggie'
  });
});


if (require.main === module) {
  app.listen(3000);
  console.log('Express server listening on port 3000');
}
else {
  module.exports = app;
}
