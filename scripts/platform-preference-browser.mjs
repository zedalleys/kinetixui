/**
 * The reader's platform choice and the component-page install strip, in a real browser against `next start`.
 *
 *   node scripts/platform-preference-browser.mjs --base http://127.0.0.1:3000
 *   node scripts/platform-preference-browser.mjs --negative=no-storage-write   # must FAIL: proves the
 *                                                                               # persistence check can fail
 *
 * jsdom proves the store's logic (platform-preference.test.tsx). This proves what only a browser can: that the
 * choice survives a real full-page navigation and a client-side one, that `?platform=` is followed and dropped across
 * Next.js client navigations, that /blocks gives install guidance for the chosen platform, reaches /blocks and the homepage flagship,
 * hydrates without a mismatch, still works with storage blocked, and that the install strip does not overflow a
 * 320px phone or 200% text.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const arg = (key, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`${key}=`));
  if (hit) return hit.slice(key.length + 1);
  return process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
};
const base = arg('--base', 'http://127.0.0.1:3000');
const negative = arg('--negative', null);
const NEGATIVES = {
  // storage writes are swallowed: the choice still holds on the page, but nothing is remembered
  'no-storage-write': () => { Storage.prototype.setItem = function () {}; },
};
assert.ok(!negative || NEGATIVES[negative], `unknown negative control ${negative}`);

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const results = [];
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log(`ok  ${name}`);
};

/** A fresh browser profile; `blocked` makes every storage access throw, as a locked-down private window does. */
async function newPage({ blocked = false, width = 1280, scale = 1 } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  if (negative) await context.addInitScript(NEGATIVES[negative]);
  if (blocked) {
    await context.addInitScript(() => {
      const deny = () => { throw new DOMException('blocked', 'SecurityError'); };
      Object.defineProperty(window, 'localStorage', { get: deny, configurable: true });
    });
  }
  const page = await context.newPage();
  // 200% text the way a reader sets it (the browser's default font size), as check:a11y-site does — not an inline style
  if (scale !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 16 * scale, fixed: 13 * scale } });
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && /hydrat/i.test(m.text())) errors.push(m.text()); });
  return { page, errors, context };
}

async function go(page, path) {
  await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
}

/** Open every component preview's Code tab and return each preview's selected platform tab label. */
async function selectedPlatforms(page) {
  const previews = page.locator('[data-cp]');
  await previews.first().waitFor();
  const n = await previews.count();
  const out = [];
  for (let i = 0; i < n; i++) {
    const cp = previews.nth(i);
    await cp.getByRole('tab', { name: 'code', exact: true }).click();
    const tab = cp.getByRole('tablist', { name: 'Platform' }).getByRole('tab', { selected: true });
    out.push(((await tab.textContent()) ?? '').replace(/·.*/, '').trim());
  }
  return out;
}

