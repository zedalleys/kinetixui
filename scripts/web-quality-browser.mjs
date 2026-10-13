/**
 * web-quality-browser.mjs — rendered proof for the website's compact type, contrast, touch targets and gallery
 * thumbnails.
 *
 *   pnpm build:web && pnpm --filter @kinetixui/web start &
 *   node scripts/web-quality-browser.mjs [--base http://127.0.0.1:3000] [--only type,contrast,touch,thumbs,layout] [--json]
 *
 * `check:typography` reads source; it cannot see a class that resolves to 10px through a stylesheet, a size that is
 * inherited, or a label that is legible only because it happens to sit on a light card. This measures the page:
 *
 *   type      every visible text element the site itself draws on the swept pages renders at 12px or more at the
 *             default text size. Library demos in preview stages, gallery thumbnails (see `thumbs`), SVG drawings,
 *             inert subtrees, lone decorative glyphs and visually hidden text are skipped — only text a reader is
 *             meant to read is held to the floor.
 *   contrast  the compact labels this pass touched (gallery chips and metadata, platform badges, tabs, breadcrumbs,
 *             token-table headings, changelog chips) meet 4.5:1 against the colour actually behind them, composited
 *             through every translucent ancestor, in light and dark. Ratios are printed, not just judged. Each run
 *             first measures a fixture pair on either side of the threshold, so a broken measurement cannot pass.
 *   touch     on a coarse pointer (touch emulation) at 390 and 768, each audited control's effective hit area — probed
 *             with `elementFromPoint`, so pseudo-element extensions count and clipped ones do not — is at least
 *             TOUCH_MIN on both axes, and no control's hit area covers the centre of another control.
 *   thumbs    every gallery thumbnail on /components is `aria-hidden`, contains nothing focusable and no heading, and
 *             its mock stays inside its frame in LTR and RTL.
 *   layout    no sideways page scroll at 320/375/390/768/1280, 100% and 200% text, LTR and RTL.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs); CI uses `playwright install chromium`.
 */
import { chromium } from "playwright";

const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");
const only = new Set(arg("--only", "type,contrast,touch,thumbs,layout").split(","));
const asJson = process.argv.includes("--json");
/** Browser checks run against the deployed site's analytics code; mark the traffic so it never reads as a visit. */
const url = (path) => `${base}${path}${path.includes("?") ? "&" : "?"}kx_traffic=diagnostic`;

/** 0.75rem at the default root — the floor for readable compact UI text. */
const TYPE_MIN_PX = 12;
/** WCAG 1.4.3 for text under 18.66px bold / 24px regular, which every compact label here is. */
const CONTRAST_MIN = 4.5;
/** The enforced coarse-pointer hit area. WCAG 2.5.8's minimum is 24px; this is the comfortable-touch floor. */
const TOUCH_MIN = 40;

const failures = [];
const report = { type: [], contrast: [], touch: [], thumbs: [], layout: [] };
const fail = (msg) => failures.push(msg);

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function open(context, path, { dir = "ltr", textScale = 1, scheme } = {}) {
  const page = await context.newPage();
  if (textScale !== 1) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * textScale, fixed: 13 * textScale } });
  }
  const res = await page.goto(url(path), { waitUntil: "load" });
  if (!res || !res.ok()) throw new Error(`${path}: HTTP ${res ? res.status() : "no response"}`);
  if (scheme) {
    // next-themes reads the class; emulating the media query alone does not flip a site whose stored choice wins.
    await page.evaluate((s) => {
      document.documentElement.classList.toggle("dark", s === "dark");
      document.documentElement.style.colorScheme = s;
    }, scheme);
  }
  if (dir !== "ltr") await page.evaluate((d) => document.documentElement.setAttribute("dir", d), dir);
  await page.waitForTimeout(500);
  if (textScale !== 1) {
    const root = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    if (Math.abs(root - 16 * textScale) > 0.5) throw new Error(`${path}: root font-size ${root}px, text scale not applied`);
  }
  return page;
}

/* ── type ─────────────────────────────────────────────────────────────────────────────────── */

const TYPE_PAGES = [
  "/",
  "/components",
  "/docs",
  "/docs/changelog",
  "/docs/components/button",
  "/docs/components/tabs",
  "/docs/tokens",
  "/docs/foundations",
];

