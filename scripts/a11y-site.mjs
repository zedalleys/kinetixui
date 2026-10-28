/**
 * a11y-site.mjs — real-browser accessibility + layout pass over the docs SITE's own pages.
 *
 *   pnpm build:web && (cd apps/web && next start -p 3100) &
 *   node scripts/a11y-site.mjs [--base http://127.0.0.1:3100]
 *
 * The Storybook pass (a11y-browser.mjs) covers the components; nothing covered the pages built from them, which is
 * how ~60 contrast / naming / heading findings and two phone-width overflows accumulated. This keeps the site at zero:
 * for every page, in light AND dark, at small-phone / phone / tablet / desktop width, AND at the reader's default
 * text size and twice it, it
 *
 *   - runs axe-core with every rule on (except `region`, which is a page-structure heuristic), and
 *   - fails on horizontal page overflow (`scrollWidth > clientWidth`).
 *
 * THE TEXT-SIZE AXIS, AND WHY IT IS SEPARATE FROM WIDTH. Page zoom shrinks the CSS viewport, so zoom is already
 * covered by the width list — 1280 at 200% zoom *is* a 640px viewport, and 1280 at 400% is the 320px entry, which is
 * what WCAG 1.4.10 means by "320 CSS pixels". Raising the reader's font size is a different thing entirely: the
 * viewport does not change, `rem` grows and `px` does not, so it catches the opposite class of bug — a container
 * sized for text that is now bigger than it. This gate had widths but no text size, and consequently every page on
 * the site overflowed sideways at 200% text while the run stayed green. WCAG 1.4.4 is an AA criterion and it was
 * failing on all 21 pages.
 *
 * There is no baseline: a finding fails the run. To add a page, add it to PAGES and make it clean first.
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs); CI uses `playwright install chromium`.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:3100").replace(/\/$/, "");

/**
 * `--page /iot` (repeatable) sweeps only the named pages, for reproducing one finding locally. CI passes none, so it
 * always sweeps every page, and the ratchet check below still runs against the full list.
 */
const { GUIDES } = await import(resolve("apps/web/src/lib/guides-data.ts"));
/** Every registered guide, read from the registry so a guide added later is swept without editing this file. */
const GUIDE_PAGES = GUIDES.map((g) => `/guides/${g.slug}`);

/** `--guides` adds every registered guide to the `--page` list (the publication runbook uses it). */
const ONLY_PAGES =
  process.argv.includes("--page") || process.argv.includes("--guides")
    ? [
        ...(process.argv.includes("--guides") ? GUIDE_PAGES : []),
        ...process.argv.flatMap((arg, i) => (process.argv[i - 1] === "--page" ? [arg] : [])),
      ]
    : null;

