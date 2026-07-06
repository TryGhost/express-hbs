# express-hbs agent notes

`express-hbs` is a CommonJS Express view-engine library. Read `README.md` for
the public API and usage examples before changing behavior.

## Commands

Use pnpm 10 on Node.js 20 or later.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm coverage
```

`pnpm test` runs `mocha` and then `pnpm lint` through the `posttest` script.
`pnpm coverage` runs the same test suite under `nyc` and enforces the coverage
thresholds in `package.json`.

## Boundaries

- Do not edit `pnpm-lock.yaml` by hand. Regenerate it with `pnpm install`.
- Keep `lib/hbs.js` and `lib/resolver.js` CommonJS; this package does not use
  ESM.
- Treat files under `test/views/**`, `test/issues/**`, and `example/views/**`
  as rendering fixtures. Seemingly odd whitespace, malformed markup, or partial
  names may be intentional test coverage.
- Keep the security warning around user-controlled `layout` values and
  `restrictLayoutsTo` in sync with behavior.

## Style notes

- Formatting is enforced by `oxfmt`; run `pnpm lint:fix` rather than doing large
  manual formatting sweeps.
- The formatter intentionally ignores Handlebars, HTML, CSS, lockfile, and
  fixture data files. Preserve their existing shape unless the test expectation
  itself is being changed.
- Add or update tests for layout resolution, partial loading, async helpers,
  template options, and caching changes.