if (only.has("type")) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  for (const path of TYPE_PAGES) {
    const page = await open(context, path);
    const small = await page.evaluate((min) => {
      // Not the site's own text: library demos inside a preview stage are held to the component scale by the
      // library's own gates, and a gallery thumbnail is a picture (the `thumbs` check covers it). SVG <text> is
      // drawing, sized in user units. `aria-hidden` alone does not exempt text — a platform badge is aria-hidden
      // because its row carries the name, and a sighted reader still reads it — only a lone glyph (→, ·, /) is.
      const decorative = (el) =>
        el.closest("[data-preview-stage], [data-showcase-preview], [data-gallery-thumbnail-body], [inert], svg, [hidden]") ||
        (el.closest('[aria-hidden="true"]') && !/[\p{L}\p{N}]{2,}/u.test(el.textContent));
      const visuallyHidden = (el) => {
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (cs.display === "none" || cs.visibility === "hidden") return true;
          const r = n.getBoundingClientRect();
          if (cs.position === "absolute" && r.width <= 1 && r.height <= 1) return true; // sr-only
        }
        return false;
      };
      const out = [];
      for (const el of document.body.querySelectorAll("*")) {
        const own = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim());
        if (!own || decorative(el) || visuallyHidden(el)) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size < min - 0.01) {
          out.push({ size, text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 40), cls: String(el.className).slice(0, 90) });
        }
      }
      return out;
    }, TYPE_MIN_PX);
    report.type.push({ path, below: small.length, sizes: [...new Set(small.map((s) => s.size))].sort() });
    for (const s of small.slice(0, 8)) fail(`type ${path}: ${s.size}px "${s.text}" (${s.cls})`);
    if (small.length > 8) fail(`type ${path}: …and ${small.length - 8} more below ${TYPE_MIN_PX}px`);
    await page.close();
  }
  await context.close();
}

/* ── contrast ─────────────────────────────────────────────────────────────────────────────── */

/** Composited text contrast, computed in the page so it reads the real cascade. */
const CONTRAST_FN = `(() => {
  const parse = (c) => {
    const m = c.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (k) => (top[k] * top.a + under[k] * under.a * (1 - top.a)) / a;
    return { r: mix("r"), g: mix("g"), b: mix("b"), a };
  };
  const lum = ({ r, g, b }) => {
    const ch = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  };
  window.__kxContrast = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor);
      if (bg && bg.a > 0) layers.push(bg);
      if (bg && bg.a >= 1) break;
    }
    let bg = { r: 255, g: 255, b: 255, a: 1 };
    for (const layer of layers.reverse()) bg = over(layer, bg);
    const cs = getComputedStyle(el);
    let fg = parse(cs.color);
    fg = { ...fg, a: fg.a * Number(cs.opacity) };
    const text = over(fg, bg);
    const [hi, lo] = [lum(text), lum(bg)].sort((x, y) => y - x);
    return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
  };
})()`;

/** [page, label, selector] — each selector should match at least one visible element. */
const CONTRAST_TARGETS = [
  ["/components", "gallery category/primitive chip", "[data-gallery-card] [data-gallery-primitive]"],
  ["/components", "gallery status chip (beta)", "[data-gallery-card] [data-gallery-status]"],
  ["/components", "platform badge (on)", '[data-gallery-card] [data-platform-badge="on"]'],
  ["/components", "platform badge (off)", '[data-gallery-card] [data-platform-badge="off"]'],
  ["/components", "gallery result count", '[role="status"]'],
  ["/components", "filter chip (resting)", '[role="group"][aria-label="Filter by category"] button[aria-pressed="false"]'],
  ["/components", "filter chip (selected)", '[role="group"][aria-label="Filter by category"] button[aria-pressed="true"]'],
  ["/components", "section meta", "[data-section-meta]"],
  ["/docs/components/button", "showcase tab (resting)", '[role="tab"][aria-selected="false"]'],
  ["/docs/components/button", "showcase tab (selected)", '[role="tab"][aria-selected="true"]'],
  ["/docs/components/button", "breadcrumb", 'nav[aria-label="Docs breadcrumb"] a'],
  ["/docs/components/button", "component meta term", "[data-component-meta] dt"],
  ["/docs/tokens", "token-table heading", "table thead th"],
  ["/docs/changelog", "changelog package/platform chip", "[data-changelog-pill]"],
  ["/docs/changelog", "changelog group label", "[data-changelog-group]"],
  ["/", "site header version", "[data-site-version]"],
];

