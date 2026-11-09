/**
 * catalogue-taxonomy-evidence.mjs — the CAT-2 taxonomy as Chromium renders it.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3000)
 *   PLAYWRIGHT_CHROMIUM_PATH=… node scripts/catalogue-taxonomy-evidence.mjs --out <dir>
 *
 * A validation script, not a gate: it prints numbers, writes PNGs and asserts nothing. The regression
 * assertions live in `check:manifest`, `check:manifest-controls`, `component-taxonomy.test.ts` and
 * `component-gallery.test.tsx`. What those cannot show is the taxonomy arriving in a browser at four
 * viewports, in both themes, mirrored, and at 200% text:
 *
 *  - every card's category pill, and the set of distinct values it produces across the catalogue
 *  - every category filter chip: its label, the count printed on it, and the cards its filter really yields
 *  - the grouped headings in the results list, and the component groups in the docs sidebar
 *  - whether the longer category labels ("Layout & Structure", "Media & Content") overflow the page at 320px
 *    or at 200% text, which is the only new layout risk a renamed taxonomy carries
 */
import { chromium } from "playwright";
import fs from "node:fs";

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const BASE = arg("base", "http://127.0.0.1:3000");
const OUT = arg("out", "");
if (OUT) fs.mkdirSync(`${OUT}/shots`, { recursive: true });

const TAXONOMY = JSON.parse(fs.readFileSync(new URL("../component-taxonomy.json", import.meta.url), "utf8"));
const EXPECTED = TAXONOMY.categoryOrder;

/** What the gallery says about itself: pills, chips, grouped headings, and whether the page overflows. */
const GALLERY_PROBE = () => {
  const text = (el) => el?.textContent?.trim() ?? null;
  const cards = [...document.querySelectorAll("[data-gallery-card]")].map((card) => ({
    slug: card.getAttribute("data-gallery-card"),
    pill: text(card.querySelector("[data-gallery-category]")),
    // the slot used to prefer the technology; a card still carrying that hook is the old behaviour
    fromCategorySlot: !!card.querySelector("[data-gallery-category]"),
  }));
  const group = document.querySelector('[role="group"][aria-label="Filter by category"]');
  const chips = [...(group?.querySelectorAll("button") ?? [])].map((b) => text(b));
  const headings = [...document.querySelectorAll("h2, h3")].map(text).filter(Boolean);
  return {
    dir: getComputedStyle(document.documentElement).direction,
    cards,
    chips,
    headings,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
};

/**
 * The docs sidebar's group headings in the order it lists them, and the category the page's own breadcrumb
 * names — two surfaces reading the same generated data, which is the point of CAT-2.
 */
const SIDEBAR_PROBE = () => {
  const groups = [...document.querySelectorAll("nav p.eyebrow")].map((p) => p.textContent?.trim()).filter(Boolean);
  const crumbs = [...document.querySelectorAll("nav[aria-label='Breadcrumb'] *, [class*='breadcrumb'] *")]
    .map((el) => (el.children.length ? null : el.textContent?.trim()))
    .filter(Boolean);
  return {
    groups: [...new Set(groups)],
    breadcrumb: crumbs,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const out = { base: BASE, takenAt: new Date().toISOString(), expectedCategories: EXPECTED, gallery: {}, chipFilters: {}, sidebar: {} };

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
  await page.waitForSelector(opts.ready ?? "[data-gallery-card]", { timeout: 30000 });
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

const ENVS = {
  "1280/light": { width: 1280 },
  "1280/dark": { width: 1280, dark: true },
  "1280/rtl": { width: 1280, rtl: true },
  "768/light": { width: 768 },
  "390/light": { width: 390 },
  "390/dark": { width: 390, dark: true },
  "390/rtl": { width: 390, rtl: true },
  "390/text200": { width: 390, text: true },
  "320/light": { width: 320 },
  "320/text200": { width: 320, text: true },
};

for (const [id, env] of Object.entries(ENVS)) {
  const file = id.replace("/", "-");
  out.gallery[id] = await withPage(env, async (page) => {
    await open(page, "/components", env);
    const probe = await page.evaluate(GALLERY_PROBE);
    if (OUT) {
      fs.writeFileSync(
        `${OUT}/shots/gallery-${file}.png`,
        await page.screenshot({ clip: { x: 0, y: 0, width: env.width ?? 1280, height: 1000 } }),
      );
      // the chip row on its own, where a renamed label would wrap or clip first
      const chips = await page.locator('[role="group"][aria-label="Filter by category"]').screenshot().catch(() => null);
      if (chips) fs.writeFileSync(`${OUT}/shots/chips-${file}.png`, chips);
    }
    return probe;
  });
  out.sidebar[id] = await withPage(env, async (page) => {
    await open(page, "/docs/components/direction-provider", { ...env, ready: "main" });
    const probe = await page.evaluate(SIDEBAR_PROBE);
    if (OUT) {
      fs.writeFileSync(
        `${OUT}/shots/sidebar-${file}.png`,
        await page.screenshot({ clip: { x: 0, y: 0, width: env.width ?? 1280, height: 1000 } }),
      );
    }
    return probe;
  });
}

/**
 * Each chip's filter, exercised. A count printed on a chip is a claim about what pressing it does, and the
 * two used to come from different maps — so the number and the result are measured separately here.
 */
out.chipFilters = await withPage({ width: 1280 }, async (page) => {
  const rows = {};
  for (const cat of EXPECTED) {
    await open(page, `/components?cat=${encodeURIComponent(cat)}`, {});
    rows[cat] = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("[data-gallery-card]")];
      const pills = new Set(
        cards.map((c) => c.querySelector("[data-gallery-category]")?.textContent?.trim()),
      );
      return { cards: cards.length, pills: [...pills] };
    });
  }
  return rows;
});

