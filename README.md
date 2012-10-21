# express-hbs

Express 3 handlebars template engine complete with multiple layouts, blocks and cached partials.

Open source project from [Barc](http://barc.com), instant real-time forum on any website.

## Usage

To use with express 3.

```javascript
var hbs = require('express-hbs');

// Hook in express-hbs and tell it to use hbs for extensions and use `views/partials`
// for partials.
app.engine('hbs', hbs.express3({partialsDir: __dirname + '/views/partials'}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
```

## Syntax

To mark where page should be inserted into a layout.

    {{{body}}}

To use a layout, use handlebars comment. `LAYOUT` is a relative path from template.

    {{!< LAYOUT}}

To define a block in layout.

    {{{block "pageScripts"}}}

To define block content in a page.

    {{contentFor "pageScripts"}}
        CONTENT HERE
    {{/contentFor}}


## Example


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

    {{{block "pageScripts"}}}
  </body>
</html>
```


File `views/index.hbs`

```html
{{!< layout/default}}

{{#contentFor 'pageStyles'}}
<style>
  .clicker {
    color: blue;
  };
</style>
{{/contentFor}}


<h1>{{title}}</h1>
<p class='clicker'>Click me!</p>
```
