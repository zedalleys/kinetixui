/**
 * catalogue-thumbnails.mjs — the /components catalogue's thumbnail framing, asserted at 200% text.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3000)
 *   PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium node scripts/catalogue-thumbnails.mjs
 *   …--self-test     also runs the negative controls and asserts the gate FAILS under each
 *
 * Why this exists, when `check:web-quality` already looks at these thumbnails: that check asserts the
 * thumbnails' SEMANTICS (a body exists, it is aria-hidden, live demos are inert, mocks carry no focusable
 * and no heading) plus the INLINE overflow of `mock` thumbnails, at 1280px and 100% text. Vertical framing,
 * every live `demo`, and every text scale above 100% are outside it by construction — which is how 49 of
 * 109 thumbnails came to cut their first line of text at 200% text with a green board (CAT-BUG-017/018).
 *
 * WHAT IT ASSERTS, and why each one is the narrowest truthful claim:
 *
 *  1. Population. The number of cards it measured equals `data-gallery-total`, the catalogue's own size,
 *     derived from the registry on a different code path from this render. A thumbnail gate that passes
 *     because nothing rendered is worthless, so absence fails: both kinds (`mock` and `demo`) must be
 *     present, and every non-`label` frame must have a body.
 *
 *  2. Reading-edge clipping. No painted descendant of a thumbnail body may escape the frame's TOP edge or
 *     its INLINE-START edge. These are the edges where reading begins; content cut there is content the
 *     reader never knows was in the frame, and at 200% text it was the demo's own first line.
 *
 *  3. The slug chip never prints over preview text. The chip is opaque (`bg-background`), so a glyph under
 *     it is hidden, not merely crowded.
 *
 *  4. No horizontal overflow of the document.
 *
 * WHAT IT DELIBERATELY DOES NOT ASSERT. Trailing-edge overflow — the frame's bottom and inline-end — is the
 * thumbnail's CROP, not a defect: a 1386px-tall description list cannot be shown whole in a card, at any
 * text scale, and `overflow-hidden` on the frame is how the catalogue has always cropped it. Capping it
 * would need an agreed number that no measurement supports, so the gate REPORTS the distribution and
 * asserts only that every frame carries the bottom fade that tells the reader the preview continues.
 *
 * Clipping is measured against the nearest clipping ancestor, not the frame: a mock with its own
 * `overflow-hidden` panel (sheet, drawer) or a virtualised list's 259,000px spacer is scrollable or clipped
 * on its own terms, and counting that against the card turns a 9px overflow into a six-figure one.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(`--${k}`);
const BASE = arg("base", "http://127.0.0.1:3000");
const OUT = arg("out", "");
const SELF_TEST = has("self-test");
/** A rect may escape by this much before it counts: sub-pixel layout and a 1px border are not clipping. */
const TOL = 2;

/**
 * The one bounded exception, and what keeps it honest.
 *
 * `Carousel` places its Previous control OUTBOARD of the track (`-left-12`, so 3rem clear of it) and the
 * audio player does the same with its transport — see `packages/ui/src/components/carousel.tsx`. That is
 * the components' own design, shared with their documentation pages, so a thumbnail gate is the wrong
 * place to change it: containing a 3rem outboard control would cost every one of the 109 previews 6rem of
 * inline room. At the two catalogue column widths where the preview is wide enough to start-align, the
 * edge of that control lands a few pixels outside the frame.
 *
 * The entry is narrow on purpose and cannot rot:
 *  - an overflow larger than `maxPx` fails, so the register is a ceiling and not a blanket;
 *  - an entry that never overflows in ANY measured environment ALSO fails, so a fixed defect forces the
 *    register to shrink rather than sitting there asserting nothing.
 */
