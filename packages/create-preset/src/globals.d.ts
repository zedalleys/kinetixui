/**
 * The one platform global this package uses, declared rather than imported.
 *
 * `tsconfig.json` deliberately sets `lib: ["ES2022"]` and `types: []` — the codec has to compile against
 * neither the DOM nor Node, because it runs in a browser, in the CLI and in a future exporter. Adding
 * `"dom"` to get `URL` would pull in `window`, `document` and every browser API alongside it, and the
 * next person to reach for one would find it available in a module that cannot use it.
 *
 * `URL` is genuinely universal — WHATWG, in every browser and in Node since v10 — so it is the one
 * capability worth depending on. Only the sliver actually used is declared: constructing one, and
 * reading repeated query parameters. Anything else stays a compile error, which is the point.
 */
declare class URLSearchParams {
  getAll(name: string): string[];
}

declare class URL {
  constructor(url: string, base?: string);
  readonly searchParams: URLSearchParams;
}
