/**
 * hero-beacon-browser.mjs — the homepage hero's traveling cage beacon, measured in a real browser.
 *
 *   pnpm --filter @kinetixui/web start &   # production build; the CSP forbids `next dev` here
 *   node scripts/hero-beacon-browser.mjs --base http://127.0.0.1:3000
 *
 * `scripts/rebrand-browser.mjs` proves the polygon rotates, that the cage stays fixed under it and that
 * no visible control row returned. It says nothing about the beacon introduced in the rebrand, so the
 * behaviour the owner approved — a light that traces the owner-supplied cage and pulses at its junction
 * nodes, with no rectangular focus frame — had no gate at all. This is that gate.
 *
 * Everything here is measured from the rendered SVG rather than read from the component:
 *   - the junction coordinates come from `hero-polygon-geometry.json`'s own node circles, not from the
 *     component's circuit constant, so a drifted circuit fails instead of agreeing with itself;
 *   - the beacon's position is sampled from its live `transform` while the page animates;
 *   - the loop duration is timed, not quoted. A geometry change moves it, and `checks.json` records the
 *     measured figure.
 *
 * kx-verify: accessibility
 * kx-verify-covers: apps/web/src/components/hero-polygon.tsx
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium binary for local runs.
 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : process.env.REBRAND_BASE || "http://127.0.0.1:3000";
const output = process.env.REBRAND_OUTPUT || "design-assets/identity/v1/verification";

// The junction nodes are the small filled circles in the supplied artwork. Each starts at its rightmost
// point and its first cubic ends a quarter-turn later at `(-r, +r)` relative to that point, so the radius
// is that segment's x offset and the centre is `M.x - r`. Reading the nodes out of the artwork — rather
// than out of the component's own circuit constant — is what makes the dwell points independent evidence.
// The large cage outline begins with a line rather than an arc, so it does not match and is skipped.
const geometry = JSON.parse(readFileSync(new URL("../apps/web/src/components/hero-polygon-geometry.json", import.meta.url), "utf8"));
const nodes = geometry.outline
  .map((path) => /^M(-?[\d.]+),(-?[\d.]+)c((?:-?[\d.]+[,-]){5}-?[\d.]+)/.exec(path.d))
  .filter(Boolean)
  .map(([, x, y, curve]) => {
    const offsets = curve.match(/-?[\d.]+/g).map(Number);
    return { x: Number(x) - Math.abs(offsets[4]), y: Number(y) };
  });
assert.equal(nodes.length, 6, `expected 6 junction nodes in the supplied cage, parsed ${nodes.length}`);

const near = (a, b, tolerance) => Math.hypot(a.x - b.x, a.y - b.y) <= tolerance;
function distanceToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const record = {};
try {
  // ── autoplay: traversal, junction pulses, closed loop ──────────────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: "light" });
    await context.addInitScript(() => localStorage.setItem("kx-consent", "denied"));
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const signals = page.locator(".kx-polygon-signals");
    assert.equal(await signals.count(), 1, "the traveling beacon is missing from the hero");
    assert.equal(await signals.evaluate((el) => getComputedStyle(el).pointerEvents), "none", "the beacon must not intercept drags");
    await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".kx-hero-polygon").dataset.running === "true");

    // Sample the live beacon for long enough to cover more than one lap at any plausible speed.
    const samples = await page.evaluate(async () => {
      const read = () => {
        const g = document.querySelector(".kx-polygon-signals");
        const halo = g.querySelector("circle");
        const [x, y] = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(g.getAttribute("transform")).slice(1).map(Number);
        return { x, y, r: Number(halo.getAttribute("r")), t: performance.now() };
      };
      const out = [];
      const started = performance.now();
      while (performance.now() - started < 40000) {
        out.push(read());
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      return out;
    });
    assert.ok(samples.length > 400, `too few beacon samples (${samples.length})`);
    assert.ok(new Set(samples.map((s) => `${s.x},${s.y}`)).size > 100, "the beacon did not travel");

    // Junction pulses: every node in the supplied artwork is visited, and the halo swells there.
    const dwells = samples.filter((s) => s.r > 10);
    assert.ok(dwells.length > 20, `the halo never swelled: max r ${Math.max(...samples.map((s) => s.r))}`);
    for (const node of nodes) {
      const hit = dwells.find((s) => near(s, node, 2));
      assert.ok(hit, `the beacon never pulsed at the supplied junction node ${node.x},${node.y}`);
    }
    record.junctionNodesPulsed = nodes.length;

    // The dwell points are the circuit's corners; every travelling sample has to sit on a leg between
    // two consecutive corners, so a beacon that cuts across the artwork fails.
    const corners = [];
    for (const s of dwells) if (!corners.some((c) => near(c, s, 4))) corners.push({ x: s.x, y: s.y });
    assert.ok(corners.length >= nodes.length, `found ${corners.length} dwell corners, fewer than the ${nodes.length} junction nodes`);
    const order = [];
    for (const s of samples) {
      const corner = corners.findIndex((c) => near(c, s, 4));
      if (corner !== -1 && order.at(-1) !== corner) order.push(corner);
    }
    const legs = new Set();
    for (let i = 1; i < order.length; i++) legs.add(`${order[i - 1]}->${order[i]}`);
    const worstOffEdge = Math.max(
      ...samples.map((s) => Math.min(...corners.flatMap((a) => corners.map((b) => (a === b ? Infinity : distanceToSegment(s, a, b)))))),
    );
    assert.ok(worstOffEdge <= 2, `a beacon sample sat ${worstOffEdge.toFixed(2)} units off every cage leg`);
    record.offEdgeMaxUnits = Number(worstOffEdge.toFixed(2));

    // Continuity, as a RATE rather than a per-sample delta. The samples are taken from a timer, so the
    // gap between them varies (measured: 61ms median, 102ms worst), and a bare delta threshold would fail
    // on a slow sample rather than on a discontinuous beacon. Normalising by the measured gap is what makes
    // this an assertion about the motion. Measured: the beacon travels at ~162 units/s and the halo swells
    // at up to ~79 units/s; a teleport between legs or a halo that snapped from 6 to 17 in one frame would
    // read in the hundreds.
    const steps = samples.slice(1).map((s, i) => ({ move: Math.hypot(s.x - samples[i].x, s.y - samples[i].y), swell: Math.abs(s.r - samples[i].r), gap: s.t - samples[i].t }));
    const rated = steps.filter((s) => s.gap > 0);
    const moveRate = Math.max(...rated.map((s) => (s.move / s.gap) * 1000));
    assert.ok(moveRate <= 400, `the beacon moved at ${moveRate.toFixed(0)} units/s — it jumped rather than travelled`);
    const swellRate = Math.max(...rated.map((s) => (s.swell / s.gap) * 1000));
    assert.ok(swellRate <= 140, `the junction halo resized at ${swellRate.toFixed(0)} units/s — the pulse is a step, not a swell`);
    const radii = samples.map((s) => s.r);
    assert.ok(Math.max(...radii) - Math.min(...radii) > 6, `the halo only varied between ${Math.min(...radii)} and ${Math.max(...radii)} — no perceptible pulse`);
    record.beaconUnitsPerSecond = Math.round(moveRate);
    record.haloUnitsPerSecond = Math.round(swellRate);
    record.haloRadiusRange = [Number(Math.min(...radii).toFixed(1)), Number(Math.max(...radii).toFixed(1))];

    // Closed loop: the circuit returns to the corner it left, and the lap is timed rather than quoted.
    const first = corners.findIndex((c) => near(c, samples[0], 4));
    const visits = samples.filter((s) => near(corners[first === -1 ? 0 : first], s, 4));
    const gaps = [];
    for (let i = 1; i < visits.length; i++) if (visits[i].t - visits[i - 1].t > 1000) gaps.push(visits[i].t - visits[i - 1].t);
    assert.ok(gaps.length >= 1, "the beacon never came back to where it started — the loop is not closed");
    const lap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length / 1000;
    assert.ok(lap > 5 && lap < 40, `implausible measured lap of ${lap.toFixed(1)}s`);
    record.measuredLapSeconds = Number(lap.toFixed(1));
    record.lapsObserved = gaps.length;

    // The beacon keeps travelling while the visitor drags, which is the approved behaviour.
    const box = await page.locator(".kx-polygon-interaction").boundingBox();
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.5);
    await page.mouse.down();
    const duringDrag = await page.evaluate(async () => {
      const read = () => document.querySelector(".kx-polygon-signals").getAttribute("transform");
      const start = read();
      await new Promise((resolve) => setTimeout(resolve, 900));
      return [start, read()];
    });
    await page.mouse.up();
    assert.notEqual(duringDrag[0], duringDrag[1], "the beacon stopped while the polygon was being dragged");
    record.beaconTravelsDuringDrag = true;

    // Keyboard focus is perceptible without a rectangular frame.
    const facet = page.locator(".kx-polygon-facets polygon").first();
    const unfocused = await facet.evaluate((el) => [getComputedStyle(el).stroke, getComputedStyle(el).strokeWidth]);
    await page.locator(".kx-polygon-interaction").evaluate((el) => delete el.dataset.pointerFocus);
    await page.keyboard.press("Tab"); // re-enter via the keyboard so :focus-visible applies
    await page.locator(".kx-polygon-interaction").focus();
    await page.keyboard.press("ArrowRight");
    const frame = await page.locator(".kx-polygon-interaction").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, boxShadow: cs.boxShadow };
    });
    assert.ok(frame.outlineStyle === "none" || parseFloat(frame.outlineWidth) === 0, `a rectangular focus outline returned: ${JSON.stringify(frame)}`);
    assert.equal(frame.boxShadow, "none", `a rectangular focus shadow returned: ${frame.boxShadow}`);
    const focused = await facet.evaluate((el) => [getComputedStyle(el).stroke, getComputedStyle(el).strokeWidth]);
    assert.notDeepEqual(focused, unfocused, "keyboard focus left the polygon looking unfocused");
    const focusRole = await page.locator("html").evaluate((el) => {
      const probe = document.createElement("span");
      probe.style.color = "hsl(var(--focus))";
      el.appendChild(probe);
      const colour = getComputedStyle(probe).color;
      probe.remove();
      return colour;
    });
    assert.equal(focused[0], focusRole, "the polygon focus indicator does not use the --focus role");
    assert.equal(parseFloat(focused[1]), 2, `focus stroke is ${focused[1]}, too thin to perceive`);
    record.focusIndicator = { rectangularFrame: false, stroke: focused[0], strokeWidth: focused[1] };

    assert.deepEqual(errors, [], `page errors: ${errors.join(" | ")}`);
    await context.close();
  }

  // ── reduced motion: a useful static polygon, no beacon ────────────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce" });
    await context.addInitScript(() => localStorage.setItem("kx-consent", "denied"));
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
    assert.equal(await page.locator(".kx-hero-polygon").getAttribute("data-running"), "false", "autoplay ran under reduced motion");
    assert.equal(await page.locator(".kx-polygon-signals").evaluate((el) => getComputedStyle(el).display), "none", "the beacon still showed under reduced motion");
    assert.ok(await page.locator(".kx-polygon-facets polygon").count() >= 3, "reduced motion left no static polygon to look at");
    const before = await page.locator(".kx-polygon-facets").evaluate((el) => el.innerHTML);
    await page.locator(".kx-polygon-interaction").focus();
    await page.keyboard.press("ArrowRight");
    assert.notEqual(await page.locator(".kx-polygon-facets").evaluate((el) => el.innerHTML), before, "reduced motion also removed deliberate keyboard rotation");
    record.reducedMotion = { autoplay: false, beaconHidden: true, keyboardRotationKept: true };
    await context.close();
  }

  // ── offscreen: the loop suspends and resumes without a glitch ─────────────────────────────────
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await context.addInitScript(() => localStorage.setItem("kx-consent", "denied"));
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "networkidle" });
    await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".kx-hero-polygon").dataset.running === "true");
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".kx-hero-polygon").dataset.running === "false");
    const parked = await page.locator(".kx-polygon-signals").getAttribute("transform");
    await page.waitForTimeout(1200);
    assert.equal(await page.locator(".kx-polygon-signals").getAttribute("transform"), parked, "the beacon kept moving while offscreen");
    await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".kx-hero-polygon").dataset.running === "true");
    await page.waitForTimeout(900);
    assert.notEqual(await page.locator(".kx-polygon-signals").getAttribute("transform"), parked, "the beacon did not resume on return");
    record.offscreenSuspends = true;
    await context.close();
  }

  // ── the focus indicator's own contrast, measured differentially ───────────────────────────────
  // SC 1.4.11 asks a focus indicator for 3:1 against the colours next to it. The indicator here is drawn
  // INSIDE the artwork, so "the adjacent colour" is whichever facet a given stroke segment crosses and a
  // single swatch comparison would be a guess. This renders the polygon unfocused and focused, takes the
  // pixels that changed as the indicator, and compares each against its nearest unchanged neighbour.
  // Measured on the fix that introduced it: 54% of the changed pixels reach 3:1 in light and 45% in dark,
  // top decile 5.8:1 and 9.1:1. With the facet stroke alone — the state this gate exists to prevent
  // returning to — the same measurement read 34% and 14%, so the floor below discriminates between them.
  {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: theme, reducedMotion: "reduce" });
      await context.addInitScript((theme) => { localStorage.setItem("kx-consent", "denied"); localStorage.setItem("theme", theme); }, theme);
      const page = await context.newPage();
      await page.goto(base, { waitUntil: "networkidle" });
      await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
      await page.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
      await page.waitForTimeout(300);
      const art = page.locator(".kx-hero-polygon-art");
      const unfocused = (await art.screenshot()).toString("base64");
      await page.locator(".kx-polygon-interaction").evaluate((el) => { delete el.dataset.pointerFocus; el.focus(); });
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(400);
      const focused = (await art.screenshot()).toString("base64");
      const measured = await page.evaluate(async ([a, b]) => {
        const load = async (data) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(image, 0, 0);
          return { d: ctx.getImageData(0, 0, image.width, image.height).data, w: image.width, h: image.height };
        };
        const A = await load(a), B = await load(b);
        const channel = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
        const luminance = (p) => 0.2126 * channel(p[0]) + 0.7152 * channel(p[1]) + 0.0722 * channel(p[2]);
        const ratio = (x, y) => { const l1 = luminance(x), l2 = luminance(y); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
        const at = (img, x, y) => { const i = (y * img.w + x) * 4; return [img.d[i], img.d[i + 1], img.d[i + 2]]; };
        const w = A.w, h = A.h, changed = [], index = new Set();
        for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
          const before = at(A, x, y), after = at(B, x, y);
          if (Math.max(Math.abs(before[0] - after[0]), Math.abs(before[1] - after[1]), Math.abs(before[2] - after[2])) > 18) { changed.push([x, y]); index.add(y * w + x); }
        }
        const ratios = [];
        for (const [x, y] of changed) {
          let neighbour = null;
          for (let r = 1; r <= 3 && !neighbour; r++) for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
            if (!index.has(ny * w + nx)) { neighbour = at(B, nx, ny); break; }
          }
          if (neighbour) ratios.push(ratio(at(B, x, y), neighbour));
        }
        ratios.sort((p, q) => q - p);
        return { changed: changed.length, compared: ratios.length, best: ratios[0] ?? 0, topDecile: ratios[Math.floor(ratios.length * 0.1)] ?? 0, share: ratios.filter((r) => r >= 3).length / (ratios.length || 1) };
      }, [unfocused, focused]);
      assert.ok(measured.changed > 2000, `${theme}: only ${measured.changed} pixels changed on focus — the indicator is too small to perceive`);
      assert.ok(measured.best >= 3, `${theme}: no part of the focus indicator reaches 3:1 (best ${measured.best.toFixed(2)})`);
      assert.ok(measured.share >= 0.25, `${theme}: only ${(measured.share * 100).toFixed(0)}% of the focus indicator reaches 3:1 against what it borders`);
      record[`focusContrast_${theme}`] = { changedPixels: measured.changed, best: Number(measured.best.toFixed(2)), topDecile: Number(measured.topDecile.toFixed(2)), shareAt3to1: Number((measured.share * 100).toFixed(0)) };
      await context.close();
    }
  }

  // ── light and dark draw the same cage in the same brand role ──────────────────────────────────
  {
    const seen = {};
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, colorScheme: theme });
      await context.addInitScript((theme) => { localStorage.setItem("kx-consent", "denied"); localStorage.setItem("theme", theme); }, theme);
      const page = await context.newPage();
      await page.goto(base, { waitUntil: "networkidle" });
      assert.equal(await page.locator(".kx-polygon-wireframe path").count(), 7, "the supplied cage and its nodes must stay intact");
      const [cage, role] = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.color = "hsl(var(--brand))";
        document.documentElement.appendChild(probe);
        const role = getComputedStyle(probe).color;
        probe.remove();
        return [getComputedStyle(document.querySelector(".kx-polygon-wireframe")).fill, role];
      });
      assert.equal(cage, role, `${theme}: the cage is not drawn in the brand role`);
      seen[theme] = cage;
      await context.close();
    }
    assert.notEqual(seen.light, seen.dark, "light and dark resolved the brand role to the same colour");
    record.cageFollowsBrandRole = seen;
  }
} finally {
  await browser.close();
}
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/beacon-results.json`, `${JSON.stringify(record, null, 2)}\n`);
console.log(JSON.stringify(record, null, 2));
console.log(`check:hero-beacon ok — ${record.junctionNodesPulsed} junction nodes pulsed, lap ${record.measuredLapSeconds}s, worst off-edge ${record.offEdgeMaxUnits} units`);