const OUTBOARD_CONTROLS = [
  { slug: "carousel", edge: "start", maxPx: 12, why: "CarouselPrevious is -left-12 of the track" },
  { slug: "audio-player", edge: "start", maxPx: 18, why: "the transport control is outboard of the player" },
];
const registered = (slug, edge) => OUTBOARD_CONTROLS.find((e) => e.slug === slug && e.edge === edge);
/** Which registered entries were actually seen to overflow, so a stale entry can be reported. */
const registerSeen = new Set();

const failures = [];
const fail = (m) => { failures.push(m); console.log(`  FAIL ${m}`); };

/* ── the measurement ──────────────────────────────────────────────────────────────────────── */

const PROBE = (tol) => {
  const clippedByAncestor = (el, stop) => {
    for (let p = el.parentElement; p && p !== stop; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/auto|scroll|hidden/.test(cs.overflowY) || /auto|scroll|hidden/.test(cs.overflowX)) return true;
    }
    return false;
  };
  const rows = [];
  const kinds = {};
  for (const card of document.querySelectorAll("[data-gallery-card]")) {
    const slug = card.getAttribute("data-gallery-card");
    const frame = card.querySelector("[data-gallery-thumbnail]");
    if (!frame) { rows.push({ slug, kind: null, noFrame: true }); continue; }
    const kind = frame.getAttribute("data-gallery-thumbnail");
    kinds[kind] = (kinds[kind] ?? 0) + 1;
    const body = frame.querySelector("[data-gallery-thumbnail-body]");
    const fr = frame.getBoundingClientRect();
    const rtl = getComputedStyle(frame).direction === "rtl";
    // The fade that signals the crop: a frame-level overlay pinned to the bottom edge.
    const fade = [...frame.children].some((el) => {
      const cs = getComputedStyle(el);
      return cs.position === "absolute" && /gradient/.test(cs.backgroundImage) && parseFloat(cs.bottom) === 0;
    });
    // The slug chip: a DIRECT child span of the frame whose text is the slug. A descendant selector
    // matched spans inside the mocks instead, which reported collisions no gutter could ever clear.
    const chip = [...frame.children].find(
      (el) => el.tagName === "SPAN" && el.getAttribute("aria-hidden") !== null && el.textContent?.trim() === slug,
    );
    const chipRect = chip ? chip.getBoundingClientRect() : null;

    const row = {
      slug, kind, hasBody: !!body, fade,
      frame: { width: Math.round(fr.width), height: Math.round(fr.height) },
      overTop: 0, overStart: 0, overBottom: 0, overEnd: 0,
      topOffender: null, startOffender: null, chipOffender: null, nodes: 0,
    };
    if (body) {
      for (const el of body.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (clippedByAncestor(el, frame)) continue;
        row.nodes++;
        const isTextLeaf = el.children.length === 0 && !!el.textContent?.trim();
        const text = (el.textContent || "").trim().slice(0, 48);
        // Inline edges, resolved against the frame's own direction, so a correctly mirrored RTL
        // thumbnail is not reported as overflowing its start edge.
        const overStart = rtl ? r.right - fr.right : fr.left - r.left;
        const overEnd = rtl ? fr.left - r.left : r.right - fr.right;
        const overTop = fr.top - r.top;
        const overBottom = r.bottom - fr.bottom;
        if (overTop > row.overTop) { row.overTop = overTop; row.topOffender = { tag: el.tagName.toLowerCase(), text, isTextLeaf }; }
        if (overStart > row.overStart) { row.overStart = overStart; row.startOffender = { tag: el.tagName.toLowerCase(), text, isTextLeaf }; }
        row.overBottom = Math.max(row.overBottom, overBottom);
        row.overEnd = Math.max(row.overEnd, overEnd);
        if (chipRect && isTextLeaf) {
          const ox = Math.min(r.right, chipRect.right) - Math.max(r.left, chipRect.left);
          const oy = Math.min(r.bottom, chipRect.bottom) - Math.max(r.top, chipRect.top);
          if (ox > tol && oy > tol && !row.chipOffender) row.chipOffender = { text, area: Math.round(ox * oy) };
        }
      }
    }
    for (const k of ["overTop", "overStart", "overBottom", "overEnd"]) row[k] = Math.round(Math.max(0, row[k]));
    rows.push(row);
  }
  const host = document.querySelector("[data-gallery-total]");
  return {
    declaredTotal: host ? Number(host.getAttribute("data-gallery-total")) : null,
    dir: getComputedStyle(document.documentElement).direction,
    rootFontSize: parseFloat(getComputedStyle(document.documentElement).fontSize),
    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    kinds, rows,
  };
};

