/**
 * Negative controls for the empty-match blind spot.
 *
 * A Playwright locator that matches nothing does not throw from `evaluateAll`: it resolves `[]`, and
 * `[].every(...)` is `true`. The same holds for `[...el.querySelectorAll(s)]` inside `page.evaluate`, and
 * for any check shaped as "count the offenders, expect zero". So an assertion written over a collection
 * passes most loudly when the collection is gone — which is the regression it was written to catch.
 *
 * Part one measures that mechanism in a real browser, on a page that deliberately contains none of the
 * elements, so the reason the guards exist is evidence and not an argument.
 *
 * Part two pins the four call sites that were repaired. A guard that can be deleted without anything going
 * red is not a guard, and the file that holds the guard cannot be the only thing that knows it is needed.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const failures = [];
let checks = 0;
const expectThat = (ok, msg) => {
  checks += 1;
  if (!ok) failures.push(msg);
};

/* ── part one: the mechanism, measured ──────────────────────────────────── */

const EMPTY_PAGE = `<!doctype html><html><body>
  <div role="radiogroup" aria-label="Rate the venue"></div>
  <section id="block"><p>a reading with no bdi run and no glyph</p></section>
  <div id="field"></div>
</body></html>`;

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
});
try {
  const page = await browser.newPage();
  await page.setContent(EMPTY_PAGE);

  const stars = page
    .getByRole("radiogroup", { name: "Rate the venue" })
    .getByRole("radio");
  expectThat(
    (await stars.count()) === 0,
    "the control page should expose no star",
  );
  expectThat(
    (await stars.evaluateAll((rs) => rs.every((r) => r.disabled))) === true,
    "unguarded: `evaluateAll` over zero radios should have resolved true, which is the defect being controlled for",
  );

  const runs = await page
    .locator("#block")
    .evaluate((el) =>
      [...el.querySelectorAll("bdi")].map((b) => getComputedStyle(b).direction),
    );
  expectThat(
    runs.length === 0 && runs.every((d) => d === "ltr") === true,
    "unguarded: `[].every` over zero <bdi> runs should have resolved true",
  );

  const lost = await page
    .locator("#block")
    .evaluate(
      (el) =>
        [...el.querySelectorAll("svg[data-glyph]")].filter(() => true).length,
    );
  expectThat(
    lost === 0,
    "unguarded: counting offenders among zero glyphs should have resolved zero",
  );

  const steppers = await page
    .locator("#field button")
    .evaluateAll((els) => els.every((e) => e.disabled));
  expectThat(
    steppers === true,
    "unguarded: `evaluateAll` over zero steppers should have resolved true",
  );

  // and the guarded shape refuses the same page
  expectThat(
    (await page.locator("#field button").count()) === 0,
    "the control page should expose no stepper",
  );
} finally {
  await browser.close();
}

/* ── part two: the four repaired call sites still carry their guard ──────── */

const SITES = [
  {
    file: "scripts/angular-browser.mjs",
    guard: /const venueCount = await venueStars\.count\(\);/,
    assertion: /venueCount === 5 && \(await venueStars\.evaluateAll/,
    what: "the disabled rating counts its stars before calling them disabled",
  },
  {
    file: "scripts/iot-monitoring.mjs",
    guard: /expectThat\(tag, glyphs > 0,/,
    assertion: /expectThat\(tag, lost\.length === 0,/,
    what: "forced colours proves a glyph is drawn before reporting none was lost",
  },
  {
    file: "scripts/iot-monitoring.mjs",
    guard: /expectThat\(tag, runs\.length > 0,/,
    assertion: /expectThat\(tag, runs\.every\(\(d\) => d === "ltr"\),/,
    what: "the RTL value run proves a <bdi> exists before reading its direction",
  },
  {
    file: "scripts/composite-visual.mjs",
    guard:
      /const stepperCount = A\.steppers \? await p\.locator\(A\.steppers\("readonly"\)\)\.count\(\) : 0;/,
    assertion:
      /stepperCount > 0 && \(await p\.locator\(A\.steppers\("readonly"\)\)\.evaluateAll/,
    what: "read-only steppers are counted before they are called disabled",
  },
  {
    file: "scripts/home-systems-browser.mjs",
    guard: /const traces = await page\.locator\(TRACES\)\.count\(\);/,
    assertion: /assert\.ok\(traces > 0,/,
    what: "the trace overlays are proved to exist before their offenders are counted",
  },
];

for (const site of SITES) {
  const src = readFileSync(site.file, "utf8");
  expectThat(
    site.guard.test(src),
    `${site.file}: the count guard is gone — ${site.what}`,
  );
  expectThat(
    site.assertion.test(src),
    `${site.file}: the guarded assertion is gone — ${site.what}`,
  );
}

/* ── report ─────────────────────────────────────────────────────────────── */

if (failures.length) {
  console.error(
    `empty-match negative controls — ${failures.length} of ${checks} failed:`,
  );
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `empty-match negative controls — ${checks} checks: zero-match assertions pass unguarded, and all five guarded call sites hold.`,
);