try {
  await check('a pick on one preview switches every preview on the page', async () => {
    const { page, errors } = await newPage();
    await go(page, '/docs/components/button');
    const before = await selectedPlatforms(page);
    assert.ok(before.length >= 2, `button page should have several previews, found ${before.length}`);
    assert.deepEqual([...new Set(before)], ['React'], `a first visit opens on React, got ${before}`);
    await page.locator('[data-cp]').first().getByRole('tablist', { name: 'Platform' }).getByRole('tab', { name: 'SwiftUI' }).click();
    const after = await selectedPlatforms(page);
    assert.deepEqual([...new Set(after)], ['SwiftUI'], `every preview should follow, got ${after}`);
    assert.deepEqual(errors, []);
  });

  await check('the choice survives a full page load and a client-side navigation', async () => {
    const { page, errors } = await newPage();
    await go(page, '/docs/components/button');
    await page.locator('[data-cp]').first().getByRole('tab', { name: 'code', exact: true }).click();
    await page.locator('[data-cp]').first().getByRole('tablist', { name: 'Platform' }).getByRole('tab', { name: 'Flutter' }).click();
    await go(page, '/docs/components/dialog');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['Flutter'], 'full load of the next page');
    // client-side: follow an in-app link to another component page
    await page.evaluate(() => document.querySelector('a[href="/docs/components/tabs"]')?.click());
    await page.waitForURL('**/docs/components/tabs');
    await page.waitForLoadState('networkidle');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['Flutter'], 'client-side navigation');
    assert.deepEqual(errors, []);
  });

  await check('/blocks and the homepage flagship open on the remembered platform', async () => {
    const { page, errors } = await newPage();
    await go(page, '/docs/components/button');
    await page.locator('[data-cp]').first().getByRole('tab', { name: 'code', exact: true }).click();
    await page.locator('[data-cp]').first().getByRole('tablist', { name: 'Platform' }).getByRole('tab', { name: 'SwiftUI' }).click();

    await go(page, '/');
    const flagship = page.getByRole('tablist', { name: 'Implementation platform' });
    assert.equal((await flagship.getByRole('tab', { selected: true }).textContent())?.trim(), 'SwiftUI');

    await go(page, '/blocks');
    // the platform lists render once a showcase's Code tab is open; open the first block that has a SwiftUI source
    const sections = page.locator('section[id]');
    let checked = 0;
    for (let i = 0; i < (await sections.count()) && checked < 1; i++) {
      const s = sections.nth(i);
      const code = s.getByRole('tab', { name: 'code', exact: true });
      if (!(await code.count())) continue;
      await code.click();
      const list = s.locator('[role="tablist"][aria-label$="implementation platform"]');
      if (!(await list.count()) || !(await list.getByRole('tab', { name: 'SwiftUI' }).count())) continue;
      assert.equal((await list.getByRole('tab', { selected: true }).textContent())?.trim(), 'SwiftUI');
      checked++;
    }
    assert.equal(checked, 1, 'no block with a SwiftUI source was found to check');
    assert.deepEqual(errors, []);
  });

  await check('?platform= opens a page on that platform without overwriting the saved choice', async () => {
    const { page } = await newPage();
    await go(page, '/docs/components/button');
    await page.locator('[data-cp]').first().getByRole('tab', { name: 'code', exact: true }).click();
    await page.locator('[data-cp]').first().getByRole('tablist', { name: 'Platform' }).getByRole('tab', { name: 'Jetpack Compose' }).click();
    await go(page, '/docs/components/button?platform=angular');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['Angular']);
    assert.equal(await page.evaluate(() => localStorage.getItem('kx-platform')), 'compose');
    await go(page, '/docs/components/button?platform=vue');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['Jetpack Compose'], 'an unknown value is ignored');
  });

  await check('client-side navigation into, between and away from ?platform= follows the URL and restores the saved choice', async () => {
    const { page, errors } = await newPage();
    await go(page, '/docs/components/button');
    await page.locator('[data-cp]').first().getByRole('tab', { name: 'code', exact: true }).click();
    await page.locator('[data-cp]').first().getByRole('tablist', { name: 'Platform' }).getByRole('tab', { name: 'Jetpack Compose' }).click();
    // a marker on window survives only while no full page load happens: every step below must keep it
    await page.evaluate(() => { window.__kxSameDocument = true; });
    const push = async (url) => {
      await page.evaluate((u) => window.next.router.push(u), url);
      await page.waitForURL(`**${url}`);
      await page.waitForLoadState('networkidle');
      assert.equal(await page.evaluate(() => window.__kxSameDocument === true), true, `${url} was a full page load, not a client navigation`);
    };
    await push('/docs/components/dialog?platform=angular');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['Angular'], 'into an override');
    await push('/docs/components/tabs?platform=flutter');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['Flutter'], 'between overrides');
    await push('/docs/components/tabs');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['Jetpack Compose'], 'same page, override removed');
    await push('/docs/components/tabs?platform=swiftui');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['SwiftUI'], 'same page, override added');
    await push('/docs/components/button');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['Jetpack Compose'], 'away from an override');
    assert.equal(await page.evaluate(() => localStorage.getItem('kx-platform')), 'compose', 'an override was saved over the reader\'s choice');
    assert.deepEqual(errors, []);
  });

  await check('/blocks explains installation for the chosen platform, and shows the React CLI only on React', async () => {
    const { page, errors } = await newPage();
    await go(page, '/blocks');
    const guide = page.locator('[data-blocks-install]');
    assert.equal(await guide.getAttribute('data-blocks-install'), 'React');
    const signIn = page.locator('section#sign-in');
    assert.equal((await signIn.locator('code', { hasText: 'npx @kinetixui/cli add' }).textContent())?.trim(), 'npx @kinetixui/cli add button card checkbox input label');
    await signIn.getByRole('tab', { name: 'code', exact: true }).click();
    await signIn.locator('[role="tablist"][aria-label$="implementation platform"]').getByRole('tab', { name: 'SwiftUI' }).click();
    assert.equal(await guide.getAttribute('data-blocks-install'), 'SwiftUI');
    assert.match(await guide.textContent(), /source only and not on Swift Package Manager yet/);
    assert.equal(await page.locator('code', { hasText: 'npx @kinetixui/cli add' }).count(), 0, 'a React CLI command is still shown on SwiftUI');
    assert.deepEqual(errors, []);
  });

  await check('with storage blocked the page still renders and a pick still works', async () => {
    const { page, errors } = await newPage({ blocked: true });
    await go(page, '/docs/components/button');
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['React']);
    await page.locator('[data-cp]').first().getByRole('tablist', { name: 'Platform' }).getByRole('tab', { name: 'SwiftUI' }).click();
    assert.deepEqual([...new Set(await selectedPlatforms(page))], ['SwiftUI']);
    assert.deepEqual(errors, []);
  });

  for (const [width, scale] of [[320, 1], [320, 2], [1280, 2]]) {
    await check(`install strip fits at ${width}px, ${scale * 100}% text, and says what each platform is`, async () => {
      const { page } = await newPage({ width, scale });
      await go(page, '/docs/components/data-table');
      const strip = page.getByRole('list', { name: 'Install by platform' });
      await strip.waitFor();
      if (scale !== 1) assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize), `${16 * scale}px`, 'text scale not applied');
      const m = await strip.evaluate((el) => ({
        text: el.textContent,
        overflow: el.scrollWidth > el.clientWidth + 1,
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      assert.equal(m.overflow, false, 'strip overflows its box');
      assert.equal(m.pageOverflow, false, 'page scrolls sideways');
      assert.match(m.text, /Angular · preview\s*Angular Setup →\s*Not implemented yet · data display wave/);
      assert.match(m.text, /Source only, not on Swift Package Manager yet/);
      assert.match(m.text, /Source only, not on Maven Central yet/);
      assert.match(m.text, /Source only, not on pub\.dev yet/);
      // each setup link is named for its platform in the browser's own accessibility tree, not only in jsdom
      for (const label of ['React', 'Angular', 'SwiftUI', 'Jetpack Compose', 'Flutter']) {
        assert.equal(await strip.getByRole('link', { name: `${label} Setup →`, exact: true }).count(), 1, `${label} setup link name`);
      }
    });
  }
} finally {
  await browser.close();
}
console.log(`\n${results.length} checks passed${negative ? ` (negative control ${negative} did NOT fail: the check is blind)` : ''}`);
if (negative) process.exit(1);