/* ── driving the browser ──────────────────────────────────────────────────────────────────── */

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });

/**
 * `mutate` is the negative-control hook: a string of CSS, or a function, applied AFTER the page has
 * settled and never committed to the repository.
 */
async function measure({ width, text, dark, rtl }, mutate) {
  const ctx = await browser.newContext({
    viewport: { width, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: dark ? "dark" : "light",
    reducedMotion: "reduce",
  });
  const page = await ctx.newPage();
  if (dark) await page.addInitScript(() => document.documentElement.classList.add("dark"));
  if (text !== 100) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Page.enable");
    // Chromium's own font-size setting, which is what a reader raising text to 200% in the browser
    // actually changes. A CSS `font-size` on :root would be overridden by the page's own type scale.
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: Math.round(16 * text / 100), fixed: Math.round(13 * text / 100) } });
  }
  await page.goto(`${BASE}/components`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-gallery-card]", { timeout: 30000 });
  if (rtl) {
    // after hydration: the root layout renders dir="ltr", and use-document-direction watches the attribute
    await page.evaluate(() => { document.documentElement.setAttribute("dir", "rtl"); document.documentElement.setAttribute("lang", "ar"); });
    await page.waitForTimeout(400);
  }
  // Mount every lazy card, then settle: a card measured before its demo mounts has nothing in it.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
  if (typeof mutate === "string") await page.addStyleTag({ content: mutate });
  else if (typeof mutate === "function") await page.evaluate(mutate);
  if (mutate) await page.waitForTimeout(300);
  const out = await page.evaluate(PROBE, TOL);
  await ctx.close();
  return out;
}

/** Everything the contract above asserts, over one measured environment. Returns the failure strings. */
function verdict(id, v) {
  const bad = [];
  const say = (m) => bad.push(`${id}: ${m}`);
  const measured = v.rows.length;

  if (measured === 0) say("no [data-gallery-card] found — the gate is measuring nothing");
  if (v.declaredTotal === null) say("no [data-gallery-total] on the page — the population cannot be checked");
  else if (measured !== v.declaredTotal) say(`measured ${measured} cards but the catalogue declares ${v.declaredTotal}`);
  if (!v.kinds.mock || !v.kinds.demo) say(`expected both static mocks and live demos, got ${JSON.stringify(v.kinds)}`);

  for (const r of v.rows) {
    if (r.noFrame) { say(`${r.slug}: card has no thumbnail frame`); continue; }
    if (r.kind !== "label" && !r.hasBody) { say(`${r.slug}: ${r.kind} thumbnail has no body`); continue; }
    if (r.kind === "label") continue;
    if (r.nodes === 0) { say(`${r.slug}: ${r.kind} thumbnail body renders nothing measurable`); continue; }
    if (!r.fade) say(`${r.slug}: thumbnail has no bottom fade, so its crop is a hard cut with no affordance`);
    if (r.overTop > TOL)
      say(`${r.slug}: ${r.overTop}px cut off the TOP of the frame by <${r.topOffender.tag}>${r.topOffender.isTextLeaf ? ` text "${r.topOffender.text}"` : ""} — the preview's first line is above the frame`);
    if (r.overStart > TOL) {
      const ex = registered(r.slug, "start");
      if (ex) {
        registerSeen.add(`${r.slug}/start`);
        if (r.overStart > ex.maxPx)
          say(`${r.slug}: ${r.overStart}px cut off the INLINE-START of the frame, over the ${ex.maxPx}px registered for its outboard control (${ex.why})`);
      } else {
        say(`${r.slug}: ${r.overStart}px cut off the INLINE-START of the frame by <${r.startOffender.tag}>${r.startOffender.isTextLeaf ? ` text "${r.startOffender.text}"` : ""}`);
      }
    }
    if (r.chipOffender)
      say(`${r.slug}: the slug chip prints over preview text "${r.chipOffender.text}" (${r.chipOffender.area}px² hidden behind an opaque chip)`);
  }
  if (v.pageOverflow > 0) say(`the page scrolls sideways by ${v.pageOverflow}px`);
  return bad;
}

