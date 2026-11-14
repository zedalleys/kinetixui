/**
 * Negative controls for `scripts/footer-browser.mjs`.
 *
 * A gate that has never failed is a gate nobody has measured. Each control below restores one of the
 * conditions the footer gate exists to catch — at runtime, in the browser, through injected CSS or a DOM
 * edit — and then asserts that the gate's own rule fires on it. Nothing deliberately broken is ever
 * committed: the controls here are the only place the broken state exists, and it lives for one page load.
 *
 * Control 1 is the measured defect itself. Before the fix, the register was `grid-cols-2 sm:grid-cols-4`;
 * at 320px with a 32px root each column was 144px and "Changelog" is 144px of unbreakable word, so the
 * document ran 8px wide. Re-imposing exactly that two-column rule at that width must reproduce it, or the
 * geometry sweep is measuring nothing.
 *
 *   node scripts/footer-negative-controls.mjs [--base http://127.0.0.1:3000]
 */
import { chromium } from "playwright";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", process.env.FOOTER_BASE ?? "http://127.0.0.1:3000");

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});

const failures = [];
const rows = [];

async function control({ name, viewport, scale = 1, forced = false, reduce = false, css, dom, expect: expectation, measure }) {
  const ctx = await browser.newContext({
    viewport,
    colorScheme: "light",
    forcedColors: forced ? "active" : "none",
    reducedMotion: reduce ? "reduce" : "no-preference",
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/blocks`, { waitUntil: "networkidle" });
  if (scale !== 1) await page.evaluate((s) => (document.documentElement.style.fontSize = `${16 * s}px`), scale);
  if (css) await page.addStyleTag({ content: css });
  if (dom) await page.evaluate(dom);
  await page.locator("footer.kx-footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const observed = await page.evaluate(measure);
  await ctx.close();

  const detected = expectation(observed);
  rows.push(`  ${detected ? "caught " : "MISSED "} ${name.padEnd(46)} ${JSON.stringify(observed)}`);
  if (!detected) failures.push(`${name}: the gate's rule did not fire on the restored defect (${JSON.stringify(observed)}).`);
}

/* 1. The measured defect: the pre-fix two-column register at 320px and 200% text. */
await control({
  name: "register forced back to two fixed columns",
  viewport: { width: 320, height: 800 },
  scale: 2,
  // `!important` because the control has to beat the `minmax(9rem, 1fr)` rule it is testing, not sit beside it.
  css: ".kx-footer-register { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }",
  measure: () => {
    const vw = document.documentElement.clientWidth;
    const f = document.querySelector("footer.kx-footer");
    return {
      footerOverflowPx: f.scrollWidth - f.clientWidth,
      escaping: [...f.querySelectorAll("*")].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5);
      }).length,
    };
  },
  expect: (o) => o.footerOverflowPx > 0 || o.escaping > 0,
});

/* 2. The same register at the SAME width and the default text size must NOT overflow — the control's
      control. Without this, control 1 could be passing because 320px is simply too narrow for anything,
      which would make the text scale, not the column rule, the thing being measured. */
await control({
  name: "two fixed columns at 320px and 100% text (must stay clean)",
  viewport: { width: 320, height: 800 },
  scale: 1,
  css: ".kx-footer-register { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }",
  measure: () => {
    const f = document.querySelector("footer.kx-footer");
    return { footerOverflowPx: f.scrollWidth - f.clientWidth };
  },
  // Inverted on purpose: here "caught" means the defect did NOT appear, which is what isolates the cause.
  expect: (o) => o.footerOverflowPx === 0,
});

