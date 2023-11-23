'use strict';
var assert = require('assert');
var hbs = require('..');
var path = require('path');
var H = require('./helpers');


describe('issue-22 template', function() {
  var dirname = path.join(__dirname, 'issues/22');

  it('should use multiple layouts with caching', function(done) {
    var render = hbs.create().express3({
      restrictLayoutsTo: dirname
    });
    var locals1 = H.createLocals('express3', dirname, { layout: 'layout1', cache: true });
    var locals2 = H.createLocals('express3', dirname, { layout: 'layout2', cache: true });

    render(dirname + '/template.hbs', locals1, function(err, html) {
      assert.ifError(err);
      assert.equal('<layout1>template</layout1>', H.stripWs(html));
      render(dirname + '/template.hbs', locals2, function(err, html) {
        assert.ifError(err);
        assert.equal('<layout2>template</layout2>', H.stripWs(html));
        done();
      });
    });
  });
});

describe('issue-23', function() {
  var dirname =  path.join(__dirname, 'issues/23');

  it('should not pass an empty or missing partial to handlebars', function(done) {
    var render = hbs.create().express3({
      partialsDir: [dirname + '/partials'],
      restrictLayoutsTo: dirname
    });

    function check(err, html) {
      assert.ifError(err);
      assert.equal('<html>Hello</html>', H.stripWs(html));
      done();
    }
    var result = render(dirname + '/index.hbs', {cache: true, settings: {views: dirname + '/views'}}, check);
  });

  it('should handle empty string', function(done) {
    var render = hbs.create().express3({
      partialsDir: [dirname + '/partials'],
      restrictLayoutsTo: dirname
    });

    function check(err, html) {
      assert.ifError(err);
      assert.equal('', H.stripWs(html));
      done();
    }
    var result = render(dirname + '/empty.hbs', {cache: true, settings: {views: dirname + '/views'}}, check);
  });


  it('should register empty partial', function(done) {
    var hb = hbs.create();
    var render = hb.express3({
      partialsDir: [dirname + '/partials'],
      restrictLayoutsTo: dirname
    });
    hb.handlebars.registerPartial('emptyPartial', '');

    var pass = 0;
    function check(err, html) {
      pass++;
      assert.ifError(err);
      assert.equal('foo', H.stripWs(html));
      if (pass < 3) {
        doIt();
      } else {
        done();
      }
    }
    function doIt() {
      render(dirname + '/emptyPartial.hbs', {cache: true, settings: {views: dirname + '/views'}}, check);
    }
    doIt();
  });

  it('should register partial that results in empty string (comment)', function(done) {
    var hb = hbs.create();
    var render = hb.express3({
      partialsDir: [dirname + '/partials'],
      restrictLayoutsTo: dirname
    });
    // this fails
    //hb.handlebars.registerPartial('emptyComment', '{{! just a comment}}');
    hb.registerPartial('emptyComment', '{{! just a comment}}');

    var pass = 0;
    function check(err, html) {
      pass++;
      assert.ifError(err);
      assert.equal('foo', H.stripWs(html));
      if (pass < 3) {
        doIt();
      } else {
        done();
      }
    }
    function doIt() {
      render(dirname + '/emptyComment.hbs', {cache: true, settings: {views: dirname + '/views'}}, check);
    }
    doIt();
  });
});


