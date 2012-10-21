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


## Credits

Some source from [donpark/hbs](https://github.com/donpark/hbs)


## License

The MIT License (MIT)
Copyright (c) 2012 Barc, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