if (OUT) fs.writeFileSync(`${OUT}/catalogue-taxonomy-evidence.json`, JSON.stringify(out, null, 1));
await browser.close();

/* ── report ─────────────────────────────────────────────────────────────── */
const base = out.gallery["1280/light"];
console.log(`cards ${base.cards.length}; expected categories ${EXPECTED.length}`);

console.log("\npills, per environment");
console.log("env".padEnd(14) + "cards  from category slot  distinct values  unexpected");
for (const [id, g] of Object.entries(out.gallery)) {
  const fromSlot = g.cards.filter((c) => c.fromCategorySlot).length;
  const distinct = [...new Set(g.cards.map((c) => c.pill))].filter(Boolean);
  const bad = distinct.filter((v) => !EXPECTED.includes(v));
  console.log(
    id.padEnd(14) +
      String(g.cards.length).padEnd(7) +
      `${fromSlot}/${g.cards.length}`.padEnd(20) +
      String(distinct.length).padEnd(17) +
      (bad.length ? bad.join(", ") : "none"),
  );
}

console.log("\ncategory chips (1280/light), count printed vs cards the filter yields");
console.log("category".padEnd(22) + "chip".padEnd(28) + "filtered cards  other pills");
for (const cat of EXPECTED) {
  const chip = base.chips.find((c) => c?.startsWith(cat)) ?? "—";
  const f = out.chipFilters[cat];
  const others = f.pills.filter((p) => p !== cat);
  console.log(
    cat.padEnd(22) + chip.padEnd(28) + String(f.cards).padEnd(16) + (others.length ? others.join(", ") : "none"),
  );
}

console.log("\npage overflow (scrollWidth vs clientWidth) and sidebar groups");
console.log("env".padEnd(14) + "gallery".padEnd(18) + "sidebar".padEnd(18) + "sidebar has all 8");
for (const id of Object.keys(ENVS)) {
  const g = out.gallery[id];
  const s = out.sidebar[id];
  const fmt = (p) => `${p.scrollWidth}/${p.clientWidth}${p.scrollWidth > p.clientWidth ? " OVERFLOW" : ""}`;
  const all = EXPECTED.every((c) => s.groups.includes(c));
  console.log(id.padEnd(14) + fmt(g).padEnd(18) + fmt(s).padEnd(18) + (all ? "yes" : `no (${EXPECTED.filter((c) => !s.groups.includes(c)).join(", ")})`));
}

console.log("\nresults-list group headings (1280/light)");
console.log(base.headings.filter((h) => EXPECTED.includes(h)).join(" · ") || "none found");
