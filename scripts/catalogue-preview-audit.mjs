/**
 * catalogue-preview-audit.mjs — what the catalogue's previews actually render, measured in Chromium.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3000)
 *   PLAYWRIGHT_CHROMIUM_PATH=… node scripts/catalogue-preview-audit.mjs [--base http://127.0.0.1:3000]
 *
 * This is the measuring instrument behind the CAT-1 audit (`docs/audits/CAT-1-CATALOGUE-AUDIT.md`), not a
 * gate: it prints numbers and writes JSON, and asserts nothing. CAT-6 is where the rows that matter become
 * thresholds with negative controls, because a threshold needs an agreed number and CAT-1 is where the
 * numbers come from.
 *
 * Three things it is careful about, because each one produced a wrong answer first:
 *
 *  - Clipping is measured against the nearest clipping ancestor, not the thumbnail frame. A virtualised
 *    list's spacer is 259,000px tall inside its own scroll container; counting that as "clipped by the
 *    card" turned a 9px overflow into a six-figure one.
 *  - RTL is applied AFTER hydration. `<html dir>` set before it is overwritten by the root layout's own
 *    render, so a pre-hydration script silently measures LTR twice (`use-document-direction.ts` watches
 *    the attribute, which is why setting it later works).
 *  - Ink is the share of pixels in a screenshot that differ from the frame's most common colour. It counts
 *    the dot-grid background and the slug chip, so it is a number to compare between cards, not an
 *    absolute.
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
const SHOTS = OUT ? `${OUT}/shots/` : "";
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const VIEWPORTS = [320, 390, 768, 1280];
/** The detail pages the owner's reports and the state audit point at. */
const DETAIL = [
  "toggle", "switch", "input", "password-input", "number-input", "label", "button",
  "dialog", "alert-dialog", "data-grid", "data-table", "chart", "footer",
  "message-bubble", "price-breakdown", "pass-card", "amount-display", "kanban-board", "address-fields", "form",
];
/** Thumbnail pairs worth asking whether they are the same picture. */
const PAIRS = [
  ["dialog", "alert-dialog"], ["dialog", "modal"], ["dropdown-menu", "context-menu"],
  ["popover", "hover-card"], ["table", "data-table"], ["sheet", "drawer"], ["alert", "banner"],
];