if (only.has("contrast")) {
  // Self-test first: #767676 on white is 4.54:1, #777777 is 4.48:1. If the measurement cannot tell them apart,
  // nothing below means anything.
  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(
      `<div style="background:#fff"><span id="pass" style="color:#767676">pass</span>` +
        `<span id="fail" style="color:#777777">fail</span>` +
        `<div style="background:rgba(0,0,0,.5)"><span id="alpha" style="color:#fff">alpha</span></div></div>`,
    );
    await page.evaluate(CONTRAST_FN);
    const [p, f, a] = await page.evaluate(() => ["pass", "fail", "alpha"].map((id) => window.__kxContrast(document.getElementById(id))));
    report.contrast.push({ fixture: { pass: p, fail: f, alphaComposited: a } });
    if (!(p >= CONTRAST_MIN && f < CONTRAST_MIN)) fail(`contrast fixture: expected 4.54 ≥ ${CONTRAST_MIN} > 4.48, got ${p} / ${f}`);
    // white on 50% black over white composites to rgb(127.5) → 3.98:1; ignoring the alpha would give 21:1 or 1:1
    if (Math.abs(a - 3.98) > 0.02) fail(`contrast fixture: translucent background not composited (got ${a}, expected 3.98)`);
    await context.close();
  }
  for (const scheme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, reducedMotion: "reduce" });
    const byPage = Map.groupBy(CONTRAST_TARGETS, ([p]) => p);
    for (const [path, targets] of byPage) {
      const page = await open(context, path, { scheme });
      await page.evaluate(CONTRAST_FN);
      for (const [, label, selector] of targets) {
        const ratios = await page.evaluate((sel) => {
          const els = [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length > 0);
          return els.slice(0, 40).map((el) => window.__kxContrast(el));
        }, selector);
        if (ratios.length === 0) {
          fail(`contrast ${scheme} ${path}: "${label}" matched nothing (${selector}) — the check is measuring nothing`);
          continue;
        }
        const min = Math.min(...ratios);
        report.contrast.push({ scheme, path, label, min, n: ratios.length });
        if (min < CONTRAST_MIN) fail(`contrast ${scheme} ${path}: ${label} is ${min}:1, below ${CONTRAST_MIN}:1`);
      }
      await page.close();
    }
    await context.close();
  }
}

/* ── touch ────────────────────────────────────────────────────────────────────────────────── */

/**
 * Effective hit box: walk outward from the centre one pixel at a time along each axis while `elementFromPoint`
 * still resolves inside the control. That is what a tap does, so a `::before` extension counts and one clipped by
 * an `overflow: hidden` ancestor does not.
 */
const HIT_FN = `window.__kxHit = (el) => {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const mine = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && el.contains(h); };
  const reach = (dx, dy) => { let d = 0; while (d < 80 && mine(cx + dx * (d + 1), cy + dy * (d + 1))) d++; return d; };
  if (!mine(cx, cy)) return { width: 0, height: 0, visual: [r.width, r.height], centreBlocked: true };
  return {
    width: reach(-1, 0) + reach(1, 0) + 1,
    height: reach(0, -1) + reach(0, 1) + 1,
    visual: [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10],
  };
};`;

/** [label, page, selector, viewport width, setup?] */
const TOUCH_TARGETS = [
  ["header search", "/docs/components/button", "header button[aria-haspopup='dialog'], header button:has(> .lucide-search)", 390],
  ["header theme toggle", "/docs/components/button", "header button:has(.sr-only)", 390],
  ["header GitHub link", "/docs/components/button", 'header a[href*="github.com"]', 390],
  ["header menu button", "/docs/components/button", 'header button[aria-label="Menu"]', 390],
  ["showcase tabs", "/docs/components/button", '[role="tab"]', 390],
  ["copy buttons", "/docs/components/button", 'button[aria-label^="Copy"]', 390, "code"],
  ["gallery Filters trigger", "/components", 'button[aria-label^="Filters"]', 390],
  ["gallery chips (sheet)", "/components", '[role="dialog"] [role="group"] button', 390, "sheet"],
  ["gallery clear search", "/components", 'button[aria-label="Clear search"]', 390, "search"],
  ["gallery chips (inline)", "/components", '[role="group"][aria-label^="Filter by"] button', 768],
  ["showcase tabs (tablet)", "/docs/components/button", '[role="tab"]', 768],
  ["header controls (tablet)", "/docs/components/button", "header button, header a[href*='github.com']", 768],
];

