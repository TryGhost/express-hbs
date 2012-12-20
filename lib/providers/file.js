var fs = require('fs'),
    path = require('path');

var _options;
var partialsDir;

function FileProvider(options){
  _options = options || {};
  partialsDir = _options.partialsDir;
}

/** 
 * returns the source of a template based on the name, or err if the lookup fails
 */
FileProvider.prototype.getTemplate = function getTemplate(templateName, cb){
  fs.readFile(templateName, 'utf-8', cb);
}

/**
 * callback provides an object where each partial name is the key and the source is the value
 */
FileProvider.prototype.getPartials = function getPartials(cb){
  var files = fs.readdirSync(partialsDir);
  var partials = {};

  files.forEach(function(file) {
      var filePath = path.join(partialsDir, file);
      var stats = fs.statSync(filePath);
      if (!stats.isFile()) return;

      var source = fs.readFileSync(filePath, 'utf8');
      var name = path.basename(file, path.extname(file));
      partials[name] = source;
      
  });

  cb(null, partials);
}

module.exports = FileProvider;