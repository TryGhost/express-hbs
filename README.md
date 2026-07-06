# express-hbs

Express Handlebars template engine for Express apps, with nested layouts,
named content blocks, cached partials, i18n helpers, and asynchronous helpers.

`express-hbs` exposes Express-compatible view engine functions and a shared
Handlebars instance. It is used by apps that want Handlebars templates with
layout inheritance and block-style content regions while keeping the familiar
`app.engine()` integration.

## Requirements

- Node.js 20 or later
- pnpm 10 when working on this repository

## v2.0.0

Version 2 was a rewrite and cleanup, with no known breaking changes. Lots of bugs were fixed which may have subtly changed behaviour.

Full details: https://github.com/TryGhost/express-hbs/releases/tag/2.0.0

## v1.0.0 Breaking Changes

If you're upgrading from v0.8.4 to v1.0.0 there are some potentially breaking changes to be aware of:

1. Handlebars @v4.0.5 - please see the [handlebars v4.0 compatibility notes](https://github.com/wycats/handlebars.js/blob/master/release-notes.md#v400---september-1st-2015)
2. The file extension for partial files must now match the extension configured in `extname` - please see [the PR](https://github.com/TryGhost/express-hbs/pull/88)

## Usage

Register the engine with Express using `hbs.express4()`.

```js
var hbs = require('express-hbs');

// Use `.hbs` for extensions and find partials in `views/partials`.
app.engine('hbs', hbs.express4({
  partialsDir: __dirname + '/views/partials'
}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
```

`hbs.express3()` is still available for legacy apps and accepts the same
options:

```js
app.engine('hbs', hbs.express3({
  partialsDir: __dirname + '/views/partials'
}));
```

Options for `express3()` and `express4()`:

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

To mark where a layout should insert page content:

    {{{body}}}

To declare a block placeholder in a layout:

    {{{block "pageScripts"}}}

To define block content in a page:

    {{#contentFor "pageScripts"}}
      CONTENT HERE
    {{/contentFor}}

## Layouts

There are three ways to use a layout, listed in precedence order:

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

    ⚠️ Passing user-controlled data into the `layout` option can read arbitrary
    files unless `restrictLayoutsTo` confines layout resolution to a safe
    directory. Do not call `res.render('index', req.query)` or similar without
    setting `restrictLayoutsTo`.

    ```js
    res.render('veggies', {
      title: 'My favorite veggies',
      veggies: veggies,
      layout: 'layout/veggie'
    });
    ```

    This option also allows layout suppression, including the default layout and
    template-declared layouts, by passing a falsey JavaScript value:

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

The main use case for template options is setting the Handlebars `data` object,
which creates global template variables accessible with an `@` prefix.

Template options can be passed when creating an engine instance, updated with
`updateTemplateOptions(templateOptions)`, or set for one request with
`updateLocalTemplateOptions(locals, templateOptions)` on `res.locals`.

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

```sh
pnpm install
node example/app.js
```

The example server listens on <http://localhost:3000>.

## Testing

Install dependencies and run the test suite:

```sh
pnpm install
pnpm test
```

Useful maintainer commands:

```sh
pnpm lint          # oxlint plus oxfmt --check
pnpm lint:fix      # apply safe lint fixes and formatting
pnpm coverage      # mocha under nyc with enforced coverage thresholds
```


## Credits

Inspiration and code from [donpark/hbs](https://github.com/donpark/hbs)

Big thanks to all [CONTRIBUTORS](https://github.com/TryGhost/express-hbs/contributors)


## License

The MIT License (MIT)

Copyright (c) 2012-2026 Barc, Inc., Ghost Foundation - Released under the [MIT license](LICENSE).
