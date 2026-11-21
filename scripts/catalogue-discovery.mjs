/**
 * The component catalogue has to be discoverable without JavaScript, and its filter bar has to stay
 * reachable when the header grows.
 *
 * Usage:
 *   node scripts/catalogue-discovery.mjs [--base http://127.0.0.1:3100]
 *   node scripts/catalogue-discovery.mjs --controls          # prove the gate can fail
 *   node scripts/catalogue-discovery.mjs --control <name>    # one control
 *
 * Two defects, both measured on `main` 6b1c990e before the repair:
 *
 * W1 — /components served 0 of 109 component documentation links. `ComponentGallery` is a client
 * component reading `useSearchParams()`, so the static prerender emits the enclosing Suspense
 * fallback in its place, and that fallback was the word "Loading…". A reader without JavaScript got
 * 26 characters of main content and no way into the catalogue.
 *
 * W2 — the filter bar guessed its sticky offset with `top-12 md:top-[5.5rem]`. Those are emitted in
 * `rem`, so they scale with text size; the site header grows by *wrapping*, which does not. At
 * 320px/200% text a bar pinned at 96px sat 137px under a 243px header, 40px of the search field
 * covered, and `elementFromPoint` at the field's own centre returned a header button. At 320px/100%
 * the same thing happened with an 87px header and a 48px offset — the defect was never only about
 * 200% text.
 *
 * What this asserts, and what it deliberately does not:
 *
 * - Population first. Every check counts what it found before reading a property off it: a locator
 *   that matches nothing resolves `[]`, and `[].every(...)` is `true`, which is how five gates in
 *   this repo once passed exactly when the thing they guarded had vanished.
 * - Rendered geometry and a real hit test, never the presence of a class. A `position: sticky` rule
 *   proves nothing about whether a reader can touch the field.
 * - No magic number anywhere in the assertions. The sticky offset is compared to the header's
 *   *measured* height, and "the field is usable" is the pointer landing on the field — which is what
 *   caught the 48px crush, where a width threshold would have needed a number no measurement
 *   supports. Field widths are reported as a distribution, not asserted.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const argv = process.argv;
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const base = arg("--base", "http://127.0.0.1:3100").replace(/\/$/, "");
const jsonOut = arg("--json", null);
const runControls = argv.includes("--controls");
const oneControl = arg("--control", null);

/** The catalogue is 109 entries today; the floor is a population check, not the count itself. */
const MIN_LINKS = 50;

const VIEWS = [
  { width: 320, scale: 1, dir: "ltr" },
  { width: 320, scale: 1, dir: "rtl" },
  { width: 320, scale: 2, dir: "ltr" },
  { width: 320, scale: 2, dir: "rtl" },
  { width: 390, scale: 1, dir: "ltr" },
  { width: 390, scale: 2, dir: "ltr" },
  { width: 390, scale: 2, dir: "rtl" },
  { width: 768, scale: 1, dir: "ltr" },
  { width: 768, scale: 2, dir: "ltr" },
  { width: 1440, scale: 1, dir: "ltr" },
  { width: 1440, scale: 1, dir: "rtl" },
  { width: 1440, scale: 2, dir: "ltr" },
  { width: 1440, scale: 2, dir: "rtl" },
];

const launch = () => chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/* ── W1: discovery without JavaScript ───────────────────────────────────────── */

