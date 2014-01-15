'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var handlebars = require('handlebars');

/**
 * Handle async helpers
 */
var async = require('./async');


/**
 * Regex pattern for layout directive. {{!< layout }}
 */
var layoutPattern = /{{!<\s+([A-Za-z0-9\._\-\/]+)\s*}}/;


/**
 * Constructor
 */
var ExpressHbs = function() {
  this.handlebars = handlebars.create();

  // DEPRECATED, kept for backwards compatibility
  this.SafeString = this.handlebars.SafeString;
  this.Utils = this.handlebars.Utils;
};


/**
 * Defines a block into which content is inserted via `content`.
 *
 * @example
 *  In layout.hbs
 *
 *  {{{block "pageStylesheets"}}}
 */
ExpressHbs.prototype.block = function(name) {
  var val = (this.blocks[name] || []).join('\n');
  // clear the block
  this.blocks[name] = [];
  return val;
};


/**
 * Defines content for a named block declared in layout.
 *
 * @example
 *
 * {{#content "pageStylesheets"}}
 * <link rel="stylesheet" href='{{{URL "css/style.css"}}}' />
 * {{/content}}
 */
ExpressHbs.prototype.content = function(name, options, context) {
  var block = this.blocks[name] || (this.blocks[name] = []);
  block.push(options.fn(context));
};

/**
 * Returns the layout filepath given the template filename and layout used.
 * Backward compatible with specifying layouts in locals like 'layouts/foo',
 * but if you have specified a layoutsDir you can specify layouts in locals with just the layout name.
 */
ExpressHbs.prototype.layoutPath = function(filename, layout) {
  var layoutPath;

  if (layout[0] === '.') {
    layoutPath = path.resolve(path.dirname(filename), layout);
  } else if (this.layoutsDir) {
    layoutPath = path.resolve(this.layoutsDir, layout);
  } else {
    layoutPath = path.resolve(this.viewsDir, layout);
  }

  return layoutPath;
}

/**
 * Find the path of the declared layout in `str`, if any
 *
 * @param  {String} str The template string to parse
 * @return {String} File path of any declared layout
 */
ExpressHbs.prototype.declaredLayoutFile = function(str, filename) {
  var matches = str.match(layoutPattern);
  if (matches) {
    var layout = matches[1];
    // behave like `require`, if '.' then relative, else look in
    // usual location (layoutsDir)
    if (this.layoutsDir && layout[0] !== '.') {
      layout = path.resolve(this.layoutsDir, layout);
    }

    return path.resolve(path.dirname(filename), layout);
  }
}

/**
 * Compiles a layout file.
 *
 * The function checks whether the layout file declares a parent layout.
 * If it does, the parent layout is loaded recursively and checked as well
 * for a parent layout, and so on, until the top layout is reached.
 * All layouts are then returned as a stack to the caller via the callback.
 *
 * @param {String}      layoutFile  The path to the layout file to compile
 * @param {Boolean}     useCache    Cache the compiled layout?
 * @param {Function}    cb          Callback called with layouts stack
 */
ExpressHbs.prototype.cacheLayout = function(layoutFile, useCache, cb) {
  var self = this;

  // assume hbs extension
  if (path.extname(layoutFile) === '') layoutFile += this._options.extname;

  // path is relative in directive, make it absolute
  var layoutTemplates = this.cache[layoutFile];
  if (layoutTemplates) return cb(null, layoutTemplates);

  fs.readFile(layoutFile, 'utf8', function(err, str) {
    if (err) return cb(err);

    //  File path of eventual declared parent layout
    var parentLayoutFile = self.declaredLayoutFile(str, layoutFile);

    // This function returns the current layout stack to the caller
    var _returnLayouts = function(layouts) {
      layouts = layouts.slice(0);
      layouts.push(self.handlebars.compile(str));

      if (useCache) {
        self.cache[layoutFile] = layouts.slice(0);
      }

      cb(null, layouts);
    };

    if (parentLayoutFile) {
      // Recursively compile/cache parent layouts
      self.cacheLayout(parentLayoutFile, useCache, function(err, parentLayouts) {
        if (err) return cb(err);
        _returnLayouts(parentLayouts);
      });
    } else {
      // No parent layout: return current layout with an empty stack
      _returnLayouts([]);
    }
  });
};


/**
 * Cache partial templates found under directories configure in partialsDir.
 */
ExpressHbs.prototype.cachePartials = function(cb) {
  var self = this;

  if(!(this.partialsDir instanceof Array)){
    this.partialsDir = [this.partialsDir];
  }

  // Use to iterate all folder in series
  var count = 0;

  function readNext() {
    readdirp({ root: self.partialsDir[count], fileFilter: '*.*' })
    .on('warn', function(err) {
      console.warn('Non-fatal error in express-hbs cachePartials.', err);
    })
    .on('error', function(err) {
      console.error('Fatal error in express-hbs cachePartials', err);
      return cb(err);
    })
    .on('data', function(entry) {
      if (!entry) return;
      var source = fs.readFileSync(entry.fullPath, 'utf8');
      var dirname = path.dirname(entry.path);
      dirname = dirname === '.' ? '' : dirname + '/';

      var name = dirname + path.basename(entry.name, path.extname(entry.name));
      self.handlebars.registerPartial(name, source);
    })
    .on('end', function() {
      count += 1;

      // If all directories aren't read, read the next directory
      if(count < self.partialsDir.length){
        readNext()
      }else{
        self.isPartialCachingComplete = true;
        cb && cb(null, true);
      }
    });
  };

  readNext();
};


