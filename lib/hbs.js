'use strict';

var fs = require('fs');
var path = require('path');
var readdirp = require('readdirp');
var handlebars = require('handlebars');
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
  this.SafeString = this.handlebars.SafeString;
  this.Utils = this.handlebars.Utils;
  this.beautify = null;
  this.beautifyrc = null;
};


/**
 * Defines a block into which content is inserted via `content`.
 *
 * @example
 * In layout.hbs
 *
 *  {{{block "pageStylesheets"}}}
 */
ExpressHbs.prototype.block = function(name) {
  var val = (this.blocks[name] || []).join('\n');
  // free mem
  this.blocks[name] = null;
  return val;
};

/**
 * Defines content for a named block declared in layout.
 *
 * @example
 *
 * {{#contentFor "pageStylesheets"}}
 * <link rel="stylesheet" href='{{{URL "css/style.css"}}}' />
 * {{/contentFor}}
 */
ExpressHbs.prototype.content = function(name, options, context) {
  var block = this.blocks[name] || (this.blocks[name] = []);
  block.push(options.fn(context));
};

/**
 * Returns the layout filepath given the template filename and layout used.
 * Backward compatible with specifying layouts in locals like 'layouts/foo',
 * but if you have specified a layoutsDir you can specify layouts in locals with just the layout name.
 *
 * @param {String} filename Path to template file.
 * @param {String} layout Layout path.
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
 * @param {String} filename Path to template
 * @returns {String|undefined} Returns the path to layout.
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
};

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
      var currentLayout;
      layouts = layouts.slice(0);
      currentLayout = self.compile(str, layoutFile);
      layouts.push(currentLayout);
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

  if (!(this.partialsDir instanceof Array)) {
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
      self.registerPartial(name, source);
    })
    .on('end', function() {
      count += 1;

      // If all directories aren't read, read the next directory
      if (count < self.partialsDir.length) {
        readNext()
      } else {
        self.isPartialCachingComplete = true;
        cb && cb(null, true);
      }
    });
  }

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
 *   blockHelperName: "block",
 *   beautify: "{Boolean} whether to pretty print HTML"
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

  if (options.i18n) {
    var i18n = options.i18n;
    this.handlebars.registerHelper('__', function() {
      return i18n.__.apply(this, arguments);
    });
    this.handlebars.registerHelper('__n', function() {
      return i18n.__n.apply(this, arguments);
    });
  }

  this.handlebars.registerHelper(this._options.blockHelperName, function(name, options) {
    var val = self.block(name);
    if (val == '' && (typeof options.fn === 'function')) {
      val = options.fn(this);
    }
    // blocks may have async helpers
    if (val.indexOf('__aSyNcId_') >= 0) {
      if (self.asyncValues) {
        Object.keys(self.asyncValues).forEach(function (id) {
          val = val.replace(id, self.asyncValues[id]);
          val = val.replace(self.Utils.escapeExpression(id), self.Utils.escapeExpression(self.asyncValues[id]));
        });
      }
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

  // express passes this through _express3 func, gulp pass in an option
  this.viewsDir = null
  this.viewsDirOpt = this._options.viewsDir;

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
 *
 * @param {String} filename Full path to template.
 * @param {Object} options Is the context or locals for templates. {
 *  {Object} settings - subset of Express settings, `settings.views` is
 *                      the views directory
 * }
 * @param {Function} cb The callback expecting the rendered template as a string.
 *
 * @example
 *
 * Example options from express
 *
 *      {
 *        settings: {
 *           'x-powered-by': true,
 *           env: 'production',
 *           views: '/home/coder/barc/code/express-hbs/example/views',
 *           'jsonp callback name': 'callback',
 *           'view cache': true,
 *           'view engine': 'hbs'
 *         },
 *         cache: true,
 *
 *         // the rest are app-defined locals
 *         title: 'My favorite veggies',
 *         layout: 'layout/veggie'
 *       }
 */