describe('issue-21', function() {
  var dirname =  path.join(__dirname, 'issues/21');
  var render = hbs.create().express3({
    layoutsDir: dirname + '/views/layouts',
    restrictLayoutsTo: dirname
  });

  it('should allow specifying layouts without the parent dir', function(done) {
    function check(err, html) {
      assert.ifError(err);
      assert.equal('<html>index</html>', H.stripWs(html));
      done();
    }

    var options = {cache: true, layout: 'default', settings: {views: dirname + '/views'}};
    var result = render(dirname + '/views/index.hbs', options, check);
  });


  it('should allow specifying layouts without the parent dir in a sub view', function(done) { function check(err, html) {
    assert.ifError(err);
    assert.equal('<html>sub</html>', H.stripWs(html));
    done();
  }

  var options = {cache: true, layout: 'default', settings: {views: dirname + '/views'}};
  var result = render(dirname + '/views/sub/sub.hbs', options, check);
  });

  it('should treat layouts that start with "." relative to template', function(done) { function check(err, html) {
    assert.ifError(err);
    assert.equal('<relative>sub</relative>', H.stripWs(html));
    done();
  }

  var options = {cache: true, layout: './relativeLayout', settings: {views: dirname + '/views'}};
  var result = render(dirname + '/views/sub/sub.hbs', options, check);
  });

  it('should allow layouts in subfolders', function(done) {
    function check(err, html) {
      assert.ifError(err);
      assert.equal('<sub>useLayoutInDir</sub>', H.stripWs(html));
      done();
    }

    var options = {cache: true, layout: 'sub/child', settings: {views: dirname + '/views'}};
    var result = render(dirname + '/views/useLayoutInDir.hbs', options, check);
  });

  it('should treat layouts relative to views directory if layoutsDir is not passed', function(done) {
    var dirname =  path.join(__dirname, 'issues/21');
    var render = hbs.create().express3({
      restrictLayoutsTo: dirname
    });

    function check(err, html) {
      assert.ifError(err);
      assert.equal('<sub>sub</sub>', H.stripWs(html));
      done();
    }

    var options = {cache: true, layout: 'layouts/sub/child', settings: {views: dirname + '/views'}};
    var result = render(dirname + '/views/sub/sub.hbs', options, check);
  });
});


