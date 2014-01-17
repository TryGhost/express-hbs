function stripWs(s) {
  return s.replace(/\s+/g, '');
}

function createLocals(which, viewsDir, locals) {
  if (!locals) locals = {};
  var opts = {};
  if (which === 'express3') {
    opts.settings = {
      views: viewsDir
    };
    opts.cache = process.env.NODE_ENV === 'production';
    for (var k in locals) {
      if (!locals.hasOwnProperty(k)) continue;
      opts[k] = locals[k];
    }
  }
  return opts;
}

module.exports = {
  createLocals: createLocals,
  stripWs: stripWs
};