/** One representative page per kind of layout, plus the pages with the densest custom UI. */
const PAGES = [
  "/",
  "/components",
  "/create",
  "/blocks",
  "/charts",
  "/themes",
  "/docs/colors",
  "/infographic",
  "/docs",
  "/docs/installation",
  "/docs/foundations",
  "/docs/platforms",
  "/docs/tokens",
  "/docs/accessibility",
  "/docs/cli",
  "/docs/changelog",
  // The guides index, added with the page itself. GUIDE_PAGES already covers each individual guide, so this
  // route is the one part of the cluster nothing sweeps: a registry-driven list with its own card layout.
  // Deferred when the page was written only because the axe job was close to its 35-minute cap; #448 raised
  // that to 60, so the reason is gone and the gap is closed here rather than carried as debt.
  "/guides",
  "/docs/angular",
  // The IoT module's page, added with the module. `/docs/angular` is the precedent: a module that ships
  // a docs page brings the page into this sweep, or the page is the one part of the site nothing checks.
  "/docs/iot",
  // /iot is the Connected Space showcase: real IoT components driven by a deterministic simulation, with
  // selects, ranges, switches and a command strip — the densest set of custom controls outside /create, and
  // the only page whose components come from a different package. In the sweep for the same reason /create is.
  "/iot",
  // The simulated Building Operations console linked from /iot: a dark shell with a floor plan, roving marker and
  // floor groups, a zone table and live-updating totals. Custom layout throughout, so it is swept like /create.
  "/demos/building-operations",
  "/docs/components/button",
  "/docs/components/data-grid",
  // The three component pages the evaluator-journey audit found failing when it swept all 98: Accordion's trigger
  // headings skipped a level under the page h1, and CodeBlock's and DiffViewer's scroll regions were unreachable by
  // keyboard at 320px. Each is here because it was found failing off-sweep, which is the argument for sweeping it.
  "/docs/components/accordion",
  "/docs/components/code-block",
  "/docs/components/diff-viewer",
  // One page per remaining gallery category (Form Inputs, Navigation, Overlays, Feedback), so every category has
  // at least one page under the gate. Button (Controls & Actions), Data Grid and the three above (Foundations,
  // Data Display) cover the rest. A full 98-page sweep at this matrix is ~1,570 views; this is the bounded step.
  "/docs/components/input",
  "/docs/components/tabs",
  "/docs/components/dialog",
  "/docs/components/alert",
  // The guides cluster (SEO Phase 3): long-form reading pages with their own layout, a status line, a wrapping CTA
  // button and a related-reading footer. Swept in whichever publication state the registry is in, so the pages
  // are already under the gate on the day they go live (marketing/seo/GUIDE-PUBLISH-RUNBOOK.md).
  ...GUIDE_PAGES,
  // Business discovery (W1): the capability index and the domain template, swept with the catalogue they filter. Both
  // use-case pages share one template; each is listed because each renders different workflows and component cards.
  "/capabilities",
  "/use-cases/commerce",
  "/use-cases/travel-booking",
];
const WIDTHS = [
  // 320 is the narrowest width the site claims to support, and it is not a rounding of 375: a fixed-width
  // column that fits at 375 can still push the page wider at 320. /infographic did exactly that — its
  // dependency chart overflowed by 5px at 320 only — and this gate did not see it, because it started at
  // 375. Cheap to check, and the only width where that class of bug shows up.
  ["small-phone", 320, 812],
  ["phone", 375, 812],
  ["tablet", 768, 1024],
  // 1024 is the width at which the `lg` compositions switch on, and it was the gap between `tablet` and
  // `desktop` where a layout can be at its tightest: wide enough to have committed to a desktop arrangement,
  // not wide enough to afford it. #444 found a real failure there that this list could not see — at 1024px
  // with a 32px default font size the docs component pages gained **37px of horizontal scrolling**, because
  // the 14rem sidebar had become 448px of a 1024px screen. The defect is fixed; the blind spot was not, and
  // a sample that misses a whole breakpoint keeps missing whatever else sits in it.
  ["laptop", 1024, 768],
  ["desktop", 1280, 900],
];
const SCHEMES = ["light", "dark"];
/**
 * The reader's default text size, as a multiple of the browser's own default.
 *
 * Applied through CDP `Page.setFontSizes`, which is the knob Chrome's "Font size" preference actually turns, rather
 * than an inline `font-size` on `<html>`. The two were compared on this site before choosing: both give a 32px root,
 * a 28px nav label and the same 328px overflow, so the faithful one is used and the equivalence is recorded instead
 * of assumed.
 *
 * 2 rather than 1.5 or 3 because 200% is the figure WCAG 1.4.4 names.
 */
const TEXT_SCALES = [1, 2];

/**
 * Pages that do not yet hold at 200% text, with the reason, as a ratchet.
 *
 * Empty: every page passes both text sizes at all four widths. `/iot` was the last entry. Its original cause,
 * `DeviceSetpointControl`'s fixed-geometry ring, was fixed by the state and spatial audit; the page chrome that
 * still overflowed (the closing "Read the IoT docs" button at 320/375px, the environment tab labels and the
 * "Built from" part names at 320px, the roadmap's "Deferred" chip at 768px) was fixed in Phase 3D by letting
 * each one wrap, without clipping or shrinking anything.
 *
 * This is a ratchet and not an exemption: an entry is asserted to be NEEDED, so the moment a page is fixed this
 * run fails and tells you to delete the line. It follows `check-rtl.mjs`, which carries its pending files the
 * same way. A new entry needs a measured reason.
 */
const TEXT_SCALE_PENDING = new Map([]);

/**
 * Single axe findings that are artefacts of how axe resolves a background, not defects of the page, as a ratchet.
 *
 * axe's `color-contrast` asks `elementsFromPoint` what is painted beneath a node. When a node is laid out
 * inside a clipping ancestor but positioned outside it, the browser paints nothing there, so that question
 * returns the page instead of the node's own card — and axe compares the text against a background it is never
 * drawn on. The finding is then arithmetic about two colours that never meet.
 *
 * An entry says: at this exact view, this exact rule on this exact node is such an artefact, and here is the
 * measurement that shows it. It is matched on all four of those, so it cannot quietly cover a second node, a
 * second rule or a second width, and like `TEXT_SCALE_PENDING` it is asserted to be NEEDED — the run fails if
 * the finding stops being observed, which is what stops a ratchet becoming an exemption.
 *
 * It is NOT a way to carry a real contrast failure. Only a finding whose true ratio has been measured against
 * the background the reader actually sees belongs here, with that number in `why`.
 */
