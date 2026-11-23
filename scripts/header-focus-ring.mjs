/**
 * Every focus stop in the site header has to draw the design system's own focus ring.
 *
 * WHY THIS GATE EXISTS. The header used to be the one region of the site whose keyboard affordance
 * came from the browser rather than from `--ring`: the wordmark and the eight numbered nav links set
 * no ring, so Chromium drew `outline: auto 1px` instead, while the three tools beside them drew the
 * token. Measured 2026-11-23: 9 of 12 stops at 1440px, in both colour schemes.
 *
 * That was never a WCAG failure — the UA ring is visible and follows the colour scheme, which is
 * precisely why `check:a11y-site` was silent across its 740 views and right to be. So no axe rule,
 * no contrast rule and no overflow rule can hold this. It needs its own assertion, and the
 * assertion has to be about PROVENANCE: not "is a ring drawn" but "is the drawn ring the token's".
 *
 * WHAT IT ASSERTS, per view:
 *   1. The tab order actually reaches the header, and reaches the wordmark. Without this the rest is
 *      vacuous — a zero-length list satisfies "every stop draws the ring". The first draft of the
 *      probe behind this gate reported "0 of 0 stops" in all three views and read as a clean pass.
 *   2. Every header focus stop paints `--ring`, resolved from the page rather than hard-coded, so
 *      the gate keeps working the next time the palette moves.
 *   3. Under forced colours, every stop still has an outline of at least 2px. The ring is a
 *      `box-shadow`, which forced colours discards, and the Tailwind pattern it follows also sets
 *      `outline: none` — together they would leave High Contrast readers with no indicator at all.
 *
 * Focus is reached by pressing Tab, never by calling `focus()`. A programmatic focus would satisfy
 * every assertion here while the element sat outside the tab order entirely.
 *
 * Usage:
 *   node scripts/header-focus-ring.mjs [--base http://127.0.0.1:3000]
 *   node scripts/header-focus-ring.mjs --controls          # prove the gate can fail
 *   node scripts/header-focus-ring.mjs --control <name>
 */
import { chromium } from "playwright";

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  return i === -1 ? fallback : argv[i + 1];
};
const base = arg("--base", "http://127.0.0.1:3000").replace(/\/$/, "");

const VIEWS = [
  { name: "320/light/ltr", width: 320, height: 640, dark: false, rtl: false },
  { name: "390/dark/ltr", width: 390, height: 844, dark: true, rtl: false },
  { name: "390/light/rtl", width: 390, height: 844, dark: false, rtl: true },
  { name: "768/light/ltr", width: 768, height: 900, dark: false, rtl: false },
  { name: "1440/light/ltr", width: 1440, height: 900, dark: false, rtl: false },
  { name: "1440/dark/ltr", width: 1440, height: 900, dark: true, rtl: false },
  { name: "1440/dark/rtl", width: 1440, height: 900, dark: true, rtl: true },
];

const TAB_LIMIT = 40;

