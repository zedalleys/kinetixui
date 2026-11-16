import assert from "node:assert/strict";
import { storyId } from "./story-id.mjs";

const surfaceSelector = '[role="dialog"][aria-label="Details"]';

/** Keep only the exit active so the pointer is guaranteed to interrupt Radix Presence. */
async function holdExit(page) {
  return page.addStyleTag({
    content: `${surfaceSelector}[data-state="closed"] { animation-play-state: paused !important; }`,
  });
}

async function finishFocusEvents(page) {
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
}

async function assertFocus(page, selector) {
  const matches = await page.evaluate((target) => document.activeElement?.matches(target), selector);
  assert.ok(matches, `expected focus on ${selector}; actual: ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 180))}`);
}

/** Use trusted pointer/keyboard events; wait for observable states and the primitive's queued focus effects. */
export async function checkPopoverReopen(browser, base, check) {
  const cases = [
    { label: "retained exit and outside dismissal", repeats: 25 },
    { label: "short retained exit in dark RTL", dir: "rtl", theme: "dark", reducedMotion: "reduce", repeats: 10 },
    { label: "uncontrolled retained exit", fixture: "uncontrolled", repeats: 1 },
    { label: "text-only content", fixture: "text", repeats: 1 },
    { label: "consumer opts out of autofocus", fixture: "keep-trigger", repeats: 1 },
    { label: "retained exit under forced colors", forcedColors: "active", repeats: 1 },
    { label: "trigger removed on close", fixture: "removed-trigger" },
    { label: "disabled trigger refuses activation", fixture: "disabled", forcedColors: "active" },
  ];
  for (const scenario of cases) {
    const page = await browser.newPage({
      reducedMotion: scenario.reducedMotion ?? "no-preference",
      forcedColors: scenario.forcedColors ?? "none",
      colorScheme: scenario.theme ?? "light",
    });
    page.setDefaultTimeout(3000);
    try {
      const url = new URL("/iframe.html", base);
      url.search = new URLSearchParams({
        id: storyId("popover", "Reopen"),
        viewMode: "story",
        dir: scenario.dir ?? "ltr",
        fixture: scenario.fixture ?? "",
        globals: `theme:${scenario.theme ?? "light"}`,
      });
      await page.goto(url.href);
      const trigger = page.getByRole("button", { name: "Open details" });
      const outside = page.getByRole("button", { name: "Outside focus target" });
      const surface = page.locator(surfaceSelector);
      const target = scenario.fixture === "text" ? surfaceSelector :
        scenario.fixture === "keep-trigger" ? '[aria-expanded="true"]' : `${surfaceSelector} input`;
      const waitForState = (state) => page.waitForFunction(
        ({ selector, state }) => document.querySelector(selector)?.getAttribute("data-state") === state,
        { selector: surfaceSelector, state },
      );
      async function events() {
        const receipt = await page.locator("[data-popover-events]").textContent();
        return receipt.split(" ").filter(Boolean);
      }
      async function clickTrigger() {
        const box = await trigger.boundingBox();
        assert.ok(box, "trigger has a hit-testable rectangle");
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }

      await trigger.waitFor();
      if (scenario.fixture === "disabled") {
        await clickTrigger();
        assert.equal(await surface.count(), 0);
        assert.deepEqual(await events(), []);
      } else {
        await clickTrigger();
        await waitForState("open");
        await finishFocusEvents(page);
        await assertFocus(page, target);
        assert.equal(await surface.evaluate((node) => getComputedStyle(node).direction), scenario.dir ?? "ltr");
        assert.equal(await trigger.getAttribute("aria-controls"), await surface.getAttribute("id"));
        assert.equal(await surface.getAttribute("aria-modal"), null);
        if (scenario.fixture === "removed-trigger") {
          await page.keyboard.press("Escape");
          await surface.waitFor({ state: "detached" });
          await finishFocusEvents(page);
          assert.equal(await trigger.count(), 0);
          await assertFocus(page, "main > button");
          assert.deepEqual(await events(), ["open", "entry", "close", "return"]);
        } else {
          for (let i = 0; i < scenario.repeats; i++) {
            const before = (await events()).length;
            const paused = await holdExit(page);
            if (scenario.fixture === "keep-trigger") {
              await clickTrigger();
            } else if (i % 2 === 0) {
              await page.keyboard.press("Escape");
            } else {
              await outside.click();
            }
            await waitForState("closed");
            assert.ok(await surface.evaluate((node) => node.getAnimations().some((animation) => animation.playState === "paused" && animation.animationName === "exit")), "exit animation is paused before the second click");
            await clickTrigger();
            await waitForState("open");
            await paused.evaluate((element) => element.remove());
            await finishFocusEvents(page);
            await assertFocus(page, target);
            assert.deepEqual((await events()).slice(before), ["close", "open", "entry"]);
            assert.equal(await surface.count(), 1);
          }
          // Escape is a real dismissal once its exit completes. A delayed pointer reopen and a keyboard
          // reopen must take the same autofocus path as the interrupting pointer did.
          await clickTrigger();
          await surface.waitFor({ state: "detached" });
          await finishFocusEvents(page);
          await assertFocus(page, '[aria-expanded="false"]');
          await clickTrigger();
          await waitForState("open");
          await finishFocusEvents(page);
          await assertFocus(page, target);
          await outside.click();
          await surface.waitFor({ state: "detached" });
          await finishFocusEvents(page);
          await assertFocus(page, "main > button");
          await trigger.focus();
          await page.keyboard.press("Enter");
          await waitForState("open");
          await finishFocusEvents(page);
          await assertFocus(page, target);
          assert.equal(await surface.count(), 1);
        }
      }
      check(true, `popover reopen: ${scenario.label}`, `${scenario.repeats ?? 1} cycle(s)`);
    } catch (error) {
      check(false, `popover reopen: ${scenario.label}`, error.message);
    } finally {
      await page.close();
    }
  }
}