describe('issue-49', function() {
  var dirname =  path.join(__dirname, 'issues/49');

  it('should report filename with error', function(done) {
    var hb = hbs.create()
    var render = hb.express3({
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname, {});
    render(dirname + '/error.hbs', locals, function(err, html) {
      assert(err.stack.indexOf('[error.hbs]') > 0);
      done();
    });
  });

  it('should report relative filename with error', function(done) {
    var hb = hbs.create()
    var render = hb.express3({
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname, {});
    render(dirname + '/front/error.hbs', locals, function(err, html) {
      assert(err.stack.indexOf('[front/error.hbs]') > 0);
      done();
    });
  });

  it('should report filename with partial error', function(done) {
    var hb = hbs.create()
    var render = hb.express3({
      partialsDir: dirname + '/partials',
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname, {});
    render(dirname + '/partial.hbs', locals, function(err, html) {
      assert(err.stack.indexOf('[partial.hbs]') > 0);
      done();
    });
  });

  it('should report filename with layout error', function(done) {
    var hb = hbs.create()
    var render = hb.express3({
      partialsDir: dirname + '/partials',
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname, {});
    render(dirname + '/index.hbs', locals, function(err, html) {
      assert(err.stack.indexOf('[layouts/default.hbs]') > 0);
      done();
    });
  });
});

describe('issue-53', function() {
  var dirname =  path.join(__dirname, 'issues/53');

  it('should use block with async helpers', function(done) {
    var hb = hbs.create()
    var res = 0;
    hb.registerAsyncHelper('weird', function(_, resultcb) {
      setTimeout(function() {
        resultcb(++res);
      }, 1)
    });
    var render = hb.express3({
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname, {});
    render(dirname + '/index.hbs', locals, function(err, html) {
      assert.ifError(err);
      assert.ok(html.indexOf('__aSyNcId_') < 0);
      done();
    });
  });
});

describe('issue-59', function() {
  var dirname = __dirname + '/issues/59';
  it('should escape or not', function (done) {
    var hb = hbs.create();

    function async(s, cb) {
      cb('<strong>' + s + '</strong>');
    }

    hb.registerAsyncHelper("async", async);

    var render = hb.express3({
      viewsDir: dirname,
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname);

    render(dirname + '/index.hbs', locals, function (err, html) {
      assert.equal(H.stripWs(html), '&lt;strong&gt;foo&lt;/strong&gt;<strong>foo</strong>');
      done();
    });
  });
  it('should not escape SafeString', function (done) {
    var hb = hbs.create();

    function async(s, cb) {
      cb(new hb.SafeString('<em>' + s + '</em>'));
    }

    hb.registerAsyncHelper('async', async);

    var render = hb.express3({
      viewsDir: dirname,
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname);

    render(dirname + '/index.hbs', locals, function (err, html) {
      assert.equal(H.stripWs(html), '<em>foo</em><em>foo</em>');
      done();
    });
  });
});

describe('issue-73', function() {
  var dirname = path.join(__dirname, 'issues/73');
  it('should allow compile options', function(done){
    var hb = hbs.create();
    var render = hb.express3({
      viewsDir: dirname,
      partialsDir: dirname + '/partials',
      restrictLayoutsTo: dirname,
      onCompile: function(eh, source, filename) {
        var options;
        if (filename && filename.indexOf('partials')) {
          options = {preventIndent: true};
        }
        return eh.handlebars.compile(source, options);
      }
    });

    var locals = H.createLocals('express3', dirname);
    render(dirname + '/index.hbs', locals, function (err, html) {
      if (err) return console.log('error', err);

      assert.ifError(err);
      assert.ok(html.match(/^Hello/m));
      assert.ok(html.match(/^second line/m));
      done();
    });
  });
});


describe('issue-62', function() {
  var dirname = path.join(__dirname, 'issues/62');

  it('should provide options for async helpers', function (done) {
    var hb = hbs.create();

    function async(c, o, cb) {
      if (o.hash.type === 'em') {
        cb('<em>' + c + '</em>');
      } else {
        cb('<strong>' + c + '</strong>');
      }
    }

    hb.registerAsyncHelper("async", async);

    var render = hb.express3({
      viewsDir: dirname,
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname);

    render(dirname + '/basic.hbs', locals, function (err, html) {
      assert.equal(
        H.stripWs(html),
        '&lt;strong&gt;foo&lt;/strong&gt;&lt;em&gt;foo&lt;/em&gt;'
      );
      done();
    });
  });

  it('should allow for block async helpers', function (done) {
    var hb = hbs.create();

    function async(c, o, cb) {
      var self = this;
      self.output = c;

      if (o.hash.inverse === 'true') {
        cb(o.inverse(self));
      } else {
        cb(o.fn(self));
      }
    }

    hb.registerAsyncHelper("async", async);

    var render = hb.express3({
      viewsDir: dirname,
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname);

    render(dirname + '/block.hbs', locals, function (err, html) {
      assert.equal(
        H.stripWs(html),
        '<p>GoodbyeWorld</p><p>HelloHandlebars</p>'
      );
      done();
    });
  });
});

describe('issue-76', function() {
  var dirname =  path.join(__dirname, 'issues/76');

  it('should allow cachePartials to be called independently of render', function (done) {
    var hb = hbs.create();

    var render = hb.express3({
      partialsDir: dirname,
      restrictLayoutsTo: dirname
    });

    hb.cachePartials(function (err) {
      assert.ifError(err);
      assert.ok(true);
      done();
    });
  });
});

describe('issue-84', function () {
  var dirname =  path.join(__dirname, 'issues/84');

  it('should render deeply nested partials', function (done) {
    var render = hbs.create().express3({
      partialsDir: [dirname + '/partials'],
      restrictLayoutsTo: dirname
    });

    function check(err, html) {
      if (err) {
        done(err);
      }
      assert.equal('<div>Testing3levelsdown</div>', H.stripWs(html));
      done();
    }

    render(dirname + '/index.hbs', {cache: true, settings: {views: dirname + '/views'}}, check);
  });
});

describe('issue-144', function() {
  var dirname =  path.join(__dirname, 'issues/144');

  it('should repalce with async helpers even special string like $\'', function(done) {
    var hb = hbs.create()
    hb.registerAsyncHelper('special_string', function(_, resultcb) {
      setTimeout(function() {
        resultcb(new hbs.SafeString('<p><code>\'$example$\'</code> abcd</p>'));
      }, 1)
    });
    var render = hb.express3({
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname, {});
    render(dirname + '/index.hbs', locals, function(err, html) {
      assert.equal('<div><p><code>\'$example$\'</code> abcd</p></div>\n', html);
      done();
    });
  });
});

describe('issue-153', function() {
  var dirname = path.join(__dirname, 'issues/153');
  it('should concat contentFor blocks with newline', function(done) {
    var check = function (err, html) {
      if (err) {
        done(err);
      }
      assert.equal('1\n2', html.trim());
      done();
    }
    var hb = hbs.create()
    var render = hb.express3({
      restrictLayoutsTo: dirname
    });
    var locals = H.createLocals('express3', dirname, { });
    render(dirname + '/index.hbs', locals, check);
  });
});