async function checkNoJsDiscovery(browser, mutate) {
  const failures = [];
  const facts = {};

  // (a) the served document, before any browser runs a line of script
  const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page0 = await ctx0.newPage();
  if (mutate?.route) await page0.route("**/components", mutate.route);
  const response = await page0.goto(base + "/components", { waitUntil: "commit" });
  const html = await response.text();
  const served = new Set([...html.matchAll(/href="(\/docs\/components\/[a-z0-9-]+)"/g)].map((m) => m[1]));
  facts.servedLinks = served.size;
  facts.servedBytes = html.length;
  if (served.size < MIN_LINKS) {
    failures.push(
      `the served /components document carries ${served.size} component documentation links, expected at least ${MIN_LINKS} — ` +
        `a reader without JavaScript, and every crawler, sees this document and nothing else`,
    );
  }
  await ctx0.close();

  // (b) the same document rendered with scripting switched off
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  if (mutate?.route) await page.route("**/components", mutate.route);
  await page.goto(base + "/components", { waitUntil: "load" });

  const m = await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const links = [...main.querySelectorAll('a[href^="/docs/components/"]')];
    const visible = links.filter((a) => {
      const r = a.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const text = (main.textContent || "").trim();
    return {
      h1: document.querySelector("h1")?.textContent?.trim() ?? null,
      links: links.length,
      visible: visible.length,
      headings: main.querySelectorAll("h2,h3").length,
      chars: text.length,
      // availability is stated as text in the static catalogue, so read the text
      hasPlatformAbbr: /\bRE\b/.test(text) && /\bSW\b/.test(text),
      // a body that is only a loading state is the defect, named
      loadingOnly: text.length < 200 && /Loading/i.test(text),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  Object.assign(facts, { noJs: m });

  if (m.h1 === null) failures.push("no-JS /components has no <h1>");
  if (m.loadingOnly) {
    failures.push(
      `no-JS /components renders only a loading state (${m.chars} characters of main content) — the catalogue has no discovery path`,
    );
  }
  if (m.visible < MIN_LINKS) {
    failures.push(`no-JS /components shows ${m.visible} visible component links, expected at least ${MIN_LINKS}`);
  }
  if (m.headings === 0) failures.push("no-JS /components has no category headings, so the catalogue cannot be skimmed by structure");
  if (!m.hasPlatformAbbr) failures.push("no-JS /components states no platform availability for its entries");
  if (m.overflow > 0) failures.push(`no-JS /components overflows horizontally by ${m.overflow}px`);

  // (c) keyboard: a component link must be reachable by Tab alone, with scripting off
  let reached = null;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const href = await page.evaluate(() => document.activeElement?.getAttribute?.("href") ?? null);
    if (href && href.startsWith("/docs/components/")) {
      reached = { href, tabs: i + 1 };
      break;
    }
  }
  facts.keyboard = reached;
  if (!reached) failures.push("no-JS /components: 40 Tab presses never reached a component documentation link");

  await ctx.close();
  return { failures, facts };
}

/* ── W2: the filter bar under a header that grows ───────────────────────────── */

async function checkStickySearch(browser, mutate) {
  const failures = [];
  const rows = [];

  for (const v of VIEWS) {
    const tag = `${v.width}/${v.scale === 2 ? "200%" : "100%"}/${v.dir}`;
    const ctx = await browser.newContext({ viewport: { width: v.width, height: 800 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    // The knob Chrome's own "Font size" preference turns, as a11y-site.mjs established.
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * v.scale, fixed: 13 * v.scale } });
    if (mutate?.route) await page.route("**/components", mutate.route);
    await page.goto(base + "/components", { waitUntil: "load" });
    await page.waitForSelector("#component-search", { timeout: 15000 }).catch(() => {});
    if (v.dir === "rtl") await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    if (mutate?.css) await page.addStyleTag({ content: mutate.css });
    await page.waitForTimeout(500);

    const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    if (Math.abs(rootPx - 16 * v.scale) > 0.5) {
      failures.push(`${tag}: root font-size is ${rootPx}px, expected ${16 * v.scale}px — the text-size axis is not being applied`);
      await ctx.close();
      continue;
    }

    const m = await page.evaluate(async () => {
      document.documentElement.style.scrollBehavior = "auto";
      const header = document.querySelector("header.sticky");
      const input = document.getElementById("component-search");
      const bar = input?.closest("div[data-filter-bar]") ?? null;
      if (!header || !input || !bar) {
        return { population: { header: !!header, input: !!input, bar: !!bar } };
      }
      const rect = (el) => {
        const b = el.getBoundingClientRect();
        return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), height: +b.height.toFixed(1), width: +b.width.toFixed(1) };
      };
      const stickyTop = parseFloat(getComputedStyle(bar).top) || 0;
      const position = getComputedStyle(bar).position;
      // Scroll past the point where a sticky bar pins, so page content is underneath it.
      window.scrollTo(0, bar.getBoundingClientRect().top + window.scrollY - stickyTop + 600);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => setTimeout(r, 250));

      const hb = rect(header);
      let bb = rect(bar);
      let ib = rect(input);
      // A bar that is not sticky has scrolled away by now, and elementFromPoint off the viewport
      // returns null — which reads exactly like "covered". For a non-sticky bar, reachable after
      // scrolling back IS the contract, so scroll back and measure there.
      let scrolledBack = false;
      if (ib.bottom < 0 || ib.top > window.innerHeight) {
        input.scrollIntoView({ block: "center", behavior: "auto" });
        await new Promise((r) => setTimeout(r, 150));
        bb = rect(bar);
        ib = rect(input);
        scrolledBack = true;
      }

      const over = (a, b) => +Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)).toFixed(1);
      const cx = Math.round((ib.left + ib.right) / 2);
      const cy = Math.round((ib.top + ib.bottom) / 2);
      const hit = document.elementFromPoint(cx, cy);
      const hitIsField = !!(hit && (hit === input || input.contains(hit) || hit.closest("#component-search")));

      input.focus();
      const fb = rect(input);
      const focusedIsField = document.activeElement === input;

      return {
        population: { header: true, input: true, bar: true },
        position,
        stickyTop,
        headerHeight: hb.height,
        // where a sticky bar actually sits versus the header's measured bottom
        offsetMatchesHeader: position === "sticky" ? Math.abs(stickyTop - hb.height) <= 1 : null,
        barCoveredByHeader: over(bb, hb),
        fieldCoveredByHeader: over(ib, hb),
        fieldWidth: ib.width,
        hitTag: hit ? hit.tagName + (hit.id ? "#" + hit.id : "") : null,
        pointerReachesField: hitIsField,
        focusedIsField,
        focusBoxUnderHeader: fb.top < hb.bottom - 1,
        scrolledBack,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    if (!m.population.header || !m.population.input || !m.population.bar) {
      failures.push(
        `${tag}: nothing to measure — header:${m.population.header} search field:${m.population.input} filter bar:${m.population.bar}. ` +
          `A missing element is a failure, not a pass.`,
      );
      rows.push({ tag, ...v, ...m });
      await ctx.close();
      continue;
    }

    if (m.offsetMatchesHeader === false) {
      failures.push(
        `${tag}: the filter bar pins at ${m.stickyTop}px under a header measuring ${m.headerHeight}px — the offset is not the header's height`,
      );
    }
    if (m.barCoveredByHeader > 1) failures.push(`${tag}: the header covers ${m.barCoveredByHeader}px of the filter bar`);
    if (m.fieldCoveredByHeader > 1) failures.push(`${tag}: the header covers ${m.fieldCoveredByHeader}px of the search field`);
    if (!m.pointerReachesField) {
      failures.push(
        `${tag}: a pointer at the search field's own centre lands on ${m.hitTag} — the field cannot be clicked or tapped (field is ${m.fieldWidth}px wide)`,
      );
    }
    if (!m.focusedIsField) failures.push(`${tag}: the search field did not take focus`);
    if (m.focusBoxUnderHeader) failures.push(`${tag}: the focused search field sits under the header, so its focus ring is hidden`);
    if (m.overflow > 0) failures.push(`${tag}: the page overflows horizontally by ${m.overflow}px`);

    rows.push({ tag, ...v, ...m });
    await ctx.close();
  }

  return { failures, rows };
}

