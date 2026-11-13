import express = require('express');
import hbs = require('../../');
import Handlebars = require('handlebars');
// Named and default imports, as Ghost uses them (esModuleInterop).
import defaultHbs, { SafeString, create } from '../../';

const app = express();

// Engine plugs into Express.
app.engine(
  'hbs',
  hbs.express4({
    partialsDir: [__dirname + '/views/partials'],
    defaultLayout: __dirname + '/views/layout/default.hbs',
    restrictLayoutsTo: __dirname + '/views',
    templateOptions: { data: { site: 'test' } },
    onCompile(exhbs, source) {
      return exhbs.handlebars.compile(source, { preventIndent: true });
    },
  }),
);
app.engine('html', hbs.express3());

// Helpers.
hbs.registerHelper('link', function (text: string, options) {
  return new hbs.SafeString('<a href="' + options.hash.href + '">' + text + '</a>');
});
hbs.registerAsyncHelper('later', function (context, cb) {
  setImmediate(() => cb(context));
});
hbs.registerAsyncHelper(
  'withOptions',
  function (context: string, options: Handlebars.HelperOptions, cb: hbs.AsyncHelperCallback) {
    cb(options.hash.value ?? context);
  },
);
// Options form inferred via `satisfies`, as documented.
hbs.registerAsyncHelper('withOptionsSatisfies', function (context, options, cb) {
  cb(options.hash.value ?? context);
} satisfies hbs.AsyncHelperWithOptions);
const typedHelper: hbs.AsyncHelperWithOptions = async (_context, options, cb) => cb(options.data);
hbs.registerAsyncHelper('typedHelper', typedHelper);

// Promise helpers infer `context` and `options` from one signature.
hbs.registerPromiseHelper('fetchTitle', async function (context, options) {
  const fallback: string = options.hash.fallback;
  return new hbs.SafeString(String(context ?? fallback));
});
hbs.registerPromiseHelper('inferredOptions', async (_context, options) => {
  // @ts-expect-error options is inferred as HelperOptions, not any
  return options.notAnOption;
});
hbs.registerPromiseHelper('plainValue', (context) => context);
// Extra template params use the variadic overload.
hbs.registerPromiseHelper('join', async (a: string, b: string, options: Handlebars.HelperOptions) =>
  [a, b].join(options.hash.sep),
);
const typedPromiseHelper: hbs.PromiseHelper = async (_context, options) => options.data;
hbs.registerPromiseHelper('typedPromiseHelper', typedPromiseHelper);
// @ts-expect-error fn must be a function
hbs.registerPromiseHelper('notAFunction', 'nope');

hbs.registerHelper({
  upper: (text: string) => text.toUpperCase(),
  lower: (text: string) => text.toLowerCase(),
});

// Template options.
hbs.updateTemplateOptions({ data: { foo: 1 } });
const opts = hbs.getTemplateOptions();
const merged = { ...opts, data: { ...opts.data, bar: 2 } };
app.use((_req, res, next) => {
  hbs.updateLocalTemplateOptions(res.locals, merged);
  hbs.getLocalTemplateOptions(res.locals);
  next();
});

// Instances and compile.
const instance = hbs.create();
const tpl = instance.compile('{{x}}', 'x.hbs');
const html: string = tpl({ x: 1 });
const file: string | undefined = tpl.__filename;
instance.registerPartial('p', '{{y}}');

// Non-Express rendering.
const engine = instance.express4({ viewsDir: __dirname });
engine(__dirname + '/a.hbs', { cache: false, layout: null }, (err, out) => {
  if (!err) void [out, html, file];
});

// @ts-expect-error extname must be a string
hbs.express4({ extname: 1 });

// Ghost-style usage.
new SafeString('<b>x</b>');
const themeEngine = create();
themeEngine.handlebars.logger.level = 0;
themeEngine.handlebars.createFrame({});
void themeEngine.handlebars.partials['name'];
defaultHbs.Utils.escapeExpression('<');

// Every falsy layout value suppresses layouts.
engine(__dirname + '/b.hbs', { layout: false }, () => {});
engine(__dirname + '/c.hbs', { layout: 0 }, () => {});
// @ts-expect-error layout must be a string or a falsy value
engine(__dirname + '/d.hbs', { layout: 1 }, () => {});
