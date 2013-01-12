var providers = require('./providers'),
    FileProvider = providers.FileProvider,
    path = require('path');

exports.handlebars = require('handlebars');

exports.providers = providers;

/**
 * Handle async helpers
 */
var async = require('./async');

/**
 * Cache for templates, express 3.x doesn't do this for us
 */
var cache = {};

/**
 * Blocks for layouts. Is this safe? What happens if the same block is used on multiple connections?
 * Isn't there a chance block and contentFor  are not in sync. The template and layout are processed
 * asynchronously.
 */
var blocks = {};

/**
 * Absolute path to partials directory.
 */
var partialsDir;

/**
 * Keep copy of options configuration.
 */
var _options;

/**
 * Holds the default compiled layout if specified in options configuration.
 */
var defaultLayoutTemplate;


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
 * Compiles a layout file.
 *
 * @param {String} layoutFile
 */
function cacheLayout(layoutFile, useCache, cb) {

  // assume hbs extension
  if (path.extname(layoutFile) === '') layoutFile += _options.extname;

  // path is relative in directive, make it absolute
  var layoutTemplate = cache[layoutFile] ? cache[layoutFile].layoutTemplate : null;
  if (layoutTemplate) return cb(null, layoutTemplate);

  _options.provider.getTemplate(layoutFile, function(err, str) {
    if (err) return cb(err);

    layoutTemplate = exports.handlebars.compile(str);
    if (useCache) {
      cache[layoutFile] = {layoutTemplate: layoutTemplate};
    }

    cb(null, layoutTemplate);
  });
}


/**
 * Cache partial templates found under <views>/partials.
 *
 * @param {String} base The views directory.
 */
function cachePartials() {
  _options.provider.getPartials(function(err,partials){ // not doing anything w/ error yet, that's probably going to need to change
    Object.keys(partials).forEach(function(name){
        exports.handlebars.registerPartial(name, partials[name]);
    });
  });
}


/**
 * Express 3.x template engine compliance.
 *
 * @param {Object} options - {
 *   handlebars: "override handlebars",
 *   defaultLayout: "path to default layout",
 *   partialsDir: "absolute path to partials",  ///TODO: need to change this to be less fs-specific terminology; e.g. collection/table for partials
 *   extname: "extension to use"
 * }
 *
 */
exports.express3 = function(options) {
  _options = options || {};
  if (!_options.extname) _options.extname = '.hbs';

  if (_options.handlebars) exports.handlebars = _options.handlebars;

  if(!_options.provider) options.provider = new FileProvider(_options);

  exports.handlebars.registerHelper('contentFor', contentFor);
  exports.handlebars.registerHelper('block', block);

  partialsDir = _options.partialsDir; 
  if (partialsDir) cachePartials();

  return _express3;
};


/**
 * Tries to load the default layout.
 *
 * @param {Boolean} useCache Whether to cache.
 */
function loadDefaultLayout(useCache, cb) {
  if (!_options.defaultLayout) return cb();
  if (useCache && defaultLayoutTemplate) return cb(null, defaultLayoutTemplate);

  cacheLayout(_options.defaultLayout, useCache, function(err, template) {
    if (err) return cb(err);

    defaultLayoutTemplate = template;
    return cb(null, template);
  });
}



/**
 * express 3.x template engine compliance
 */
var _express3 = function(filename, options, cb) {
  var handlebars = exports.handlebars;

  // Force reloading of all partials if cachine not used. Inefficient but there
  // is no loading partial event.
  if (!options.cache && partialsDir) cachePartials();

  // Unfortunately, express3 above is not async so check here to load the
  // default template once.

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

      // cacheLayout expects absolute path
      layout = path.resolve(path.join(path.dirname(filename), layout));
      cacheLayout(layout, options.cache, cb);
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

    _options.provider.getTemplate(filename, function(err, str) {
      if (err) return cb(err);

      var template = handlebars.compile(str);
      if (options.cache) {
        cache[filename] = { template: template };
      }

      // Try to get the layout
      parseLayout(str, filename, function(err, layoutTemplate) {
        if (err) return cb(err);

        function renderIt(layoutTemplate) {
          if (layoutTemplate && options.cache) {
            cache[filename].layoutTemplate = layoutTemplate;
          }
          return render(template, locals, layoutTemplate, cb);
        }

        // Determine which layout to use
        //   1. Layout specified in template
        if (layoutTemplate) {
          renderIt(layoutTemplate);
        }

        //   2. Layout specified by options from render
        else if (typeof(options.layout) !== 'undefined') {
          if (options.layout) {
            var layoutFile = path.resolve(path.join(path.dirname(filename), options.layout));
            cacheLayout(layoutFile, options.cache, function(err, layoutTemplate) {
              if (err) return cb(err);
              renderIt(layoutTemplate);
            });
            
          } else {
            // if the value is falsey, behave as if no layout should be used - suppress defaults
            renderIt(null);
          }
        }

        //   3. Default layout specified when middleware was configured.
        else if (defaultLayoutTemplate) {
          renderIt(defaultLayoutTemplate);
        }

        // render without a template
        else renderIt(null);
      });
    });
  }

  // kick it off by loading default template (if any)
  loadDefaultLayout(options.cache, function(err) {
    if (err) return cb(err);
    return compileFile(options, cb);
  });
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
