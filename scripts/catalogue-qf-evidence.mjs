/**
 * catalogue-qf-evidence.mjs — the five CAT-QF fixes, measured and photographed in Chromium.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3000)
 *   PLAYWRIGHT_CHROMIUM_PATH=… node scripts/catalogue-qf-evidence.mjs --out <dir>
 *
 * A validation script, not a gate: it prints numbers, writes PNGs and asserts nothing. The regression
 * assertions for these fixes live in the test suite (`component-gallery.test.tsx`,
 * `component-preview.test.tsx`); what cannot be asserted there is layout, because jsdom has none — which is
 * what this measures:
 *
 *  - CAT-BUG-006/007   does a content-bearing mock render text, and how large is the smallest of it
 *  - CAT-BUG-007/008   how much of one thumbnail differs from its family's others, in light and in dark
 *  - CAT-BUG-010       the inset between the preview panel's border and the Preview/Code control
 *  - CAT-BUG-012       what every gallery card's pill says
 *
 * Shots are written per environment so a reader can see light, dark, phone and desktop side by side.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import { decode } from "./visual-harness.mjs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3000");
const OUT = arg("out", "");
if (OUT) fs.mkdirSync(`${OUT}/shots`, { recursive: true });

/** The cards this slice redraws, by the family whose members used to be one picture. */
const FAMILIES = {
  "dialog family": ["dialog", "modal", "alert-dialog"],
  "floating cards": ["popover", "hover-card"],
  menus: ["dropdown-menu", "context-menu", "menubar"],
  tables: ["table", "data-table"],
  "side surfaces": ["sheet", "drawer"],
};
const CHANGED = ["footer", ...Object.values(FAMILIES).flat()];

/**
 * The share of pixels that differ, over the region the two shots have in common. Cards land on subpixel
 * boundaries, so two thumbnails in the same grid can come back 393px and 394px wide; cropping to the
 * overlap compares them anyway instead of reporting nothing.
 */
const diffRatio = (a, b) => {
  const A = decode(a), B = decode(b);
  const w = Math.min(A.w, B.w), h = Math.min(A.h, B.h);
  if (!w || !h) return null;
  let n = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * A.w + x) * 4, j = (y * B.w + x) * 4;
      const d =
        Math.abs(A.data[i] - B.data[j]) +
        Math.abs(A.data[i + 1] - B.data[j + 1]) +
        Math.abs(A.data[i + 2] - B.data[j + 2]);
      if (d > 24) n++;
    }
  return n / (w * h);
};

/** Per card: what the pill says, and the text inside the thumbnail with its smallest rendered size. */
const CARD_PROBE = () => {
  const rows = [];
  for (const card of document.querySelectorAll("[data-gallery-card]")) {
    const frame = card.querySelector("[data-gallery-thumbnail]");
    const body = frame?.querySelector("[data-gallery-thumbnail-body]");
    let minFont = null;
    let words = 0;
    for (const el of body?.querySelectorAll("*") ?? []) {
      const t = el.textContent?.trim();
      if (!t || el.children.length) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      words++;
      const size = parseFloat(getComputedStyle(el).fontSize);
      const scale = el.offsetHeight ? r.height / el.offsetHeight : 1;
      const eff = size * scale;
      if (minFont === null || eff < minFont) minFont = eff;
    }
    rows.push({
      slug: card.getAttribute("data-gallery-card"),
      kind: frame?.getAttribute("data-gallery-thumbnail") ?? null,
      pill: card.querySelector("[data-gallery-category], [data-gallery-primitive]")?.textContent?.trim() ?? null,
      pillAttr: card.querySelector("[data-gallery-category]") ? "category" : card.querySelector("[data-gallery-primitive]") ? "primitive" : null,
      textNodes: words,
      minFont: minFont === null ? null : Math.round(minFont * 10) / 10,
    });
  }
  return { dir: document.documentElement.getAttribute("dir"), rows };
};

