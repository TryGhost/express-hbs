# express-hbs

Express 3 handlebars template engine with multiple layouts, blocks and cached partials.

Open source project from [Barc](http://barc.com), instant real-time forum on any website.

**0.7 BREAKING CHANGES**: The logic for layout resolution for layoutsDir,
layout and declarative layouts in previous versions stepped on each other.
Read Layouts section below on how layouts are resolved.

## Usage

To use with express 3.

    var hbs = require('express-hbs');

    // Use `.hbs` for extensions and find partials in `views/partials`.
    app.engine('hbs', hbs.express3({
      partialsDir: __dirname + '/views/partials'
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
      templateOptions: "{Object} options to pass to template()",
      beautify: "{Boolean} whether to pretty print HTML, see github.com/einars/js-beautify .jsbeautifyrc
    });


Partials may use any extension, which is better for syntax highlighting.


## Syntax

To mark where layout should insert page

    {{{body}}}

To declare a block placeholder in layout

    {{{block "pageScripts"}}}

To define block content in a page

    {{#contentFor "pageScripts"}}
      CONTENT HERE
    {{/contentFor}}

## Layouts

There are three ways to use a layout, listed in precedence order

1.  Declarative within a page. Use handlebars comment

        {{!< LAYOUT}}

    Layout file resolution:

        If path starts with '.'
            LAYOUT is relative to template
        Else If `layoutsDir` is set
            LAYOUT is relative to `layoutsDir`
        Else
            LAYOUT from path.resolve(dirname(template), LAYOUT)

2.  As an option to render

        res.render('veggies', {
          title: 'My favorite veggies',
          veggies: veggies,
          layout: 'layout/veggie'
        });

    This option also allows for layout suppression (both the default layout and when specified declaratively in a page) by passing in a falsey Javascript value as the value of the `layout` property:

        res.render('veggies', {
          title: 'My favorite veggies',
          veggies: veggies,
          layout: null // render without using a layout template
        });

    Layout file resolution:

        If path starts with '.'
            layout is relative to template
        Else If `layoutsDir` is set
            layout is relative to `layoutsDir`
        Else
            layout from path.resolve(viewsDir, layout)

3.  Lastly, use `defaultLayout` if specified in hbs configuration options.


Layouts can be nested: just include a declarative layout tag within any layout
template to have its content included in the declared "parent" layout.  Be
aware that too much nesting can impact performances, and stay away from
infinite loops!


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


## Engine Instances

Create isolated engine instances with their own cache system and handlebars engine.

    var hbs = require('express-hbs');
    var instance1 = hbs.create();
    var instance2 = hbs.create();


## Example

in File `app.js`
```
// http://expressjs.com/api.html#app.locals
app.locals({
    'PROD_MODE': 'production' === app.get('env')
});

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

    {{#if PROD_MODE}}
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

Big thanks to all [CONTRIBUTORS](https://github.com/barc/express-hbs/contributors)


## License

The MIT License (MIT)

Copyright (c) 2012-2014 Barc, Inc.

See file LICENSE for copying permissions.