const AXE_ARTIFACTS = new Map([
  [
    "/create",
    [
      {
        view: "dark/laptop/text100%",
        rule: "color-contrast",
        node: ".text-destructive",
        // The `laptop` width found this on its first run. At 1024px the preview frame is 574px wide
        // (x 417–991) while the dashboard scene inside it paints its Metric trend at x 974–1019: 28px past
        // the frame's `overflow-hidden` edge, so the reader never sees it and `elementsFromPoint` at its
        // centre returns `main` and `body`. axe therefore measured #c70a0a on the page's #050b10 and got
        // 3.27. Against the white card the element is actually inside, the same two colours measure
        // **6.04**, which passes AA at 12px. There is no contrast defect here.
        //
        // The clipping IS a defect, and it is not this gate's: the preview scene's `sm-rem:` classes are
        // viewport media queries, so a 574px frame at a 1024px viewport is asked to lay out the desktop
        // arrangement. Nothing currently measures content painted outside its own clip, at any width.
        why: "node painted 28px outside its clipping frame; true ratio against its white card is 6.04:1",
        // The ratio above is re-measured on every run against the backdrop the node is really drawn over,
        // and the entry fails if it moves. Without it the entry excuses the finding on the mechanism alone:
        // a node still outside its clip, still reported by axe, but now genuinely illegible where it is
        // painted, would keep the same key and stay silent. Measured by hand once; asserted from here on.
        trueRatio: 6.04,
      },
    ],
  ],
]);

/** Marks an artefact entry as still earned; an unseen entry fails the run at the end. */
const artifactsSeen = new Set();
const artifactKey = (path, i) => `${path}#${i}`;

/**
 * Is every element this selector matches unable to be hit-tested at its own centre?
 *
 * This is the condition an `AXE_ARTIFACTS` entry rests on, asked of the live page rather than read from
 * the entry's note. axe's `color-contrast` resolves a background with `elementsFromPoint` at the node's
 * centre; when the node is laid out outside a clipping ancestor, nothing is painted there, the hit test
 * returns the node's ANCESTORS instead of the node, and axe compares the text against a background it is
 * never drawn on. If the node CAN be hit at its own centre, that is not happening: axe sampled what the
 * reader actually sees, and the finding is a measurement rather than an artefact, whatever the entry says.
 *
 * Every match is checked, not the first. An axe selector for a single node is normally specific, but a
 * bare class like `.text-destructive` can match several elements, and the suppression must not rest on
 * whichever one `querySelector` happens to return. One hittable match disqualifies the entry: the bias is
 * towards reporting.
 */
async function unhittableAtItsCentre(page, selector) {
  return page.evaluate((sel) => {
    const els = [...document.querySelectorAll(sel)];
    if (!els.length) return { held: false, why: `no element matches \`${sel}\` any more` };
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue; // no box, so nothing axe could have sampled
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Off-viewport is equally unhittable, and for the same reason: `elementsFromPoint` returns nothing there.
      if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) continue;
      // The node itself, or anything inside it, being at that point means the node IS painted there.
      if (document.elementsFromPoint(cx, cy).some((n) => n === el || el.contains(n))) {
        let clip = null;
        for (let a = el.parentElement; a && !clip; a = a.parentElement) {
          if (getComputedStyle(a).overflow !== "visible") clip = a;
        }
        return {
          held: false,
          why:
            `the node is now painted at its own centre (${Math.round(cx)}, ${Math.round(cy)}), so axe sampled the ` +
            `background the reader really sees` +
            (clip ? `; its nearest clipping ancestor is \`${clip.tagName.toLowerCase()}\`` : `; it has no clipping ancestor`),
        };
      }
    }
    return { held: true, why: "the node cannot be hit at its own centre" };
  }, selector);
}

/**
 * The contrast ratio the reader really gets on one node, and the ratio WCAG AA asks of it.
 *
 * `unhittableAtItsCentre` establishes that axe sampled the wrong background. It says nothing about what the
 * right background is, so on its own it excuses a finding on the mechanism alone: a node still outside its
 * clip, still reported, but now genuinely illegible where it IS painted, would keep the same key and stay
 * silent. This measures the other half — the backdrop the node is drawn over in its own layout position.
 *
 * The backdrop is composited the way the painter does it: background colours from the node outwards until
 * one is opaque, then laid back over each other in that order. A background IMAGE anywhere in that stack
 * ends the measurement rather than guessing a colour from it, and so does running out of ancestors without
 * an opaque layer: both report, because an entry that cannot be measured has not earned its silence.
 */
