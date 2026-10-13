/**
 * The homepage's Systems in Motion visuals, in a real browser against `next start`.
 *
 *   node scripts/home-systems-browser.mjs --base http://127.0.0.1:3000
 *
 * The unit tests (apps/web/src/components/systems/systems-in-motion.test.tsx) hold the data and the markup to the
 * repository. This holds what only a laid-out page can show:
 *
 *   - tabs: both platform tablists (hero map, implementation explorer) move with the arrow keys in reading order,
 *     and follow a runtime change of `<html dir>` without a reload; the hero list turns vertical on a phone and
 *     then takes Up/Down, not Left/Right; Home and End reach the ends
 *   - type: no text inside the Systems in Motion visuals renders under 12px (the site's compact-text floor)
 *   - headline: the hero headline never splits a word across lines, at phone to wide widths and at 200% text
 *   - map, phone: the generated-output layer, the token boundary and the written layer are all on screen; the
 *     written branches are dashed and the generated ones solid
 *   - map, desktop: four outputs over five platforms, and no trace runs through an output it does not belong to
 *   - no horizontal overflow at any of those widths, in either direction
 *   - structure (a performance guard, not a timing threshold): the HTML carries only the open explorer panel and
 *     the payload no second copy of it; the hero map's client props stay under a byte budget; the hero map, its
 *     outputs and its tabs exist once at phone and desktop widths (no duplicate mobile tree); every excerpt, on
 *     every tab, stays inside the 7-line window
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const arg = (key, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`${key}=`));
  if (hit) return hit.slice(key.length + 1);
  return process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
};
const base = arg('--base', 'http://127.0.0.1:3000');
const FLOOR = 12;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const failures = [];
// a check that hangs (a page that never settles) fails after this long instead of stalling the whole gate
const CHECK_TIMEOUT = 180_000;
const check = async (name, fn) => {
  let timer;
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${CHECK_TIMEOUT / 1000}s`)), CHECK_TIMEOUT);
      }),
    ]);
    console.log(`ok   ${name}`);
  } catch (e) {
    failures.push(name);
    console.log(`FAIL ${name}\n     ${String(e.message).split('\n').slice(0, 6).join('\n     ')}`);
  } finally {
    clearTimeout(timer);
  }
};

async function open({ width, height = 900, scale = 1, reducedMotion = 'reduce' }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion });
  await context.addInitScript(() => {
    try {
      localStorage.setItem('kx-consent', 'denied');
    } catch {}
  });
  const page = await context.newPage();
  if (scale !== 1) {
    // 200% text the way a reader sets it, as check:a11y-site does
    const cdp = await context.newCDPSession(page);
    await cdp.send('Page.setFontSizes', { fontSizes: { standard: 16 * scale, fixed: 13 * scale } });
  }
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  return { page, context };
}

const setDir = (page, dir) =>
  page.evaluate(async (d) => {
    document.documentElement.setAttribute('dir', d);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, dir);

/** Focus a tab in `list`, press keys, and return the selected tab's data-platform after each. */
async function walk(page, list, startPlatform, keys) {
  const tab = page.locator(`${list} [role="tab"][data-platform="${startPlatform}"]`);
  await tab.click();
  await page.waitForTimeout(100);
  const seen = [];
  for (const k of keys) {
    await page.keyboard.press(k);
    await page.waitForTimeout(50);
    seen.push(await page.locator(`${list} [role="tab"][aria-selected="true"]`).getAttribute('data-platform'));
  }
  return seen;
}

const HERO = '[data-hero-system-map] [role="tablist"]';
const EXPLORER = '[data-implementation-explorer] [role="tablist"]';

// ── tabs ───────────────────────────────────────────────────────────────────────────────────────────────────────
await check('hero tabs, desktop: horizontal, Left/Right follow reading order, live dir change', async () => {
  const { page, context } = await open({ width: 1440 });
  const list = page.locator(HERO);
  assert.equal(await list.getAttribute('aria-orientation'), 'horizontal');
  const platforms = await page.locator(`${HERO} [role="tab"]`).evaluateAll((t) => t.map((n) => n.dataset.platform));
  const [first, second] = platforms;
  assert.deepEqual(await walk(page, HERO, first, ['ArrowRight', 'ArrowLeft']), [second, first], 'LTR: Right moves forward');
  await setDir(page, 'rtl');
  assert.deepEqual(await walk(page, HERO, first, ['ArrowLeft', 'ArrowRight']), [second, first], 'RTL: Left moves forward');
  assert.deepEqual(await walk(page, HERO, first, ['End', 'Home']), [platforms.at(-1), first], 'Home/End reach the ends');
  await setDir(page, 'ltr');
  assert.deepEqual(await walk(page, HERO, first, ['ArrowRight']), [second], 'back to LTR without a reload');
  await context.close();
});