function _express3(filename, source, options, cb) {
  // console.log('filename', filename);
  // console.log('options', options);

  // support running as a gulp/grunt filter outside of express
  if (arguments.length === 3) {
    cb = options;
    options = source;
    source = null;
  }

  this.viewsDir = options.settings.views || this.viewsDirOpt;
  var self = this;

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
    } else {
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
    var res;

    try {
      res = template(locals, self._options.templateOptions);
    } catch (err) {
      if (err.message) {
        err.message = '[' + template.__filename + '] ' + err.message;
      } else if (typeof err === 'string') {
        err = '[' + template.__filename + '] ' + err;
      }
      return cb(err, null);
    }

    // Wait for async helpers
    async.done(function (values) {
      // Save for layout. Block helpers are called within layout, not in the
      // current template.
      self.asyncValues = values;

      Object.keys(values).forEach(function (id) {
        res = res.replace(id, values[id]);
        res = res.replace(self.Utils.escapeExpression(id), self.Utils.escapeExpression(values[id]));
      });
      cb(null, res);
    });
  }


  /**
   * Renders `template` with an optional set of nested `layoutTemplates` using
   * data in `locals`.
   */
  function render(template, locals, layoutTemplates, cb) {
    if (layoutTemplates == undefined) layoutTemplates = [];

    // We'll render templates from bottom to top of the stack, each template
    // being passed the rendered string of the previous ones as `body`
    var i = layoutTemplates.length - 1;

    var _stackRenderer = function(err, htmlStr) {
      if (err) return cb(err);

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
   * Lazy loads js-beautify, which shouldn't be used in production env.
   */
  function loadBeautify() {
    if (!self.beautify) {
      self.beautify = require('js-beautify').html;
      var rc = path.join(process.cwd(), '.jsbeautifyrc');
      if (fs.existsSync(rc)) {
        self.beautifyrc = JSON.parse(fs.readFileSync(rc, 'utf8'));
      }
    }
  }


  /**
   * Compiles a file into a template and a layoutTemplate, then renders it above.
   */
  function compileFile(locals, cb) {
    var source, info, template;

    if (options.cache) {
      info = self.cache[filename];
      if (info) {
        source = info.source;
        template = info.template;
      }
    }

    if (!info) {
      source = fs.readFileSync(filename, 'utf8');
      template = self.compile(source, filename);
      if (options.cache) {
        self.cache[filename] = { source: source, template: template };
      }
    }

    // Try to get the layout
    parseLayout(source, filename, function (err, layoutTemplates) {
      if (err) return cb(err);

      function renderIt(layoutTemplates) {
        if (self._options.beautify) {
          return render(template, locals, layoutTemplates, function(err, html) {
            if (err) return cb(err);
            loadBeautify();
            return cb(null, self.beautify(html, self.beautifyrc));
          });
        } else {
          return render(template, locals, layoutTemplates, cb);
        }
      }

      // Determine which layout to use
      // If options.layout is falsy, behave as if no layout should be used - suppress defaults
      if ((typeof (options.layout) !== 'undefined') && !options.layout) {
        renderIt(null);
      } else {
        //   1. Layout specified in template
        if (layoutTemplates) {
          renderIt(layoutTemplates);
        }

        //   2. Layout specified by options from render
        else if ((typeof (options.layout) !== 'undefined') && options.layout) {
          var layoutFile = self.layoutPath(filename, options.layout);
          self.cacheLayout(layoutFile, options.cache, function (err, layoutTemplates) {
            if (err) return cb(err);
            renderIt(layoutTemplates);
          });
        }

        //   3. Default layout specified when middleware was configured.
        else if (self.defaultLayoutTemplates) {
          renderIt(self.defaultLayoutTemplates);
        }

        // render without a template
        else renderIt(null);
      }
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
ExpressHbs.prototype.registerHelper = function(name, fn) {
  this.handlebars.registerHelper(name, fn);
};


/**
 * Registers a partial.
 *
 * @param {String} name The name of the partial as used in a template.
 * @param {String} source String source of the partial.
 */
ExpressHbs.prototype.registerPartial = function(name, source) {
  this.handlebars.registerPartial(name, this.compile(source));
};


/**
 * Compiles a string.
 *
 * @param {String} source The source to compile.
 * @param {String} filename The path used to embed into __filename for errors.
 */
ExpressHbs.prototype.compile = function(source, filename) {
  // Handlebars has a bug with comment only partial causes errors. This must
  // be a string so the block below can add a space.
  if (typeof source !== 'string') {
    throw new Error('registerPartial must be a string for empty comment workaround');
  }
  if (source.indexOf('}}') === source.length - 2) {
    source += ' ';
  }
  var compiled = this.handlebars.compile(source);
  if (filename) {
    // track for error message
    compiled.__filename = path.relative(this.viewsDir, filename).replace(path.sep, '/');
  }
  return compiled;
}

/**
 * Registers an asynchronous helper.
 *
 * @param {String} name The name of the partial as used in a template.
 * @param {String} fn The `function(options, cb)`
 */
ExpressHbs.prototype.registerAsyncHelper = function(name, fn) {
  this.handlebars.registerHelper(name, function(context) {
    return async.resolve(fn.bind(this), context);
  });
};

ExpressHbs.prototype.updateTemplateOptions = function(templateOptions) {
  this._options.templateOptions = templateOptions;
};

/**
 * Creates a new instance of ExpressHbs.
 */
ExpressHbs.prototype.create = function() {
  return new ExpressHbs();
};

module.exports = new ExpressHbs();