/* ── controls: prove each assertion can fail ─────────────────────────────────── */

/**
 * Rewriting the served body, not the DOM: /components is server-rendered, so a MutationObserver is
 * overwritten by React's commit and a property override never fires — the HTML parser put the markup
 * there. `route.fetch()` then `fulfill({ response, body })` keeps every header, the CSP included.
 */
const rewrite = (fn) => async (route) => {
  const response = await route.fetch();
  const body = fn(await response.text());
  await route.fulfill({ response, body });
};

const CONTROLS = {
  "w1-strip-links": {
    why: "component links removed from the initial document",
    part: "w1",
    // must trip the served-document assertion specifically
    expect: /the served \/components document carries 0 component documentation links/,
    mutate: { route: rewrite((h) => h.replace(/href="\/docs\/components\/[a-z0-9-]+"/g, 'data-stripped="1"')) },
  },
  "w1-loading-only": {
    why: "the catalogue returns only a loading placeholder",
    part: "w1",
    // the links assertion fires too, but this control exists to prove the loading-state assertion,
    // so that is the finding it is required to produce.
    expect: /renders only a loading state/,
    mutate: {
      route: rewrite((h) =>
        h.replace(/<div data-catalogue-static=""[\s\S]*?(?=<\/main>)/, '<p>Loading&#x2026;</p>'),
      ),
    },
  },
  "w1-no-keyboard-reach": {
    why: "the catalogue's links are present but unreachable by keyboard",
    part: "w1",
    expect: /never reached a component documentation link/,
    // The link stays in the document and stays visible — only its tab order is taken away — so the
    // served-links and visible-links assertions both still pass and this control isolates the
    // keyboard one. `class` precedes `href` in the rendered anchor, so the insertion hangs off the
    // href itself rather than off `<a `.
    mutate: {
      route: rewrite((h) =>
        h.replace(/href="(\/docs\/components\/[a-z0-9-]+)"/g, 'href="$1" tabindex="-1"'),
      ),
    },
  },
  "w2-fixed-offset": {
    why: "the old constant sticky offset is restored, so the header obscures the search",
    part: "w2",
    expect: /the offset is not the header's height/,
    mutate: { css: "[data-filter-bar]{position:sticky!important;top:3rem!important}" },
  },
  "w2-header-covers-field": {
    why: "the bar is pinned high enough that the header covers the search field itself",
    part: "w2",
    expect: /covers \d+(\.\d+)?px of the search field/,
    mutate: { css: "[data-filter-bar]{position:sticky!important;top:0!important}" },
  },
  "w2-blocked-pointer": {
    why: "pointer interaction with the search is blocked by an overlay",
    part: "w2",
    expect: /the field cannot be clicked or tapped/,
    mutate: {
      css:
        "[data-filter-bar]::after{content:'';position:absolute;inset:0;z-index:50;background:transparent;pointer-events:auto}",
    },
  },
  "w2-length-floor-overflow": {
    why: "a length-based width floor on the field pushes the page sideways",
    part: "w2",
    // On the InputGroup, not the field: the group is `overflow: hidden`, which is why the crushed
    // 48px field clipped its own content instead of pushing the page sideways — a floor on the field
    // alone measured 0px of overflow with the field already 320px wide inside a 288px box. 20rem is
    // 320px at the default text size, so it overflows a 320px viewport's 288px content box by 16px
    // without leaving the viewport. This is the shape of the regression the first repair attempt
    // actually shipped, at 64px, before the length floor was removed entirely.
    expect: /overflows horizontally by \d+px/,
    mutate: { css: "[data-filter-bar] div:has(> #component-search){min-width:20rem!important}" },
  },
};

