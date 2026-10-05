/**
 * iot-control-strategies.mjs — the M2A control contract, played through in a real browser.
 *
 *   pnpm build-storybook && node scripts/iot-control-strategies.mjs [--only=power-confirmed-success,...]
 *
 * The unit tests prove what the four controls render for a given lifecycle. This proves what a person
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
    if (cond.width >= 390 && !cond.scale) expectThat(tag, (await page.locator("[data-ring-requested]").count()) === 1, "ring: no dashed request segment");
    await conditionChecks(page, `${tag} pending`, cond);
    await axe(page, `${tag} pending`, cond);
    await press(page, cond, button(page, "Device confirms"));
    expectThat(tag, (await page.locator("[data-confirmed]").first().textContent()) === "22°C", "confirmed numeral");
    expectThat(tag, (await announcer(page)) === "Chamber target: 22°C.", `confirmed: "${await announcer(page)}"`);
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
};

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