async function touchSetup(page, setup) {
  if (setup === "sheet") {
    await page.locator('button[aria-label^="Filters"]').click();
    await page.waitForSelector('[role="dialog"] [role="group"]');
    await page.waitForTimeout(400);
  } else if (setup === "search") {
    await page.locator("#component-search").fill("but");
    await page.waitForSelector('button[aria-label="Clear search"]');
  } else if (setup === "code") {
    // the first showcase's Code tab reveals its copy button
    const tab = page.locator('[role="tab"]', { hasText: /^code$/i }).first();
    await tab.click();
    await page.waitForTimeout(200);
  }
}

if (only.has("touch")) {
  for (const [label, path, selector, width, setup] of TOUCH_TARGETS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      hasTouch: true,
      isMobile: width < 768,
      reducedMotion: "reduce",
    });
    const page = await open(context, path);
    const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
    if (!coarse) fail(`touch ${label}: the context is not a coarse pointer — the emulation is not applied`);
    await touchSetup(page, setup);
    await page.evaluate(HIT_FN);
    const results = await page.evaluate((sel) => {
      const els = [...document.querySelectorAll(sel)].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
      });
      // only what is on screen: elementFromPoint cannot see past the viewport
      const onScreen = els.filter((el) => {
        el.scrollIntoView({ block: "center", inline: "nearest" });
        return true;
      });
      return onScreen.slice(0, 30).map((el) => {
        el.scrollIntoView({ block: "center", inline: "nearest" });
        const hit = window.__kxHit(el);
        // does this control's hit area swallow a neighbouring control's centre?
        const others = [...document.querySelectorAll("a[href], button, [role='tab'], input")].filter((o) => o !== el && !el.contains(o) && !o.contains(el));
        const stolen = others.filter((o) => {
          const r = o.getBoundingClientRect();
          if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) return false;
          const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return h && el.contains(h);
        }).length;
        return { name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24), ...hit, stolen };
      });
    }, selector);
    if (results.length === 0) fail(`touch ${label}: ${selector} matched nothing at ${width}px — the check is measuring nothing`);
    const minW = Math.min(...results.map((r) => r.width));
    const minH = Math.min(...results.map((r) => r.height));
    report.touch.push({ label, path, width, n: results.length, minHit: [minW, minH], visual: results[0]?.visual, sample: results.slice(0, 3) });
    for (const r of results) {
      if (r.centreBlocked) fail(`touch ${label} @${width}: "${r.name}" — its own centre resolves to another element`);
      else if (r.width < TOUCH_MIN || r.height < TOUCH_MIN)
        fail(`touch ${label} @${width}: "${r.name}" hit area ${r.width}×${r.height}px (visual ${r.visual.join("×")}), below ${TOUCH_MIN}px`);
      if (r.stolen) fail(`touch ${label} @${width}: "${r.name}" hit area covers the centre of ${r.stolen} other control(s)`);
    }
    await context.close();
  }
}

/* ── thumbnails ───────────────────────────────────────────────────────────────────────────── */