await check('hero tabs, phone: vertical, Up/Down move, Left/Right do not', async () => {
  const { page, context } = await open({ width: 390, height: 844 });
  const list = page.locator(HERO);
  assert.equal(await list.getAttribute('aria-orientation'), 'vertical');
  const platforms = await page.locator(`${HERO} [role="tab"]`).evaluateAll((t) => t.map((n) => n.dataset.platform));
  const [first, second] = platforms;
  assert.deepEqual(await walk(page, HERO, first, ['ArrowDown', 'ArrowUp']), [second, first], 'Down/Up move');
  assert.deepEqual(await walk(page, HERO, first, ['ArrowRight', 'ArrowLeft']), [first, first], 'Left/Right do nothing on a vertical list');
  await setDir(page, 'rtl');
  assert.deepEqual(await walk(page, HERO, first, ['ArrowDown', 'End', 'Home']), [second, platforms.at(-1), first], 'RTL: Down, End, Home');
  await context.close();
});

await check('explorer tabs: Left/Right follow reading order, live dir change', async () => {
  const { page, context } = await open({ width: 1280 });
  await page.locator(EXPLORER).scrollIntoViewIfNeeded();
  const platforms = await page.locator(`${EXPLORER} [role="tab"]`).evaluateAll((t) => t.map((n) => n.dataset.platform));
  const [first, second] = platforms;
  assert.deepEqual(await walk(page, EXPLORER, first, ['ArrowRight', 'ArrowLeft']), [second, first], 'LTR: Right moves forward');
  await setDir(page, 'rtl');
  assert.deepEqual(await walk(page, EXPLORER, first, ['ArrowLeft', 'ArrowRight']), [second, first], 'RTL: Left moves forward');
  assert.deepEqual(await walk(page, EXPLORER, first, ['End', 'Home']), [platforms.at(-1), first], 'Home/End reach the ends');
  await context.close();
});

// ── type floor ─────────────────────────────────────────────────────────────────────────────────────────────────
const SYSTEMS = '[data-hero-system-map], [data-implementation-explorer], [data-token-pipeline], [data-evidence-columns], [data-spotlight]';
for (const width of [390, 1440]) {
  await check(`type floor ${FLOOR}px in the Systems in Motion visuals at ${width}px`, async () => {
    const { page, context } = await open({ width });
    // render every chapter (content-visibility skips offscreen ones) and every tab panel of the explorer
    await page.evaluate(async () => {
      for (let y = 0; y < Math.min(document.body.scrollHeight, 100_000); y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
      }
    });
    const small = [];
    const tabs = await page.locator(`${EXPLORER} [role="tab"]`).all();
    for (const t of [null, ...tabs]) {
      if (t) await t.click();
      small.push(
        ...(await page.evaluate(
          ({ sel, floor }) => {
            const out = [];
            for (const root of document.querySelectorAll(sel)) {
              const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
              for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                if (!n.textContent.trim()) continue;
                const el = n.parentElement;
                if (el.closest('[aria-hidden="true"]') && !el.closest('.kx-map-outputs')) continue;
                const cs = getComputedStyle(el);
                if (cs.display === 'none' || cs.visibility === 'hidden') continue;
                if (el.closest('.sr-only')) continue;
                const px = parseFloat(cs.fontSize);
                if (px < floor - 0.01) out.push(`${px}px "${n.textContent.trim().slice(0, 40)}" in <${el.tagName.toLowerCase()} class="${el.className}">`);
              }
            }
            return out;
          },
          { sel: SYSTEMS, floor: FLOOR },
        )),
      );
    }
    assert.deepEqual([...new Set(small)], [], 'text under the floor');
    await context.close();
  });
}

// ── headline ───────────────────────────────────────────────────────────────────────────────────────────────────
for (const [width, scale] of [
  [320, 1], [375, 1], [390, 1], [768, 1], [1024, 1], [1280, 1], [1440, 1], [1920, 1],
  [320, 2], [768, 2], [1280, 2],
]) {
  await check(`headline keeps every word whole at ${width}px, ${scale * 100}% text`, async () => {
    const { page, context } = await open({ width, scale });
    const split = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const out = [];
      const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        for (const m of n.textContent.matchAll(/\S+/g)) {
          const r = document.createRange();
          r.setStart(n, m.index);
          r.setEnd(n, m.index + m[0].length);
          const lines = new Set([...r.getClientRects()].filter((q) => q.width > 0).map((q) => Math.round(q.top)));
          if (lines.size > 1) out.push(m[0]);
        }
      }
      return { out, hyphens: getComputedStyle(h1).hyphens };
    });
    assert.notEqual(split.hyphens, 'auto', 'automatic hyphenation is on');
    assert.deepEqual(split.out, [], 'a word breaks across lines');
    await context.close();
  });
}

