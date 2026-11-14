// Run after building UI and Storybook. The public demo drives the same package
// entry point as the other rendered motion checks.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { storyId } from "./story-id.mjs";
import { assertUiDistMatchesSource } from "./ui-dist-stamp.mjs";
import { serveStatic } from "./visual-harness.mjs";

assertUiDistMatchesSource("progress motion");
const server = await serveStatic(fileURLToPath(new URL("../apps/docs/storybook-static", import.meta.url)));
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
  for (const direction of ["ltr", "rtl"]) {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const page = await browser.newPage({ reducedMotion });
      try {
        await page.goto(`${server.base}/iframe.html?id=${storyId("progress", "Default")}&viewMode=story`);
        const bar = page.getByRole("progressbar", { name: "Upload progress" });
        await bar.waitFor();
        await bar.evaluate((el, dir) => {
          el.parentElement.parentElement.dir = dir === "rtl" ? "ltr" : "rtl";
          el.parentElement.dir = dir;
        }, direction);

        const initial = await bar.boundingBox();
        for (const [from, to] of [[1, 3], [3, 1]]) {
          const button = page.getByRole("button", { name: to === 1 ? "1 file uploaded" : "3 files uploaded" });
          await button.focus();
          await bar.evaluate((root, { to, reducedMotion }) => {
            const fill = root.firstElementChild;
            const start = fill.firstElementChild.getBoundingClientRect().width / root.getBoundingClientRect().width;
            const scale = () => new DOMMatrixReadOnly(getComputedStyle(fill).transform).a;
            window.progressSample = new Promise((resolve, reject) => {
              const watcher = new MutationObserver(() => {
                if (root.getAttribute("aria-valuenow") !== String(to)) return;
                watcher.disconnect();
                clearTimeout(timeout);
                try {
                  const first = scale();
                  const animation = fill.getAnimations().find((a) => a.transitionProperty === "transform");
                  if (!animation || reducedMotion === "reduce") {
                    resolve({ start, first, duration: animation?.effect.getTiming().duration ?? 0 });
                    return;
                  }
                  // Seeking a paused transition makes the midpoint independent of runner speed.
                  const duration = animation.effect.getTiming().duration;
                  animation.pause();
                  animation.currentTime = duration / 2;
                  const midpoint = scale();
                  animation.finish();
                  resolve({ start, first, midpoint, duration });
                } catch (error) {
                  reject(error);
                }
              });
              const timeout = setTimeout(() => {
                watcher.disconnect();
                reject(new Error(`Progress did not reach ${to}`));
              }, 3000);
              watcher.observe(root, { attributes: true, attributeFilter: ["aria-valuenow"] });
            });
          }, { to, reducedMotion });
          await page.keyboard.press("Enter");
          const result = await page.evaluate(() => window.progressSample);
          assert.ok(Math.abs(result.start - from / 4) < 0.001, JSON.stringify(result));
          assert.equal(await bar.getAttribute("aria-valuenow"), String(to));
          assert.equal(await bar.getAttribute("aria-valuemax"), "4");
          assert.equal(await button.evaluate((el) => el === document.activeElement), true);
          if (reducedMotion === "reduce") {
            assert.equal(result.duration, 0);
            assert.equal(result.first, to / 4);
          } else {
            assert.equal(result.duration, 300);
            assert.ok(result.midpoint > 0.25 && result.midpoint < 0.75, JSON.stringify(result));
          }

          const end = await bar.evaluate((el) => {
            const track = el.getBoundingClientRect();
            const fill = el.firstElementChild.firstElementChild.getBoundingClientRect();
            return { left: fill.left - track.left, right: track.right - fill.right, fraction: fill.width / track.width };
          });
          assert.ok(Math.abs(end.fraction - to / 4) < 0.001);
          assert.ok(Math.abs(direction === "rtl" ? end.right : end.left) < 0.1);
          assert.deepEqual(await bar.boundingBox(), initial);
          console.log(direction, reducedMotion, `${from} → ${to}`, result);
        }
        await page.getByRole("button", { name: "Unknown progress" }).click();
        assert.equal(await bar.getAttribute("aria-valuenow"), null);
        const fillWidth = await bar.evaluate((el) => el.firstElementChild.firstElementChild.getBoundingClientRect().width);
        assert.equal(fillWidth, 0);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser?.close();
  server.close();
}
