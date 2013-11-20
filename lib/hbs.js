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
 * Compiles a layout file.
 *
 * @param {String} layoutFile
 */
ExpressHbs.prototype.cacheLayout = function(layoutFile, useCache, cb) {

  var self = this;

  // assume hbs extension
  if (path.extname(layoutFile) === '') layoutFile += this._options.extname;

  // path is relative in directive, make it absolute
  var layoutTemplate = this.cache[layoutFile] ? this.cache[layoutFile].layoutTemplate : null;
  if (layoutTemplate) return cb(null, layoutTemplate);

  fs.readFile(layoutFile, 'utf8', function(err, str) {
    if (err) return cb(err);

    layoutTemplate = self.handlebars.compile(str);
    if (useCache) {
      self.cache[layoutFile] = {
        layoutTemplate: layoutTemplate
      };
    }

    cb(null, layoutTemplate);
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
  options || (options = {});
  options.extname || (options.extname = '.hbs');
  options.contentHelperName || (options.contentHelperName = 'contentFor');
  options.blockHelperName || (options.blockHelperName = 'block');
  options.templateOptions || (options.templateOptions = {});
  options.handlebars && (this.handlebars = options.handlebars);

  this._options = options;
  if (this._options.handlebars) this.handlebars = this._options.handlebars;

  this.handlebars.registerHelper(this._options.blockHelperName, function(name) {
    return self.block(name);
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
  this.defaultLayoutTemplate = null;

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
  if (useCache && this.defaultLayoutTemplate) return cb(null, this.defaultLayoutTemplate);

  this.cacheLayout(this._options.defaultLayout, useCache, function(err, template) {
    if (err) return cb(err);

    self.defaultLayoutTemplate = template;
    return cb(null, template);
  });
};


/**
 * express 3.x template engine compliance
 */
function _express3(filename, options, cb) {
  var self = this;

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
      layout = layoutPath(filename, layout);
      self.cacheLayout(layout, options.cache, cb);
    } else {
      cb(null, null);
    }
  }

  /**
   * Returns the layout filepath given the template filename and layout used.
   * Backward compatible with specifying layouts in locals like 'layouts/foo',
   * but if you have specified a layoutsDir you can specify layouts in locals with just the layout name.
   */
  function layoutPath(filename, layout) {
    var layoutWithDir = layout.split('/').length > 1;
    var layoutsDirUsed = layoutWithDir ? null : self.layoutsDir;
    return path.resolve(path.join(layoutsDirUsed ? layoutsDirUsed : path.dirname(filename), layout));
  }

  /**
   * Renders `template` with an optional `layoutTemplate` using data in `locals`.
   */
  function render(template, locals, layoutTemplate, cb) {
    var res = template(locals, self._options.templateOptions);
    async.done(function(values) {
      Object.keys(values).forEach(function(id) {
        res = res.replace(id, values[id]);
      });

      if (!layoutTemplate) return cb(null, res);

      // layout declare a {{{body}}} placeholder into which a page is inserted
      locals.body = res;

      var layoutResult = layoutTemplate(locals, self._options.templateOptions);
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
    cached = self.cache[filename];
    if (cached) {
      template = cached.template;
      layoutTemplate = cached.layoutTemplate;
      return render(template, locals, layoutTemplate, cb);
    }

    fs.readFile(filename, 'utf8', function(err, str) {
      if (err) return cb(err);

      var template = self.handlebars.compile(str);
      if (options.cache) {
        self.cache[filename] = {
          template: template
        };
      }

      // Try to get the layout
      parseLayout(str, filename, function(err, layoutTemplate) {
        if (err) return cb(err);

        function renderIt(layoutTemplate) {
          if (layoutTemplate && options.cache) {
            self.cache[filename].layoutTemplate = layoutTemplate;
          }
          return render(template, locals, layoutTemplate, cb);
        }

        // Determine which layout to use
        //   1. Layout specified in template
        if (layoutTemplate) {
          renderIt(layoutTemplate);
        }

        //   2. Layout specified by options from render
        else if (typeof (options.layout) !== 'undefined') {
          if (options.layout) {
            var layoutFile = layoutPath(filename, options.layout);
            self.cacheLayout(layoutFile, options.cache, function(err, layoutTemplate) {
              if (err) return cb(err);
              renderIt(layoutTemplate);
            });

          } else {
            // if the value is falsey, behave as if no layout should be used - suppress defaults
            renderIt(null);
          }
        }

        //   3. Default layout specified when middleware was configured.
        else if (self.defaultLayoutTemplate) {
          renderIt(self.defaultLayoutTemplate);
        }

        // render without a template
        else renderIt(null);
      });
    });
  }

  // kick it off by loading default template (if any)
  this.loadDefaultLayout(options.cache, function(err) {
    if (err) return cb(err);

    // Force reloading of all partials if caching is not used. Inefficient but there
    // is no loading partial event.
    if (self.partialsDir && (!options.cache || !self.isPartialCachingComplete)) {
      return self.cachePartials(function(err) {
        if (err) {
          return cb(err);
        }

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
