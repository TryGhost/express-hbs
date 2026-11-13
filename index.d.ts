import Handlebars = require('handlebars');

declare namespace hbs {
  type HandlebarsEnvironment = typeof Handlebars;

  /** Compiled Handlebars template, tagged with the file it came from when known. */
  type CompiledTemplate = Handlebars.TemplateDelegate & { __filename?: string };

  /** Minimal shape of the `i18n` module used to register the `__` and `__n` helpers. */
  interface I18n {
    __(...args: any[]): string;
    __n(...args: any[]): string;
  }

  interface Options {
    /** Path to partial templates; one directory or several. */
    partialsDir?: string | string[];
    /** Absolute path to a directory that layouts must reside in. */
    restrictLayoutsTo?: string;
    /** Name of the block helper. Defaults to `block`. */
    blockHelperName?: string;
    /** Name of the content helper. Defaults to `contentFor`. */
    contentHelperName?: string;
    /** Absolute path to the default layout template. */
    defaultLayout?: string;
    /** Extension for templates and partials. Defaults to `.hbs`. */
    extname?: string;
    /** Handlebars module to use instead of the bundled instance. */
    handlebars?: HandlebarsEnvironment;
    /** i18n object; registers the `__` and `__n` helpers. */
    i18n?: I18n;
    /** Path to layout templates. */
    layoutsDir?: string;
    /** Views directory used when not rendering through Express. */
    viewsDir?: string | string[];
    /** Options passed to every compiled template call. */
    templateOptions?: Handlebars.RuntimeOptions;
    /** Pretty-print rendered HTML with js-beautify. */
    beautify?: boolean;
    /** Override template compilation. */
    onCompile?: (exhbs: ExpressHbs, source: string, filename?: string) => CompiledTemplate;
  }

  /** Locals passed to `res.render()` / the engine function. */
  interface RenderOptions {
    settings?: { views?: string | string[]; [key: string]: any };
    cache?: boolean;
    /**
     * Layout to render with, or a falsy value to render without any layout.
     *
     * Passing user-controlled data here can read arbitrary files unless
     * `restrictLayoutsTo` is set.
     */
    layout?: string | null | false | 0;
    [key: string]: any;
  }

  type RenderCallback = (err: any, html?: string) => void;

  /** Express-compatible view engine function. */
  interface Engine {
    (filename: string, options: RenderOptions, cb: RenderCallback): void;
    (filename: string, source: string | null, options: RenderOptions, cb: RenderCallback): void;
  }

  type AsyncHelperCallback = (result: any) => void;

  type AsyncHelper = (this: any, context: any, cb: AsyncHelperCallback) => void;

  type AsyncHelperWithOptions = (
    this: any,
    context: any,
    options: Handlebars.HelperOptions,
    cb: AsyncHelperCallback,
  ) => void;

  /**
   * Promise helper. Handlebars passes `(...params, options)`; this type covers
   * the common one-param form so TypeScript can infer every parameter.
   */
  type PromiseHelper = (this: any, context: any, options: Handlebars.HelperOptions) => unknown;

  interface ExpressHbs {
    handlebars: HandlebarsEnvironment;
    SafeString: typeof Handlebars.SafeString;
    Utils: typeof Handlebars.Utils;

    express3(options?: Options): Engine;
    express4(options?: Options): Engine;

    registerHelper(name: string, fn: Handlebars.HelperDelegate): void;
    registerHelper(helpers: Handlebars.HelperDeclareSpec): void;
    /**
     * Register a helper that delivers its result later via `cb(result)`. The
     * helper receives `options` only when it declares three parameters.
     *
     * TypeScript infers parameter types for the `(context, cb)` form. For the
     * `(context, options, cb)` form, add `satisfies hbs.AsyncHelperWithOptions`
     * to the function so its parameters are inferred.
     *
     * @example
     * hbs.registerAsyncHelper('readFile', function (filename, cb) {
     *   fs.readFile(filename, 'utf8', (err, content) => cb(content));
     * });
     *
     * hbs.registerAsyncHelper('lookup', function (context, options, cb) {
     *   cb(options.hash.fallback ?? context);
     * } satisfies hbs.AsyncHelperWithOptions);
     */
    registerAsyncHelper(name: string, fn: AsyncHelper): void;
    registerAsyncHelper(name: string, fn: AsyncHelperWithOptions): void;
    /**
     * Register a helper whose return value, or the value its promise resolves
     * to, is rendered. A rejection or thrown error fails the render, and
     * `null`/`undefined` render as an empty string. It is called like a sync
     * helper, with the template params followed by `options`.
     *
     * The result is only usable as output: subexpressions and block conditions
     * such as `{{#if (helper)}}` see a placeholder string, not the resolved value.
     *
     * @example
     * hbs.registerPromiseHelper('readFile', async function (filename, options) {
     *   return new hbs.SafeString(await fs.promises.readFile(filename, 'utf8'));
     * });
     */
    registerPromiseHelper(name: string, fn: PromiseHelper): void;
    registerPromiseHelper(name: string, fn: (this: any, ...args: any[]) => unknown): void;
    registerPartial(name: string, source: string, filename?: string): void;
    compile(source: string, filename?: string): CompiledTemplate;

    getTemplateOptions(): Handlebars.RuntimeOptions;
    updateTemplateOptions(templateOptions: Handlebars.RuntimeOptions): void;
    getLocalTemplateOptions(locals: object): Handlebars.RuntimeOptions;
    updateLocalTemplateOptions<T extends Handlebars.RuntimeOptions | undefined>(
      locals: object,
      localTemplateOptions: T,
    ): T;

    /** Creates an isolated instance with its own cache and Handlebars environment. */
    create(): ExpressHbs;
  }
}

declare const hbs: hbs.ExpressHbs;

export = hbs;
