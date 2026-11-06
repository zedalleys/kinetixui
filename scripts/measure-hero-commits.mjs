/**
 * measure-hero-commits.mjs — does the hero's animation rerender React, or the SVG?
 *
 * Owner question, 2026-11-05: "Measure/verify that the final implementation does not
 * rerender the whole SVG every frame."
 *
 * Two independent measurements, both read off a running production page rather than
 * from the source:
 *
 *   1. React commits. A devtools-hook stub is installed before any script runs, so
 *      React's production build reports every commit of the whole root to it. The count
 *      is taken twice over equal windows — once with the hero on screen and running,
 *      once with it scrolled away and stopped. The page animates other things, so the
 *      absolute number is not the hero's; the DIFFERENCE is what the hero's motion
 *      costs React. A rotation driven through `useState` would show roughly one commit
 *      per animation frame on top of the idle baseline.
 *
 *   2. DOM writes. A MutationObserver on `svg.kx-hero-mesh` records every mutation
 *      inside the artwork, grouped by what was touched. The imperative path writes a
 *      custom property on the spin group and `cx`/`cy`/`opacity` on the pulses and
 *      junction glows; a React rerender of the SVG would show attribute writes spread
 *      across the facets and links as well, or childList churn.
 *
 * Diagnostic, not a gate: it depends on React's internal devtools hook, which is not a
 * contract. Run it when the hero's animation implementation changes.
 *
 * Requires the production site on REBRAND_BASE (default http://127.0.0.1:3104).
 *
 * Usage: pnpm measure:hero-commits
 */
import { chromium } from 'playwright';

const base = process.env.REBRAND_BASE ?? 'http://127.0.0.1:3104';
const WINDOW_MS = Number(process.env.WINDOW_MS ?? 4000);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => {
  let commits = 0;
  window.__kxCommits = () => commits;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: false,
    supportsFiber: true,
    renderers: new Map(),
    inject: (renderer) => {
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.set(1, renderer);
      return 1;
    },
    checkDCE: () => {},
    onCommitFiberRoot: () => {
      commits += 1;
    },
    onCommitFiberUnmount: () => {},
    onPostCommitFiberRoot: () => {},
  };
});
await page.goto(base, { waitUntil: 'networkidle' });
await page.locator('.kx-hero-polygon').scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'true');
if (!(await page.evaluate(() => window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers.size > 0))) {
  console.error('React never injected into the hook — the measurement would be meaningless');
  await browser.close();
  process.exit(2);
}

/** Commits and animation frames over one window, with `act` running inside it. */
const sample = async (label, act = async () => {}) => {
  const before = await page.evaluate(() => ({ commits: window.__kxCommits(), t: performance.now() }));
  await page.evaluate((ms) => {
    window.__kxFrames = 0;
    const start = performance.now();
    const tick = () => {
      window.__kxFrames += 1;
      if (performance.now() - start < ms) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, WINDOW_MS);
  await act();
  await page.waitForTimeout(WINDOW_MS + 100);
  const after = await page.evaluate(() => ({ commits: window.__kxCommits(), frames: window.__kxFrames, t: performance.now() }));
  const result = { commits: after.commits - before.commits, frames: after.frames, ms: Math.round(after.t - before.t) };
  console.log(
    `  ${label.padEnd(30)} ${String(result.commits).padStart(4)} React commit(s) / ${String(result.frames).padStart(4)} frames  (${result.ms}ms)`,
  );
  return result;
};

console.log('React commits for the whole root, hero running vs hero stopped');
const running = await sample('hero on screen, running');
await page.locator('footer').scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
const stopped = await sample('hero scrolled away, stopped');
await page.locator('.kx-hero-polygon').scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'true');
const dragging = await sample('while the reader drags it', async () => {
  const box = await page.locator('.kx-mesh-facets path[data-material="3"]').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 60; i++) await page.mouse.move(box.x + box.width / 2 + i * 4, box.y + box.height / 2);
  await page.mouse.up();
});

// Compared as RATES, not raw counts: driving the drag takes longer than the sampling
// window, so the windows are not equal and subtracting the totals would invent commits
// that are only extra elapsed time.
const rate = (s) => (s.commits / (s.ms / 1000)).toFixed(2);
console.log('\n  commits per second');
console.log(`    hero running     ${rate(running)}`);
console.log(`    hero stopped     ${rate(stopped)}   <- the rest of the page, with the hero still`);
console.log(`    while dragging   ${rate(dragging)}`);
console.log(
  `  the hero's motion costs ${(rate(running) - rate(stopped)).toFixed(2)} commit(s)/s on top of the page's own, ` +
    `and dragging ${(rate(dragging) - rate(stopped)).toFixed(2)}`,
);

console.log('\nDOM writes inside svg.kx-hero-mesh, by what was touched');
const mutations = await page.evaluate(
  (ms) =>
    new Promise((done) => {
      const svg = document.querySelector('svg.kx-hero-mesh');
      const tally = {};
      const key = (record) => {
        const el = record.target instanceof Element ? record.target : record.target.parentElement;
        const group = el?.closest('[class^="kx-mesh-"], [class*=" kx-mesh-"]');
        const where = group ? String(group.getAttribute('class')).split(' ').find((c) => c.startsWith('kx-mesh-')) : 'other';
        return `${record.type}:${record.attributeName ?? '-'} on ${where}`;
      };
      let frames = 0;
      const tick = () => {
        frames += 1;
        if (performance.now() - start < ms) requestAnimationFrame(tick);
      };
      const observer = new MutationObserver((records) => {
        for (const r of records) tally[key(r)] = (tally[key(r)] ?? 0) + 1;
      });
      observer.observe(svg, { attributes: true, childList: true, subtree: true, characterData: true });
      const start = performance.now();
      requestAnimationFrame(tick);
      setTimeout(() => {
        observer.disconnect();
        done({ tally, frames });
      }, ms);
    }),
  WINDOW_MS,
);
for (const [what, n] of Object.entries(mutations.tally).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(5)}  ${what}`);
}
console.log(`  (over ${mutations.frames} animation frames)`);
const facetWrites = Object.entries(mutations.tally)
  .filter(([what]) => /on kx-mesh-(facets|links)\b/.test(what) || /^childList/.test(what))
  .reduce((n, [, v]) => n + v, 0);
console.log(`\n  writes to the facets, the links, or the child lists: ${facetWrites}`);

await browser.close();