async function runControl(name) {
  const c = CONTROLS[name];
  if (!c) throw new Error(`unknown control ${name}; have ${Object.keys(CONTROLS).join(", ")}`);
  const browser = await launch();
  const r = c.part === "w1" ? await checkNoJsDiscovery(browser, c.mutate) : await checkStickySearch(browser, c.mutate);
  await browser.close();
  const matched = r.failures.filter((f) => c.expect.test(f));
  // Firing is not enough: a control that trips a different assertion proves that other assertion,
  // not the one it was written for. Both facts are reported.
  return {
    name,
    why: c.why,
    part: c.part,
    fired: r.failures.length > 0,
    onTarget: matched.length > 0,
    expected: String(c.expect),
    findings: matched.length > 0 ? matched.slice(0, 2) : r.failures.slice(0, 2),
  };
}

/* ── main ────────────────────────────────────────────────────────────────────── */

if (oneControl) {
  const r = await runControl(oneControl);
  console.log(
    `${r.onTarget ? "control FIRED on target" : r.fired ? "control fired OFF TARGET" : "control DID NOT FIRE"} — ${r.name}: ${r.why}`,
  );
  if (!r.onTarget) console.log(`    expected a finding matching ${r.expected}`);
  for (const f of r.findings) console.log(`    ${f}`);
  process.exit(r.onTarget ? 0 : 1);
}