const ink = (png) => {
  const { w, h, data } = decode(png);
  const counts = new Map();
  for (let i = 0; i < w * h; i++) {
    const k = `${data[i * 4]},${data[i * 4 + 1]},${data[i * 4 + 2]}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const bg = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
  let n = 0;
  for (let i = 0; i < w * h; i++)
    if (Math.abs(data[i * 4] - bg[0]) > 12 || Math.abs(data[i * 4 + 1] - bg[1]) > 12 || Math.abs(data[i * 4 + 2] - bg[2]) > 12) n++;
  return n / (w * h);
};

const diffRatio = (a, b) => {
  const A = decode(a), B = decode(b);
  if (A.w !== B.w || A.h !== B.h) return { error: "size mismatch" };
  let n = 0;
  for (let i = 0; i < A.w * A.h; i++) {
    const d = Math.abs(A.data[i * 4] - B.data[i * 4]) + Math.abs(A.data[i * 4 + 1] - B.data[i * 4 + 1]) + Math.abs(A.data[i * 4 + 2] - B.data[i * 4 + 2]);
    if (d > 24) n++;
  }
  return { ratio: n / (A.w * A.h) };
};

/** Every gallery card: thumbnail kind, real clipping, fill, smallest rendered text. */
const CARD_PROBE = () => {
  const clips = (el, stop) => {
    for (let p = el.parentElement; p && p !== stop; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/auto|scroll|hidden/.test(cs.overflowY) || /auto|scroll|hidden/.test(cs.overflowX)) return true;
    }
    return false;
  };
  const rows = [];
  for (const card of document.querySelectorAll("[data-gallery-card]")) {
    const slug = card.getAttribute("data-gallery-card");
    const frame = card.querySelector("[data-gallery-thumbnail]");
    if (!frame) continue;
    const body = frame.querySelector("[data-gallery-thumbnail-body]");
    const fr = frame.getBoundingClientRect();
    let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity, nodes = 0, minFont = null, worst = null;
    if (body) {
      for (const el of body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        // content inside a scroll container of its own is scrollable, not clipped by the card
        if (clips(el, frame)) continue;
        nodes++;
        top = Math.min(top, r.top); left = Math.min(left, r.left);
        right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
        const over = Math.max(fr.top - r.top, r.bottom - fr.bottom, fr.left - r.left, r.right - fr.right);
        if (over > 2 && (!worst || over > worst.over))
          worst = { over: Math.round(over), tag: el.tagName.toLowerCase(), text: (el.textContent || "").trim().slice(0, 40) };
        const t = el.textContent?.trim();
        if (t && el.children.length === 0) {
          const size = parseFloat(getComputedStyle(el).fontSize);
          const scale = el.offsetHeight ? r.height / el.offsetHeight : 1;
          const eff = size * scale;
          if (minFont === null || eff < minFont) minFont = eff;
        }
      }
    }
    const has = nodes > 0;
    rows.push({
      slug,
      kind: frame.getAttribute("data-gallery-thumbnail"),
      frame: { width: Math.round(fr.width), height: Math.round(fr.height) },
      nodes, minFont,
      clip: has ? {
        top: Math.round(Math.max(0, fr.top - top)), bottom: Math.round(Math.max(0, bottom - fr.bottom)),
        start: Math.round(Math.max(0, fr.left - left)), end: Math.round(Math.max(0, right - fr.right)),
      } : null,
      worst,
      fillRatio: has ? ((bottom - top) * (right - left)) / (fr.width * fr.height) : 0,
      meta: card.querySelector("[data-gallery-primitive]")?.textContent?.trim() ?? null,
    });
  }
  return {
    dir: document.documentElement.getAttribute("dir"),
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rows,
  };
};

/** A component detail page's preview panel: the stage's empty space, and each region's inset. */
const DETAIL_PROBE = () => {
  const panel = document.querySelector("[data-cp]");
  if (!panel) return { missing: true };
  const pr = panel.getBoundingClientRect();
  const seg = panel.querySelector('[role="radiogroup"]');
  const toolbar = seg?.parentElement ?? null;
  const stage = panel.querySelector("[data-preview-stage]");
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return {
      top: +(r.top - pr.top).toFixed(1), start: +(r.left - pr.left).toFixed(1), end: +(pr.right - r.right).toFixed(1),
      width: Math.round(r.width), height: Math.round(r.height),
      paddingTop: cs.paddingTop, paddingLeft: cs.paddingLeft, radius: cs.borderRadius,
    };
  };
  let demo = null;
  if (stage) {
    let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity, n = 0;
    for (const el of stage.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let clipped = false;
      for (let p = el.parentElement; p && p !== stage; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (/auto|scroll|hidden/.test(cs.overflowY) || /auto|scroll|hidden/.test(cs.overflowX)) { clipped = true; break; }
      }
      if (clipped) continue;
      n++;
      top = Math.min(top, r.top); left = Math.min(left, r.left); right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
    }
    if (n) demo = { width: Math.round(right - left), height: Math.round(bottom - top), nodes: n };
  }
  const sr = stage?.getBoundingClientRect() ?? null;
  return {
    panel: { width: Math.round(pr.width), radius: getComputedStyle(panel).borderRadius },
    previewCodeControl: box(seg),
    environmentToolbar: box(toolbar),
    stage: box(stage),
    demo,
    emptyRatio: sr && demo ? 1 - (demo.width * demo.height) / (sr.width * sr.height) : null,
    verticalSlack: sr && demo ? Math.round(sr.height - demo.height) : null,
    htmlDir: document.documentElement.getAttribute("dir"),
    stageDir: stage?.getAttribute("dir") ?? null,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};

/** Every block showcase on /blocks: its stage, the block's own box, and the empty space between them. */
const BLOCKS_PROBE = () => {
  const rows = [];
  for (const sec of document.querySelectorAll("[id]")) {
    const stage = [...sec.querySelectorAll("div")].find((d) => parseFloat(getComputedStyle(d).minHeight) >= 200);
    if (!stage) continue;
    const sr = stage.getBoundingClientRect();
    let top = Infinity, left = Infinity, right = -Infinity, bottom = -Infinity, n = 0;
    for (const el of stage.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      n++;
      top = Math.min(top, r.top); left = Math.min(left, r.left); right = Math.max(right, r.right); bottom = Math.max(bottom, r.bottom);
    }
    if (!n) continue;
    rows.push({
      slug: sec.id,
      stage: { width: Math.round(sr.width), height: Math.round(sr.height), minHeight: parseFloat(getComputedStyle(stage).minHeight), padding: getComputedStyle(stage).padding },
      content: { width: Math.round(right - left), height: Math.round(bottom - top) },
      emptyRatio: 1 - ((bottom - top) * (right - left)) / (sr.width * sr.height),
      clipTop: Math.round(Math.max(0, sr.top - top)), clipBottom: Math.round(Math.max(0, bottom - sr.bottom)),
    });
  }
  return {
    status: document.querySelector("[data-blocks-status]")?.textContent?.trim() ?? null,
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    rows,
  };
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const result = { base: BASE, takenAt: new Date().toISOString(), cards: {}, detail: {}, blocks: {}, pairs: {} };

async function withPage(opts, fn) {
  const ctx = await browser.newContext({
    viewport: { width: opts.width ?? 1280, height: opts.height ?? 1000 },
    deviceScaleFactor: 1,
    colorScheme: opts.dark ? "dark" : "light",
    reducedMotion: opts.reduced ? "reduce" : "no-preference",
    forcedColors: opts.forced ? "active" : "none",
  });
  const page = await ctx.newPage();
  if (opts.dark) await page.addInitScript(() => document.documentElement.classList.add("dark"));
  try { return await fn(page); } finally { await ctx.close(); }
}

/** Load, apply the post-hydration environment, mount every lazy card, settle. */
async function open(page, path, opts) {
  if (opts.text) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Page.enable");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 32, fixed: 26 } });
  }
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-gallery-card], [data-cp], [data-blocks-status]", { timeout: 30000 });
  if (opts.rtl) {
    // after hydration: the root layout renders dir="ltr", and use-document-direction watches the attribute
    await page.evaluate(() => { document.documentElement.setAttribute("dir", "rtl"); document.documentElement.setAttribute("lang", "ar"); });
    await page.waitForTimeout(400);
  }
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
}

const ENVS = { light: {}, dark: { dark: true }, rtl: { rtl: true }, text200: { text: true }, "forced-colors": { forced: true }, "reduced-motion": { reduced: true } };

for (const width of VIEWPORTS) {
  for (const [id, env] of Object.entries(ENVS)) {
    if (width !== 1280 && (id === "forced-colors" || id === "reduced-motion")) continue;
    result.cards[`${width}/${id}`] = await withPage({ width, ...env }, async (page) => {
      await open(page, "/components", env);
      return page.evaluate(CARD_PROBE);
    });
  }
}

if (SHOTS) {
  await withPage({ width: 1280 }, async (page) => {
    await open(page, "/components", {});
    for (const row of result.cards["1280/light"].rows) {
      try {
        const png = await page.locator(`[data-gallery-card="${row.slug}"] [data-gallery-thumbnail]`).screenshot();
        fs.writeFileSync(`${SHOTS}${row.slug}.png`, png);
        row.ink = ink(png);
      } catch (e) { row.shotError = String(e).slice(0, 140); }
    }
  });
  for (const [x, y] of PAIRS) {
    try { result.pairs[`${x} vs ${y}`] = diffRatio(fs.readFileSync(`${SHOTS}${x}.png`), fs.readFileSync(`${SHOTS}${y}.png`)); }
    catch (e) { result.pairs[`${x} vs ${y}`] = { error: String(e).slice(0, 100) }; }
  }
}

const DETAIL_ENVS = { "1280/light": { width: 1280 }, "1280/rtl": { width: 1280, rtl: true }, "1280/forced-colors": { width: 1280, forced: true }, "390/light": { width: 390 }, "390/text200": { width: 390, text: true }, "320/light": { width: 320 } };
for (const slug of DETAIL) {
  result.detail[slug] = {};
  for (const [id, opts] of Object.entries(DETAIL_ENVS))
    result.detail[slug][id] = await withPage(opts, async (page) => {
      await open(page, `/docs/components/${slug}`, opts);
      return page.evaluate(DETAIL_PROBE);
    });
}

for (const [id, opts] of Object.entries({ "1280/light": { width: 1280 }, "1280/rtl": { width: 1280, rtl: true }, "390/light": { width: 390 } }))
  result.blocks[id] = await withPage(opts, async (page) => {
    await open(page, "/blocks", opts);
    return page.evaluate(BLOCKS_PROBE);
  });

if (OUT) fs.writeFileSync(`${OUT}/catalogue-preview-audit.json`, JSON.stringify(result, null, 1));

/* ── report ─────────────────────────────────────────────────────────────── */
const base = result.cards["1280/light"].rows;
const n = (v, d = 0) => (v == null ? "–" : v.toFixed(d));
const pct = (v, d = 0) => (v == null ? "–" : `${(v * 100).toFixed(d)}%`);
console.log(`cards ${base.length}  kinds ${JSON.stringify(base.reduce((a, r) => ((a[r.kind] = (a[r.kind] ?? 0) + 1), a), {}))}`);
const inks = base.filter((r) => r.ink != null).map((r) => r.ink).sort((a, b) => a - b);
if (inks.length) console.log(`ink: min ${pct(inks[0], 2)} median ${pct(inks[Math.floor(inks.length / 2)], 2)} max ${pct(inks.at(-1), 2)}`);

console.log("\n— real clipping by the 184px frame (1280 light) —");
for (const r of base.filter((r) => r.clip && Math.max(r.clip.top, r.clip.bottom, r.clip.start, r.clip.end) > 2).sort((a, b) => Math.max(b.clip.top, b.clip.bottom, b.clip.start, b.clip.end) - Math.max(a.clip.top, a.clip.bottom, a.clip.start, a.clip.end)))
  console.log(`  ${r.slug.padEnd(18)} ${r.kind.padEnd(5)} top ${String(r.clip.top).padStart(4)} bottom ${String(r.clip.bottom).padStart(4)} start ${String(r.clip.start).padStart(4)} end ${String(r.clip.end).padStart(4)}  fill ${pct(r.fillRatio)}  ${r.worst ? `<${r.worst.tag}> "${r.worst.text}"` : ""}`);

console.log("\n— least ink, and how much of the frame the content covers —");
for (const r of base.filter((r) => r.ink != null).sort((a, b) => a.ink - b.ink).slice(0, 15))
  console.log(`  ${r.slug.padEnd(18)} ${r.kind.padEnd(5)} ink ${pct(r.ink, 2).padStart(6)}  fill ${pct(r.fillRatio).padStart(5)}  smallest text ${n(r.minFont, 1)}px`);

console.log("\n— thumbnails that are nearly the same picture —");
for (const [k, v] of Object.entries(result.pairs)) console.log(`  ${k.padEnd(32)} ${v.ratio != null ? pct(v.ratio, 2) + " of pixels differ" : v.error}`);

console.log("\n— /components page overflow and clipping per environment —");
for (const [k, v] of Object.entries(result.cards)) {
  const bad = v.rows.filter((r) => r.clip && Math.max(r.clip.top, r.clip.bottom, r.clip.start, r.clip.end) > 2);
  console.log(`  ${k.padEnd(20)} dir=${v.dir ?? "ltr"} overflow=${v.pageOverflow}px clipped=${bad.length}/${v.rows.length}`);
}

console.log("\n— detail preview panel —");
console.log("  slug              env                stage      demo       empty slack  preview/code inset  stage padding");
for (const [slug, envs] of Object.entries(result.detail))
  for (const [env, d] of Object.entries(envs)) {
    if (d.missing || !d.stage) { console.log(`  ${slug.padEnd(17)} ${env.padEnd(18)} (no panel)`); continue; }
    const c = d.previewCodeControl;
    console.log(`  ${slug.padEnd(17)} ${env.padEnd(18)} ${`${d.stage.width}x${d.stage.height}`.padEnd(10)} ${(d.demo ? `${d.demo.width}x${d.demo.height}` : "–").padEnd(10)} ${pct(d.emptyRatio).padStart(5)} ${String(d.verticalSlack).padStart(6)}  top ${n(c?.top, 1)} start ${n(c?.start, 1)}`.padEnd(104) + `${d.stage.paddingLeft}` + (d.pageOverflow > 0 ? `  OVERFLOW ${d.pageOverflow}px` : ""));
  }

console.log("\n— /blocks showcases —");
for (const [env, b] of Object.entries(result.blocks)) {
  console.log(`  ${env}: ${b.status} · page overflow ${b.pageOverflow}px`);
  for (const r of b.rows.sort((x, y) => y.emptyRatio - x.emptyRatio).slice(0, 6))
    console.log(`     ${r.slug.padEnd(22)} stage ${r.stage.width}x${r.stage.height} content ${r.content.width}x${r.content.height} empty ${pct(r.emptyRatio)} clip ${r.clipTop}/${r.clipBottom}`);
}
await browser.close();
