/**
 * hero-light-browser.mjs — the hero network's travelling light and its focus
 * indicator, measured in a real browser.
 *
 * kx-verify: accessibility
 * kx-verify-covers: apps/web/src/components/hero-polygon.tsx
 *
 * `scripts/rebrand-browser.mjs` owns the hero's structural and interaction
 * contract across seven viewport/theme cases. This file owns the two claims
 * that need a measurement rather than an assertion, and that are too slow to
 * repeat per case:
 *
 *   1. The lap. `hero-mesh.json` *declares* each route's duration. A declared
 *      duration is not a measured one, so this times a pulse's actual return to
 *      its starting vertex and compares the two. A geometry change that moves a
 *      route's length silently would be caught here, not in the data.
 *
 *   2. The focus indicator's own contrast. SC 1.4.11 asks a focus indicator for
 *      3:1 against the colours next to it. This indicator is drawn INSIDE the
 *      artwork, so "the adjacent colour" is whichever facet a stroke crosses and
 *      a single swatch comparison would be a guess. This renders the hero
 *      unfocused and focused, takes the pixels that changed as the indicator,
 *      and compares each against its nearest unchanged neighbour.
 *
 *      Focus is reached with Tab, not with focus() plus an arrow key. An arrow
 *      key rotates the network, so the earlier version of this measurement was
 *      comparing a rotated render against a still one and counting displaced
 *      edges as part of the indicator. Tab changes nothing but the focus state,
 *      so what it leaves is the indicator and only the indicator.
 *
 * Both run with motion stilled, so neither measurement races the animation.
 */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : null) ?? "http://127.0.0.1:3000";
const outDir = "design-assets/identity/v1/verification";
const mesh = JSON.parse(await readFile("apps/web/src/components/hero-mesh.json", "utf8"));
const record = { base, measuredAt: new Date().toISOString(), routes: mesh.routes.length, junctions: mesh.nodes.length };

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/** Tab until the hero's rotation group holds focus, so :focus-visible is a keyboard focus. */
async function tabToHero(page) {
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement?.classList.contains("kx-polygon-interaction"))) return true;
  }
  return false;
}

// ── 1. the lap, timed ────────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem("kx-consent", "denied"));
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector(".kx-hero-polygon")?.dataset.running === "true");

  const read = () =>
    page.locator(".kx-mesh-pulses circle").evaluateAll((n) =>
      n.map((c) => [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))]),
    );

  // Route 0 is the longest-lived reference. Wait until it is close to a known
  // vertex, then time its return to that same vertex.
  const target = mesh.routes[0].v[0];
  const near = (p) => Math.hypot(p[0] - target[0], p[1] - target[1]);
  const settle = async () => {
    for (let i = 0; i < 400; i++) {
      if (near((await read())[0]) < 12) return true;
      await page.waitForTimeout(100);
    }
    return false;
  };
  assert.ok(await settle(), "pulse 0 never passed its own starting vertex");
  // Leave the start behind before looking for the return, or the first sample wins.
  for (let i = 0; i < 100 && near((await read())[0]) < 40; i++) await page.waitForTimeout(100);
  const left = Date.now();
  assert.ok(await settle(), "pulse 0 never came back — the route does not close");
  const lap = (Date.now() - left) / 1000;

  const declared = mesh.routes[0].duration;
  record.lap = { measuredSeconds: Number(lap.toFixed(1)), declaredSeconds: declared };
  assert.ok(
    Math.abs(lap - declared) / declared < 0.35,
    `route 0 laps in ${lap.toFixed(1)}s but hero-mesh.json declares ${declared}s`,
  );
  await context.close();
}

// ── 2. the focus indicator's own contrast ────────────────────────────────────
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    colorScheme: theme,
    reducedMotion: "reduce",
  });
  await context.addInitScript(
    (t) => {
      localStorage.setItem("kx-consent", "denied");
      localStorage.setItem("theme", t);
    },
    theme,
  );
  const page = await context.newPage();
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator(".kx-hero-polygon").scrollIntoViewIfNeeded();
  await page.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
  await page.waitForTimeout(300);

  const art = page.locator(".kx-hero-mesh");
  const unfocused = (await art.screenshot()).toString("base64");
  assert.ok(await tabToHero(page), `${theme}: the hero's rotation group is not reachable by Tab`);
  await page.waitForTimeout(250);
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
    const A = await load(a);
    const B = await load(b);
    const channel = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
    const luminance = (p) => 0.2126 * channel(p[0]) + 0.7152 * channel(p[1]) + 0.0722 * channel(p[2]);
    const ratio = (x, y) => {
      const l1 = luminance(x);
      const l2 = luminance(y);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const at = (img, x, y) => {
      const i = (y * img.w + x) * 4;
      return [img.d[i], img.d[i + 1], img.d[i + 2]];
    };
    const w = A.w;
    const h = A.h;
    const changed = [];
    const index = new Set();
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const before = at(A, x, y);
        const after = at(B, x, y);
        if (
          Math.max(
            Math.abs(before[0] - after[0]),
            Math.abs(before[1] - after[1]),
            Math.abs(before[2] - after[2]),
          ) > 18
        ) {
          changed.push([x, y]);
          index.add(y * w + x);
        }
      }
    }
    const ratios = [];
    for (const [x, y] of changed) {
      let neighbour = null;
      for (let r = 1; r <= 3 && !neighbour; r++) {
        for (const [dx, dy] of [
          [r, 0],
          [-r, 0],
          [0, r],
          [0, -r],
          [r, r],
          [-r, -r],
          [r, -r],
          [-r, r],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
          if (!index.has(ny * w + nx)) {
            neighbour = at(B, nx, ny);
            break;
          }
        }
      }
      if (neighbour) ratios.push(ratio(at(B, x, y), neighbour));
    }
    ratios.sort((p, q) => q - p);
    return {
      changed: changed.length,
      compared: ratios.length,
      best: ratios[0] ?? 0,
      topDecile: ratios[Math.floor(ratios.length * 0.1)] ?? 0,
      share: ratios.filter((r) => r >= 3).length / (ratios.length || 1),
    };
  }, [unfocused, focused]);

  assert.ok(
    measured.changed > 1500,
    `${theme}: only ${measured.changed} pixels changed on focus — the indicator is too small to perceive`,
  );
  assert.ok(measured.best >= 3, `${theme}: no part of the focus indicator reaches 3:1 (best ${measured.best.toFixed(2)})`);
  assert.ok(
    measured.share >= 0.25,
    `${theme}: only ${(measured.share * 100).toFixed(0)}% of the focus indicator reaches 3:1 against what it borders`,
  );
  record[`focusContrast_${theme}`] = {
    changedPixels: measured.changed,
    best: Number(measured.best.toFixed(2)),
    topDecile: Number(measured.topDecile.toFixed(2)),
    shareAt3to1: Number((measured.share * 100).toFixed(0)),
  };
  await context.close();
}

await browser.close();
await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/hero-light-results.json`, `${JSON.stringify(record, null, 2)}\n`);
console.log(
  `hero-light ok — lap ${record.lap.measuredSeconds}s against ${record.lap.declaredSeconds}s declared; ` +
    `focus indicator at 3:1 over ${record.focusContrast_light.shareAt3to1}% (light) and ` +
    `${record.focusContrast_dark.shareAt3to1}% (dark) of its own area`,
);