async function trueContrast(page, selector) {
  return page.evaluate((sel) => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = "1"] = m[1].split(",").map((x) => x.trim());
      return { r: +r, g: +g, b: +b, a: +a };
    };
    const over = (top, bottom) => ({
      r: top.r * top.a + bottom.r * (1 - top.a),
      g: top.g * top.a + bottom.g * (1 - top.a),
      b: top.b * top.a + bottom.b * (1 - top.a),
      a: 1,
    });
    const luminance = ({ r, g, b }) => {
      const ch = [r, g, b].map((v) => {
        const x = v / 255;
        return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    };
    const ratio = (a, b) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    const measured = [];
    for (const el of document.querySelectorAll(sel)) {
      const cs = getComputedStyle(el);
      const fg = parse(cs.color);
      if (!fg) return { ok: false, why: `cannot parse the node's colour \`${cs.color}\`` };

      const layers = [];
      let base = null;
      for (let n = el; n; n = n.parentElement) {
        const ns = getComputedStyle(n);
        if (ns.backgroundImage !== "none") {
          return {
            ok: false,
            why: `\`${n.tagName.toLowerCase()}\` behind the node paints a background image, so the ratio the reader gets cannot be measured from colours alone`,
          };
        }
        const bg = parse(ns.backgroundColor);
        if (!bg || bg.a === 0) continue;
        layers.push(bg);
        if (bg.a === 1) {
          base = bg;
          break;
        }
      }
      if (!base) return { ok: false, why: "no opaque background behind the node, so its backdrop is undefined" };
      // layers[] runs innermost-first; composite outermost-inwards so the node's own background lands last.
      let backdrop = base;
      for (let i = layers.length - 2; i >= 0; i--) backdrop = over(layers[i], backdrop);

      // AA: 4.5:1, or 3:1 for large text (>=24px, or >=18.66px when bold).
      const px = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const required = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
      measured.push({
        ratio: Math.round(ratio(fg, backdrop) * 100) / 100,
        required,
        px,
        backdrop: `rgb(${[backdrop.r, backdrop.g, backdrop.b].map(Math.round).join(" ")})`,
      });
    }
    if (!measured.length) return { ok: false, why: `no element matches \`${sel}\` any more` };
    // The worst match decides, for the same reason every match is hit-tested: one illegible node is enough.
    measured.sort((a, b) => a.ratio - b.ratio);
    return { ok: true, ...measured[0] };
  }, selector);
}

/** The matching entry for one axe violation in one view, or undefined. */
function axeArtifactFor(path, view, v) {
  const entries = AXE_ARTIFACTS.get(path);
  if (!entries) return undefined;
  const i = entries.findIndex((e) => e.view === view && e.rule === v.id && v.count === 1 && v.nodes[0] === e.node);
  if (i === -1) return undefined;
  artifactsSeen.add(artifactKey(path, i));
  return entries[i];
}

/**
 * Per-page layout contracts: regions that must still be usable, not merely free of sideways scroll.
 *
 * #278 taught that a page can pass the overflow check and still be unusable, and /create proved it.
 * At 1280px/200% text its two-column grid resolved to `[832px 256px]`, and inside that 254px pane the
 * preview scene still laid itself out as a desktop app: its cards rendered **2px** wide around 299px
 * of content, and the Table wrapper 0px. `document.scrollWidth === clientWidth` throughout — the page
 * did not overflow, because the content was being crushed instead of pushed. An overflow check cannot
 * see that, by construction: crushing is the opposite failure.
 *
 * The assertion is deliberately NOT a pixel minimum for cards in general. Different pages give a card
 * different room for good reasons, and a universal floor would be a number invented here rather than a
 * property of the page. What it asserts instead is a relationship the element states about itself:
 *
 *     a box that cannot scroll must show at least half of its own content.
 *
 * A Card is a content box, not a scroll container — nothing about it offers the reader a way to reach
 * what it does not show, so content past its edge is content that does not exist for them. A scroll
 * container is exempt by the same logic and is not matched here: `Table`'s wrapper is allowed to be
 * narrower than its table, which is the whole point of the contract #279 established for it.
 *
 * Measured separation is wide, so the threshold is not doing delicate work: the collapse produced
 * ratios of 0.00 (1280px and 1440px) and 0.26 (768px), while the same cards after the fix measure
 * 0.79–1.00, as do all eight 100%-text views.
 */
