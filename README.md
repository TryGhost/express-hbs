# express-hbs

Express handlebars template engine with multiple layouts, blocks and cached partials.

## v2.0.0

Version 2 was a rewrite and cleanup, with no known breaking changes. Lots of bugs were fixed which may have subtly changed behaviour.

Full details: https://github.com/TryGhost/express-hbs/releases/tag/2.0.0

## v1.0.0 Breaking Changes

If you're upgrading from v0.8.4 to v1.0.0 there are some potentially breaking changes to be aware of:

1. Handlebars @v4.0.5 - please see the [handlebars v4.0 compatibility notes](https://github.com/wycats/handlebars.js/blob/master/release-notes.md#v400---september-1st-2015)
2. The file extension for partial files must now match the extension configured in `extname` - please see [the PR](https://github.com/TryGhost/express-hbs/pull/88)

## Usage

To use with express 4.
```js
var hbs = require('express-hbs');

// Use `.hbs` for extensions and find partials in `views/partials`.
app.engine('hbs', hbs.express4({
  partialsDir: __dirname + '/views/partials'
}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
```
To use with express 3 is the same as above, except use hbs.express3

```js
app.engine('hbs', hbs.express3({
  partialsDir: __dirname + '/views/partials'
}));
```

Options for `#express3` and `#express4`

```js
hbs.express4({
  partialsDir: "{String/Array} [Required] Path to partials templates, one or several directories",

  // OPTIONAL settings
  restrictLayoutsTo: "{String} Absolute path to a directory to restrict layout directive reading from",
  blockHelperName: "{String} Override 'block' helper name.",
  contentHelperName: "{String} Override 'contentFor' helper name.",
  defaultLayout: "{String} Absolute path to default layout template",
  extname: "{String} Extension for templates & partials, defaults to `.hbs`",
  handlebars: "{Module} Use external handlebars instead of express-hbs dependency",
  i18n: "{Object} i18n object",
  layoutsDir: "{String} Path to layout templates",
  templateOptions: "{Object} options to pass to template()",
  beautify: "{Boolean} whether to pretty print HTML, see github.com/einars/js-beautify .jsbeautifyrc",

  // override the default compile
  onCompile: function(exhbs, source, filename) {
    var options;
    if (filename && filename.indexOf('partials') > -1) {
      options = {preventIndent: true};
    }
    return exhbs.handlebars.compile(source, options);
  }
});
```

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

    ## ⚠️ This creates a potential security vulnerability if used without a `restrictLayoutsTo`:

    The `restrictLayoutsTo` option will restrict reading layouts to a particular directory, if you do not pass this option then do not use the `layout` option in conjunction with passing user submitted data to res.render e.g. `res.render('index', req.query)`. This allows users to read arbitrary files from your filesystem!

    ```js
    res.render('veggies', {
      title: 'My favorite veggies',
      veggies: veggies,
      layout: 'layout/veggie'
    });
    ```

    This option also allows for layout suppression (both the default layout and when specified declaratively in a page) by passing in a falsey Javascript value as the value of the `layout` property:

    ```js
    res.render('veggies', {
      title: 'My favorite veggies',
      veggies: veggies,
      layout: null // render without using a layout template
    });
    ```

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

### Synchronous helpers

```js
hbs.registerHelper('link', function(text, options) {
  var attrs = [];
  for(var prop in options.hash) {
    attrs.push(prop + '="' + options.hash[prop] + '"');
  }
  return new hbs.SafeString(
    "<a " + attrs.join(" ") + ">" + text + "</a>"
  );
});
```

in markup
```
{{{link 'barc.com' href='http://barc.com'}}}
```

### Asynchronous helpers

```js
hbs.registerAsyncHelper('readFile', function(filename, cb) {
  fs.readFile(path.join(viewsDir, filename), 'utf8', function(err, content) {
    cb(new hbs.SafeString(content));
  });
});
```

in markup
```
{{{readFile 'tos.txt'}}}
```


## i18n support

Express-hbs supports [i18n](https://github.com/mashpie/i18n-node)

```js
var i18n = require('i18n');

// minimal config
i18n.configure({
    locales: ['en', 'fr'],
    cookie: 'locale',
    directory: __dirname + "/locales"
});

app.engine('hbs', hbs.express3({
    // ... options from above
    i18n: i18n,  // registers __ and __n helpers
}));
app.set('view engine', 'hbs');
app.set('views', viewsDir);

// cookies are needed
app.use(express.cookieParser());

// init i18n module
app.use(i18n.init);
```

## Engine Instances

Create isolated engine instances with their own cache system and handlebars engine.

```js
var hbs = require('express-hbs');
var instance1 = hbs.create();
var instance2 = hbs.create();
```

## Template options

The main use case for template options is setting the handlebars "data" object - this creates global template variables accessible with an `@` prefix.

Template options can be set in 3 ways. When setting global template options they can be [passed as config on creation of an instance](https://github.com/barc/express-hbs#usage), and they can also be updated used the `updateTemplateOptions(templateOptions)` method of an instance. To set template options for an individual request they can be set on `res.locals` using the helper method `updateLocalTemplateOptions(locals, templateOptions)`.

Both of these methods have a companion method `getTemplateOptions()` and `getLocalTemplateOptions(locals)`, which should be used when extending or merging the current options.

## Example

in File `app.js`

```js
// http://expressjs.com/api.html#app.locals
app.locals({
    'PROD_MODE': 'production' === app.get('env')
});

```

File `views/layout/default.hbs`

```html
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

```html
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

Big thanks to all [CONTRIBUTORS](https://github.com/TryGhost/express-hbs/contributors)


## License

The MIT License (MIT)

Copyright (c) 2012-2023 Barc, Inc., Ghost Foundation - Released under the [MIT license](LICENSE).
