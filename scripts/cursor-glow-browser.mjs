/**
 * cursor-glow-browser.mjs — the site-wide pointer glow, measured in a real browser.
 *
 * kx-verify: accessibility
 * kx-verify-covers: apps/web/src/components/cursor-glow.tsx
 *
 * The glow replaces `.kx-polygon-spotlight`, which was bound to the homepage
 * hero: `position: absolute; inset: 0` inside `.kx-hero-polygon`, centred by a
 * percentage of that element's own box. Measured on `25e0bdf` at 1440px, the
 * layer's rect was exactly the hero's — x 613 → 1472 in a 1440px viewport — and
 * one pixel to the left of it the whole thing faded out. The replacement is a
 * fixed, viewport-positioned layer, so it follows the cursor on every page.
 *
 * Making a brightening site-wide is an accessibility change before it is a
 * visual one, and CI never moves a mouse: no axe run, no contrast gate and no
 * screenshot in this repository has a pointer anywhere, so none of them would
 * ever see what this layer does to a rendered background. This gate is the
 * thing that does. It asserts, per page and per theme:
 *
 *   1. Tracking. One mouse move puts the glow where the cursor is, and the
 *      layer stays pinned to the viewport through a scroll — the thing the
 *      hero-bound spotlight could not do.
 *   2. Occlusion. With the glow centred on an opaque, text-bearing surface, the
 *      rendered pixels of that surface are byte-identical to the glow-off
 *      render. An opaque surface must block it; if it does not, the glow is
 *      painting over content.
 *   3. Contrast. With the glow at full strength centred on each distinct
 *      text/background pair the page actually renders, every pair still meets
 *      WCAG AA (4.5:1, or 3:1 where the text qualifies as large). The
 *      background is sampled from the composited render, with the text itself
 *      made transparent, so this is the pixel the glyph sits on — not a CSS
 *      colour that the glow never appears in.
 *   4. Placement. The layer is `position: fixed` over the viewport, takes no
 *      pointer event, is not focusable, and is painted BELOW the content
 *      wrapper — it is the wrapper's previous sibling at stacking level 0.
 *      The rendered measurements come first on purpose: a structural assertion
 *      that the z-index is 0 would catch a glow lifted over the content, but it
 *      would catch it by reading a declaration back, not by seeing what the
 *      reader sees.
 *   5. Preferences. Under `prefers-reduced-motion: reduce` and under forced
 *      colours the layer is not rendered.
 *
 * `scripts/cursor-glow-negative-controls.mjs` proves 1–3 can fail: a stronger
 * tint (the 0.16 alpha costed on the parked `c097c48`, which takes the homepage
 * supporting paragraph to roughly 4.2:1), the layer lifted above the content,
 * and the layer made `absolute` so it stops following the viewport.
 *
 * Requires the site on --base (default http://127.0.0.1:3000).
 *
 * Usage: pnpm check:cursor-glow
 */
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : null) ?? "http://127.0.0.1:3000";
const outDir = "design-assets/identity/v1/verification";

/**
 * Negative-control seam. `scripts/cursor-glow-negative-controls.mjs` runs THIS
 * gate with KX_GLOW_NC set and requires a non-zero exit each time. Nothing is
 * injected on a normal run, and nothing in the repository is modified.
 */
const NEGATIVE_CONTROLS = {
  // The alpha Codex costed on the parked c097c48: enough tint to take a real
  // homepage pair under AA. The contrast assertion must notice.
  "tint-too-strong": `.kx-cursor-glow { background: radial-gradient(circle var(--kx-cursor-radius, 420px) at var(--kx-cursor-x, 50%) var(--kx-cursor-y, 50%), hsl(var(--brand) / 0.16) 0%, hsl(var(--brand) / 0.07) 46%, transparent 72%) !important; }`,
  // The layer lifted over the content wrapper: every surface is tinted,
  // including opaque ones, and the glow is now between the reader and the text.
  "glow-over-content": `.kx-cursor-glow { z-index: 60 !important; }`,
  // Not fixed any more: the glow stops following the viewport once the page scrolls.
  "glow-not-fixed": `.kx-cursor-glow { position: absolute !important; }`,
};

