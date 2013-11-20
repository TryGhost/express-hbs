# express-hbs

Express 3 handlebars template engine with multiple layouts, blocks and cached partials.

Open source project from [Barc](http://barc.com), instant real-time forum on any website.

## Usage

To use with express 3.

    var hbs = require('express-hbs');

    // Use `.hbs` for extensions and find partials in `views/partials`.
    app.engine('hbs', hbs.express3({
      partialsDir: __dirname + '/views/partials',
      contentHelperName: 'content',
    }));
    app.set('view engine', 'hbs');
    app.set('views', __dirname + '/views');

Options for `#express3`

    hbs.express3({
      partialsDir: "{String/Array} [Required] Path to partials templates, one or several directories",

      // OPTIONAL settings

      blockHelperName: "{String} Override 'block' helper name.",
      contentHelperName: "{String} Override 'contentFor' helper name.",
      defaultLayout: "{String} Absolute path to default layout template",
      extname: "{String} Extension for templates, defaults to `.hbs`",
      handlebars: "{Module} Use external handlebars instead of express-hbs dependency",
      layoutsDir: "{String} Path to layout templates",
      templateOptions: "{Object} options to pass to template()"
    });

Partials may use any extension, which is better for syntax highlighting.


## Syntax

To mark where layout should insert page,

    {{{body}}}


To declare a block placeholder in layout.

    {{{block "pageScripts"}}}

To define block content in a page.

    {{#contentFor "pageScripts"}}
      CONTENT HERE
    {{/contentFor}}

There are three ways to use a layout, listed in the order in which they are checked for and used:

1.  Declarative within a page. Use handlebars comment. If you have declared a layoutsDir in the configuration, `LAYOUT` is a relative path from layoutsDir. Otherwise, `LAYOUT` is a relative path from the template.

        {{!< LAYOUT}}

2.  As an option to render

        res.render('veggies', {
          title: 'My favorite veggies',
          veggies: veggies,
          layout: 'layout/veggie'
        });

    This option also allows for default layout suppression by passing in a falsey Javascript value as the value of the `layout` property:

        res.render('veggies', {
          title: 'My favorite veggies',
          veggies: veggies,
          layout: null // render without using a layout template
        });

3.  Lastly, use `defaultLayout` if specified in hbs configuration options.

## Helpers

Synchronous helpers

    hbs.registerHelper('link', function(text, options) {
      var attrs = [];
      for(var prop in options.hash) {
        attrs.push(prop + '="' + options.hash[prop] + '"');
      }
      return new hbs.SafeString(
        "<a " + attrs.join(" ") + ">" + text + "</a>"
      );
    });

    # in markup
    {{{link 'barc.com' href='http://barc.com'}}}

Asynchronous helpers

    hbs.registerAsyncHelper('readFile', function(filename, cb) {
      fs.readFile(path.join(viewsDir, filename), 'utf8', function(err, content) {
        cb(new hbs.SafeString(content));
      });
    });

    # in markup
    {{{readFile 'tos.txt'}}}

## Methods

### Create multiple instance

    var hbs = require('express-hbs');

    var instance1 = hbs.create();
    var instance2 = hbs.create();

    This allows you to create isolated instances with their own cache system and handlebars engine.

## Example

in File `app.js`
```
app.set('PROD_MODE', ('production' === app.get('env')));
```

File `views/layout/default.hbs`

```
<html>
  <head>
    <title>{{title}}</title>
    <link type="text/css" rel="stylesheet" href="/css/style.css"/>
    {{{block "pageStyles"}}}
  </head>
  <body>
    {{{body}}}

    {{> scripts}}

    {{#if settings.PROD_MODE}}
    {{{block 'googleAnalyticsScripts'}}}
    {{/if}}

  </body>
</html>
```


File `views/index.hbs`

```
{{!< default}}

{{#contentFor 'pageStyles'}}
<style>
  .clicker {
    color: blue;
  };
</style>
{{/contentFor}}

<h1>{{title}}</h1>
<p class="clicker">Click me!</p>
```

To run example project

    npm install -d
    node example/app.js

## Testing

The test suite requires the `grunt-cli` package:

    npm install -g grunt-cli
    npm install -d

Once everything's installed, just run:

    npm test

## Credits

Inspiration and code from [donpark/hbs](https://github.com/donpark/hbs)

## Contributors

Big thanks!

- Erin Noe-Payne
- Hannah Wolfe
- Ivan Stojic
- Jacob Gable
- John Lindal
- Karl Johan Kleist
- Mario Gutierrez
- Norman Chen
- Olivier Lance
- Peter deHaan
- Seb Gotvitch
- williamcoates
- William Dibbern


## License

The MIT License (MIT)
Copyright (c) 2012, 2013 Barc, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
