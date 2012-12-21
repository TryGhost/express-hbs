var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var TemplateSchema = new Schema({
    name : {type:String, required:true,unique:true},
    isPartial:Boolean,
    text : {type:String, required:true}
})


/**
 * Requires the mongoUrl option
 */
function MongoProvider(options){
  _options = options || {};
  this.viewPath = options.viewPath;
  this.db = mongoose.createConnection(_options.mongoUrl);

}

MongoProvider.prototype.getModel = function getModel(){
    return this.db.model('hbs_templates', TemplateSchema);
}

/** 
 * returns the source of a template based on the name, or err if the lookup fails
 */
MongoProvider.prototype.getTemplate = function getTemplate(templateName, cb){
    templateName = templateName.substring(this.viewPath.length+1);
  this.getModel().findOne({name:templateName},'name text', function(err, template){
      if(err) return cb(err);
      if(template) return cb(null, template.text);
      return cb(null,null);
  })
}

/**
 * callback provides an object where each partial name is the key and the source is the value
 */
MongoProvider.prototype.getPartials = function getPartials(cb){
    this.getModel().find({isPartial:true}, 'name text', function(err, templates){
        if(err) return cb(err);
        var partials = {};
        templates.forEach(function(template){
            partials[template.name] = template.text;
        })
        return cb(null, partials);
    })
}



module.exports = MongoProvider;