const PAGES = ["/", "/blocks", "/docs/accessibility", "/themes"];

/** sRGB relative luminance and the WCAG contrast ratio, on 0-255 triples. */
const CHANNEL = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
const luminance = ([r, g, b]) => 0.2126 * CHANNEL(r) + 0.7152 * CHANNEL(g) + 0.0722 * CHANNEL(b);
const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  args: process.env.PLAYWRIGHT_CHROMIUM_PATH ? ["--no-sandbox"] : [],
});
const record = { base, measuredAt: new Date().toISOString(), pages: [] };

/**
 * Decode a viewport screenshot inside the page and hand back a pixel reader.
 * The composited render is the only place the glow exists — it is a background
 * on a layer of its own, so no `getComputedStyle` call anywhere can see what it
 * does to the colour a glyph sits on.
 */
const samplePixels = async (page, points) => {
  // A single point is read from a 6px clip rather than a full-viewport PNG. The
  // contrast loop calls this once per pair per page, and a 1440×900 screenshot
  // carried through a base64 string and a canvas each time is how this gate
  // first ran the container out of memory.
  if (points.length === 1) {
    const { x, y } = points[0];
    const shot = (
      await page.screenshot({ type: "png", clip: { x: Math.max(0, x - 3), y: Math.max(0, y - 3), width: 6, height: 6 } })
    ).toString("base64");
    return page.evaluate(async (data) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const d = ctx.getImageData(Math.floor(image.width / 2), Math.floor(image.height / 2), 1, 1).data;
      return [[d[0], d[1], d[2]]];
    }, shot);
  }
  const shot = (await page.screenshot({ type: "png" })).toString("base64");
  return page.evaluate(
    async ([data, pts]) => {
      const image = new Image();
      image.src = `data:image/png;base64,${data}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const scale = image.width / innerWidth;
      const out = pts.map(({ x, y }) => {
        const d = ctx.getImageData(Math.round(x * scale), Math.round(y * scale), 1, 1).data;
        return [d[0], d[1], d[2]];
      });
      canvas.width = 0;
      canvas.height = 0;
      return out;
    },
    [shot, points],
  );
};

try {
  for (const path of PAGES) {
    for (const theme of ["light", "dark"]) {
      const label = `${path} (${theme})`;
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: theme,
        reducedMotion: "no-preference",
      });
      await context.addInitScript((t) => {
        localStorage.setItem("kx-consent", "denied");
        localStorage.setItem("theme", t);
      }, theme);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      if (NEGATIVE_CONTROLS[process.env.KX_GLOW_NC ?? ""]) {
        await page.addStyleTag({ content: NEGATIVE_CONTROLS[process.env.KX_GLOW_NC] });
      }
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });

      assert.equal(
        await page.locator(".kx-cursor-glow").count(),
        1,
        `${label}: there is no .kx-cursor-glow layer`,
      );

      // ── 1. The pointer drives it, and it follows the viewport ────────────
      // Driven through the component rather than by this gate writing the
      // custom properties: one mouse move, one position.
      await page.mouse.move(700, 420);
      await page.waitForTimeout(120);
      const tracked = await page.evaluate(() => {
        const layer = document.querySelector(".kx-cursor-glow");
        return { active: layer.dataset.active, x: layer.style.getPropertyValue("--kx-cursor-x"), y: layer.style.getPropertyValue("--kx-cursor-y") };
      });
      assert.equal(tracked.active, "true", `${label}: a mouse move did not light the glow`);
      assert.equal(tracked.x, "700px", `${label}: the glow is at ${tracked.x}, not where the cursor is`);

      // …and it follows the viewport through a scroll, which is the whole point
      // of a fixed layer: the hero-bound spotlight could not leave its element.
      await page.evaluate(() => window.scrollTo({ top: 600, behavior: "instant" }));
      await page.mouse.move(701, 421);
      await page.waitForTimeout(120);
      const afterScroll = await page.evaluate(() => {
        const r = document.querySelector(".kx-cursor-glow").getBoundingClientRect();
        return { top: Math.round(r.top), left: Math.round(r.left) };
      });
      assert.deepEqual(afterScroll, { top: 0, left: 0 }, `${label}: the glow moved with the page instead of the viewport`);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));

      // ── Text made transparent: what is left is the background a glyph sits
      //    on, including whatever the glow puts there. Only the FILL is cleared,
      //    not `color`, so `getComputedStyle(el).color` still reports the ink
      //    the reader sees and the page can stay in this state while the
      //    measurement walks it. ───────────────────────────────────────────────
      await page.addStyleTag({
        content: "*{-webkit-text-fill-color:transparent!important;text-shadow:none!important}",
      });

      const measured = [];
      const seen = new Set();
      let runs = 0;
      let occlusion = null;

      // Three viewports' worth of the page, not just the first screen. The glow
      // is fixed, so a pair is measured wherever it happens to be on screen; a
      // gate that only ever looked at the fold would have nothing to say about
      // the text under it.
      for (const scrollTop of [0, 900, 1800]) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), scrollTop);
        await page.waitForTimeout(150);

        const candidates = await page.evaluate(() => {
          const out = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            if (!node.nodeValue.trim()) continue;
            const el = node.parentElement;
            if (!el || el.closest("nextjs-portal") || el.tagName.includes("-")) continue;
            if (el.closest(".kx-cursor-glow")) continue;
            const style = getComputedStyle(el);
            if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.95) continue;
            // Visually-hidden text (the skip link, sr-only instructions) is clipped to a
            // point. Its rect exists, so it would be sampled, and what the sample reads is
            // whatever happens to be painted there — not the colour pair a reader sees.
            if (el.closest(".sr-only") || el.clientWidth <= 1 || el.clientHeight <= 1) continue;
            if (style.clipPath === "inset(50%)" || style.clip === "rect(0px, 0px, 0px, 0px)") continue;
            const range = document.createRange();
            range.selectNodeContents(node);
            const rect = [...range.getClientRects()][0];
            if (!rect || rect.width < 8 || rect.height < 6) continue;
            const x = Math.round(rect.left + Math.min(rect.width / 2, 60));
            const y = Math.round(rect.top + rect.height / 2);
            if (x < 2 || y < 2 || x > innerWidth - 2 || y > innerHeight - 2) continue;
            const size = parseFloat(style.fontSize);
            const weight = Number(style.fontWeight) || 400;
            out.push({
              x,
              y,
              color: style.color,
              // WCAG "large text": 18.66px bold or 24px.
              large: size >= 24 || (size >= 18.66 && weight >= 700),
              text: node.nodeValue.trim().slice(0, 40),
            });
          }
          return out.slice(0, 400);
        });
        runs += candidates.length;
        if (!candidates.length) continue;

        await page.evaluate(() => {
          document.querySelector(".kx-cursor-glow").dataset.active = "false";
        });
        await page.waitForTimeout(60);
        const backgroundsOff = await samplePixels(page, candidates);

        // ── 2. An opaque surface still occludes the glow ───────────────────
        if (!occlusion) {
          const opaque = await page.evaluate(() => {
            for (const el of document.querySelectorAll("main *")) {
              const s = getComputedStyle(el);
              const m = s.backgroundColor.match(/rgba?\(([^)]+)\)/);
              if (!m) continue;
              const parts = m[1].split(",").map((n) => parseFloat(n));
              if (parts.length === 4 && parts[3] < 1) continue;
              if (parts.length < 3) continue;
              const r = el.getBoundingClientRect();
              if (r.width < 80 || r.height < 40 || r.top < 80 || r.bottom > innerHeight - 10) continue;
              if (!el.textContent.trim()) continue;
              const x = Math.round(r.left + r.width / 2);
              const y = Math.round(r.top + r.height / 2);
              // The point has to land on this surface. A box can be clipped by an
              // ancestor, or covered by a later sibling, and then the pixel read
              // there is somebody else's — which is how this measurement first
              // reported a white docs section tinted: the sample was on the page
              // behind it, not on the section.
              const hit = document.elementFromPoint(x, y);
              if (!hit || !(hit === el || el.contains(hit))) continue;
              // …and nothing translucent may sit between the surface and the sample.
              let covered = false;
              for (let n = hit; n && n !== el; n = n.parentElement) {
                const ns = getComputedStyle(n);
                if (Number(ns.opacity) < 1 || ns.backdropFilter !== "none" || ns.mixBlendMode !== "normal") covered = true;
              }
              if (covered) continue;
              return { x, y, where: `${el.tagName}.${String(el.className).slice(0, 60)}` };
            }
            return null;
          });
          if (opaque) {
            const [before] = await samplePixels(page, [opaque]);
            await page.evaluate(({ x, y }) => {
              const layer = document.querySelector(".kx-cursor-glow");
              layer.style.setProperty("--kx-cursor-x", `${x}px`);
              layer.style.setProperty("--kx-cursor-y", `${y}px`);
              layer.dataset.active = "true";
            }, opaque);
            await page.waitForTimeout(60);
            const [after] = await samplePixels(page, [opaque]);
            occlusion = { point: opaque, before, after };
            assert.deepEqual(
              after,
              before,
              `${label}: the glow tinted an opaque surface at ${opaque.x},${opaque.y} (${before} → ${after}) — it is painting over content`,
            );
          }
        }

        // ── 3. Contrast, per distinct pair, with the glow on the text ──────
        //    Deduplicated by ink, unlit background and size class: the glow is
        //    centred on whatever it measures, so two runs of the same pair
        //    measure the same thing wherever they sit.
        for (let i = 0; i < candidates.length; i++) {
          const pair = { ...candidates[i], backgroundOff: backgroundsOff[i] };
          const key = `${pair.color}|${pair.backgroundOff.join(",")}|${pair.large}`;
          if (seen.has(key)) continue;
          seen.add(key);
          await page.evaluate(({ x, y }) => {
            const layer = document.querySelector(".kx-cursor-glow");
            layer.style.setProperty("--kx-cursor-x", `${x}px`);
            layer.style.setProperty("--kx-cursor-y", `${y}px`);
            layer.dataset.active = "true";
          }, pair);
          await page.waitForTimeout(50);
          const [lit] = await samplePixels(page, [{ x: pair.x, y: pair.y }]);
          const ink = pair.color.match(/[\d.]+/g).slice(0, 3).map(Number);
          measured.push({
            text: pair.text,
            color: pair.color,
            large: pair.large,
            backgroundOff: pair.backgroundOff,
            backgroundLit: lit,
            without: Number(ratio(ink, pair.backgroundOff).toFixed(2)),
            with: Number(ratio(ink, lit).toFixed(2)),
            required: pair.large ? 3 : 4.5,
          });
        }
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      assert.ok(runs > 10, `${label}: only ${runs} text runs found — the sample is too small to mean anything`);

      // The claim is about what the GLOW does, so a pair that was already under
      // AA without it is reported but not charged to this layer: fixing those is
      // a different piece of work, and failing here would hide the real finding.
      const preexisting = measured.filter((m) => m.without < m.required);
      const failing = measured.filter((m) => m.without >= m.required && m.with < m.required);
      const worst = measured
        .filter((m) => m.without >= m.required)
        .sort((a, b) => a.with / a.required - b.with / b.required)[0];
      assert.equal(
        failing.length,
        0,
        `${label}: the glow takes ${failing.length} text pair(s) under AA — worst "${failing[0]?.text}" ` +
          `${failing[0]?.without} → ${failing[0]?.with}:1 against ${failing[0]?.required}:1 required`,
      );
      // …and the measurement has to be looking at something.
      assert.ok(measured.length >= 3, `${label}: only ${measured.length} distinct text pairs measured`);

      // ── 4. Placement, read off the rendered page ─────────────────────────────────────────────────────
      const placement = await page.evaluate(() => {
        const layer = document.querySelector(".kx-cursor-glow");
        if (!layer) return null;
        const s = getComputedStyle(layer);
        const wrapper = layer.nextElementSibling;
        return {
          position: s.position,
          pointerEvents: s.pointerEvents,
          zIndex: s.zIndex,
          tabIndex: layer.tabIndex,
          ariaHidden: layer.getAttribute("aria-hidden"),
          focusableInside: layer.querySelectorAll("[tabindex], a, button, input").length,
          // Painted below the content: the layer is the wrapper's previous
          // sibling, and neither of them raises itself above the other.
          beforeContent: !!wrapper?.contains(document.querySelector("main")),
          coversViewport:
            Math.round(layer.getBoundingClientRect().width) === innerWidth &&
            Math.round(layer.getBoundingClientRect().height) === innerHeight,
        };
      });
      assert.ok(placement, `${label}: there is no .kx-cursor-glow layer`);
      assert.equal(placement.position, "fixed", `${label}: the glow is ${placement.position}, so it cannot follow the viewport`);
      assert.equal(placement.pointerEvents, "none", `${label}: the glow takes pointer events`);
      assert.equal(placement.zIndex, "0", `${label}: the glow sits at z-index ${placement.zIndex}`);
      assert.equal(placement.ariaHidden, "true", `${label}: the glow is not hidden from assistive technology`);
      assert.equal(placement.tabIndex, -1, `${label}: the glow is focusable`);
      assert.equal(placement.focusableInside, 0, `${label}: the glow contains a focus stop`);
      assert.ok(placement.beforeContent, `${label}: the glow is not painted before the content wrapper`);
      assert.ok(placement.coversViewport, `${label}: the glow does not cover the viewport`);

      // ── 5. Preferences ───────────────────────────────────────────────────
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page.locator(".kx-cursor-glow").evaluate((el) => getComputedStyle(el).display),
        "none",
        `${label}: the glow survives prefers-reduced-motion`,
      );
      await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
      assert.equal(
        await page.locator(".kx-cursor-glow").evaluate((el) => getComputedStyle(el).display),
        "none",
        `${label}: the glow survives forced colours`,
      );
      await page.emulateMedia({ forcedColors: "none" });

      assert.deepEqual(errors, [], `${label}: page errors`);
      record.pages.push({
        path,
        theme,
        pairs: measured.length,
        worst: worst && { text: worst.text, without: worst.without, with: worst.with, required: worst.required },
        measured: measured.map((m) => ({ text: m.text, required: m.required, without: m.without, with: m.with })),
        alreadyUnderAAWithoutTheGlow: preexisting.map((m) => ({ text: m.text, ratio: m.without, required: m.required })),
        occlusion,
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

await mkdir(outDir, { recursive: true });
await writeFile(`${outDir}/cursor-glow-results.json`, `${JSON.stringify(record, null, 2)}\n`);
const worst = record.pages.map((p) => p.worst).filter(Boolean).sort((a, b) => a.with - b.with)[0];
console.log(
  `cursor glow ok — fixed, below the content, occluded by opaque surfaces, and across ` +
    `${record.pages.length} page/theme cases the worst real text pair measures ${worst.with}:1 with the glow ` +
    `at full strength behind it (${worst.without}:1 without), against ${worst.required}:1 required: "${worst.text}"`,
);