const LAYOUT_CONTRACTS = new Map([
  [
    "/create",
    {
      // `.bg-card` is the Card component's own surface token, so this follows the component rather
      // than a layout class someone might restyle. Selection is by class; the ASSERTION below is
      // rendered geometry.
      selector: "section[aria-labelledby='create-preview-heading'] .bg-card",
      // The preview scene always draws several cards. Requiring a minimum match count is what stops
      // this silently passing if the markup is reshaped and the selector stops matching — a guard
      // that measures nothing would otherwise look exactly like a guard that found nothing wrong.
      minMatches: 3,
      minContentRatio: 0.5,
      what: "a card in the Create preview must show at least half of its own content",
    },
  ],
]);

/**
 * Navigation contracts: what a reader must be able to reach on a page at every swept width, measured as rendered
 * visibility rather than read from class names.
 *
 *   search   the site search trigger. It used to be `hidden` below 640px, so phones had no site search at all.
 *   docs     on /docs/*, either the docs sidebar or the menu that carries the docs groups. The sidebar appears at
 *            `lg` and the menu used to disappear at `md`, so 768–1023px had neither.
 *
 * Both are checked at every width and text size because both regressions were breakpoint arithmetic, and the
 * band where they fail is exactly the one a desktop-only look never visits.
 */
const isDocsPage = (path) => path === "/docs" || path.startsWith("/docs/");

/**
 * The docs reading column against the navigation rails beside it.
 *
 * `/create` taught that a page can pass the overflow check and still be unusable because its content is being
 * crushed rather than pushed. The docs layout had the same failure in a different shape, and the per-element
 * content ratio above cannot see it: prose wraps, so a 128px article has `scrollWidth === clientWidth` and
 * measures perfectly healthy element by element. What is wrong is how the row was divided. Measured on the
 * commit before this one, at 1280px with a 32px default font size:
 *
 *     sidebar 448px   article 128px   table of contents 448px
 *
 * Both rails are sized in `rem` and doubled with the reader's text; the `lg`/`xl` media queries that decided to
 * show them are in `px` and could not see that the text had doubled, so the layout kept a three-column desktop
 * composition and gave the documentation the narrowest third of it.
 *
 * The assertion is a comparison and not a pixel floor. A floor would be a number invented here, and it would be
 * wrong at 320px, where a narrow column is the screen being narrow rather than the layout being broken. What the
 * page can be held to at every width is the relationship it is making a claim about:
 *
 *     the documentation is never narrower than the navigation beside it.
 *
 * Only rails that are actually rendered count, so a width where the sidebar is hidden simply has less to beat.
 * Separation is wide and not delicate: the broken view measures 0.29 of its widest rail, every view after the
 * fix measures 2.0 or more, and the three-column views at the default text size are unchanged at 3.1.
 */
const DOCS_COLUMN_MIN_RATIO = 1;

/**
 * The width at which the docs layout renders both rails, for a reader at this text size.
 *
 * The contract above is only worth anything in a view that actually renders a rail, and at 200% text none of the
 * swept widths does: the rails appear at `lg-rem`/`xl-rem`, which are 2048px and 2560px once the root is 32px, and
 * the widest swept viewport is 1280px. Every enlarged-text view would therefore meet no rail, score `Infinity` and
 * pass without having looked at the composition the contract is about.
 *
 * So on docs pages the desktop view is measured a second time, in a viewport scaled the way the breakpoints are.
 * At the default text size that is 1280px, the width already being swept, and the second measurement is the same
 * measurement. At 200% it is 2560px, which is where the three-column layout comes back for that reader — and where
 * a real defect was hiding: `max-w-screen-2xl` is a flat 1536px, so the row was divided inside a container that had
 * not grown with the columns, and the article measured 384px beside a 448px table of contents. Resizing the open
 * page costs no navigation, which is why this is a resize rather than a fifth entry in WIDTHS.
 */
const DOCS_RAIL_WIDTH = 1280;

const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const failures = [];
const pendingSeen = new Set();
let views = 0;

