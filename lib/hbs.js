'use strict';
var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
exports.handlebars = require('handlebars');

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
 * Isn't there a chance block and content  are not in sync. The template and layout are processed
 * asynchronously.
 */
var blocks = {};

/**
 * Absolute path to partials directory.
 */
var partialsDir;

/**
 * Absolute path to the layouts directory
 */
var layoutsDir;

/**
 * Keep copy of options configuration.
 */
var _options;

/**
 * Holds the default compiled layout if specified in options configuration.
 */
var defaultLayoutTemplates;


/**
 * Regex pattern for layout directive. {{!< layout }}
 */
var layoutPattern = /{{!<\s+([A-Za-z0-9\._\-\/]+)\s*}}/;

/**
 * Keep track of if partials have been cached already or not.
 */
var isPartialCachingComplete = false;


/**
 * Defines a block into which content is inserted via `content`.
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
 * Defines content for a named block declared in layout.
 *
 * @example
 *
 * {{#content "pageStylesheets"}}
 * <link rel="stylesheet" href='{{{URL "css/style.css"}}}' />
 * {{/content}}
 */
function content(name, context) {
  var block = blocks[name];
  if (!block) {
    block = blocks[name] = [];
  }
  block.push(context.fn(this));
}

/**
 * Returns the layout filepath given the template filename and layout used.
 * Backward compatible with specifying layouts in locals like 'layouts/foo',
 * but if you have specified a layoutsDir you can specify layouts in locals with just the layout name.
 */
function layoutPath(filename, layout) {
  var layoutWithDir = layout.split('/').length > 1;
  var layoutsDirUsed = layoutWithDir ? null : layoutsDir;
  return path.resolve(path.join(layoutsDirUsed ? layoutsDirUsed : path.dirname(filename), layout));
}

/**
 * Find the path of the declared layout in `str`, if any
 *
 * @param  {String} str The template string to parse
 * @return {String} File path of any declared layout
 */
function declaredLayoutFile(str, filename) {
  var matches = str.match(layoutPattern);
  if (matches) {
    var layout = matches[1];
    return layoutPath(filename, layout);
  } else {
    return null;
  }
}

/**
 * Compiles a layout file.
 * The function will check whether the layout file declares a parent layout or not.
 * If it does, this parent layout is loaded recursively and checked as well
 * for a parent layout, and so on, until the top layout is reached.
 * All layouts are then returned as a stack to the caller via the callback.
 *
 * @param {String}      layoutFile  The path to the layout file to compile
 * @param {Boolean}     useCache    Cache the compiled layout?
 * @param {Function}    cb          Callback called with layouts stack
 */
function cacheLayout(layoutFile, useCache, cb) {
  // assume hbs extension
  if (path.extname(layoutFile) === '') layoutFile += _options.extname;

  // path is relative in directive, make it absolute
  var layoutTemplates = cache[layoutFile] ? cache[layoutFile].layoutTemplates : null;
  if (layoutTemplates) return cb(null, layoutTemplates);

  fs.readFile(layoutFile, 'utf8', function (err, str) {
    if (err) return cb(err);

    //  File path of eventual declared parent layout
    var parentLayoutFile = declaredLayoutFile(str, layoutFile);

    // This function returns the current layout stack to the caller
    var _returnLayouts = function(layouts) {
      layouts.push(exports.handlebars.compile(str));

      if (useCache) {
        cache[layoutFile] = {
          layoutTemplates: layouts
        };
      }

      cb(null, layouts);
    };

    if (parentLayoutFile) {
      // Recursively compile/cache parent layouts
      cacheLayout(parentLayoutFile, useCache, function(err, parentLayouts) {
        if (err) return cb(err);
        _returnLayouts(parentLayouts);
      });
    } else {
      // No parent layout: return current layout with an empty stack
      _returnLayouts([]);
    }
  });
}


/**
 * Cache partial templates found under <views>/partials.
 *
 * @param {String} base The views directory.
 */
function cachePartials(cb) {
  readdirp({ root: partialsDir, fileFilter: '*.*' })
    .on('warn', function (err) {
      console.warn('Non-fatal error in express-hbs cachePartials.', err);
    })
    .on('error', function (err) {
      console.error('Fatal error in express-hbs cachePartials', err);
      return cb(err);
    })
    .on('data', function (entry) {
      if (!entry) return;
      var source = fs.readFileSync(entry.fullPath, 'utf8');
      var dirname = path.dirname(entry.path);
      dirname = dirname === '.' ? '' : dirname + '/';

      var name = dirname + path.basename(entry.name, path.extname(entry.name));
      exports.handlebars.registerPartial(name, source);
    })
    .on('end', function () {
        isPartialCachingComplete = true;
        cb && cb(null, true);
    });
}


/**
 * Express 3.x template engine compliance.
 *
 * @param {Object} options = {
 *   handlebars: "override handlebars",
 *   defaultLayout: "path to default layout",
 *   partialsDir: "absolute path to partials",
 *   layoutsDir: "absolute path to the layouts",
 *   extname: "extension to use",
 *   contentHelperName: "contentFor",
 *   blockHelperName: "block"
 * }
 *
 */