// ── the map ────────────────────────────────────────────────────────────────────────────────────────────────────
const mapFacts = (page) =>
  page.evaluate(() => {
    const map = document.querySelector('[data-hero-system-map]');
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const chips = [...map.querySelectorAll('[data-output]')];
    const tabs = [...map.querySelectorAll('[role="tab"]')];
    const traces = [...map.querySelectorAll('svg path.kx-trace')];
    // dashed = a visible dash pattern; a generated trace drawn with pathLength=1 and a dash of 1 is solid
    const dashed = (p) => {
      const d = getComputedStyle(p).strokeDasharray;
      if (d === 'none') return false;
      return !(p.getAttribute('pathLength') === '1' && parseFloat(d) >= 1);
    };
    const boundary = [...map.querySelectorAll('p')].find((p) => /Tokens generated/.test(p.textContent));
    // sample each trace, and report any point that falls inside an output it does not start or end at
    const box = map.getBoundingClientRect();
    const through = [];
    for (const p of traces) {
      const len = p.getTotalLength();
      const own = new Set();
      const ends = [p.getPointAtLength(0), p.getPointAtLength(len)];
      for (const c of chips) {
        const r = c.getBoundingClientRect();
        for (const e of ends) if (e.x + box.left >= r.left - 2 && e.x + box.left <= r.right + 2 && e.y + box.top >= r.top - 2 && e.y + box.top <= r.bottom + 2) own.add(c);
      }
      for (let i = 1; i < 40; i++) {
        const q = p.getPointAtLength((len * i) / 40);
        for (const c of chips) {
          if (own.has(c)) continue;
          const r = c.getBoundingClientRect();
          if (q.x + box.left > r.left + 1 && q.x + box.left < r.right - 1 && q.y + box.top > r.top + 1 && q.y + box.top < r.bottom - 1) {
            through.push(`${p.dataset.kind} trace crosses the ${c.dataset.output} output`);
          }
        }
      }
    }
    return {
      layout: map.dataset.mapLayout,
      mapWidth: Math.round(box.width),
      rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      chipsVisible: chips.filter(visible).length,
      chips: chips.length,
      tabsVisible: tabs.filter(visible).length,
      boundaryVisible: visible(boundary),
      generated: traces.filter((p) => p.dataset.kind === 'generated').map(dashed),
      written: traces.filter((p) => p.dataset.kind === 'written').map(dashed),
      through: [...new Set(through)],
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

for (const [width, dir] of [[320, 'ltr'], [390, 'ltr'], [390, 'rtl'], [768, 'ltr'], [1024, 'ltr'], [1280, 'ltr'], [1440, 'ltr'], [1440, 'rtl'], [1920, 'ltr']]) {
  await check(`map at ${width}px ${dir.toUpperCase()}: generated layer, boundary, dashed written layer, no trace through another output`, async () => {
    const { page, context } = await open({ width, height: width < 600 ? 844 : 900 });
    await setDir(page, dir);
    await page.waitForTimeout(200);
    const f = await mapFacts(page);
    // the map switches from rows to columns at a container width of 34rem
    assert.equal(f.layout, f.mapWidth >= 34 * f.rem ? 'columns' : 'rows', `layout at a ${f.mapWidth}px map`);
    assert.ok(f.chips >= 1 && f.chipsVisible === f.chips, `generated outputs on screen: ${f.chipsVisible}/${f.chips}`);
    assert.ok(f.chips < f.tabsVisible, `${f.chips} outputs feed ${f.tabsVisible} platforms`);
    assert.ok(f.boundaryVisible, 'the token boundary is on screen');
    assert.equal(f.generated.length, f.chips, 'one generated trace per output');
    assert.equal(f.written.length, f.tabsVisible, 'one written trace per platform');
    assert.ok(f.generated.every((d) => !d), 'generated traces are solid');
    assert.ok(f.written.every((d) => d), 'written traces are dashed');
    assert.deepEqual(f.through, [], 'a trace runs through an output it does not belong to');
    assert.ok(f.overflow <= 0, `horizontal overflow ${f.overflow}px`);
    await context.close();
  });
}

// ---- structure: what the page sends before anyone interacts with it ----------------------------------------------

/** The page's raw HTML and the decoded React payload that rides with it (in which elements are JSON, never `<pre`). */
async function rawPage() {
  const html = await (await fetch(`${base}/`)).text();
  let flight = '';
  for (const m of html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) flight += JSON.parse(m[1]);
  return { html, flight };
}

/** The JSON object that starts at `start` in `text`, by brace matching (strings respected). */
function objectAt(text, start) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error('unterminated object');
}

const EXCERPT_LINES = 7; // lib/systems-in-motion.ts cuts every excerpt to a 7-line window
const HERO_PROPS_BUDGET = 4096; // the hero map's serialized props: token, outputs, platforms, theme facts

await check('structure: the explorer sends one panel as HTML, the other four as data only', async () => {
  const { html, flight } = await rawPage();
  const pres = (html.match(/<pre\b[^>]*class="kx-code /g) ?? []).length;
  assert.equal(pres, 1, `${pres} explorer code blocks in the HTML; only the open panel belongs there`);
  // the open panel's element tree rides once in the payload for hydration; a second copy means a hidden panel
  // was rendered as elements again
  const trees = flight.split('kx-code font-mono').length - 1;
  assert.ok(trees <= 1, `${trees} explorer code trees in the React payload`);
});

await check(`structure: hero map props stay under ${HERO_PROPS_BUDGET} bytes (static evidence stays on the server)`, async () => {
  const { flight } = await rawPage();
  const at = flight.indexOf('{"token":');
  assert.ok(at >= 0, 'hero map props not found in the payload');
  const size = Buffer.byteLength(objectAt(flight, at));
  assert.ok(size <= HERO_PROPS_BUDGET, `hero map props are ${size} bytes`);
});

for (const width of [390, 1440]) {
  await check(`structure at ${width}px: one hero map, one explorer, one panel of at most ${EXCERPT_LINES} lines per file`, async () => {
    const { page, context } = await open({ width });
    const f = await page.evaluate(() => {
      const count = (sel) => document.querySelectorAll(sel).length;
      return {
        maps: count('[data-hero-system-map]'),
        heroTabs: count('[data-hero-system-map] [role="tab"]'),
        outputs: count('[data-hero-system-map] .kx-map-outputs'),
        tablists: count('[data-hero-system-map] .kx-map-tabs'),
        explorers: count('[data-implementation-explorer]'),
        explorerTabs: count('[data-implementation-explorer] [role="tab"]'),
        pres: count('[data-implementation-explorer] pre.kx-code'),
        lines: [...document.querySelectorAll('[data-implementation-explorer] pre.kx-code')].map(
          (p) => p.querySelectorAll('.kx-ln').length,
        ),
      };
    });
    // one adaptive structure: a phone gets the same tree laid out as rows, never a second copy
    assert.equal(f.maps, 1, `${f.maps} hero maps`);
    assert.equal(f.heroTabs, 5, `${f.heroTabs} hero platform tabs`);
    assert.equal(f.outputs, 1, `${f.outputs} output layers`);
    assert.equal(f.tablists, 1, `${f.tablists} hero tab lists`);
    assert.equal(f.explorers, 1, `${f.explorers} explorers`);
    assert.equal(f.explorerTabs, 5, `${f.explorerTabs} explorer tabs`);
    assert.equal(f.pres, 1, `${f.pres} explorer code blocks mounted; only the open panel should be`);
    assert.ok(f.lines.every((n) => n >= 1 && n <= EXCERPT_LINES), `excerpt line counts ${f.lines}`);
    // switching tabs mounts that panel and only that one, still inside the line window
    const platforms = await page.locator(`${EXPLORER} [role="tab"]`).evaluateAll((t) => t.map((n) => n.dataset.platform));
    for (const platform of platforms.slice(1)) {
      await page.locator(`${EXPLORER} [role="tab"][data-platform="${platform}"]`).click();
      const g = await page.evaluate(() => [...document.querySelectorAll('[data-implementation-explorer] pre.kx-code')].map((p) => p.querySelectorAll('.kx-ln').length));
      assert.ok(g.length >= 1 && g.every((n) => n >= 1 && n <= EXCERPT_LINES), `${platform}: excerpt line counts ${g}`);
      const shown = await page.locator('[data-implementation-explorer] [role="tabpanel"]:not([hidden])').count();
      assert.equal(shown, 1, `${platform}: ${shown} panels mounted`);
    }
    await context.close();
  });
}

await browser.close();
if (failures.length) {
  console.error(`\nhome-systems: ${failures.length} check(s) failed`);
  process.exit(1);
}
console.log('\nhome-systems ok — tabs (LTR/RTL/live, horizontal/vertical), type floor, headline, map layers and routing, structure');
