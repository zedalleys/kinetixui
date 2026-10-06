/**
 * iot-control-strategies.mjs — the M2A/M2B control contract, played through in a real browser.
 *
 *   pnpm build-storybook && node scripts/iot-control-strategies.mjs [--only=power-confirmed-success,...]
 *
 * The unit tests prove what the controls render for a given lifecycle (M2A: power, level, setpoint,
 * mode; M2B: colour, lock, media, and G12 — no status is not "offline"). This proves what a person
 * gets when they use them: each `IoT/Control strategies` story is a deterministic script (no timers,
 * no hardware) with buttons that play the device's side, and every scenario below is pressed through
 * in each of these browser conditions:
 *
 *   light       1280px, light theme
 *   dark        1280px, the `dark` theme class
 *   keyboard    the same steps with Tab/Space/Enter/arrow keys only — no clicks
 *   reduced     prefers-reduced-motion: no animation may loop, the switch knob must not transition
 *   forced      forced-colors: active — the pending track keeps its dashed outline, the outcome text is drawn
 *   rtl         dir="rtl" on the document — the knob of a switch that reads "on" sits at the inline end
 *   large       390px wide at 200% text (CDP Page.setFontSizes) — no horizontal overflow, nothing clipped
 *
 * At every step it reads back the accessible state (role, aria-checked, aria-busy, aria-valuetext), the
 * polite status region's sentence, the visible outcome sentence, and runs axe-core (every rule but the
 * page-level ones a story fragment cannot satisfy; colour contrast is skipped only under forced colours,
 * where the system palette replaces ours). This is an automated accessibility-tree check, not a manual
 * screen-reader test, and it does not claim to be one.
 *
 * Env: PLAYWRIGHT_CHROMIUM_PATH points at an existing Chromium (local runs); CI uses `playwright install chromium`.
 */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const staticDir = join(root, "apps/docs/storybook-static");