for (const scheme of SCHEMES) {
  for (const [widthName, width, height] of WIDTHS) {
    for (const scale of TEXT_SCALES) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: "reduce" });
      for (const path of ONLY_PAGES ?? PAGES) {
        // A pending page is still SWEPT. Review caught that skipping it before navigation also skipped
        // the root-size assertion, axe and the overflow check at every width and theme, so its known
        // overflow would have masked a new axe violation, or extra overflow at another width. Only the
        // overflow finding itself is excused below, and only on a page named in the ratchet.
        const overflowPending = scale !== 1 && TEXT_SCALE_PENDING.has(path);
        const page = await context.newPage();
        const tag = `${scheme}/${widthName}/text${scale * 100}% ${path}`;
        try {
          if (scale !== 1) {
            // Per page, and before navigating: the setting belongs to the renderer, and a page that has already
            // laid out at the default size would have to be reloaded for it to take effect.
            const cdp = await context.newCDPSession(page);
            await cdp.send("Page.enable");
            await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * scale, fixed: 13 * scale } });
          }
          const response = await page.goto(base + path, { waitUntil: "load" });
          if (!response || !response.ok()) {
            failures.push(`${tag}: HTTP ${response ? response.status() : "no response"}`);
            continue;
          }
          await page.waitForTimeout(600); // hydration + reveal animations settle
          // The root size is asserted rather than trusted: if `setFontSizes` ever stopped taking effect, every
          // text200% view would quietly pass by measuring the default size again, which is the exact shape of
          // false green this axis exists to remove.
          const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
          if (Math.abs(rootPx - 16 * scale) > 0.5) {
            failures.push(`${tag}: root font-size is ${rootPx}px, expected ${16 * scale}px — the text-size axis is not being applied`);
            continue;
          }
          await page.addScriptTag({ content: axeSource });
          const result = await page.evaluate(async ({ docs, ...contract }) => {
            const r = await window.axe.run(document, { rules: { region: { enabled: false } } });
            return {
              violations: r.violations.map((v) => ({
                id: v.id,
                help: v.help,
                nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
                count: v.nodes.length,
              })),
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              layout: contract.selector
                ? (() => {
                    const nodes = [...document.querySelectorAll(contract.selector)];
                    const crushed = nodes
                      .map((el) => ({
                        client: el.clientWidth,
                        content: el.scrollWidth,
                        ratio: el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1,
                        text: (el.textContent || "").trim().slice(0, 40),
                      }))
                      .filter((m) => m.content > 0 && m.ratio < contract.minContentRatio);
                    return { matched: nodes.length, crushed: crushed.slice(0, 3), crushedCount: crushed.length };
                  })()
                : null,
              // Rails are measured by their rendered box, not by their classes: a rail hidden at this width has
              // no box and nothing to beat, which is the correct reading of "the navigation beside it".
              docsColumn: docs
                ? (() => {
                    const article = document.querySelector("[data-docs-content]");
                    if (!article) return { found: false };
                    const rails = [...document.querySelectorAll("[data-docs-rail]")]
                      .map((el) => ({ name: el.getAttribute("data-docs-rail"), width: Math.round(el.getBoundingClientRect().width) }))
                      .filter((r) => r.width > 0);
                    const widest = rails.reduce((m, r) => (r.width > m.width ? r : m), { name: "none", width: 0 });
                    const a = Math.round(article.getBoundingClientRect().width);
                    return { found: true, article: a, rails, widest, ratio: widest.width > 0 ? a / widest.width : Infinity };
                  })()
                : null,
            };
          }, { ...(LAYOUT_CONTRACTS.get(path) ?? { selector: null }), docs: isDocsPage(path) });
          views++;
          const reach = await page.evaluate(() => {
            const shown = (el) => {
              if (!el) return false;
              const r = el.getBoundingClientRect();
              const cs = getComputedStyle(el);
              return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
            };
            const header = document.querySelector("header");
            const buttons = header ? [...header.querySelectorAll("button")] : [];
            const named = (re) => buttons.some((b) => re.test((b.getAttribute("aria-label") || b.textContent || "").trim()) && shown(b));
            return {
              search: named(/^Search/),
              menu: named(/^Menu$/),
              sidebar: shown(document.querySelector('nav[aria-label="Documentation"]')),
            };
          });
          if (!reach.search) failures.push(`${tag}: no visible site search trigger in the header`);
          if (isDocsPage(path) && !reach.sidebar && !reach.menu) {
            failures.push(`${tag}: no docs navigation — neither the sidebar nor the menu button is visible`);
          }
          for (const v of result.violations) {
            const artifact = axeArtifactFor(path, tag.split(" ")[0], v);
            if (artifact) {
              // Matching on view, rule and node proves the finding still OCCURS. It does not prove the
              // finding is still an ARTEFACT: that rests on a ratio measured by hand once, and a layout
              // change could move this node back under the pointer while leaving it on a dark surface —
              // same selector, same rule, same view, now a real contrast failure, silently excused. So the
              // condition is asserted against the page before anything is suppressed.
              const clip = await unhittableAtItsCentre(page, artifact.node);
              // Both halves of the claim, or the finding is reported. The mechanism (axe sampled a
              // background the node is not drawn on) and the consequence (where it IS drawn, the reader
              // gets the ratio this entry recorded) are separate facts, and either can stop being true on
              // its own.
              const real = clip.held ? await trueContrast(page, artifact.node) : null;
              const drift = real?.ok ? Math.abs(real.ratio - artifact.trueRatio) : 0;
              const why = !clip.held
                ? clip.why
                : !real.ok
                  ? real.why
                  : real.ratio < real.required
                    ? `where it is painted the reader gets ${real.ratio}:1 on ${real.backdrop}, below the ${real.required}:1 AA asks of ${real.px}px text`
                    : drift > 0.05
                      ? `where it is painted the reader now gets ${real.ratio}:1 on ${real.backdrop}, not the ${artifact.trueRatio}:1 this entry recorded`
                      : null;
              if (!why) continue;
              failures.push(
                `${tag}: ${v.id} ×${v.count} — ${v.help} (${v.nodes.join(" | ")}) ` +
                  `— AXE_ARTIFACTS excuses this as a background-resolution artefact, but ${why}. ` +
                  `Re-measure it: the entry's recorded "${artifact.why}" no longer describes this page.`,
              );
              continue;
            }
            failures.push(`${tag}: ${v.id} ×${v.count} — ${v.help} (${v.nodes.join(" | ")})`);
          }
          const contract = LAYOUT_CONTRACTS.get(path);
          if (contract && result.layout) {
            if (result.layout.matched < contract.minMatches) {
              failures.push(
                `${tag}: layout contract matched only ${result.layout.matched} element(s) for \`${contract.selector}\`, ` +
                  `expected at least ${contract.minMatches} — the guard is measuring nothing, which is not the same as passing`,
              );
            } else if (result.layout.crushedCount > 0) {
              failures.push(
                `${tag}: ${result.layout.crushedCount} of ${result.layout.matched} crushed — ${contract.what}; ` +
                  result.layout.crushed
                    .map((c) => `${c.client}px shown of ${c.content}px (${c.ratio.toFixed(2)}) "${c.text}"`)
                    .join(" | "),
              );
            }
          }
          if (isDocsPage(path) && widthName === "desktop" && width !== DOCS_RAIL_WIDTH * scale) {
            // Same page, same text size, a viewport wide enough for this reader to be shown the rails.
            await page.setViewportSize({ width: DOCS_RAIL_WIDTH * scale, height });
            await page.waitForTimeout(200);
            const wide = await page.evaluate(() => {
              const article = document.querySelector("[data-docs-content]");
              if (!article) return { found: false };
              const rails = [...document.querySelectorAll("[data-docs-rail]")]
                .map((el) => ({ name: el.getAttribute("data-docs-rail"), width: Math.round(el.getBoundingClientRect().width) }))
                .filter((r) => r.width > 0);
              const widest = rails.reduce((m, r) => (r.width > m.width ? r : m), { name: "none", width: 0 });
              const a = Math.round(article.getBoundingClientRect().width);
              return { found: true, article: a, rails, widest, ratio: widest.width > 0 ? a / widest.width : Infinity };
            });
            if (!wide.found) {
              failures.push(`${scheme}/${DOCS_RAIL_WIDTH * scale}px/text${scale * 100}% ${path}: no \`[data-docs-content]\` article found`);
            } else if (wide.widest.width === 0) {
              failures.push(
                `${scheme}/${DOCS_RAIL_WIDTH * scale}px/text${scale * 100}% ${path}: no docs rail rendered at the width the ` +
                  `breakpoints name — this re-measurement is measuring nothing, so either the breakpoints or ` +
                  `DOCS_RAIL_WIDTH has moved and this contract is no longer exercising the multi-column layout`,
              );
            } else if (wide.ratio < DOCS_COLUMN_MIN_RATIO) {
              failures.push(
                `${scheme}/${DOCS_RAIL_WIDTH * scale}px/text${scale * 100}% ${path}: the docs reading column is ` +
                  `${wide.article}px against a ${wide.widest.width}px ${wide.widest.name} rail (${wide.ratio.toFixed(2)}) — ` +
                  `the navigation has more of the page than the documentation ` +
                  `[${wide.rails.map((r) => `${r.name} ${r.width}px`).join(", ")}]`,
              );
            }
            await page.setViewportSize({ width, height });
          }
          if (isDocsPage(path)) {
            const c = result.docsColumn;
            if (!c || !c.found) {
              failures.push(
                `${tag}: no \`[data-docs-content]\` article found — this contract is measuring nothing, which is ` +
                  `not the same as finding nothing wrong`,
              );
            } else if (c.ratio < DOCS_COLUMN_MIN_RATIO) {
              failures.push(
                `${tag}: the docs reading column is ${c.article}px against a ${c.widest.width}px ${c.widest.name} rail ` +
                  `(${c.ratio.toFixed(2)}) — the navigation has more of the page than the documentation ` +
                  `[${c.rails.map((r) => `${r.name} ${r.width}px`).join(", ") || "no rails rendered"}]`,
              );
            }
          }
          if (result.overflow > 0) {
            if (overflowPending) pendingSeen.add(path);
            else failures.push(`${tag}: page scrolls sideways by ${result.overflow}px`);
          }
        } catch (err) {
          failures.push(`${tag}: ${String(err.message).split("\n")[0]}`);
        } finally {
          await page.close();
        }
      }
      await context.close();
    }
  }
}
// Every pending entry must still be earned. A page fixed and left on the list would otherwise keep its
// exemption for ever, which is how a ratchet quietly becomes an exemption.
//
// `pendingSeen` is now populated by the sweep itself — the page is visited at every width and theme like
// any other, and the entry is marked only when real overflow was actually observed. That is strictly
// stronger than the earlier separate re-check at one width in one theme, and it means a pending page's
// axe results and its other widths are no longer skipped.
/**
 * Both ratchets below assert that an entry is still EARNED, which only one kind of run can judge.
 *
 * A `--page` run visits a subset, so a page it never opened cannot have been observed, and demanding the
 * observation would fail every targeted run — including the negative controls, which is how this was found.
 * The membership check still applies either way: an entry naming a page that is not in PAGES is wrong
 * whatever was swept.
 */
