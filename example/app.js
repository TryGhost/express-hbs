// npm install express express-hbs

var express = require('express');
var app = express();
var hbs = require('..'); // should be `require('express-hbs')` outside of this example

app.use(express.static(__dirname + '/public'));

// Hook in express-hbs and tell it where partials are found
app.engine('hbs', hbs.express3({partialsDir: __dirname + '/views/partials'}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

var fruits = [];
fruits.push({ name: 'apple' });
fruits.push({ name: 'orange' });
fruits.push({ name: 'pear' });

app.get('/', function(req, res){
  res.render('index', {
    title: 'express-hbs example'
  });
});

app.get('/fruits', function(req, res){
  res.render('fruits/index', {
    title: 'My favorite fruits',
    fruits: fruits
  });
});

app.listen(3000);
console.log('Express server listening on port 3000');