exports.express3 = function (options) {
  _options = options || {};
  if (!_options.extname) _options.extname = '.hbs';
  if (!_options.contentHelperName) _options.contentHelperName = 'contentFor';
  if (!_options.blockHelperName) _options.blockHelperName = 'block';
  if (!_options.templateOptions) _options.templateOptions = {};
  if (_options.handlebars) exports.handlebars = _options.handlebars;

  exports.handlebars.registerHelper(_options.blockHelperName, block);
  exports.handlebars.registerHelper(_options.contentHelperName, content);

  partialsDir = _options.partialsDir;

  layoutsDir = _options.layoutsDir;

  return _express3;
};


/**
 * Tries to load the default layout.
 *
 * @param {Boolean} useCache Whether to cache.
 */
function loadDefaultLayout(useCache, cb) {
  if (!_options.defaultLayout) return cb();
  if (useCache && defaultLayoutTemplates) return cb(null, defaultLayoutTemplates);

  cacheLayout(_options.defaultLayout, useCache, function (err, templates) {
    if (err) return cb(err);

    defaultLayoutTemplates = templates;
    return cb(null, templates);
  });
}



/**
 * express 3.x template engine compliance
 */
var _express3 = function (filename, options, cb) {
  var handlebars = exports.handlebars;

  //console.log('options', options);

  // Unfortunately, express3 above is not async so check here to load the
  // default template once.

  /**
   * Allow a layout to be declared as a handlebars comment to remain spec
   * compatible with handlebars.
   *
   * Valid directives
   *
   *  {{!< foo}}                      # foo.hbs in same directory as template
   *  {{!< ../layouts/default}}       # default.hbs in parent layout directory
   *  {{!< ../layouts/default.html}}  # default.html in parent layout directory
   */
  function parseLayout(str, filename, cb) {
    var layoutFile = declaredLayoutFile(str, filename);
    if (layoutFile) {
        cacheLayout(layoutFile, options.cache, cb);
    }
    else {
      cb(null, null);
    }
  }


  /**
   * Renders `template` with given `locals` and calls `cb` with the
   * resulting HTML string.
   *
   * @param template
   * @param locals
   * @param cb
   */
  function renderTemplate(template, locals, cb) {
    var res = template(locals, _options.templateOptions);

    // Wait for async helpers
    async.done(function (values) {
      Object.keys(values).forEach(function (id) {
        res = res.replace(id, values[id]);
      });

      cb(null, res);
    });
  }


    /**
     * Renders `template` with an optional set of nested `layoutTemplates` using
     * data in `locals`.
     */
  function render(template, locals, layoutTemplates, cb) {
    if(layoutTemplates == undefined) layoutTemplates = [];

    // We'll render templates from bottom to top of the stack, each template
    // being passed the rendered string of the previous ones as `body`
    var i = layoutTemplates.length - 1;

    var _stackRenderer = function(err, htmlStr) {
      if(err) return cb(err);

      if (i >= 0) {
        locals.body = htmlStr;
        renderTemplate(layoutTemplates[i--], locals, _stackRenderer);
      } else {
        cb(null, htmlStr);
      }
    };

    // Start the rendering with the innermost page template
    renderTemplate(template, locals, _stackRenderer);
  }


  /**
   * Compiles a file into a template and a layoutTemplate, then renders it above.
   */
  function compileFile(locals, cb) {
    var cached, template, layoutTemplates;

    // check cache
    cached = cache[filename];
    if (cached) {
      template = cached.template;
      layoutTemplates = cached.layoutTemplates;
      return render(template, locals, layoutTemplates, cb);
    }

    fs.readFile(filename, 'utf8', function (err, str) {
      if (err) return cb(err);

      var template = handlebars.compile(str);
      if (options.cache) {
        cache[filename] = {
          template: template
        };
      }

      // Try to get the layout
      parseLayout(str, filename, function (err, layoutTemplates) {
        if (err) return cb(err);

        function renderIt(layoutTemplates) {
          if (layoutTemplates && options.cache) {
            cache[filename].layoutTemplates = layoutTemplates;
          }
          return render(template, locals, layoutTemplates, cb);
        }

        // Determine which layout to use
        //   1. Layout specified in template
        if (layoutTemplates) {
          renderIt(layoutTemplates);
        }

        //   2. Layout specified by options from render
        else if (typeof (options.layout) !== 'undefined') {
          if (options.layout) {
            var layoutFile = layoutPath(filename, options.layout);
            cacheLayout(layoutFile, options.cache, function (err, layoutTemplates) {
              if (err) return cb(err);
              renderIt(layoutTemplates);
            });

          } else {
            // if the value is falsey, behave as if no layout should be used - suppress defaults
            renderIt(null);
          }
        }

        //   3. Default layout specified when middleware was configured.
        else if (defaultLayoutTemplates) {
          renderIt(defaultLayoutTemplates);
        }

        // render without a template
        else renderIt(null);
      });
    });
  }

  // kick it off by loading default template (if any)
  loadDefaultLayout(options.cache, function (err) {
    if (err) return cb(err);

    // Force reloading of all partials if caching is not used. Inefficient but there
    // is no loading partial event.
    if (partialsDir && (!options.cache || !isPartialCachingComplete)) {
      return cachePartials(function (err) {
        if (err) {
          return cb(err);
        }

        return compileFile(options, cb);
      });
    }

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

exports.registerAsyncHelper = function (name, fn) {
  exports.handlebars.registerHelper(name, function (context) {
    return async.resolve(fn.bind(this), context);
  });
};

// DEPRECATED, kept for backwards compatibility
exports.SafeString = exports.handlebars.SafeString;
exports.Utils = exports.handlebars.Utils;
