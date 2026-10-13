/** Focused website gate: navigation, filter semantics, motion, reflow and forced colors. */
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { chromium } from "playwright";
const base = process.env.TABS_BASE ?? "http://127.0.0.1:3123";
const out = "evidence/tabs-dogfood";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_PATH ?? (existsSync("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome") ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined),
});
const results = [];
try {
  for (const config of [
    { name: "desktop-light", width: 1280, dir: "ltr", text: 16, dark: false },
    { name: "desktop-dark-rtl", width: 1280, dir: "rtl", text: 16, dark: true },
    { name: "phone", width: 320, dir: "ltr", text: 16, dark: false },
    { name: "phone-rtl", width: 390, dir: "rtl", text: 16, dark: true },
    { name: "phone-large", width: 320, dir: "ltr", text: 32, dark: false },
    { name: "phone-large-rtl", width: 390, dir: "rtl", text: 32, dark: true },
    { name: "tablet-large", width: 768, dir: "ltr", text: 32, dark: true },
    { name: "forced-colors", width: 1280, dir: "rtl", text: 16, dark: false, forced: true },
  ]) {
    console.log("Checking", config.name);
    const context = await browser.newContext({
      viewport: { width: config.width, height: 900 },
      reducedMotion: "reduce",
      forcedColors: config.forced ? "active" : "none",
    });
    try {
      const page = await context.newPage();
      await page.addInitScript(({ dir, text, dark }) => {
        document.addEventListener("DOMContentLoaded", () => {
          document.documentElement.dir = dir;
          document.documentElement.style.fontSize = text + "px";
          document.documentElement.classList.toggle("dark", dark);
        });
      }, config);
      await page.goto(base + "/iot#fleets");
      const list = page.getByRole("tablist", { name: "IoT category" });
      await list.waitFor();
      await page.waitForTimeout(600);
      // Live direction updates must reach Radix, not merely change text alignment.
      await page.evaluate((dir) => {
        document.documentElement.dir = dir;
      }, config.dir);
      await page.waitForTimeout(100);
      const tabs = list.getByRole("tab");
      const first = tabs.first();
      await first.focus();
      await page.waitForFunction((el) => el.getAttribute("aria-selected") === "true", await first.elementHandle());
      await first.press(config.dir === "rtl" ? "ArrowLeft" : "ArrowRight");
      await page.waitForFunction(
        (el) => el.getAttribute("aria-selected") === "true",
        await tabs.nth(1).elementHandle(),
      );
      assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true");
      assert.equal(await tabs.nth(1).evaluate((el) => el === document.activeElement), true);
      const before = await tabs.nth(1).evaluate((el) => getComputedStyle(el).fontWeight);
      await first.focus();
      assert.equal(await tabs.nth(1).evaluate((el) => getComputedStyle(el).fontWeight), before);
      await first.press("End");
      const last = tabs.last();
      await page.waitForFunction((el) => el === document.activeElement, await last.elementHandle());
      assert.equal(await last.evaluate((el) => el === document.activeElement), true);
      const geometry = await last.evaluate((el) => {
        const a = el.getBoundingClientRect(),
          b = el.parentElement.getBoundingClientRect();
        return { left: a.left - b.left, right: a.right - b.right };
      });
      assert(geometry.left >= -2 && geometry.right <= 2, "focused last tab must be revealed locally");
      const styles = await last.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          duration: s.transitionDuration,
          bg: s.backgroundColor,
          border: s.borderBottomWidth,
          shadow: s.boxShadow,
          color: s.color,
          borderColor: s.borderBottomColor,
        };
      });
      assert(parseFloat(styles.duration) <= 0.001, "reduced motion is suppressed");
      assert.equal(styles.border, "2px");
      if (!config.forced) assert.equal(styles.borderColor, styles.color);
      assert(/rgba\([^)]*, 0\)$/.test(styles.bg), "tab has no fill");
      assert.equal(
        await last.evaluate(
          (el) => getComputedStyle(el).boxShadow !== "none" || parseFloat(getComputedStyle(el).outlineWidth) >= 2,
        ),
        true,
        "keyboard focus is visible",
      );
      // Root overflow is checked at both ordinary and doubled text sizes.
      const overflow = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        items: [...document.querySelectorAll("body *")]
          .filter(
            (el) =>
              el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 &&
              !el.closest('pre,[role="tablist"],[hidden]'),
          )
          .slice(0, 12)
          .map((el) => ({
            tag: el.tagName,
            cls: el.className,
            text: el.textContent.slice(0, 60),
            right: el.getBoundingClientRect().right,
          })),
      }));
      if (overflow.scroll > overflow.width + 1) console.log(JSON.stringify(overflow));
      assert(overflow.scroll <= overflow.width + 1, "IoT page reflows");
      await page.addScriptTag({ content: readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
      let axe = await page.evaluate(
        async () => (await axe.run("[data-category-bar]", { rules: { region: { enabled: false } } })).violations,
      );
      assert.deepEqual(
        axe.map((v) => v.id),
        [],
        "navigation accessibility",
      );
      if (config.name === "desktop-light") await list.screenshot({ path: out + "/after-iot-keyboard.png" });
      await page.goto(base + "/components");
      await page.waitForTimeout(500);
      await page.evaluate(({ dir, text, dark }) => {
        document.documentElement.dir = dir;
        document.documentElement.style.fontSize = text + "px";
        document.documentElement.classList.toggle("dark", dark);
      }, config);
      const filterButton = page.getByRole("button", { name: /^Filters/ });
      const mobile = await filterButton.isVisible();
      if (mobile) await filterButton.click();
      const group = page.getByRole("group", { name: "Filter by platform" }).filter({ visible: true });
      await group.waitFor();
      assert.equal(await group.locator("[data-platform-logo]").count(), 5);
      for (const svg of await group.locator("[data-platform-logo]").all()) {
        assert.equal(await svg.getAttribute("aria-hidden"), "true");
        assert.equal(await svg.getAttribute("fill"), "currentColor");
        const size = await svg.boundingBox();
        assert(
          size.width >= 14 * (config.text / 16) &&
            size.width <= 16 * (config.text / 16) &&
            size.height >= 14 * (config.text / 16) &&
            size.height <= 16 * (config.text / 16),
        );
      }
      const chip = group.getByRole("button", { name: /^React/ });
      const order = await chip.evaluate((el) => {
        const icon = el.querySelector("svg").getBoundingClientRect();
        const text = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
        const range = document.createRange();
        range.selectNodeContents(text);
        const label = range.getBoundingClientRect();
        return { iconLeft: icon.left, iconRight: icon.right, labelLeft: label.left, labelRight: label.right };
      });
      assert(
        config.dir === "rtl" ? order.iconLeft >= order.labelRight : order.iconRight <= order.labelLeft,
        "leading icon follows reading order",
      );
      await chip.focus();
      await chip.press("Space");
      await page.waitForTimeout(400);
      assert.equal(await chip.getAttribute("aria-pressed"), "true");
      if (config.forced) assert.equal(await chip.evaluate((el) => getComputedStyle(el).outlineWidth), "2px");
      assert(parseFloat(await chip.evaluate((el) => getComputedStyle(el).transitionDuration)) <= 0.001);
      assert(
        await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
        "Components page reflows",
      );
      await page.addScriptTag({ content: readFileSync("node_modules/axe-core/axe.min.js", "utf8") });
      axe = await page.evaluate(
        async () =>
          (await axe.run('[aria-label="Filter by platform"]', { rules: { region: { enabled: false } } })).violations,
      );
      assert.deepEqual(
        axe.map((v) => v.id),
        [],
        "filter accessibility",
      );
      if (config.name === "desktop-light") {
        await chip.click();
        await page.waitForTimeout(300);
        await group.screenshot({ path: out + "/after-platforms-keyboard.png" });
      }
      if (config.name === "desktop-light") {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        assert(parseFloat(await chip.evaluate((el) => getComputedStyle(el).transitionDuration)) > 0);
      }
      results.push({ case: config.name, pass: true, focusGeometry: geometry, styles });
    } catch (error) {
      results.push({ case: config.name, pass: false, error: String(error) });
      console.error(config.name, error.message);
    } finally {
      await context.close();
    }
  }
  writeFileSync(out + "/browser-results.json", JSON.stringify(results, null, 2) + "\n");
  assert(
    results.every((r) => r.pass),
    JSON.stringify(results.filter((r) => !r.pass)),
  );
  console.log(
    `PASS: ${results.length} cases; keyboard, active state, focus, RTL, reduced motion, 200% text, local overflow, icons, axe and forced colors.`,
  );
} finally {
  await browser.close();
}
