/**
 * The Angular browser harness: one page that bootstraps one fixture as a live Angular application.
 *
 *   index.html?fixture=selection&theme=dark&dir=rtl
 *
 * The page loads what a consumer loads — the generated token CSS and the package's styles.css, linked by
 * build.mjs after Vite has finished so no CSS pipeline rewrites them — and Angular renders, binds and
 * re-renders the components exactly as it does in an application: zoneless change detection, real event
 * listeners, real signals. Nothing on the page is markup written to resemble a component.
 *
 * When the application is stable the root gets `data-kx-ready`, and `window.kxHarness` exposes:
 *
 *   settle()    resolves when Angular is stable again — after a keypress, before reading the DOM back
 *   exports     every public directive and component with the CSS selector Angular compiled for it, so a
 *               gate can prove which of them actually rendered (read from the compiled definitions, not
 *               from a list someone keeps)
 */
import { provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import * as api from '../src/public-api';
import { FIXTURES } from '../src/fixtures';
import { USAGE_DEMOS } from '../src/fixtures/usage';

type Selectors = (string | number)[][];
interface Compiled {
  ɵcmp?: { selectors: Selectors };
  ɵdir?: { selectors: Selectors };
}

/**
 * Angular's compiled selector list back to CSS: `[['button', 'kxButton', ''], ['a', 'kxButton', '']]` is
 * `button[kxButton], a[kxButton]`. The package only uses element and attribute selectors; anything else (a
 * class or `:not()` part, which Angular encodes with numeric flags) is reported rather than guessed at.
 */
function css(selectors: Selectors): string | null {
  const parts: string[] = [];
  for (const one of selectors) {
    if (one.some((p) => typeof p === 'number')) return null;
    const [tag, ...attrs] = one as string[];
    let out = tag || '';
    for (let i = 0; i < attrs.length; i += 2) out += attrs[i + 1] ? `[${attrs[i]}="${attrs[i + 1]}"]` : `[${attrs[i]}]`;
    parts.push(out);
  }
  return parts.join(', ');
}

const exportsInfo = Object.entries(api)
  .map(([name, value]) => {
    const def = (value as Compiled).ɵcmp ?? (value as Compiled).ɵdir;
    return def ? { name, selector: css(def.selectors) } : null;
  })
  .filter((e): e is { name: string; selector: string | null } => e !== null);

const root = document.documentElement;
const params = new URLSearchParams(location.search);
const name = params.get('fixture') ?? root.dataset['kxFixture'] ?? '';
const theme = params.get('theme') ?? root.dataset['kxTheme'];
if (theme === 'dark') root.classList.add('dark');
const dir = params.get('dir');
if (dir === 'rtl' || dir === 'ltr') root.dir = dir;

const fixture = FIXTURES[name];
if (!fixture) {
  root.dataset['kxError'] = `no fixture named "${name}" (known: ${Object.keys(FIXTURES).join(', ')})`;
} else {
  bootstrapApplication(fixture, { providers: [provideZonelessChangeDetection()] })
    .then(async (app) => {
      await app.whenStable();
      (window as unknown as { kxHarness: unknown }).kxHarness = { settle: () => app.whenStable(), exports: exportsInfo, fixture: name, demos: USAGE_DEMOS.map((d) => d.name) };
      root.dataset['kxReady'] = 'true';
    })
    .catch((error: unknown) => {
      root.dataset['kxError'] = String(error);
    });
}