/** Walk the real tab order and report every stop that is inside the header. */
const walkHeader = async (page) => {
  const walked = [];
  for (let i = 0; i < TAB_LIMIT; i += 1) {
    await page.keyboard.press("Tab");
    const stop = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      // `--ring` as the page itself resolves it, in the same colour serialization the computed
      // outline and shadow use, so the three are comparable as strings.
      //
      // `hsl(var(--ring))`, NOT `var(--ring)`. The token holds a bare HSL triplet — `246 68% 56%` —
      // which is how Tailwind consumes it, and which is not a colour on its own. The first version
      // of this gate wrote `color: var(--ring)`, so the declaration was invalid, `color` fell back
      // to the inherited foreground, and the comparison inverted: it matched exactly the stops
      // drawing the browser's ring (whose `outline-color` IS the foreground) and rejected the ones
      // painting the token. It reported "0 of 5 paint --ring" in light and "10 of 12" in dark on a
      // build where the repair was working. An instrument that is wrong in a way that looks like a
      // finding is worse than one that is silent.
      const probe = document.createElement("span");
      probe.style.color = "hsl(var(--ring))";
      document.documentElement.appendChild(probe);
      const ring = getComputedStyle(probe).color;
      probe.remove();
      if (!/^rgb/.test(ring)) {
        // If the token ever stops resolving, every comparison below becomes meaningless. Say so
        // rather than reporting whatever the mismatch happens to produce.
        throw new Error(`--ring did not resolve to a colour: ${JSON.stringify(ring)}`);
      }
      return {
        inHeader: Boolean(el.closest("header")),
        tag: el.tagName,
        label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 28),
        outlineStyle: cs.outlineStyle,
        outlineColor: cs.outlineColor,
        outlineWidth: cs.outlineWidth,
        boxShadow: cs.boxShadow,
        ring,
      };
    });
    if (!stop) continue;
    walked.push(stop);
    // Stop once the tab order has entered the header and left it again. Not on the FIRST stop
    // outside it: the skip link is rendered before the header and is always the first stop.
    if (!stop.inHeader && walked.some((w) => w.inHeader)) break;
  }
  return walked;
};

const paintsToken = (s) =>
  s.outlineColor === s.ring || (s.boxShadow !== "none" && s.boxShadow.includes(s.ring));

const run = async (mutate) => {
  const failures = [];
  const rows = [];
  const browser = await chromium.launch();

  for (const view of VIEWS) {
    for (const forced of [false, true]) {
      const ctx = await browser.newContext({
        viewport: { width: view.width, height: view.height },
        colorScheme: view.dark ? "dark" : "light",
        forcedColors: forced ? "active" : "none",
      });
      const page = await ctx.newPage();
      await page.goto(`${base}/`, { waitUntil: "networkidle" });
      if (view.rtl) {
        await page.evaluate(() => {
          document.documentElement.setAttribute("dir", "rtl");
        });
      }
      if (mutate) await page.evaluate(mutate);

      const walked = await walkHeader(page);
      const stops = walked.filter((s) => s.inHeader);
      const tag = `${view.name}${forced ? "/forced" : ""}`;

      // (1) Population, before any property of the population.
      if (stops.length === 0) {
        failures.push(
          `${tag}: ${walked.length} focus stops walked and none was inside <header> — the header ` +
            `is not in the tab order, or the gate measured nothing`,
        );
        rows.push({ tag, stops: 0, token: 0, outlined: 0 });
        await ctx.close();
        continue;
      }
      if (!stops.some((s) => s.label.includes("Kinetix"))) {
        failures.push(
          `${tag}: the tab order reached ${stops.length} header stop(s) but not the wordmark — ` +
            `the site's first focus stop is missing from the keyboard path`,
        );
      }

      if (forced) {
        // (3) Forced colours: the shadow is gone, so an outline has to be there instead.
        const bare = stops.filter(
          (s) => s.outlineStyle === "none" || parseFloat(s.outlineWidth) < 2,
        );
        if (bare.length) {
          failures.push(
            `${tag}: ${bare.length} of ${stops.length} header focus stops have no outline of at ` +
              `least 2px under forced colours — the ring is a box-shadow, which forced colours ` +
              `discards, so these stops show no focus at all (${bare.map((s) => JSON.stringify(s.label)).join(", ")})`,
          );
        }
        rows.push({
          tag,
          stops: stops.length,
          token: stops.filter(paintsToken).length,
          outlined: stops.length - bare.length,
        });
      } else {
        // (2) Provenance: the ring each stop paints has to be the token's.
        const foreign = stops.filter((s) => !paintsToken(s));
        if (foreign.length) {
          failures.push(
            `${tag}: ${foreign.length} of ${stops.length} header focus stops do not paint --ring ` +
              `(${foreign.map((s) => JSON.stringify(s.label)).join(", ")}) — they fall back to the ` +
              `browser's own ring, which ignores the theme's ring colour and differs per browser`,
          );
        }
        rows.push({
          tag,
          stops: stops.length,
          token: stops.length - foreign.length,
          outlined: stops.filter((s) => s.outlineStyle !== "none").length,
        });
      }

      await ctx.close();
    }
  }

  await browser.close();
  return { failures, rows };
};