if (!existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(2);
}
const axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(staticDir, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(staticDir) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
const failures = [];
let checks = 0;
const expectThat = (tag, ok, msg) => {
  checks++;
  if (!ok) failures.push(`${tag}: ${msg}`);
};

const CONDITIONS = [
  { name: "light", width: 1280 },
  { name: "dark", width: 1280, theme: "dark", scheme: "dark" },
  { name: "keyboard", width: 1280, keyboard: true },
  { name: "reduced", width: 1280, reducedMotion: "reduce" },
  { name: "forced", width: 1280, forcedColors: "active" },
  { name: "rtl", width: 1280, rtl: true },
  { name: "large", width: 390, scale: 2 },
];

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function open(story, cond) {
  const context = await browser.newContext({
    viewport: { width: cond.width, height: 900 },
    colorScheme: cond.scheme ?? "light",
    reducedMotion: cond.reducedMotion ?? "no-preference",
    forcedColors: cond.forcedColors ?? "none",
  });
  const page = await context.newPage();
  if (cond.scale) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Page.enable");
    await cdp.send("Page.setFontSizes", { fontSizes: { standard: 16 * cond.scale, fixed: 13 * cond.scale } });
  }
  await page.goto(`${base}/iframe.html?id=iot-control-strategies--${story}&viewMode=story&globals=theme:${cond.theme ?? "light"}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.classList.contains("sb-show-main") || document.body.classList.contains("sb-show-errordisplay"), null, { timeout: 20000 });
  if (await page.evaluate(() => document.body.classList.contains("sb-show-errordisplay"))) throw new Error(`${story} threw while rendering`);
  if (cond.rtl) await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
  if (cond.scale) {
    const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    if (Math.abs(rootPx - 16 * cond.scale) > 0.5) throw new Error(`root font-size ${rootPx}px, expected ${16 * cond.scale}px`);
  }
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

/** Press a control or a script button the way this condition's user would. */
async function press(page, cond, locator) {
  if (cond.keyboard) {
    await locator.focus();
    const focused = await locator.evaluate((el) => document.activeElement === el);
    if (!focused) throw new Error("could not focus the control by keyboard");
    const role = await locator.getAttribute("role");
    await page.keyboard.press(role === "switch" || role === "radio" ? "Space" : "Enter");
  } else {
    await locator.click();
  }
  await page.waitForTimeout(60);
}

const button = (page, name) => page.getByRole("button", { name, exact: true });
const announcer = (page) => page.locator("[data-control-announcer]").first().textContent();
const outcome = (page) => page.locator("[data-outcome]").first();
const stage = (page) => page.locator("[data-script-stage]").getAttribute("data-script-stage");

async function axe(page, tag, cond) {
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ content: axeSource });
  // Measured at rest, as a11y-browser.mjs measures every story: a pulse or a fill caught mid-flight is a
  // contrast the element never rests at, and pausing one mid-fade made the result depend on timing.
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  const violations = await page.evaluate(async (forced) => {
    for (let i = 0; i < 20; i++) {
      try {
        const r = await window.axe.run(document.querySelector("#storybook-root"), {
          rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false }, "color-contrast": { enabled: !forced } },
        });
        return r.violations.map((v) => `${v.id} (${v.nodes.length})`);
      } catch (e) {
        if (!String(e).includes("already running")) throw e;
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    return ["axe never ran"];
  }, cond.forcedColors === "active");
  expectThat(tag, violations.length === 0, `axe: ${violations.join(", ")}`);
}

/** Per-condition checks that apply to whatever is on screen. */
async function conditionChecks(page, tag, cond) {
  if (cond.scale) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expectThat(tag, overflow <= 1, `horizontal overflow ${overflow}px at 200% text`);
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll("[data-outcome], [data-requested], [data-confirmed]")].filter((el) => el.scrollWidth > el.clientWidth + 1).map((el) => el.textContent),
    );
    expectThat(tag, clipped.length === 0, `clipped text: ${clipped.join(" | ")}`);
  }
  if (cond.reducedMotion === "reduce") {
    const loops = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.playState === "running")
        .map((a) => a.effect?.target?.className?.toString().slice(0, 60) ?? "?"),
    );
    expectThat(tag, loops.length === 0, `looping animation under reduced motion: ${loops.join(", ")}`);
    const knobMotion = await page.evaluate(() => {
      const knob = document.querySelector("[role=switch] > span > span");
      return knob ? getComputedStyle(knob).transitionDuration : "0s";
    });
    // The token layer's reduced-motion rule leaves 0.01ms rather than 0, so a browser still fires transition
    // events; anything at or under a millisecond is not motion a person can see.
    expectThat(tag, knobMotion.split(",").every((d) => parseFloat(d) <= 0.001), `switch knob still transitions (${knobMotion})`);
  }
  const note = page.locator("[data-outcome]");
  if (await note.count()) {
    const box = await note.first().boundingBox();
    expectThat(tag, !!box && box.width > 0 && box.height > 0, "the outcome sentence is not drawn");
  }
}

/** Where a switch's knob sits relative to its track: "start" or "end" of the inline axis. */
async function knobSide(page) {
  // Read where the knob comes to rest, not where its transition happens to be: a reading taken 60ms
  // into a 200ms slide was the gate's one source of flakiness.
  await page.waitForFunction(() => document.querySelector("[role=switch] > span > span")?.getAnimations().length === 0, null, { timeout: 5000 });
  return page.evaluate(() => {
    const track = document.querySelector("[role=switch] > span");
    const knob = track.querySelector("span");
    const t = track.getBoundingClientRect();
    const k = knob.getBoundingClientRect();
    const right = k.left + k.width / 2 > t.left + t.width / 2;
    const rtl = getComputedStyle(track).direction === "rtl";
    return right !== rtl ? "end" : "start";
  });
}

const SWITCH = (page) => page.getByRole("switch", { name: "Workshop lamp" });
const attrs = (locator) => locator.evaluate((el) => ({ checked: el.getAttribute("aria-checked"), busy: el.getAttribute("aria-busy"), shown: el.getAttribute("data-shown"), disabled: el.hasAttribute("disabled") }));

const SCENARIOS = {
  "power-confirmed-success": async (page, tag, cond) => {
    await press(page, cond, SWITCH(page));
    const pending = await attrs(SWITCH(page));
    expectThat(tag, pending.checked === "false" && pending.shown === "off" && pending.busy === "true", `pending: switch should stay at the reported off, busy (${JSON.stringify(pending)})`);
    expectThat(tag, (await knobSide(page)) === "start", "pending: the knob moved under confirmed");
    expectThat(tag, (await announcer(page)) === "Turning on, waiting for the device.", `pending announcement: "${await announcer(page)}"`);
    expectThat(tag, (await page.getByText("Turning on", { exact: true }).count()) === 1, "pending: no visible 'Turning on'");
    if (cond.forcedColors) {
      const style = await page.evaluate(() => getComputedStyle(document.querySelector("[role=switch] > span")).borderTopStyle);
      expectThat(tag, style === "dashed", `forced colours: the pending track lost its dashed outline (${style})`);
    }
    await conditionChecks(page, `${tag} pending`, cond);
    await axe(page, `${tag} pending`, cond);
    await press(page, cond, button(page, "Device confirms"));
    const done = await attrs(SWITCH(page));
    expectThat(tag, done.checked === "true" && done.busy === null, `confirmed: ${JSON.stringify(done)}`);
    expectThat(tag, (await announcer(page)) === "On.", `confirmed announcement: "${await announcer(page)}"`);
    expectThat(tag, (await knobSide(page)) === "end", "confirmed: knob is not at the inline end");
  },

  "power-optimistic-failure": async (page, tag, cond) => {
    await press(page, cond, SWITCH(page));
    const pending = await attrs(SWITCH(page));
    expectThat(tag, pending.checked === "true" && pending.busy === "true" && pending.shown === "on", `optimistic pending: ${JSON.stringify(pending)}`);
    expectThat(tag, (await knobSide(page)) === "end", "optimistic pending: the knob did not move to the request");
    expectThat(tag, (await page.locator("[data-mark]").count()) === 0, "optimistic pending: the confirmed mark was drawn");
    expectThat(tag, (await announcer(page)) === "", `optimistic pending should announce nothing, got "${await announcer(page)}"`);
    await press(page, cond, button(page, "Device fails"));
    const after = await attrs(SWITCH(page));
    expectThat(tag, after.checked === "false" && after.shown === "off", `rollback: ${JSON.stringify(after)}`);
    expectThat(tag, (await knobSide(page)) === "start", "rollback: the knob did not move back");
    expectThat(tag, (await outcome(page).getAttribute("data-rolled-back")) === "", "rollback: not marked as rolled back");
    expectThat(tag, (await outcome(page).textContent()) === "Could not turn on. The device still reports off.", `rollback sentence: "${await outcome(page).textContent()}"`);
    expectThat(tag, (await announcer(page)) === "Could not turn on. The device still reports off.", `rollback announcement: "${await announcer(page)}"`);
    await conditionChecks(page, `${tag} rolled back`, cond);
    await axe(page, `${tag} rolled back`, cond);
  },

  "power-hybrid-success": async (page, tag, cond) => {
    await press(page, cond, SWITCH(page));
    const pending = await attrs(SWITCH(page));
    expectThat(tag, pending.checked === "false" && pending.shown === "on" && pending.busy === "true", `hybrid pending: ${JSON.stringify(pending)}`);
    expectThat(tag, (await knobSide(page)) === "end", "hybrid pending: the knob did not move to the request");
    const hollow = await page.evaluate(() => getComputedStyle(document.querySelector("[role=switch] > span > span")).borderTopStyle);
    expectThat(tag, hollow === "dashed", `hybrid pending: knob not hollow/dashed (${hollow})`);
    expectThat(tag, (await announcer(page)) === "Turning on, waiting for the device.", `hybrid announcement: "${await announcer(page)}"`);
    await conditionChecks(page, `${tag} pending`, cond);
    await axe(page, `${tag} pending`, cond);
    await press(page, cond, button(page, "Device confirms"));
    expectThat(tag, (await announcer(page)) === "On.", `hybrid confirmed announcement: "${await announcer(page)}"`);
    expectThat(tag, (await page.locator("[data-mark=on]").count()) === 1, "hybrid confirmed: no confirmed tick");
  },

  "power-unreachable-reconnect": async (page, tag, cond) => {
    await press(page, cond, button(page, "Connection lost"));
    expectThat(tag, (await announcer(page)) === "Could not turn on: the device is unreachable. It last reported off.", `unreachable: "${await announcer(page)}"`);
    expectThat(tag, (await outcome(page).getAttribute("data-outcome")) === "unreachable", "unreachable: no visible outcome");
    await conditionChecks(page, `${tag} unreachable`, cond);
    await axe(page, `${tag} unreachable`, cond);
    await press(page, cond, button(page, "Device returns: on"));
    expectThat(tag, (await stage(page)) === "confirmed", `reconnect matching: stage ${await stage(page)}`);
    expectThat(tag, (await announcer(page)) === "On.", `reconnect matching: "${await announcer(page)}"`);
    await press(page, cond, button(page, "Reset"));
    await press(page, cond, button(page, "Connection lost"));
    await press(page, cond, button(page, "Device returns: off"));
    expectThat(tag, (await stage(page)) === "failed", `reconnect different: stage ${await stage(page)}`);
    expectThat(tag, (await announcer(page)) === "Could not turn on. The device still reports off.", `reconnect different: "${await announcer(page)}"`);
  },

  "power-physical-switch": async (page, tag, cond) => {
    await press(page, cond, button(page, "Wall switch: on"));
    expectThat(tag, (await attrs(SWITCH(page))).checked === "true", "physical report did not update the switch");
    expectThat(tag, (await announcer(page)) === "", "a report with no request should announce nothing");
    await press(page, cond, button(page, "Delayed older report: off"));
    expectThat(tag, (await attrs(SWITCH(page))).checked === "true", "an older report overwrote a newer one");
    expectThat(tag, (await page.locator("[data-script-stage]").textContent()).includes("stale-report"), "the older report was not refused as stale-report");
    await conditionChecks(page, tag, cond);
    await axe(page, tag, cond);
  },

  "level-rapid-commands": async (page, tag, cond) => {
    await press(page, cond, button(page, "Request 40"));
    await press(page, cond, button(page, "Request 80"));
    await press(page, cond, button(page, "Late reply for 40"));
    expectThat(tag, (await page.locator("[data-script-stage]").textContent()).includes("stale-response"), "the late reply for 40 was not refused");
    expectThat(tag, (await page.locator("[data-confirmed]").first().textContent()) === "20%", `after the late 40: numeral ${await page.locator("[data-confirmed]").first().textContent()}`);
    expectThat(tag, (await page.locator("[data-requested]").first().textContent()) === "Requested 80%, not yet confirmed", "the request chip does not name 80");
    expectThat(tag, (await announcer(page)) === "Changing to 80%, waiting for the device.", `after the late 40: "${await announcer(page)}"`);
    expectThat(tag, (await page.getByRole("slider").getAttribute("aria-valuetext")) === "20%, changing to 80%", "slider valuetext");
    await press(page, cond, button(page, "Device reports 40"));
    expectThat(tag, (await page.locator("[data-confirmed]").first().textContent()) === "40%", "the device's 40 report was not shown as reported");
    expectThat(tag, (await stage(page)) === "requested", `a report of 40 settled the request for 80 (stage ${await stage(page)})`);
    await conditionChecks(page, `${tag} pending`, cond);
    await axe(page, `${tag} pending`, cond);
    await press(page, cond, button(page, "Device confirms 80"));
    expectThat(tag, (await announcer(page)) === "80%.", `confirmed 80: "${await announcer(page)}"`);
  },

  "setpoint-hybrid": async (page, tag, cond) => {
    expectThat(tag, (await page.locator("[data-value-source=requested]").first().textContent()) === "22°C", "hybrid numeral is not the requested 22°C");
    expectThat(tag, (await page.locator("[data-requested]").textContent()) === "Requested, not yet confirmed. Device target 20°C", `chip: ${await page.locator("[data-requested]").textContent()}`);
    expectThat(tag, (await page.getByText(/^Now 18\.5°C/).count()) === 1, "the current measurement is missing");
    expectThat(tag, (await announcer(page)) === "Chamber target: Changing the target to 22°C, waiting for the device.", `pending: "${await announcer(page)}"`);
    // Under `optimistic` the chip is withheld and nothing is announced, so this is the only programmatic
    // sign that the numeral is a request; it is asserted under every strategy so they cannot drift apart.
    expectThat(tag, (await page.locator("[data-strategy][aria-busy=true]").count()) === 1, "pending: the setpoint container is not aria-busy");
    expectThat(tag, (await button(page, "Increase Chamber target").getAttribute("aria-busy")) === "true", "pending: the stepper is not aria-busy");
    if (cond.width >= 390 && !cond.scale) expectThat(tag, (await page.locator("[data-ring-requested]").count()) === 1, "ring: no dashed request segment");
    await conditionChecks(page, `${tag} pending`, cond);
    await axe(page, `${tag} pending`, cond);
    await press(page, cond, button(page, "Device confirms"));
    expectThat(tag, (await page.locator("[data-confirmed]").first().textContent()) === "22°C", "confirmed numeral");
    expectThat(tag, (await announcer(page)) === "Chamber target: 22°C.", `confirmed: "${await announcer(page)}"`);
    expectThat(tag, (await page.locator("[aria-busy=true]").count()) === 0, "confirmed: something is still aria-busy");
  },

  "mode-pending-failure": async (page, tag, cond) => {
    const checked = () => page.locator("[role=radio][aria-checked=true]").getAttribute("data-mode-id");
    if (cond.keyboard) {
      await page.getByRole("radio", { name: "Program A" }).focus();
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(60);
    } else {
      await page.getByRole("radio", { name: "Program B" }).click();
    }
    expectThat(tag, (await checked()) === "a", `pending: checked ${await checked()}`);
    expectThat(tag, (await page.getByRole("radio", { name: "Program B, requested, not yet confirmed" }).count()) === 1, "pending: the request is not named");
    expectThat(tag, (await announcer(page)) === "Changing to Program B, waiting for the device.", `pending: "${await announcer(page)}"`);
    const c = page.getByRole("radio", { name: "Program C" });
    expectThat(tag, (await c.getAttribute("aria-disabled")) === "true", "unsupported option is not marked unavailable");
    await conditionChecks(page, `${tag} pending`, cond);
    await axe(page, `${tag} pending`, cond);
    await press(page, cond, button(page, "Device fails"));
    expectThat(tag, (await checked()) === "a", `failed: checked ${await checked()}`);
    expectThat(tag, (await outcome(page).textContent()) === "Could not change to Program B. The device still reports Program A.", "failed: outcome sentence");
    await conditionChecks(page, `${tag} failed`, cond);
    await axe(page, `${tag} failed`, cond);
  },

  "connectivity-states": async (page, tag, cond) => {
    await page.waitForSelector("[data-connectivity]");
    const rows = await page.locator("[data-connectivity]").evaluateAll((els) => els.map((el) => ({ state: el.getAttribute("data-connectivity"), title: el.querySelector("dt").textContent, text: el.querySelector("dd").textContent })));
    expectThat(tag, rows.length === 7, `expected six states and the missing case, found ${rows.length}`);
    expectThat(tag, new Set(rows.map((r) => r.title)).size === rows.length, "two states share a description");
    for (const row of rows) {
      if (row.state !== "offline") expectThat(tag, !/offline/i.test(`${row.title} ${row.text}`), `${row.state} reads as offline: ${row.text}`);
    }
    expectThat(tag, rows.find((r) => r.state === "missing")?.text.includes("connection unknown"), "missing connectivity is not described as unknown");
    await conditionChecks(page, tag, cond);
    await axe(page, tag, cond);
  },

  // ------------------------------------------------------------------ M2B

  "unknown-status": async (page, tag, cond) => {
    const text = await page.locator("#storybook-root").innerText();
    expectThat(tag, !/offline/i.test(text), `a device with no status reads as offline: ${text.match(/.{0,30}offline.{0,30}/i)?.[0]}`);
    expectThat(tag, (await page.locator("[data-state-chip]").textContent()).includes("Status unknown"), "the card chip does not say 'Status unknown'");
    expectThat(tag, (await page.getByText("Device status unknown").count()) >= 2, "the controls do not describe the status as unknown");
    expectThat(tag, await SWITCH(page).isDisabled(), "an unknown-status switch accepts input");
    expectThat(tag, (await page.locator("[data-lock-headline]").textContent()) === "Lock state unknown", "the lock does not say its state is unknown");
    await conditionChecks(page, tag, cond);
    await axe(page, tag, cond);
  },

  ...colourScenario("colour-confirmed", "confirmed"),
  ...colourScenario("colour-optimistic-failure", "optimistic"),
  ...colourScenario("colour-hybrid", "hybrid"),

  "lock-confirmed": async (page, tag, cond) => {
    await press(page, cond, LOCK(page));
    await lockPendingChecks(page, tag, cond, "confirmed");
    await press(page, cond, button(page, "Device confirms"));
    expectThat(tag, (await lockAttrs(page)).state === "locked", "confirmed: data-lock-state is not locked");
    expectThat(tag, (await page.locator("[data-lock-headline]").textContent()) === "Locked", "confirmed: the headline is not 'Locked'");
    expectThat(tag, (await page.locator("[data-lock-glyph=locked]").count()) === 1, "confirmed: no closed lock");
    expectThat(tag, (await announcer(page)) === "Locked.", `confirmed: "${await announcer(page)}"`);
    expectThat(tag, (await page.getByRole("button", { name: "Unlock Front door" }).count()) === 1, "confirmed: no Unlock action");
    await conditionChecks(page, `${tag} locked`, cond);
    await axe(page, `${tag} locked`, cond);
  },

  "lock-failure": async (page, tag, cond) => {
    await press(page, cond, LOCK(page));
    await lockPendingChecks(page, tag, cond, "confirmed");
    await press(page, cond, button(page, "Device fails"));
    expectThat(tag, (await lockAttrs(page)).state === "unlocked", "failed: data-lock-state is not unlocked");
    expectThat(tag, (await page.locator("[data-lock-headline]").textContent()) === "Unlocked", "failed: the headline is not 'Unlocked'");
    expectThat(tag, (await outcome(page).textContent()) === "Could not lock. The device still reports unlocked.", `failed: "${await outcome(page).textContent()}"`);
    expectThat(tag, (await announcer(page)) === "Could not lock. The device still reports unlocked.", `failed announcement: "${await announcer(page)}"`);
    expectThat(tag, !(await LOCK(page).isDisabled()), "failed: the Lock action is not offered again");
    await conditionChecks(page, `${tag} failed`, cond);
    await axe(page, `${tag} failed`, cond);
  },

  "lock-unreachable-stale": async (page, tag, cond) => {
    await lockPendingChecks(page, tag, cond, "hybrid");
    await press(page, cond, button(page, "Late reply for an earlier request"));
    expectThat(tag, (await page.locator("[data-script-stage]").textContent()).includes("stale-response"), "the late reply was not refused");
    expectThat(tag, (await lockAttrs(page)).state === "unlocked", "a stale reply locked the door");
    expectThat(tag, (await page.locator("[data-lock-glyph=locked]").count()) === 0, "a stale reply drew the closed lock");
    await press(page, cond, button(page, "Connection lost"));
    expectThat(tag, (await announcer(page)) === "Could not lock: the device is unreachable. It last reported unlocked.", `unreachable: "${await announcer(page)}"`);
    expectThat(tag, (await outcome(page).getAttribute("data-outcome")) === "unreachable", "unreachable: no visible outcome");
    expectThat(tag, (await page.locator("[data-lock-headline]").textContent()) === "Unlocked", "unreachable: the headline is not the reported 'Unlocked'");
    await conditionChecks(page, `${tag} unreachable`, cond);
    await axe(page, `${tag} unreachable`, cond);
    await press(page, cond, button(page, "Device returns: locked"));
    expectThat(tag, (await stage(page)) === "confirmed", `reconnect: stage ${await stage(page)}`);
    expectThat(tag, (await announcer(page)) === "Locked.", `reconnect: "${await announcer(page)}"`);
  },

  // A request still open when the device's link drops: the request is honestly unresolved, but nothing is
  // progressing, so the chip must stop pulsing (and keep its dashed outline and words). Read off the running
  // animations, not the class list: the class is what the unit test checks, the animation is what a person sees.
  "level-pending-link-lost": async (page, tag, cond) => {
    const chip = page.locator("[data-requested]");
    const pulsing = () => chip.evaluate((el) => el.getAnimations().some((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations === Infinity));
    const dashed = () => chip.evaluate((el) => getComputedStyle(el).borderStyle.includes("dashed"));
    const moves = cond.reducedMotion !== "reduce";
    expectThat(tag, (await chip.textContent()) === "Requested 60%, not yet confirmed", `online chip: ${await chip.textContent()}`);
    expectThat(tag, (await pulsing()) === moves, `online: the open request ${moves ? "does not pulse" : "pulses under reduced motion"}`);
    for (const [step, label] of [["offline", "Device goes offline"], ["unreachable", "Hub unreachable"]]) {
      await press(page, cond, button(page, label));
      expectThat(tag, (await chip.count()) === 1 && (await chip.textContent()) === "Requested 60%, not yet confirmed", `${step}: the request is no longer shown`);
      expectThat(tag, !(await pulsing()), `${step}: the chip still pulses beside a request that is going nowhere`);
      expectThat(tag, await dashed(), `${step}: the chip lost its dashed outline`);
    }
    await press(page, cond, button(page, "Device back online"));
    expectThat(tag, (await pulsing()) === moves, `back online: the pulse ${moves ? "did not resume" : "ran under reduced motion"}`);
    // axe freezes every animation on the page, so it runs last, on the offline state.
    await press(page, cond, button(page, "Device goes offline"));
    await conditionChecks(page, `${tag} offline`, cond);
    await axe(page, `${tag} offline`, cond);
  },

  "media-play-confirmed": async (page, tag, cond) => {
    await press(page, cond, button(page, "Play"));
    await mediaPendingChecks(page, tag, cond);
    await press(page, cond, button(page, "Device confirms"));
    expectThat(tag, (await page.locator("[data-playback-headline]").textContent()) === "Playing", "confirmed: headline");
    expectThat(tag, (await page.locator("[role=group][data-playback]").getAttribute("data-playback")) === "playing", "confirmed: data-playback");
    expectThat(tag, (await button(page, "Pause").count()) === 1, "confirmed: no Pause action");
    expectThat(tag, (await announcer(page)) === "Playing.", `confirmed: "${await announcer(page)}"`);
    // Transport is not mirrored: Previous stays on the left in every direction.
    const prev = await button(page, "Previous").boundingBox();
    const next = await button(page, "Next").boundingBox();
    expectThat(tag, prev && next && prev.x < next.x, "transport order is mirrored");
  },

  "media-play-failure": async (page, tag, cond) => {
    await press(page, cond, button(page, "Play"));
    await mediaPendingChecks(page, tag, cond);
    await press(page, cond, button(page, "Device fails"));
    expectThat(tag, (await page.locator("[data-playback-headline]").textContent()) === "Paused", "failed: headline");
    expectThat(tag, (await outcome(page).textContent()) === "Could not start playback. The device still reports paused.", `failed: "${await outcome(page).textContent()}"`);
    expectThat(tag, (await announcer(page)) === "Could not start playback. The device still reports paused.", `failed announcement: "${await announcer(page)}"`);
    expectThat(tag, !(await button(page, "Play").isDisabled()), "failed: Play is not offered again");
    await conditionChecks(page, `${tag} failed`, cond);
    await axe(page, `${tag} failed`, cond);
  },

  "media-seek-volume": async (page, tag, cond) => {
    const scrub = page.locator("[data-media-part=scrubber]");
    const position = page.getByRole("slider", { name: "Position" });
    const volume = page.getByRole("slider", { name: "Volume" });
    await press(page, cond, button(page, "Seek to 2:00"));
    expectThat(tag, (await position.getAttribute("aria-valuetext")) === "1 minute 5 seconds, changing to 2 minutes", `seek valuetext: ${await position.getAttribute("aria-valuetext")}`);
    expectThat(tag, (await position.getAttribute("aria-busy")) === "true", "seek: the scrubber is not aria-busy");
    expectThat(tag, (await position.getAttribute("min")) === "0" && (await position.getAttribute("max")) === "1800", "seek: min/max");
    expectThat(tag, (await scrub.locator("[data-confirmed]").textContent()) === "1:05", "seek: the numeral is not the reported 1:05");
    expectThat(tag, (await scrub.locator("[data-requested]").textContent()) === "Requested 2:00, not yet confirmed", "seek: no request chip");
    expectThat(tag, (await scrub.locator("[data-control-announcer]").textContent()) === "Seeking to 2 minutes, waiting for the device.", "seek: announcement");
    await press(page, cond, button(page, "Device reports 1:06"));
    expectThat(tag, (await scrub.locator("[data-confirmed]").textContent()) === "1:06", "an intermediate position was not shown as reported");
    expectThat(tag, (await stage(page)).startsWith("requested"), `an intermediate position settled the seek (${await stage(page)})`);
    await press(page, cond, button(page, "Volume to 60"));
    expectThat(tag, (await volume.getAttribute("aria-valuetext")) === "40%, changing to 60%", `volume valuetext: ${await volume.getAttribute("aria-valuetext")}`);
    expectThat(tag, (await page.locator("[data-media-part=volume] [data-requested]").textContent()) === "Requested 60%, not yet confirmed", "volume: no request chip");
    await conditionChecks(page, `${tag} pending`, cond);
    await axe(page, `${tag} pending`, cond);
    await press(page, cond, button(page, "Device confirms the seek"));
    expectThat(tag, (await scrub.locator("[data-confirmed]").textContent()) === "2:00", "seek confirmed: numeral");
    expectThat(tag, (await scrub.locator("[data-control-announcer]").textContent()) === "2 minutes.", "seek confirmed: announcement");
    await press(page, cond, button(page, "Device confirms the volume"));
    expectThat(tag, (await volume.getAttribute("aria-valuetext")) === "60%", "volume confirmed: valuetext");
  },

  "media-unavailable": async (page, tag, cond) => {
    const text = await page.locator("#storybook-root").innerText();
    expectThat(tag, !/offline/i.test(text), "an unknown media device reads as offline");
    expectThat(tag, (await page.getByText("Device status unknown").count()) === 1, "the unknown status is not said exactly once");
    for (const name of ["Previous", "Play", "Next"]) expectThat(tag, await button(page, name).isDisabled(), `${name} accepts input on an unknown device`);
    expectThat(tag, (await page.locator("[data-support=unsupported]").textContent()) === "Doorbell: not supported by this device", "unsupported is not said");
    await conditionChecks(page, tag, cond);
    await axe(page, tag, cond);
  },
};

/** One colour scenario per strategy: Warm white reported, Ocean requested, then confirmed or failed. */
function colourScenario(id, strategy) {
  return {
    [id]: async (page, tag, cond) => {
      const checked = () => page.locator("[role=radio][aria-checked=true]").getAttribute("data-mode-id");
      const shown = page.locator("[data-color-shown]");
      if (cond.keyboard) {
        await page.getByRole("radio", { name: "Warm white" }).focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(60);
      } else {
        await page.getByRole("radio", { name: "Ocean" }).click();
      }
      expectThat(tag, (await page.locator("[data-strategy][aria-busy=true]").count()) >= 1, "pending: nothing is aria-busy");
      if (strategy === "optimistic") {
        expectThat(tag, (await checked()) === "ocean", `optimistic pending: checked ${await checked()}`);
        expectThat(tag, (await shown.textContent()) === "Ocean (#2563EB)", `optimistic pending: shown ${await shown.textContent()}`);
        expectThat(tag, (await page.locator("[data-requested]").count()) === 0, "optimistic pending: a request chip was drawn");
        expectThat(tag, (await announcer(page)) === "", `optimistic pending should announce nothing, got "${await announcer(page)}"`);
      } else {
        expectThat(tag, (await checked()) === "warm", `${strategy} pending: checked ${await checked()}`);
        expectThat(tag, (await page.getByRole("radio", { name: "Ocean, requested, not yet confirmed" }).count()) === 1, "pending: the request is not named on its swatch");
        expectThat(tag, (await announcer(page)) === "Changing to Ocean (#2563EB), waiting for the device.", `pending: "${await announcer(page)}"`);
        if (strategy === "confirmed") {
          expectThat(tag, (await shown.textContent()) === "Warm white (2700 K)" && (await shown.getAttribute("data-value-source")) === "reported", "confirmed pending: the preview is not the reported colour");
          expectThat(tag, (await page.locator("[data-requested]").textContent()) === "Requested Ocean (#2563EB), not yet confirmed", "confirmed pending: chip");
        } else {
          expectThat(tag, (await shown.textContent()) === "Ocean (#2563EB)" && (await shown.getAttribute("data-value-source")) === "requested", "hybrid pending: the preview is not the target");
          expectThat(tag, (await page.locator("[data-requested]").textContent()) === "Requested, not yet confirmed. Device reports Warm white (2700 K)", "hybrid pending: chip");
          const edge = await page.evaluate(() => getComputedStyle(document.querySelector("[data-color-preview]")).borderTopStyle);
          expectThat(tag, edge === "dashed", `hybrid pending: the target preview is not dashed (${edge})`);
        }
      }
      if (cond.forcedColors) {
        // Device colour is content: forced colours keep it, as they keep a photo.
        const fill = await page.evaluate(() => getComputedStyle(document.querySelector("[data-color-preview]")).backgroundColor);
        expectThat(tag, fill !== "rgba(0, 0, 0, 0)" && fill !== "transparent", `forced colours: the colour preview lost its fill (${fill})`);
      }
      await conditionChecks(page, `${tag} pending`, cond);
      await axe(page, `${tag} pending`, cond);
      if (strategy === "optimistic") {
        await press(page, cond, button(page, "Device fails"));
        expectThat(tag, (await checked()) === "warm", `rollback: checked ${await checked()}`);
        expectThat(tag, (await shown.textContent()) === "Warm white (2700 K)", "rollback: the preview did not return");
        expectThat(tag, (await outcome(page).getAttribute("data-rolled-back")) === "", "rollback: not marked as rolled back");
        const sentence = "Could not change to Ocean (#2563EB). The device still reports Warm white (2700 K).";
        expectThat(tag, (await outcome(page).textContent()) === sentence, `rollback sentence: "${await outcome(page).textContent()}"`);
        expectThat(tag, (await announcer(page)) === sentence, `rollback announcement: "${await announcer(page)}"`);
        await conditionChecks(page, `${tag} rolled back`, cond);
        await axe(page, `${tag} rolled back`, cond);
      } else {
        // The device reports a new object with its keys in another order: equality is by value.
        await press(page, cond, button(page, "Device reports Ocean"));
        expectThat(tag, (await stage(page)) === "confirmed", `confirmed: stage ${await stage(page)}`);
        expectThat(tag, (await checked()) === "ocean", `confirmed: checked ${await checked()}`);
        expectThat(tag, (await announcer(page)) === "Ocean (#2563EB).", `confirmed: "${await announcer(page)}"`);
      }
    },
  };
}

const LOCK = (page) => page.getByRole("button", { name: "Lock Front door" });
const lockAttrs = (page) => page.locator("[role=group][data-lock-state]").evaluate((el) => ({ state: el.getAttribute("data-lock-state"), busy: el.getAttribute("aria-busy") }));

/** A lock request is open: never "Locked", busy, worded as pending, not pressable. */
async function lockPendingChecks(page, tag, cond, strategy) {
  const attrs = await lockAttrs(page);
  expectThat(tag, attrs.state === "unlocked" && attrs.busy === "true", `pending: ${JSON.stringify(attrs)}`);
  expectThat(tag, (await page.locator("[data-lock-glyph=locked]").count()) === 0, "pending: the closed lock was drawn");
  expectThat(tag, (await page.getByText("Locked", { exact: true }).count()) === 0, "pending: 'Locked' is on screen");
  const headline = await page.locator("[data-lock-headline]").textContent();
  expectThat(tag, headline === (strategy === "hybrid" ? "Locking" : "Unlocked"), `pending headline: ${headline}`);
  const chip = await page.locator("[data-requested]").textContent();
  expectThat(tag, chip === (strategy === "hybrid" ? "Waiting for the device. It still reports unlocked" : "Locking, not yet confirmed"), `pending chip: ${chip}`);
  expectThat(tag, (await announcer(page)) === "Locking, waiting for the device.", `pending announcement: "${await announcer(page)}"`);
  expectThat(tag, await LOCK(page).isDisabled(), "pending: Lock can be pressed again");
  await conditionChecks(page, `${tag} pending`, cond);
  await axe(page, `${tag} pending`, cond);
}

/** A play request is open: the headline stays at the reported "Paused", and only Play is busy. */
async function mediaPendingChecks(page, tag, cond) {
  const group = page.locator("[role=group][data-playback]");
  expectThat(tag, (await group.getAttribute("data-playback")) === "paused", "pending: data-playback is not the reported paused");
  expectThat(tag, (await group.getAttribute("aria-busy")) === "true", "pending: the media group is not aria-busy");
  expectThat(tag, (await page.locator("[data-playback-headline]").textContent()) === "Paused", "pending: headline");
  expectThat(tag, (await page.locator("[data-requested]").first().textContent()) === "Starting playback, not yet confirmed", "pending: chip");
  const play = button(page, "Play");
  expectThat(tag, (await play.getAttribute("aria-busy")) === "true" && (await play.isDisabled()), "pending: Play is not busy and disabled");
  expectThat(tag, !(await button(page, "Next").isDisabled()), "pending: a pending play locked Next");
  expectThat(tag, (await announcer(page)) === "Starting playback, waiting for the device.", `pending announcement: "${await announcer(page)}"`);
  await conditionChecks(page, `${tag} pending`, cond);
  await axe(page, `${tag} pending`, cond);
}

const results = [];
for (const [story, play] of Object.entries(SCENARIOS)) {
  if (ONLY && !ONLY.includes(story)) continue;
  for (const cond of CONDITIONS) {
    const tag = `${story} [${cond.name}]`;
    const before = failures.length;
    const { context, page } = await open(story, cond);
    try {
      await play(page, tag, cond);
    } catch (error) {
      failures.push(`${tag}: ${error.message.split("\n")[0]}`);
    } finally {
      await context.close();
    }
    results.push(`${failures.length === before ? "ok  " : "FAIL"} ${tag}`);
  }
}

await browser.close();
server.close();
console.log(results.join("\n"));
if (failures.length) {
  console.error(`\n${failures.map((f) => `  x ${f}`).join("\n")}\n\ncheck:iot-strategies failed (${failures.length} of ${checks} checks).`);
  process.exit(1);
}
console.log(`\ncheck:iot-strategies ok — ${results.length} scenario runs, ${checks} checks.`);
