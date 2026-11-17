import assert from "node:assert/strict";
import { chromium } from "playwright";
import { resolve } from "node:path";
import { buildAngularHarness, contrast, framer, serveStatic, settleAngular, waitForAngular } from "./visual-harness.mjs";

const harness = process.argv[2] ? resolve(process.argv[2]) : buildAngularHarness("progress");
const server = await serveStatic(harness);
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const readPixels = framer({ dpr: 1, pad: 2 });
const cases = [
  ["light", "ltr", "reduce", 100, 640],
  ["dark", "ltr", "reduce", 100, 640],
  ["light", "rtl", "reduce", 200, 320],
  ["dark", "rtl", "no-preference", 200, 320],
];
let failures = 0;

try {
  console.log(`Chromium ${browser.version()}`);
  for (const [theme, dir, reducedMotion, textSize, viewportWidth] of cases) {
    const page = await browser.newPage({
      colorScheme: theme, forcedColors: "active", reducedMotion,
      deviceScaleFactor: 1, viewport: { width: viewportWidth, height: 600 },
    });
    const description = `${theme} ${dir} ${reducedMotion} ${textSize}% ${viewportWidth}px`;
    try {
      await page.goto(`${server.base}/?fixture=progress&theme=${theme}&dir=${dir}`);
      await waitForAngular(page);
      await page.evaluate((size) => { document.documentElement.style.fontSize = `${size}%`; }, textSize);
      const progress = page.getByRole("progressbar", { name: "Upload progress" });
      const fill = progress.locator(".kx-progress__bar");
      const session = await page.context().newCDPSession(page);
      await session.send("Accessibility.enable");
      const { root } = await session.send("DOM.getDocument");
      const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector: "kx-progress" });

      async function measure(button, value, max, fraction) {
        await page.locator(`#${button}`).click();
        await settleAngular(page);
        await fill.evaluate(async (bar) => {
          await new Promise(requestAnimationFrame);
          await Promise.all(bar.getAnimations().map((animation) => animation.finished));
        });
        const track = await progress.boundingBox();
        const bar = await fill.evaluate((element) => element.getBoundingClientRect().toJSON());
        assert.ok(track.width > 0 && track.height > 0 && track.x + track.width <= viewportWidth);
        assert.ok(Math.abs(bar.width - track.width * fraction) < 0.5, `${button}: geometry matches the normalized state`);
        const edge = dir === "rtl" ? "right" : "left";
        assert.ok(Math.abs(bar[edge] - (dir === "rtl" ? track.x + track.width : track.x)) < 0.5);

        const { nodes: [ax] } = await session.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false });
        const properties = Object.fromEntries(ax.properties.map(({ name, value }) => [name, value.value]));
        assert.equal(ax.role.value, "progressbar");
        assert.equal(ax.value?.value, value);
        assert.equal(properties.valuemin, 0);
        assert.equal(properties.valuemax, max);

        const pixels = await readPixels(page, track);
        const y = track.y + track.height / 2;
        const x = (portion) => track.x + track.width * (dir === "rtl" ? 1 - portion : portion);
        const inside = pixels.at(x(0.125), y);
        const empty = pixels.at(x(0.875), y);
        const boundary = pixels.at(x(0.5), track.y);
        const background = pixels.at(x(0.5), track.y - 2);
        return { inside, empty, boundary, background };
      }

      const partial = await measure("low", 1, 4, 0.25);
      if (process.env.KX_PROGRESS_SCREENSHOTS) {
        await progress.screenshot({ path: resolve(process.env.KX_PROGRESS_SCREENSHOTS, `progress-${theme}-${dir}.png`) });
      }
      const zero = await measure("zero", 0, 4, 0);
      const full = await measure("max", 4, 4, 1);
      await measure("unknown", undefined, 4, 1);
      const fillContrast = contrast(partial.inside, partial.empty);
      const trackContrast = contrast(zero.boundary, zero.background);
      console.log(JSON.stringify({ description, fillContrast, trackContrast, partial, zero, full }));
      assert.ok(fillContrast >= 3, `partial fill contrasts with its track (${fillContrast.toFixed(2)}:1)`);
      assert.ok(trackContrast >= 3, `empty track has a visible boundary (${trackContrast.toFixed(2)}:1)`);
      assert.ok(contrast(zero.inside, zero.empty) < 1.05, "zero paints only the track interior");
      assert.ok(contrast(full.empty, zero.empty) >= 3, "full progress paints the previously empty region");
    } catch (error) {
      failures++;
      console.error(`${description}: ${error.message}`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

process.exitCode = failures ? 1 : 0;