const CONTROLS = {
  "nav-links-lose-the-ring": {
    why: "the eight numbered nav links go back to the browser's ring, the state measured on main",
    expect: /do not paint --ring/,
    mutate: () => {
      document.querySelectorAll("header nav a").forEach((a) => {
        a.className = a.className
          .split(" ")
          .filter((c) => !c.startsWith("focus-visible:") && c !== "kx-header-focus")
          .join(" ");
      });
    },
  },
  "wordmark-loses-the-ring": {
    why: "only the wordmark regresses — the one stop present in every view, including the small screens where the nav is hidden",
    expect: /do not paint --ring/,
    mutate: () => {
      const a = document.querySelector('header a[href="/"]');
      a.className = a.className
        .split(" ")
        .filter((c) => !c.startsWith("focus-visible:") && c !== "kx-header-focus")
        .join(" ");
    },
  },
  "header-leaves-the-tab-order": {
    why: "the header becomes unreachable by keyboard — the population failure that would otherwise make every assertion above vacuously true",
    expect: /none was inside <header>/,
    mutate: () => {
      document
        .querySelectorAll("header a, header button")
        .forEach((el) => el.setAttribute("tabindex", "-1"));
    },
  },
  "forced-colours-outline-removed": {
    why: "the forced-colours fallback is deleted, leaving High Contrast readers with a box-shadow that forced colours has already thrown away",
    expect: /no outline of at least 2px under forced colours/,
    mutate: () => {
      const s = document.createElement("style");
      s.textContent = "@media (forced-colors: active){.kx-header-focus:focus-visible{outline:none !important}}";
      document.head.appendChild(s);
    },
  },
};

if (argv.includes("--controls") || argv.includes("--control")) {
  const only = arg("--control", null);
  const names = only ? [only] : Object.keys(CONTROLS);
  console.log("header-focus-ring — negative controls\n");
  let bad = 0;
  for (const name of names) {
    const c = CONTROLS[name];
    if (!c) {
      console.log(`  UNKNOWN   ${name}`);
      bad += 1;
      continue;
    }
    const { failures } = await run(c.mutate);
    const hit = failures.find((f) => c.expect.test(f));
    if (!failures.length) {
      console.log(`  SILENT     ${name.padEnd(32)} ${c.why}`);
      bad += 1;
    } else if (!hit) {
      console.log(`  OFF TARGET ${name.padEnd(32)} ${c.why}`);
      console.log(`             ↳ fired, but not on its own assertion: ${failures[0]}`);
      bad += 1;
    } else {
      console.log(`  ON TARGET  ${name.padEnd(32)} ${c.why}`);
      console.log(`             ↳ ${hit}`);
    }
  }
  console.log(
    bad
      ? `\n${bad} control(s) did not fire on their own assertion — the gate does not protect what it claims to.`
      : `\nall ${names.length} controls fired on their own assertion — each protected regression is detected.`,
  );
  process.exit(bad ? 1 : 0);
}

const { failures, rows } = await run(null);
console.log("header-focus-ring — the site header's keyboard affordance\n");
console.log("  view                      stops  paint --ring  outlined");
for (const r of rows) {
  console.log(
    `  ${r.tag.padEnd(24)} ${String(r.stops).padStart(5)} ${String(r.token).padStart(13)} ${String(r.outlined).padStart(9)}`,
  );
}
if (failures.length) {
  console.log(`\nheader-focus-ring — ${failures.length} finding(s):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`\nheader-focus-ring ok — ${rows.length} view(s), every header focus stop draws --ring, and keeps an outline under forced colours.`);