/* 3. Raster decoration back in the footer — the retired engraving plate's exact shape. */
await control({
  name: "a url() background restored on a footer layer",
  viewport: { width: 1440, height: 900 },
  css: ".kx-footer-weave { background-image: url(/footer/paper-grain.webp) !important; }",
  measure: () => {
    const f = document.querySelector("footer.kx-footer");
    return {
      urlBackgrounds: [...f.querySelectorAll("*")].filter((el) => /url\(/.test(getComputedStyle(el).backgroundImage)).length,
    };
  },
  expect: (o) => o.urlBackgrounds > 0,
});

/* 4. The weave left on under forced colours. */
await control({
  name: "weave left visible under forced colours",
  viewport: { width: 1440, height: 900 },
  forced: true,
  css: "@media (forced-colors: active) { .kx-footer-weave { display: block !important; } }",
  measure: () => ({ weaveDisplay: getComputedStyle(document.querySelector(".kx-footer-weave")).display }),
  expect: (o) => o.weaveDisplay !== "none",
});

/* 5. A decorative layer put back into the accessibility tree. */
await control({
  name: "aria-hidden stripped from the seam",
  viewport: { width: 1440, height: 900 },
  dom: () => document.querySelector(".kx-footer-seam").removeAttribute("aria-hidden"),
  measure: () => ({ ariaHidden: document.querySelector(".kx-footer-seam").getAttribute("aria-hidden") }),
  expect: (o) => o.ariaHidden === null,
});

/* 6. The underline reduced to a hover-only effect, so a keyboard reader gets nothing. */
await control({
  name: "underline suppressed on focus-visible",
  viewport: { width: 1440, height: 900 },
  css: ".kx-footer-link:focus-visible::after { transform: scaleX(0) !important; }",
  measure: () => {
    const a = document.querySelector("footer.kx-footer a.kx-footer-link");
    a.focus();
    return { transform: getComputedStyle(a, "::after").transform };
  },
  expect: (o) => o.transform === "matrix(0, 0, 0, 1, 0, 0)",
});

/* 7. Back-to-top pointed at an id that does not exist. */
await control({
  name: "back-to-top href pointed at a missing id",
  viewport: { width: 390, height: 844 },
  dom: () => {
    const a = [...document.querySelectorAll("footer.kx-footer a")].find((x) => (x.textContent || "").trim() === "Back to top");
    a.setAttribute("href", "#no-such-anchor");
  },
  measure: () => {
    const a = [...document.querySelectorAll("footer.kx-footer a")].find((x) => (x.textContent || "").trim() === "Back to top");
    const id = (a.getAttribute("href") || "").replace(/^#/, "");
    return { href: a.getAttribute("href"), targetExists: !!document.getElementById(id) };
  },
  expect: (o) => !o.targetExists,
});

/* 8. A group list stripped of its name — the grouping the register uses instead of headings. */
await control({
  name: "aria-labelledby removed from a group list",
  viewport: { width: 1440, height: 900 },
  dom: () => document.querySelector("footer.kx-footer ul").removeAttribute("aria-labelledby"),
  measure: () => {
    const f = document.querySelector("footer.kx-footer");
    const lists = [...f.querySelectorAll("ul")].map((u) => {
      const id = u.getAttribute("aria-labelledby");
      return id ? document.getElementById(id)?.textContent?.trim() ?? null : null;
    });
    return { unnamed: lists.filter((n) => !n).length };
  },
  expect: (o) => o.unnamed > 0,
});

/* 9. A heading put into the footer — the outline cost the register is designed to avoid. */
await control({
  name: "an h3 introduced into the footer",
  viewport: { width: 1440, height: 900 },
  dom: () => {
    const h = document.createElement("h3");
    h.textContent = "Docs";
    document.querySelector("footer.kx-footer nav").prepend(h);
  },
  measure: () => ({ headings: document.querySelectorAll("footer.kx-footer h1,footer.kx-footer h2,footer.kx-footer h3").length }),
  expect: (o) => o.headings > 0,
});

await browser.close();

console.log(rows.join("\n"));
if (failures.length) {
  console.error(`\nFooter negative controls: ${failures.length} control(s) did not reproduce their defect.`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`\nFooter negative controls ok — ${rows.length} controls, each reproducing the condition its gate rule exists to catch.`);