/** The preview panel's first row: the gap between the panel's border box and the control inside it. */
const PANEL_PROBE = () => {
  const panel = document.querySelector("[data-cp]");
  const control = panel?.querySelector('[role="radiogroup"]');
  if (!panel || !control) return null;
  const p = panel.getBoundingClientRect();
  const c = control.getBoundingClientRect();
  const rtl = getComputedStyle(panel).direction === "rtl";
  return {
    panel: { width: Math.round(p.width), height: Math.round(p.height) },
    control: { width: Math.round(c.width), height: Math.round(c.height) },
    top: Math.round((c.top - p.top) * 10) / 10,
    start: Math.round(((rtl ? p.right - c.right : c.left - p.left)) * 10) / 10,
    dir: getComputedStyle(panel).direction,
    row: control.parentElement === panel ? "panel (no inset row)" : getComputedStyle(control.parentElement).padding,
  };
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const out = { base: BASE, takenAt: new Date().toISOString(), cards: {}, panel: {}, pairs: {} };

async function withPage(opts, fn) {
  const ctx = await browser.newContext({
    viewport: { width: opts.width ?? 1280, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: opts.dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  if (opts.dark) await page.addInitScript(() => document.documentElement.classList.add("dark"));
  try { return await fn(page); } finally { await ctx.close(); }
}

async function open(page, path, opts) {
  if (opts.text) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Page.enable");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
  }
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-gallery-card], [data-cp]", { timeout: 30000 });
  if (opts.rtl) {
    // after hydration: the root layout renders dir="ltr", and use-document-direction watches the attribute
    await page.evaluate(() => {
      document.documentElement.setAttribute("dir", "rtl");
      document.documentElement.setAttribute("lang", "ar");
    });
    await page.waitForTimeout(400);
  }
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
}

/* ── gallery: pills, thumbnail text, and a shot of every redrawn card ───── */
const CARD_ENVS = {
  "1280/light": { width: 1280 },
  "1280/dark": { width: 1280, dark: true },
  "390/light": { width: 390 },
  "390/dark": { width: 390, dark: true },
  "1280/rtl": { width: 1280, rtl: true },
  "390/text200": { width: 390, text: true },
};
for (const [id, env] of Object.entries(CARD_ENVS)) {
  out.cards[id] = await withPage(env, async (page) => {
    await open(page, "/components", env);
    const probe = await page.evaluate(CARD_PROBE);
    if (OUT) {
      for (const slug of CHANGED) {
        // centre the card first: the gallery's filter bar is sticky, and an element screenshot of a card
        // sitting under it comes back with the bar painted over the thumbnail — which is a difference
        // between two cards that has nothing to do with the mocks.
        await page
          .evaluate((s) => {
            document.querySelector(`[data-gallery-card="${s}"]`)?.scrollIntoView({ block: "center" });
          }, slug)
          .catch(() => {});
        await page.waitForTimeout(250);
        const png = await page
          .locator(`[data-gallery-card="${slug}"] [data-gallery-thumbnail]`)
          .screenshot()
          .catch(() => null);
        if (!png) continue;
        fs.writeFileSync(`${OUT}/shots/card-${slug}-${id.replace("/", "-")}.png`, png);
      }
      // the whole first screen of the gallery, so the pills read in context
      const page1 = await page.screenshot({ clip: { x: 0, y: 0, width: env.width ?? 1280, height: 1000 } });
      fs.writeFileSync(`${OUT}/shots/gallery-${id.replace("/", "-")}.png`, page1);
    }
    return probe;
  });
}

/* ── how different each family's members now are, in light and dark ─────── */
for (const env of ["1280-light", "1280-dark"]) {
  for (const [family, slugs] of Object.entries(FAMILIES)) {
    for (let i = 0; i < slugs.length; i++)
      for (let j = i + 1; j < slugs.length; j++) {
        const [x, y] = [slugs[i], slugs[j]];
        try {
          const r = diffRatio(
            fs.readFileSync(`${OUT}/shots/card-${x}-${env}.png`),
            fs.readFileSync(`${OUT}/shots/card-${y}-${env}.png`),
          );
          out.pairs[`${env} ${x} vs ${y}`] = { family, ratio: r };
        } catch (e) {
          out.pairs[`${env} ${x} vs ${y}`] = { family, error: String(e).slice(0, 100) };
        }
      }
  }
}

/* ── the preview panel's inset, across viewport, theme, direction, text ─── */
const PANEL_ENVS = {
  "1280/light": { width: 1280 },
  "1280/dark": { width: 1280, dark: true },
  "1280/rtl": { width: 1280, rtl: true },
  "768/light": { width: 768 },
  "390/light": { width: 390 },
  "390/rtl": { width: 390, rtl: true },
  "390/text200": { width: 390, text: true },
  "320/light": { width: 320 },
};
for (const [id, env] of Object.entries(PANEL_ENVS)) {
  out.panel[id] = await withPage(env, async (page) => {
    await open(page, "/docs/components/button", env);
    const probe = await page.evaluate(PANEL_PROBE);
    if (OUT) {
      const png = await page.locator("[data-cp]").first().screenshot().catch(() => null);
      if (png) fs.writeFileSync(`${OUT}/shots/panel-${id.replace("/", "-")}.png`, png);
    }
    return probe;
  });
}

if (OUT) fs.writeFileSync(`${OUT}/catalogue-qf-evidence.json`, JSON.stringify(out, null, 1));
await browser.close();

/* ── report ─────────────────────────────────────────────────────────────── */
const pct = (r) => (r === null || r === undefined ? "–" : `${(r * 100).toFixed(2)}%`);
const base = out.cards["1280/light"].rows;

console.log(`cards ${base.length}`);
const pills = base.filter((r) => r.pillAttr === "category").length;
const values = new Set(base.map((r) => r.pill));
console.log(`\n— CAT-BUG-012: the category pill —`);
console.log(`  cards whose pill is the category slot: ${pills}/${base.length}`);
console.log(`  distinct values: ${values.size} → ${[...values].sort().join(", ")}`);

console.log(`\n— CAT-BUG-006/007: text inside the redrawn thumbnails —`);
for (const slug of ["footer", "table", "data-table"]) {
  const r = base.find((x) => x.slug === slug);
  const small = Object.entries(out.cards)
    .map(([id, c]) => `${id} ${c.rows.find((x) => x.slug === slug)?.minFont ?? "–"}px`)
    .join("  ");
  console.log(`  ${slug.padEnd(11)} text nodes ${String(r?.textNodes ?? 0).padStart(3)}   smallest: ${small}`);
}

console.log(`\n— CAT-BUG-007/008: how much of each pair differs —`);
for (const [k, v] of Object.entries(out.pairs))
  console.log(`  ${k.padEnd(44)} ${v.error ? v.error : pct(v.ratio)}`);

console.log(`\n— CAT-BUG-010: the Preview/Code control's inset —`);
for (const [id, p] of Object.entries(out.panel))
  console.log(
    p
      ? `  ${id.padEnd(14)} top ${String(p.top).padStart(5)}  start ${String(p.start).padStart(5)}  dir ${p.dir.padEnd(3)}  row padding ${p.row}`
      : `  ${id.padEnd(14)} control not found`,
  );