if (runControls) {
  const out = [];
  for (const name of Object.keys(CONTROLS)) out.push(await runControl(name));
  console.log("\ncatalogue-discovery — negative controls\n");
  for (const r of out) {
    const verdict = r.onTarget ? "ON TARGET " : r.fired ? "OFF TARGET" : "SILENT    ";
    console.log(`  ${verdict} ${r.name.padEnd(24)} ${r.why}`);
    console.log(`             ↳ ${r.findings[0] ?? "(no finding at all)"}`);
    if (!r.onTarget) console.log(`             ! expected ${r.expected}`);
  }
  const bad = out.filter((r) => !r.onTarget);
  console.log("");
  if (bad.length > 0) {
    // A control that does nothing reads exactly like a gate that works, and a control that trips a
    // neighbouring assertion reads exactly like one that proves its own. Refuse to report success.
    console.error(
      `${bad.length} of ${out.length} controls did not fire on their own assertion: ${bad.map((s) => s.name).join(", ")}. ` +
        `Those assertions are NOT proven able to detect their regression.`,
    );
    process.exit(1);
  }
  console.log(`all ${out.length} controls fired on their own assertion — each protected regression is detected.`);
  process.exit(0);
}

const browser = await launch();
const w1 = await checkNoJsDiscovery(browser, null);
const w2 = await checkStickySearch(browser, null);
await browser.close();

console.log("\ncatalogue-discovery — no-JS discovery (W1)\n");
console.log(`  served document: ${w1.facts.servedLinks} component links, ${w1.facts.servedBytes} bytes`);
console.log(
  `  scripting off:   ${w1.facts.noJs.visible} visible links, ${w1.facts.noJs.headings} category headings, ` +
    `${w1.facts.noJs.chars} chars of main content, platform tags ${w1.facts.noJs.hasPlatformAbbr ? "present" : "ABSENT"}`,
);
console.log(
  `  keyboard:        ${w1.facts.keyboard ? `${w1.facts.keyboard.href} after ${w1.facts.keyboard.tabs} Tab presses` : "NEVER reached a component link"}`,
);

console.log("\ncatalogue-discovery — the filter bar under the header (W2)\n");
console.log("  view              pos      hdrH  top   offset=hdr  barCov  fldCov  fldW   pointer  focusHidden  ovf");
for (const r of w2.rows) {
  if (!r.population?.header) {
    console.log(`  ${r.tag.padEnd(17)} NOTHING MEASURED`);
    continue;
  }
  console.log(
    `  ${r.tag.padEnd(17)} ${String(r.position).padEnd(8)} ${String(r.headerHeight).padStart(4)} ${String(r.stickyTop).padStart(5)} ` +
      `${String(r.offsetMatchesHeader ?? "n/a").padStart(10)} ${String(r.barCoveredByHeader).padStart(7)} ${String(r.fieldCoveredByHeader).padStart(7)} ` +
      `${String(Math.round(r.fieldWidth)).padStart(5)} ${String(r.pointerReachesField).padStart(8)} ${String(r.focusBoxUnderHeader).padStart(12)} ${String(r.overflow).padStart(4)}`,
  );
}

const failures = [...w1.failures, ...w2.failures];
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ base, at: new Date().toISOString(), w1: w1.facts, w2: w2.rows, failures }, null, 2));

console.log("");
if (failures.length > 0) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`\ncatalogue-discovery: ${failures.length} finding(s).`);
  process.exit(1);
}
console.log(`catalogue-discovery ok — no-JS discovery and ${w2.rows.length} view(s) of the filter bar are clean.`);
