var fs = require('fs');
var path = require('path');
exports.handlebars = require('handlebars');

/**
 * handle async helpers
 */
var async = require('./async');

// cache for templates, express 3.x doesn't do this for us
var cache = {};

// Blocks for layouts. Is this safe? What happens if the same block is used on multiple connections?
// Isn't there a chance block and contentFor  are not in sync. The template and layout are processed
// asynchronously.
var blocks = {};

var partialsDir;


/**
 * Regex pattern for layout directive. {{!< layout }}
 */
var layoutPattern = /\{\{\!\<\s+([A-Za-z0-9\._\-\/]+)\s*\}\}/;


/**
 * Defines a block into which content is inserted via `contentFor`.
 *
 * @example
 *  In layout.hbs
 *
 *  {{{block "pageStylesheets"}}}
 */
function block(name) {
    var val = (blocks[name] || []).join('\n');
    // clear the block
    blocks[name] = [];
    return val;
}


/**
 * Defines content for a named block usually declared in a layout.
 *
 * @example
 *
 * {{#contentFor "pageStylesheets"}}
 * <link rel="stylesheet" href='{{{URL "css/style.css"}}}' />
 * {{/contentFor}}
 */
function contentFor(name, context) {
    var block = blocks[name];
    if (!block) {
        block = blocks[name] = [];
    }
    block.push(context.fn(this));
}


/**
 * Cache partial templates found under <views>/partials.
 *
 * @param {String} base The views directory.
 */
function cachePartials() {
    var files = fs.readdirSync(partialsDir);

    files.forEach(function(file) {
        var source = fs.readFileSync(path.join(partialsDir, file), 'utf8');
        var name = path.basename(file, path.extname(file));
        exports.handlebars.registerPartial(name, source);
    });
}


/**
 * Express 3.x template engine compliance.
 *
 * @param {Object} options - { handlebars: "override handlebars", partialsDir: "absolute path to partials" }
 */
exports.express3 = function(options) {
  if (options.handlebars) exports.handlebars = options.handlebars;

  exports.handlebars.registerHelper('contentFor', contentFor);
  exports.handlebars.registerHelper('block', block);

  partialsDir = options.partialsDir;
  if (partialsDir) cachePartials();

  return _express3;
};



/**
 * express 3.x template engine compliance
 */
var _express3 = function(filename, options, cb) {
  var handlebars = exports.handlebars;
  var extname = options.extname || '.hbs';

  // Force reloading of all partials if cachine not used. Inefficient but there
  // is no loading partial event.
  if (!options.cache) cachePartials();

  /**
   * Allow a layout to be declared as a handlebars comment to remain spec compatible
   * with handlebars.
   *
   * Valid directives
   *
   *  {{!< foo}}                      # foo.hbs in same directory as template
   *  {{!< ../layouts/default}}       # default.hbs in parent layout directory
   *  {{!< ../layouts/default.html}}  # default.html in parent layout directory
   */
  function parseLayout(str, filename, cb) {
    var matches = str.match(layoutPattern);
    if (matches) {
      var layout = matches[1];

      // assume hbs extension
      if (path.extname(layout) === '') layout += extname;

      // path is relative in directive, make it absolute
      var layoutName = path.resolve(path.join(path.dirname(filename), layout));
      var layoutTemplate = cache[layoutName] ? cache[layoutName].layoutTemplate : null;

      if (layoutTemplate) return cb(null, layoutTemplate);

      fs.readFile(layoutName, 'utf8', function(err, str) {
        if (err) return cb(err);

        layoutTemplate = handlebars.compile(str);
        if (options.cache) {
          cache[layoutName] = {layoutTemplate: layoutTemplate};
        }

        cb(null, layoutTemplate);
      });
    }
    else {
      cb(null, null);
    }
  }


  /**
   * Renders `template` with an optional `layoutTemplate` using data in `locals`.
   */
  function render(template, locals, layoutTemplate, cb) {
    var res = template(locals);
    async.done(function(values) {
      Object.keys(values).forEach(function(id) {
        res = res.replace(id, values[id]);
      });

      if (!layoutTemplate) return cb(null, res);

      // layout declare a {{{body}}} placeholder into which a page is inserted
      locals.body = res;

      var layoutResult = layoutTemplate(locals);
      async.done(function(values) {
        Object.keys(values).forEach(function(id) {
          layoutResult = layoutResult.replace(id, values[id]);
        });

        cb(null, layoutResult);
      });
    });
  }


  /**
   * Compiles a file into a template and a layoutTemplate, then renders it above.
   */
  function compileFile(locals, cb) {
    var cached, template, layoutTemplate;

    // check cache
    cached = cache[filename];
    if (cached) {
      template = cached.template;
      layoutTemplate = cached.layoutTemplate;
      return render(template, locals, layoutTemplate, cb);
    }

    fs.readFile(filename, 'utf8', function(err, str) {
      if (err) return cb(err);

      // read layout
      var template = handlebars.compile(str);
      if (options.cache) {
        cache[filename] = { template: template };
      }

      parseLayout(str, filename, function(err, layoutTemplate) {
        if (err) return cb(err);

        if (layoutTemplate && options.cache) {
            cache[filename].layoutTemplate = layoutTemplate;
        }
        return render(template, locals, layoutTemplate, cb);
      });
    });
  }

  return compileFile(options, cb);
};


/**
 * Expose useful methods.
 */

exports.registerHelper = function () {
  exports.handlebars.registerHelper.apply(exports.handlebars, arguments);
};

exports.registerPartial = function () {
  exports.handlebars.registerPartial.apply(exports.handlebars, arguments);
};

exports.registerAsyncHelper = function(name, fn) {
  exports.handlebars.registerHelper(name, function(context) {
    return async.resolve(fn, context);
  });
};

// DEPRECATED, kept for backwards compatibility
exports.SafeString = exports.handlebars.SafeString;
exports.Utils = exports.handlebars.Utils;