const ENVS = [
  { id: "320/text100", width: 320, text: 100 },
  { id: "320/text200", width: 320, text: 200 },
  { id: "390/text100", width: 390, text: 100 },
  { id: "390/text200", width: 390, text: 200 },
  { id: "768/text200", width: 768, text: 200 },
  { id: "1024/text200", width: 1024, text: 200 },
  { id: "1280/text100", width: 1280, text: 100 },
  { id: "1280/text200", width: 1280, text: 200 },
  { id: "1280/text200/dark", width: 1280, text: 200, dark: true },
  { id: "1280/text200/rtl", width: 1280, text: 200, rtl: true },
  { id: "390/text200/rtl", width: 390, text: 200, rtl: true },
];

const report = { base: BASE, takenAt: new Date().toISOString(), tolerancePx: TOL, envs: {}, controls: {} };

console.log(`catalogue-thumbnails — ${BASE}\n`);
for (const env of ENVS) {
  const v = await measure(env);
  const bad = verdict(env.id, v);
  const crops = v.rows.filter((r) => r.overBottom > TOL || r.overEnd > TOL);
  report.envs[env.id] = {
    cards: v.rows.length, declaredTotal: v.declaredTotal, kinds: v.kinds, dir: v.dir,
    rootFontSize: v.rootFontSize, pageOverflow: v.pageOverflow, failures: bad.length,
    cropped: crops.length,
    worstCrop: crops.length ? Math.max(...crops.map((r) => Math.max(r.overBottom, r.overEnd))) : 0,
    rows: v.rows,
  };
  const e = report.envs[env.id];
  console.log(`${env.id.padEnd(20)} ${String(e.cards).padStart(3)}/${e.declaredTotal} cards  dir=${e.dir}  root=${e.rootFontSize}px  overflow=${e.pageOverflow}px  trailing-crop=${e.cropped} (worst ${e.worstCrop}px)  ${bad.length ? `${bad.length} FAILURES` : "clean"}`);
  for (const m of bad) fail(m);
}

/* ── negative controls ────────────────────────────────────────────────────────────────────── */
/**
 * Each control restores a condition the fix removed, or removes the content the gate measures, and the
 * gate must FAIL on it. Nothing here is ever committed: the mutations are injected at runtime into a
 * throwaway browser context. A control that does not fail means the assertion it targets is decorative.
 */