/**
 * Express 3.x template engine compliance.
 *
 * @param {Object} options = {
 *   handlebars: "override handlebars",
 *   defaultLayout: "path to default layout",
 *   partialsDir: "absolute path to partials (one path or an array of paths)",
 *   layoutsDir: "absolute path to the layouts",
 *   extname: "extension to use",
 *   contentHelperName: "contentFor",
 *   blockHelperName: "block"
 * }
 *
 */
ExpressHbs.prototype.express3 = function(options) {
  var self = this;

  // Set defaults
  if (!options) options = {};
  if (!options.extname) options.extname = '.hbs';
  if (!options.contentHelperName) options.contentHelperName = 'contentFor';
  if (!options.blockHelperName) options.blockHelperName = 'block';
  if (!options.templateOptions) options.templateOptions = {};
  if (options.handlebars) this.handlebars = options.handlebars;

  this._options = options;
  if (this._options.handlebars) this.handlebars = this._options.handlebars;

  this.handlebars.registerHelper(this._options.blockHelperName, function(name, options) {
    var val = self.block(name);
    if(val == '' && (typeof options.fn === 'function')) {
      val = options.fn(this);
    }
    return val;
  });

  // Pass 'this' as context of helper function to don't lose context call of helpers.
  this.handlebars.registerHelper(this._options.contentHelperName, function(name, options) {
    return self.content(name, options, this);
  });

  // Absolute path to partials directory.
  this.partialsDir = this._options.partialsDir;

  // Absolute path to the layouts directory
  this.layoutsDir = this._options.layoutsDir;


  // Cache for templates, express 3.x doesn't do this for us
  this.cache = {};

  // Blocks for layouts. Is this safe? What happens if the same block is used on multiple connections?
  // Isn't there a chance block and content  are not in sync. The template and layout are processed asynchronously.
  this.blocks = {};

  // Holds the default compiled layout if specified in options configuration.
  this.defaultLayoutTemplates = null;

  // Keep track of if partials have been cached already or not.
  this.isPartialCachingComplete = false;

  return _express3.bind(this);
};


/**
 * Tries to load the default layout.
 *
 * @param {Boolean} useCache Whether to cache.
 */
ExpressHbs.prototype.loadDefaultLayout = function(useCache, cb) {
  var self = this;

  if (!this._options.defaultLayout) return cb();
  if (useCache && this.defaultLayoutTemplates) return cb(null, this.defaultLayoutTemplates);

  this.cacheLayout(this._options.defaultLayout, useCache, function(err, templates) {
    if (err) return cb(err);

    self.defaultLayoutTemplates = templates.slice(0);
    return cb(null, templates);
  });
};


/**
 * express 3.x template engine compliance
 */
function _express3(filename, options, cb) {
  // console.log('filename', filename);
  // console.log('options', options);

  this.viewsDir = options.settings.views;

  var self = this;

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
    var layoutFile = self.declaredLayoutFile(str, filename);
    if (layoutFile) {
      self.cacheLayout(layoutFile, options.cache, cb);
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
    var res = template(locals, self._options.templateOptions);

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
    var source, info, template, cached, template, layoutTemplates;

    if (options.cache) {
      info = self.cache[filename];
      if (info) {
        source = info.source;
        template = info.template;
      }
    }

    if (!info) {
      source = fs.readFileSync(filename, 'utf8');
      template = self.handlebars.compile(source);
      if (options.cache) {
        self.cache[filename] = { source: source, template: template };
      }
    }

    // Try to get the layout
    parseLayout(source, filename, function (err, layoutTemplates) {
      if (err) return cb(err);

      function renderIt(layoutTemplates) {
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
          var layoutFile = self.layoutPath(filename, options.layout);
          self.cacheLayout(layoutFile, options.cache, function (err, layoutTemplates) {
            if (err) return cb(err);
            renderIt(layoutTemplates);
          });

        } else {
          // if the value is falsey, behave as if no layout should be used - suppress defaults
          renderIt(null);
        }
      }

      //   3. Default layout specified when middleware was configured.
      else if (self.defaultLayoutTemplates) {
        renderIt(self.defaultLayoutTemplates);
      }

      // render without a template
      else renderIt(null);
    });
  }

  // kick it off by loading default template (if any)
  this.loadDefaultLayout(options.cache, function(err) {
    if (err) return cb(err);

    // Force reloading of all partials if caching is not used. Inefficient but there
    // is no loading partial event.
    if (self.partialsDir && (!options.cache || !self.isPartialCachingComplete)) {
      return self.cachePartials(function(err) {
        if (err) return cb(err);
        return compileFile(options, cb);
      });
    }

    return compileFile(options, cb);
  });
}


/**
 * Expose useful methods.
 */

ExpressHbs.prototype.registerHelper = function() {
  this.handlebars.registerHelper.apply(this.handlebars, arguments);
};

ExpressHbs.prototype.registerPartial = function() {
  this.handlebars.registerPartial.apply(this.handlebars, arguments);
};

ExpressHbs.prototype.registerAsyncHelper = function(name, fn) {
  this.handlebars.registerHelper(name, function(context) {
    return async.resolve(fn.bind(this), context);
  });
};

ExpressHbs.prototype.updateTemplateOptions = function(templateOptions) {
  this._options.templateOptions = templateOptions;
};

ExpressHbs.prototype.create = function() {
  return new ExpressHbs();
};

module.exports = new ExpressHbs();
