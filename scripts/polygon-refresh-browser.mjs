import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const base = process.env.POLYGON_BASE || 'http://127.0.0.1:3000';
const output = '.impeccable/review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const results = [];
try {
  for (const [name, width, dark, rtl, reduced, scale] of [
    ['desktop', 1440, false, false, false, 1],
    ['mobile', 390, false, false, true, 1],
    ['desktop-dark-rtl', 1440, true, true, false, 1],
    ['mobile-dark-rtl', 390, true, true, true, 1],
    ['narrow', 320, false, false, true, 1],
    ['tablet', 768, false, false, true, 1],
    ['zoom', 1280, false, false, true, 2],
    ['narrow-zoom', 320, false, false, true, 2],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, colorScheme: dark ? 'dark' : 'light', reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await context.addInitScript(({ rtl, dark }) => {
      localStorage.setItem('kx-consent', 'denied');
      localStorage.setItem('theme', dark ? 'dark' : 'light');
      if (rtl) document.addEventListener('DOMContentLoaded', () => document.documentElement.dir = 'rtl');
    }, { rtl, dark });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    if (scale === 2) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } });
    }
    for (const route of ['/', '/create']) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      // Full-page evidence must include offscreen chapters whose entrance effect waits for scrolling.
      // This capture-only override settles existing reveal motion without changing product CSS.
      await page.addStyleTag({ content: '[data-reveal] { opacity: 1 !important; transform: none !important; animation: none !important; } .kx-defer { content-visibility: visible !important; } html { scroll-behavior: auto !important; }' });
      // Visit each viewport once so existing near-viewport component previews mount for full-page evidence.
      await page.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
          window.scrollTo(0, y);
          await new Promise(resolve => setTimeout(resolve, 40));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(300);
      const label = route === '/' ? name : `create-${name}`;
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `${label}: horizontal overflow ${overflow}`);
      assert.equal(await page.locator('footer img').count(), 0, 'discarded landscape imagery returned');
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const axe = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })));
      if (route === '/') {
        const mesh = page.locator('.kx-polygon-hero-mesh');
        const button = mesh.getByRole('button', { name: 'Pause polygon animation' });
        const shapes = await mesh.locator('.kx-polygon-art path, .kx-polygon-art circle').count();
        assert.equal(shapes, 117, 'source geometry or bounded signal budget changed');
        if (reduced) {
          assert.equal(await button.isVisible(), false);
          assert.equal(await mesh.getAttribute('data-polygon-running'), 'false');
          assert.equal(await mesh.locator('.kx-polygon-drift').evaluate(el => getComputedStyle(el).animationName), 'none');
        } else {
          await mesh.scrollIntoViewIfNeeded();
          await page.waitForFunction(() => document.querySelector('.kx-polygon-hero-mesh').dataset.polygonRunning === 'true');
          const link = mesh.locator('.kx-polygon-signals path').first();
          const before = await link.evaluate(el => getComputedStyle(el).strokeDashoffset);
          await page.waitForTimeout(250);
          assert.notEqual(await link.evaluate(el => getComputedStyle(el).strokeDashoffset), before, 'links do not animate');
          await button.focus();
          await page.keyboard.press('Enter');
          assert.equal(await button.getAttribute('aria-pressed'), 'true');
          assert.equal(await mesh.getAttribute('data-polygon-running'), 'false');
          await page.keyboard.press('Enter');
          await page.locator('footer').scrollIntoViewIfNeeded();
          await page.waitForFunction(() => document.querySelector('.kx-polygon-hero-mesh').dataset.polygonRunning === 'false');
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.waitForFunction(() => document.querySelector('.kx-polygon-hero-mesh').dataset.polygonRunning === 'false');
          await page.emulateMedia({ reducedMotion: 'no-preference' });
        }
        const cta = await page.locator('[data-hero-copy] a').first().boundingBox();
        if (scale === 1) assert.ok(cta.y + cta.height < 960, `${label}: CTA below fold`);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${output}/${label}.png`, animations: 'disabled' });
      if (['desktop', 'mobile'].includes(name)) {
        // A separate half-scale context keeps long pages below Chromium's texture-height limit.
        const fullContext = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: .5, reducedMotion: 'reduce', storageState: await context.storageState() });
        const full = await fullContext.newPage();
        await full.goto(base + route, { waitUntil: 'networkidle' });
        await full.evaluate(() => document.fonts.ready);
        await full.addStyleTag({ content: 'html { scroll-behavior: auto !important; } [data-reveal] { opacity: 1 !important; transform: none !important; animation: none !important; } .kx-defer { content-visibility: visible !important; }' });
        await full.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
            window.scrollTo(0, y);
            await new Promise(resolve => setTimeout(resolve, 40));
          }
          window.scrollTo(0, 0);
        });
        await full.waitForTimeout(300);
        await full.screenshot({ path: `${output}/${label}-full.png`, fullPage: true, scale: 'device', animations: 'disabled' });
        await fullContext.close();
      }
      assert.deepEqual(errors, [], `${label}: runtime errors`);
      results.push({ label, overflow, axe });
    }
    await context.close();
  }
  await writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
  assert.ok(results.every(r => r.axe.length === 0), 'axe violations — see browser-results.json');
} finally { await browser.close(); }
