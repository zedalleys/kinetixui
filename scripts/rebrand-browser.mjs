import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const base = process.env.REBRAND_BASE || 'http://127.0.0.1:3104';
const output = process.env.REBRAND_OUTPUT || 'design-assets/identity/v1/verification';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const [name, width, dark, rtl, reduced, zoom] of [
    ['desktop', 1440, false, false, false, false],
    ['mobile', 390, false, false, false, false],
    ['desktop-dark', 1440, true, false, false, false],
    ['mobile-dark-rtl', 390, true, true, true, false],
    ['narrow', 320, false, false, true, false],
    ['tablet', 768, false, false, true, false],
    ['narrow-text-200', 320, false, false, true, true],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, colorScheme: dark ? 'dark' : 'light', reducedMotion: reduced ? 'reduce' : 'no-preference' });
    await context.addInitScript(({ dark, rtl }) => {
      localStorage.setItem('kx-consent', 'denied'); localStorage.setItem('theme', dark ? 'dark' : 'light');
      if (rtl) document.addEventListener('DOMContentLoaded', () => document.documentElement.dir = 'rtl');
    }, { dark, rtl });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    if (zoom) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } });
    }
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').count(), 1);
    const root = page.locator('.kx-hero-polygon');
    const handle = root.getByRole('group', { name: 'Rotate hero polygon' });
    assert.equal(await root.locator('.kx-polygon-facets polygon').count(), 9, 'supplied facets preserved');
    assert.equal(await root.locator('.kx-polygon-wireframe path').count(), 7, 'supplied cage and nodes preserved');
    assert.equal(await root.locator('.kx-polygon-wireframe').evaluate(el => getComputedStyle(el).fill), await page.locator('html').evaluate(el => {
      const n = document.createElement('span'); n.style.color = 'hsl(var(--brand))'; el.appendChild(n); const c = getComputedStyle(n).color; n.remove(); return c;
    }));
    const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].map(el => ({ tag: el.tagName, cls: String(el.className).slice(0, 100), right: el.getBoundingClientRect().right })).filter(el => el.right > innerWidth + 1).slice(0, 10));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: horizontal overflow ${JSON.stringify(overflow)}`);
    if (!reduced) {
      await handle.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'true');
      const rect = await handle.boundingBox();
      await page.mouse.move(rect.x + rect.width * .4, rect.y + rect.height * .5);
      await page.mouse.down(); await page.mouse.move(rect.x + rect.width * .6, rect.y + rect.height * .6, { steps: 8 }); await page.mouse.up();
      assert.notEqual(await root.locator('.kx-polygon-rotation').evaluate(el => getComputedStyle(el).transform), 'matrix(1, 0, 0, 1, 0, 0)', 'drag rotation missing');
      await root.getByRole('button', { name: 'Reset polygon rotation' }).click();
      assert.equal(await root.locator('.kx-polygon-rotation').evaluate(el => el.style.getPropertyValue('--polygon-yaw')), '0deg');
      await handle.focus(); await page.keyboard.press('ArrowRight');
      assert.equal(await root.locator('.kx-polygon-rotation').evaluate(el => el.style.getPropertyValue('--polygon-yaw')), '5deg');
      await page.keyboard.press('Home');
      const pause = root.getByRole('button', { name: 'Pause polygon animation' });
      await pause.click(); assert.equal(await root.getAttribute('data-running'), 'false');
      await pause.click();
      await page.locator('footer').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
      await root.scrollIntoViewIfNeeded();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('.kx-hero-polygon').dataset.running === 'false');
      assert.equal(await root.locator('.kx-polygon-idle').evaluate(el => getComputedStyle(el).animationName), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    } else {
      assert.equal(await root.getAttribute('data-running'), 'false');
      assert.equal(await root.locator('.kx-polygon-idle').evaluate(el => getComputedStyle(el).animationName), 'none');
      assert.equal(await root.getByRole('button', { name: 'Pause polygon animation' }).isVisible(), false);
    }
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    await page.evaluate(() => { document.activeElement?.blur(); document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo({ top: 0, behavior: 'instant' }); });
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${name}.png`, animations: 'disabled' });
    if (['desktop', 'mobile'].includes(name)) await page.locator('.kx-brand-hero').screenshot({ path: `${output}/${name}-hero.png`, animations: 'disabled' });
    if (name === 'mobile') await root.screenshot({ path: `${output}/mobile-polygon.png`, animations: 'disabled' });
    results.push({ name, violations, errors });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/browser-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
assert.ok(results.every(r => !r.violations.length && !r.errors.length), 'browser or accessibility errors; inspect results');