const swept = (path) => (ONLY_PAGES ?? PAGES).includes(path);

for (const [path, why] of TEXT_SCALE_PENDING) {
  if (!PAGES.includes(path)) {
    failures.push(`${path}: listed in TEXT_SCALE_PENDING but not in PAGES — remove the entry or the page`);
  } else if (swept(path) && !pendingSeen.has(path)) {
    failures.push(`${path}: no longer overflows at 200% text in any swept view — delete it from TEXT_SCALE_PENDING (was: ${why})`);
  }
}

// Same ratchet as TEXT_SCALE_PENDING: an artefact entry that no longer matches anything is a line claiming a
// finding the sweep cannot find, which is indistinguishable from an exemption nobody is checking.
for (const [path, entries] of AXE_ARTIFACTS) {
  if (!PAGES.includes(path)) {
    failures.push(`${path}: listed in AXE_ARTIFACTS but not in PAGES — remove the entry or the page`);
    continue;
  }
  if (!swept(path)) continue;
  entries.forEach((e, i) => {
    if (!artifactsSeen.has(artifactKey(path, i))) {
      failures.push(
        `${path}: the ${e.rule} finding on \`${e.node}\` at ${e.view} no longer occurs — delete it from ` +
          `AXE_ARTIFACTS (was: ${e.why})`,
      );
    }
  });
}

await browser.close();

if (failures.length) {
  console.error(`✗ ${failures.length} finding(s) across ${views} page views:\n` + failures.map((f) => `  ${f}`).join("\n"));
  process.exit(1);
}
console.log(
  `a11y-site ok — ${(ONLY_PAGES ?? PAGES).length} pages × ${SCHEMES.length} themes × ${WIDTHS.length} widths × ${TEXT_SCALES.length} text sizes ` +
    `(${views} views): no axe findings, no horizontal overflow, ${LAYOUT_CONTRACTS.size} layout contract(s) held, ` +
    `site search and docs navigation reachable at every width, and the docs reading column never narrower ` +
    `than the navigation rails beside it, measured both at the swept widths and at ${DOCS_RAIL_WIDTH}px × the text ` +
    `scale, where this reader is shown those rails.` +
    (TEXT_SCALE_PENDING.size
      ? `\n  ${TEXT_SCALE_PENDING.size} page(s) pending at 200% text, each verified to still need it: ` +
        [...TEXT_SCALE_PENDING.keys()].join(", ")
      : ""),
);