const CONTROLS = [
  {
    id: "NC1-pixel-frame-and-plain-centring",
    why: "the defect itself: a 184px frame with a centred body, which is what main shipped",
    env: { id: "1280/text200", width: 1280, text: 200 },
    mutate: `[data-gallery-thumbnail]{height:184px !important}
             [data-gallery-thumbnail-body]{align-items:center !important;justify-content:center !important;padding:1rem !important}`,
    expect: /cut off the TOP of the frame/,
  },
  {
    id: "NC2-no-chip-gutter",
    why: "the chip gutter removed, leaving overflowing previews to start under the opaque slug chip",
    env: { id: "1280/text200", width: 1280, text: 200 },
    mutate: `[data-gallery-thumbnail]{--thumb-gutter:0rem !important}`,
    expect: /the slug chip prints over preview text/,
  },
  {
    id: "NC3-no-thumbnails-rendered",
    why: "a thumbnail gate that passes when no thumbnail renders is invalid — absence must fail",
    env: { id: "1280/text100", width: 1280, text: 100 },
    mutate: () => document.querySelectorAll("[data-gallery-thumbnail-body]").forEach((el) => el.remove()),
    expect: /has no body|renders nothing measurable/,
  },
  {
    id: "NC4-population-shrunk",
    why: "a gallery that silently renders a subset must fail the population assertion",
    env: { id: "1280/text100", width: 1280, text: 100 },
    mutate: () => [...document.querySelectorAll("[data-gallery-card]")].slice(20).forEach((el) => el.remove()),
    expect: /measured \d+ cards but the catalogue declares/,
  },
  {
    id: "NC7-register-ceiling-exceeded",
    why: "the registered outboard-control ceiling is a ceiling, not a blanket exemption",
    env: { id: "1280/text200", width: 1280, text: 200 },
    // push the carousel's own outboard control far past its registered 12px
    mutate: `[data-gallery-card="carousel"] [data-gallery-thumbnail-body] button{margin-inline-start:-120px !important}`,
    expect: /over the 12px registered for its outboard control/,
  },
  {
    id: "NC5-sideways-scroll",
    why: "the document overflow assertion",
    env: { id: "1280/text200", width: 1280, text: 200 },
    mutate: () => { const d = document.createElement("div"); d.style.cssText = "width:3000px;height:4px"; document.body.appendChild(d); },
    expect: /scrolls sideways/,
  },
  {
    id: "NC6-fade-removed",
    why: "the crop affordance assertion — without the fade the crop is a hard cut",
    env: { id: "1280/text200", width: 1280, text: 200 },
    mutate: `[data-gallery-thumbnail] > div[class*="bg-gradient-to-t"]{background-image:none !important}`,
    expect: /has no bottom fade/,
  },
];

for (const e of OUTBOARD_CONTROLS)
  if (!registerSeen.has(`${e.slug}/${e.edge}`))
    fail(`the register entry for ${e.slug} (${e.edge} edge, ${e.maxPx}px, "${e.why}") never overflowed in any measured environment — remove it rather than leave an exception asserting nothing`);

if (SELF_TEST) {
  console.log("\n— negative controls (the gate must fail on each) —");
  for (const c of CONTROLS) {
    const v = await measure(c.env, c.mutate);
    const bad = verdict(c.env.id, v);
    const matched = bad.filter((m) => c.expect.test(m));
    report.controls[c.id] = { why: c.why, failures: bad.length, matched: matched.length, sample: matched[0] ?? bad[0] ?? null };
    const ok = matched.length > 0;
    console.log(`  ${ok ? "detected" : "NOT DETECTED"}  ${c.id.padEnd(36)} ${matched.length} matching failure(s)${ok ? `  e.g. ${matched[0].slice(0, 110)}` : ""}`);
    if (!ok) fail(`negative control ${c.id} did not fail the gate — the assertion it targets (${c.why}) is not actually enforced`);
  }
  // And the control must be reversible: the same environment, unmutated, is clean.
  const after = verdict("1280/text200", await measure({ width: 1280, text: 200 }));
  console.log(`  ${after.length ? "NOT CLEAN" : "clean"}     restored, unmutated  ${after.length} failure(s)`);
  for (const m of after) fail(`after the controls, the unmutated page is not clean: ${m}`);
}

if (OUT) { fs.mkdirSync(OUT.replace(/\/[^/]+$/, ""), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(report, null, 1)); }
await browser.close();

console.log(`\n${failures.length ? `catalogue-thumbnails FAILED — ${failures.length} failure(s)` : "catalogue-thumbnails passed"}`);
process.exit(failures.length ? 1 : 0);