if (only.has("thumbs")) {
  for (const dir of ["ltr", "rtl"]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
    const page = await open(context, "/components", { dir });
    const t = await page.evaluate(() => {
      const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"]';
      const frames = [...document.querySelectorAll("[data-gallery-thumbnail]")];
      const kinds = {};
      const problems = [];
      for (const f of frames) {
        const kind = f.getAttribute("data-gallery-thumbnail");
        kinds[kind] = (kinds[kind] ?? 0) + 1;
        const slug = f.closest("[data-gallery-card]")?.getAttribute("data-gallery-card");
        if (kind === "label") continue;
        const body = f.querySelector("[data-gallery-thumbnail-body]");
        if (!body) { problems.push(`${slug}: ${kind} thumbnail has no body`); continue; }
        if (body.getAttribute("aria-hidden") !== "true") problems.push(`${slug}: ${kind} thumbnail is not aria-hidden`);
        if (kind === "demo" && !body.inert) problems.push(`${slug}: live demo thumbnail is not inert`);
        if (kind === "mock") {
          const focusable = body.querySelectorAll(FOCUSABLE).length;
          if (focusable) problems.push(`${slug}: mock thumbnail contains ${focusable} focusable element(s)`);
          const headings = body.querySelectorAll("h1,h2,h3,h4,h5,h6,[role=heading]").length;
          if (headings) problems.push(`${slug}: mock thumbnail contains ${headings} heading(s)`);
          const fr = f.getBoundingClientRect();
          const inner = body.firstElementChild?.firstElementChild ?? body.firstElementChild;
          if (inner) {
            const r = inner.getBoundingClientRect();
            if (r.left < fr.left - 0.5 || r.right > fr.right + 0.5) problems.push(`${slug}: mock overflows its frame inline (${Math.round(r.left - fr.left)} / ${Math.round(fr.right - r.right)}px)`);
          }
        }
      }
      return { kinds, problems, total: frames.length };
    });
    report.thumbs.push({ dir, total: t.total, kinds: t.kinds, problems: t.problems.length });
    if (t.total === 0) fail(`thumbs ${dir}: no [data-gallery-thumbnail] frames found — the check is measuring nothing`);
    if (!t.kinds.mock || !t.kinds.demo) fail(`thumbs ${dir}: expected both static mocks and live demos, got ${JSON.stringify(t.kinds)}`);
    for (const p of t.problems) fail(`thumbs ${dir}: ${p}`);
    await context.close();
  }
}

/* ── layout ───────────────────────────────────────────────────────────────────────────────── */

const LAYOUT_PAGES = ["/", "/components", "/docs", "/docs/changelog", "/docs/components/button", "/docs/tokens", "/docs/foundations"];
const LAYOUT_WIDTHS = [320, 375, 390, 768, 1280];

if (only.has("layout")) {
  for (const width of LAYOUT_WIDTHS) {
    for (const textScale of [1, 2]) {
      for (const dir of ["ltr", "rtl"]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
        for (const path of LAYOUT_PAGES) {
          const page = await open(context, path, { dir, textScale });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          report.layout.push({ width, textScale, dir, path, overflow });
          if (overflow > 0) fail(`layout ${width}px/${textScale * 100}%/${dir} ${path}: page scrolls sideways by ${overflow}px`);
          await page.close();
        }
        await context.close();
      }
    }
  }
}

await browser.close();

if (asJson) console.log(JSON.stringify({ failures, report }, null, 2));
else {
  if (report.type.length) console.log("type floor:", report.type.map((t) => `${t.path} ${t.below}${t.below ? ` [${t.sizes.join(",")}]` : ""}`).join(" · "));
  if (report.contrast.length)
    console.log(
      "contrast:\n" +
        report.contrast.map((c) => (c.fixture ? `  fixture ${JSON.stringify(c.fixture)}` : `  ${c.scheme.padEnd(5)} ${c.min.toFixed(2)}:1  ${c.label} (${c.n})`)).join("\n"),
    );
  if (report.touch.length)
    console.log(
      "touch (coarse pointer):\n" +
        report.touch.map((t) => `  ${t.label} @${t.width}: min hit ${t.minHit.join("×")} (visual ${t.visual?.join("×")}, n=${t.n})`).join("\n"),
    );
  if (report.thumbs.length) console.log("thumbnails:", report.thumbs.map((t) => `${t.dir} ${t.total} ${JSON.stringify(t.kinds)} problems=${t.problems}`).join(" · "));
  if (report.layout.length) console.log(`layout: ${report.layout.length} views, ${report.layout.filter((l) => l.overflow > 0).length} overflowing`);
}
if (failures.length) {
  console.error(`\nweb-quality-browser: ${failures.length} failure(s)\n` + failures.map((f) => `  ✗ ${f}`).join("\n"));
  process.exit(1);
}
console.log("web-quality-browser ok");
