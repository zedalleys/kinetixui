/** Run against the docs server; screenshot artifacts are written to --out (default /tmp/docs-trees). */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const arg = (key, fallback) => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
const out = arg('--out', '/tmp/docs-trees');
mkdirSync(out, { recursive: true });
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
try {
  for (const width of [320, 1280]) for (const dir of ['ltr', 'rtl']) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${arg('--base', 'http://127.0.0.1:3000')}/docs/tokens`);
    await page.evaluate(async dir => { document.documentElement.dir = dir; await document.fonts.ready; }, dir);
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => (await window.axe.run(document, {
      rules: { region: { enabled: false } },
    })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
    assert.deepEqual(violations, [], 'documentation page must pass axe');
    const trees = page.locator('[data-documentation-tree]');
    assert.equal(await trees.count(), 2);
    for (let i = 0; i < 2; i++) {
      const tree = trees.nth(i);
      assert.equal(await tree.getAttribute('dir'), 'ltr');
      assert.equal(await tree.getAttribute('role'), 'group');
      assert.equal(await tree.getAttribute('aria-label'), 'Scrollable text diagram');
      await tree.focus();
      assert.equal(await tree.evaluate(el => document.activeElement === el), true);
      const metrics = await tree.evaluate(el => {
        const code = el.querySelector('code');
        const style = getComputedStyle(code);
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const widths = [...' │├└─a'].map(c => ctx.measureText(c).width);
        const lines = [...el.querySelectorAll('[data-line]')];
        const heights = lines.map(l => l.getBoundingClientRect().height);
        const prefixX = lines.map(l => {
          const text = l.firstChild?.firstChild;
          if (!text || text.nodeType !== Node.TEXT_NODE) return null;
          const at = text.textContent.indexOf('├');
          if (at < 0) return null;
          const range = document.createRange(); range.setStart(text, at); range.setEnd(text, at + 1);
          return { at, x: range.getBoundingClientRect().x };
        }).filter(Boolean);
        return { widths, heights, prefixX, family: style.fontFamily, whiteSpace: style.whiteSpace,
          direction: getComputedStyle(el).direction, bidi: getComputedStyle(el).unicodeBidi,
          scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
          pageOverflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.match(metrics.family, /treeMono/);
      assert.equal(metrics.whiteSpace, 'pre');
      assert.equal(metrics.direction, 'ltr');
      assert.equal(metrics.bidi, 'isolate');
      assert.ok(Math.max(...metrics.widths) - Math.min(...metrics.widths) < 0.05, 'connector advances must match spaces');
      assert.ok(Math.max(...metrics.heights) - Math.min(...metrics.heights) < 0.1, 'lines must not wrap');
      for (const a of metrics.prefixX) for (const b of metrics.prefixX) {
        assert.ok(Math.abs((b.x - a.x) - (b.at - a.at) * metrics.widths[0]) < 0.2, 'branch columns must align');
      }
      assert.equal(metrics.pageOverflow, false);
      if (width === 320) {
        assert.ok(metrics.scrollWidth > metrics.clientWidth);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);
        assert.ok(await tree.evaluate(el => el.scrollLeft > 0), 'keyboard scroll must work');
        await tree.evaluate(el => el.scrollLeft = 0);
      }
      await tree.screenshot({ path: `${out}/${width}-${dir}-${i}.png` });
    }
    await page.close();
    console.log(`PASS ${width}px ${dir}: font metrics, branch columns, no wrapping, keyboard overflow`);
  }
} finally { await browser.close(); }
