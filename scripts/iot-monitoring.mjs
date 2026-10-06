/**
 * iot-monitoring.mjs — the M3 monitoring and feedback components, read in a real browser.
 *
 *   pnpm build-storybook && node scripts/iot-monitoring.mjs [--only=battery-stale,connection-unknown,...]
 *
 * The unit tests prove what the six components render for given data. This proves what a person gets:
 * every `IoT/Monitoring` scenario (a `[data-scenario]` block on a fixed clock) is opened in each of
 *
 *   light       1280px, light theme
 *   dark        1280px, the `dark` theme class
 *   keyboard    actions (Retry, the feedback script, activity buttons) by Tab/Enter only; passive
 *               components must offer no tab stop at all
 *   reduced     prefers-reduced-motion: nothing may loop (the retrying glyph must stop)
 *   forced      forced-colors: active — every state glyph and state word is still drawn
 *   rtl         dir="rtl" — markers sit at the inline start, numbers with units stay one LTR run
 *   large       390px wide at 200% text (CDP Page.setFontSizes) — no horizontal overflow, nothing clipped
 *
 * and checked for: the accessible tree (Playwright's ARIA snapshot — the one sentence a screen reader
 * gets, and that the short visual forms are NOT also read), the visible words and glyph shapes that
 * carry each state, the truth rules (unknown is not 0 or offline, stale is marked, requested and
 * acknowledged are not confirmed, a missing origin is "Source unknown"), and axe-core. This is an
 * automated accessibility-tree check, not a manual screen-reader test, and it does not claim to be one.
 * Chromium only.
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
  await page.goto(`${base}/iframe.html?id=iot-monitoring--${story}&viewMode=story&globals=theme:${cond.theme ?? "light"}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.body.classList.contains("sb-show-main") || document.body.classList.contains("sb-show-errordisplay"), null, { timeout: 20000 });
  if (await page.evaluate(() => document.body.classList.contains("sb-show-errordisplay"))) throw new Error(`${story} threw while rendering`);
  // `sb-show-main` can be set a frame before the story's first commit; wait for the content itself.
  await page.locator("[data-scenario]").first().waitFor({ timeout: 20000 });
  if (cond.rtl) await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
  if (cond.scale) {
    const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    if (Math.abs(rootPx - 16 * cond.scale) > 0.5) throw new Error(`root font-size ${rootPx}px, expected ${16 * cond.scale}px`);
  }
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

/** Press a button the way this condition's user would: by Tab focus and Enter, or by click. */
async function press(page, cond, locator) {
  if (cond.keyboard) {
    await locator.focus();
    const focused = await locator.evaluate((el) => document.activeElement === el);
    if (!focused) throw new Error("could not focus the button by keyboard");
    await page.keyboard.press("Enter");
  } else {
    await locator.click();
  }
  await page.waitForTimeout(60);
}

async function axe(page, tag, cond) {
  if (!(await page.evaluate(() => Boolean(window.axe)))) await page.addScriptTag({ content: axeSource });
  await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
  const violations = await page.evaluate(async (forced) => {
    for (let i = 0; i < 20; i++) {
      try {
        const r = await window.axe.run(document.querySelector("#storybook-root"), {
          rules: { region: { enabled: false }, "landmark-one-main": { enabled: false }, "page-has-heading-one": { enabled: false }, "color-contrast": { enabled: !forced } },
        });
        return r.violations.map((v) => `${v.id} (${v.nodes.length}: ${v.nodes[0]?.target?.join(" ")})`);
      } catch (e) {
        if (!String(e).includes("already running")) throw e;
        await new Promise((r) => setTimeout(r, 150));
      }
    }
    return ["axe never ran"];
  }, cond.forcedColors === "active");
  expectThat(tag, violations.length === 0, `axe: ${violations.join(", ")}`);
}

/** Condition checks for one scenario block. */
async function blockChecks(page, block, tag, cond) {
  if (cond.scale) {
    const clipped = await block.evaluate((el) =>
      [el, ...el.querySelectorAll("*")]
        // Visually hidden text (the one-pixel, clipped `sr-only` box) is not drawn, so it cannot be clipped.
        .filter((n) => n.clientWidth > 1 && getComputedStyle(n).clip === "auto" && n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflowX !== "visible")
        .map((n) => n.textContent.slice(0, 40)),
    );
    expectThat(tag, clipped.length === 0, `clipped at 200% text: ${clipped.join(" | ")}`);
    const box = await block.boundingBox();
    expectThat(tag, !!box && box.x >= 0 && box.x + box.width <= cond.width + 1, `block leaves the 390px viewport (${JSON.stringify(box)})`);
  }
  if (cond.forcedColors === "active") {
    // Every state glyph is still drawn: a box, and a stroke or fill that is not transparent.
    const lost = await block.evaluate((el) =>
      [...el.querySelectorAll("svg[data-glyph]")]
        .filter((svg) => {
          const r = svg.getBoundingClientRect();
          const color = getComputedStyle(svg).color;
          return r.width === 0 || r.height === 0 || color === "rgba(0, 0, 0, 0)" || color === "transparent";
        })
        .map((svg) => svg.getAttribute("data-glyph")),
    );
    expectThat(tag, lost.length === 0, `forced colours lost glyphs: ${lost.join(", ")}`);
  }
  if (cond.rtl) {
    // A number and its unit are one left-to-right run inside an RTL page.
    const runs = await block.evaluate((el) => [...el.querySelectorAll("bdi")].map((b) => getComputedStyle(b).direction));
    expectThat(tag, runs.every((d) => d === "ltr"), `a value run is not LTR under RTL (${runs.join(",")})`);
  }
}

async function pageChecks(page, tag, cond) {
  if (cond.scale) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expectThat(tag, overflow <= 1, `horizontal overflow ${overflow}px at 200% text`);
  }
  if (cond.reducedMotion === "reduce") {
    const loops = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.playState === "running")
        .map((a) => a.effect?.target?.getAttribute?.("data-glyph") ?? "?"),
    );
    expectThat(tag, loops.length === 0, `looping animation under reduced motion: ${loops.join(", ")}`);
  }
}

/** The text of the ARIA snapshot: what the accessibility tree exposes, roles stripped. */
const aria = async (locator) => (await locator.ariaSnapshot()).replace(/\s+/g, " ");
const visible = (locator) => locator.evaluate((el) => el.innerText.replace(/\s+/g, " ").trim());
const glyphs = (locator) => locator.evaluate((el) => [...el.querySelectorAll("svg[data-glyph]")].map((g) => g.getAttribute("data-glyph")));

/* ------------------------------------------------------------------ expectations */

const BATTERY = {
  "battery-normal": { sentence: "Battery 72 percent", shows: ["72%"], level: "high" },
  "battery-low": { sentence: "Battery 21 percent, low", shows: ["21%", "Low"], glyph: "triangle", level: "low" },
  "battery-critical": { sentence: "Battery 6 percent, critical, not charging", shows: ["6%", "Critical", "Not charging"], glyph: "octagon", level: "critical" },
  "battery-charging": { sentence: "Battery 42 percent, charging", shows: ["42%", "Charging"], glyph: "bolt", level: "medium" },
  "battery-unknown": { sentence: "Battery level unknown, charging state unknown", shows: ["—", "Unknown", "Charging unknown"], level: "unknown", noZero: true },
  "battery-stale": { sentence: "Battery 18 percent, low, stale reading, reported 9 hours ago", shows: ["18%", "Stale", "9h ago"], glyph: "clock", level: "low", notOffline: true },
  "battery-unsupported": { sentence: "Battery not supported by this device", shows: ["No battery"], glyph: "slash", level: "unsupported" },
};

const CONNECTION = {
  online: { sentence: "Online, Wi-Fi via Barn gateway", glyph: "record" },
  offline: { sentence: "Offline, last seen 7 minutes ago", glyph: "circle" },
  unreachable: { sentence: "Unreachable, last seen 7 minutes ago", glyph: "circle-x" },
  stale: { sentence: "Data is out of date, last seen 3 hours ago", glyph: "clock" },
  connecting: { sentence: "Connecting, last seen 7 minutes ago", glyph: "circle-half" },
  unknown: { sentence: "Connection unknown", glyph: "dash" },
};

const TELEMETRY = {
  "telemetry-live": { sentence: "Line pressure 2.4 bar, normal, measured 1 minute ago", shows: ["2.4 bar", "Normal"], state: "known" },
  "telemetry-formatted": { sentence: "Spindle speed 12,480 RPM, normal, measured 1 minute ago", shows: ["12,480 RPM"], state: "known" },
  "telemetry-delta": {
    sentence: "Heart rate 72 beats per minute, normal, up 4 beats per minute from previous reading, measured 1 minute ago",
    shows: ["72 bpm", "+4 bpm vs previous reading"],
    state: "known",
    delta: true,
  },
  "telemetry-stale": { sentence: "Soil moisture 31 %, stale reading, last known value, measured 3 hours ago", shows: ["31 %", "Last known value", "Stale"], state: "known", stale: true, noDelta: true },
  "telemetry-unknown": { sentence: "Weight unknown, no reading", shows: ["—", "Unknown"], state: "unknown", noDigits: true },
  "telemetry-unavailable": { sentence: "Air quality unavailable, no reading", shows: ["—", "Unavailable"], state: "unavailable", noDigits: true },
  "telemetry-range": { sentence: "Glucose 5.8 millimoles per litre, reference 4.0 to 7.0, measured 2 minutes ago", shows: ["5.8 mmol/L", "Reference 4.0–7.0 mmol/L"], state: "known" },
};

const FEEDBACK = {
  "feedback-requested": { headline: "Infusion rate: Requested, not yet confirmed", glyph: "circle-dot", tone: "pending" },
  "feedback-acknowledged": { headline: "Infusion rate: Acknowledged, not yet confirmed", glyph: "circle-half", tone: "pending" },
  "feedback-retrying": { headline: "Infusion rate: Retrying, not yet confirmed", glyph: "retry", tone: "pending" },
  "feedback-confirmed": { headline: "Infusion rate: Confirmed", glyph: "check", tone: "success" },
  "feedback-failed": { headline: "Infusion rate: Failed", glyph: "circle-x", tone: "attention", retry: true },
  "feedback-timed-out": { headline: "Infusion rate: Timed out, may still apply", glyph: "clock", tone: "attention", retry: true, sentence: /last reported 20%\. It may still apply\./ },
  "feedback-unreachable": { headline: "Infusion rate: Device unreachable", glyph: "dash", tone: "attention", retry: true },
  "feedback-cancelled": { headline: "Infusion rate: Cancelled", glyph: "slash", tone: "neutral", noRollback: true },
};

const ENERGY = {
  "energy-simple": async (block, tag) => {
    const text = await visible(block);
    expectThat(tag, text.includes("This week") && text.includes("85 kWh") && text.includes("3.2 kW"), `simple: "${text}"`);
    expectThat(tag, !/Today/.test(text), "simple: assumed 'Today'");
  },
  "energy-stale": async (block, tag) => {
    expectThat(tag, (await block.locator('[data-energy-slot="power"] [data-last-known]').count()) === 1, "stale: not marked last known");
    expectThat(tag, (await aria(block)).includes("stale reading, last known value"), "stale: not stale in the accessibility tree");
  },
  "energy-partial": async (block, tag) => {
    const power = block.locator('[data-energy-slot="power"]');
    const powerText = await visible(power);
    expectThat(tag, powerText.includes("Unknown") && !/\d/.test(powerText), `partial: unknown power drawn as "${powerText}"`);
    expectThat(tag, (await visible(block.locator('[data-energy-slot="cost"]'))).includes("Not supported by this device"), "partial: unsupported cost not said");
    expectThat(tag, (await visible(block.locator('[data-energy-slot="energy"]'))).includes("14.2 kWh"), "partial: known energy lost");
  },
  "energy-unknown": async (block, tag) => {
    const slot = block.locator('[data-energy-slot="energy"]');
    expectThat(tag, (await slot.locator("[data-value-state=unknown]").count()) === 1, "unknown: not unknown");
    expectThat(tag, !/\d/.test(await visible(slot)), "unknown: a number was drawn");
  },
  "energy-custom": async (block, tag) => {
    const text = await visible(block);
    expectThat(tag, text.includes("€31.20") && text.includes("+32.5 MJ vs Shift A") && text.includes("Power factor"), `custom: "${text}"`);
    expectThat(tag, !text.includes("kWh"), "custom: assumed kWh");
  },
};

/* ------------------------------------------------------------------ stories */

const STORIES = {
  battery: {
    scenarios: Object.keys(BATTERY),
    passive: true,
    check: async (page, block, id, tag) => {
      const want = BATTERY[id];
      const root = block.locator("[data-battery-level]");
      expectThat(tag, (await root.getAttribute("data-battery-level")) === want.level, `level ${await root.getAttribute("data-battery-level")}, expected ${want.level}`);
      const tree = await aria(root);
      expectThat(tag, tree.includes(want.sentence), `accessible text "${tree}", expected "${want.sentence}"`);
      expectThat(tag, !/\d+%/.test(tree), `the percentage is read twice: "${tree}"`);
      const text = await visible(root);
      for (const word of want.shows) expectThat(tag, text.includes(word), `"${word}" not drawn ("${text}")`);
      if (want.glyph) expectThat(tag, (await glyphs(root)).includes(want.glyph), `no ${want.glyph} glyph`);
      if (want.noZero) expectThat(tag, !/\b0\s?%/.test(text), "unknown drawn as 0%");
      if (want.notOffline) expectThat(tag, !/offline/i.test(text + tree), "stale battery says offline");
    },
  },
  connection: {
    scenarios: Object.keys(CONNECTION).map((s) => `connection-${s}`),
    passive: true,
    check: async (page, block, id, tag, cond) => {
      const state = id.slice("connection-".length);
      const want = CONNECTION[state];
      const root = block.locator("[data-connectivity]");
      expectThat(tag, (await root.getAttribute("data-connectivity")) === state, `state ${await root.getAttribute("data-connectivity")}`);
      const tree = await aria(root);
      expectThat(tag, tree.includes(want.sentence), `accessible text "${tree}", expected "${want.sentence}"`);
      expectThat(tag, !/\dm ago|\dh ago/.test(tree), `the short last-seen form is read: "${tree}"`);
      expectThat(tag, (await glyphs(root))[0] === want.glyph, `marker ${(await glyphs(root))[0]}, expected ${want.glyph}`);
      const text = await visible(root);
      if (state !== "offline") expectThat(tag, !/offline/i.test(text + tree), `${state} says offline`);
      if (state !== "online") expectThat(tag, !/online/i.test(text + tree), `${state} says online`);
      if (cond.rtl) {
        // The marker leads the word at the inline start: to its right under RTL.
        const order = await root.evaluate((el) => {
          const marker = el.querySelector("svg[data-glyph]").getBoundingClientRect();
          const word = el.querySelector("svg[data-glyph]").nextElementSibling.getBoundingClientRect();
          return marker.left > word.left;
        });
        expectThat(tag, order, "RTL: marker is not at the inline start");
      }
    },
  },
  telemetry: {
    scenarios: Object.keys(TELEMETRY),
    passive: true,
    check: async (page, block, id, tag) => {
      const want = TELEMETRY[id];
      const root = block.locator("[data-value-state]");
      expectThat(tag, (await root.getAttribute("data-value-state")) === want.state, `value state ${await root.getAttribute("data-value-state")}`);
      const tree = await aria(root);
      expectThat(tag, tree.includes(want.sentence), `accessible text "${tree}", expected "${want.sentence}"`);
      const text = await visible(root);
      for (const word of want.shows) expectThat(tag, text.includes(word), `"${word}" not drawn ("${text}")`);
      if (want.stale) expectThat(tag, (await root.getAttribute("data-reading-state")) === "stale" && (await glyphs(root)).includes("clock"), "stale: not marked with the clock");
      if (want.noDelta) expectThat(tag, (await root.locator("[data-delta]").count()) === 0, "a delta was drawn for a stale value");
      if (want.delta) expectThat(tag, (await root.locator("[data-delta=up]").count()) === 1, "no delta drawn");
      if (want.noDigits) expectThat(tag, !/\d/.test(text) && !/\d/.test(tree), `a number was drawn for no value: "${text}"`);
    },
  },
  feedback: {
    scenarios: Object.keys(FEEDBACK),
    check: async (page, block, id, tag, cond) => {
      const want = FEEDBACK[id];
      const root = block.locator("[data-feedback-stage]");
      const headline = await visible(root.locator("[data-feedback-headline]"));
      expectThat(tag, headline === want.headline, `headline "${headline}"`);
      expectThat(tag, (await glyphs(root.locator("[data-feedback-headline]")))[0] === want.glyph, `glyph ${(await glyphs(root.locator("[data-feedback-headline]")))[0]}`);
      expectThat(tag, (await root.getAttribute("data-feedback-tone")) === want.tone, `tone ${await root.getAttribute("data-feedback-tone")}`);
      expectThat(tag, (await root.locator('[role="status"]').count()) === 0, "announces without being asked");
      const sentence = await visible(root.locator("[data-feedback-sentence]"));
      if (want.sentence) expectThat(tag, want.sentence.test(sentence), `sentence "${sentence}"`);
      if (want.noRollback) expectThat(tag, !/roll|revert|restor/i.test(sentence), `cancel claims a rollback: "${sentence}"`);
      if (want.tone !== "success") expectThat(tag, !/^Confirmed/.test(sentence), `reads as confirmed: "${sentence}"`);
      const retry = root.getByRole("button", { name: "Retry" });
      expectThat(tag, (await retry.count()) === (want.retry ? 1 : 0), `Retry offered: ${await retry.count()}`);
      if (want.retry && id === "feedback-timed-out") {
        const before = Number(await page.locator("[data-retries]").getAttribute("data-retries"));
        await press(page, cond, retry);
        const after = Number(await page.locator("[data-retries]").getAttribute("data-retries"));
        expectThat(tag, after === before + 1, `Retry did not reach the product (${before} → ${after})`);
      }
    },
  },
  "feedback-script": {
    scenarios: ["feedback-script"],
    check: async (page, block, id, tag, cond) => {
      const status = block.locator('[role="status"]');
      const say = async () => (await status.textContent()).trim();
      expectThat(tag, (await status.count()) === 1, "no single status region");
      expectThat(tag, (await say()) === "", `idle announced "${await say()}"`);
      const step = async (name, stage, headline) => {
        await press(page, cond, block.getByRole("button", { name, exact: true }));
        expectThat(tag, (await block.locator("[data-script-stage]").getAttribute("data-script-stage")) === stage, `after ${name}: stage ${await block.locator("[data-script-stage]").getAttribute("data-script-stage")}`);
        const words = await say();
        expectThat(tag, words.startsWith(`Zone 3 valve: ${headline}.`), `after ${name}: announced "${words}"`);
        return words;
      };
      await press(page, cond, block.getByRole("button", { name: "Request open", exact: true }));
      const requested = await step("Send", "requested", "Requested, not yet confirmed");
      expectThat(tag, !/^Zone 3 valve: Confirmed/.test(requested), "requested announced as confirmed");
      await step("Acknowledge", "acknowledged", "Acknowledged, not yet confirmed");
      await step("Time out", "timed-out", "Timed out, may still apply");
      await press(page, cond, block.getByRole("button", { name: "Retry", exact: true }));
      expectThat(tag, (await block.locator("[data-script-stage]").getAttribute("data-script-stage")) === "retrying", "Retry did not retry");
      const done = await step("Confirm", "confirmed", "Confirmed");
      expectThat(tag, done.includes("the device reports open"), `confirmed: "${done}"`);
    },
  },
  activity: {
    scenarios: ["activity"],
    check: async (page, block, id, tag, cond) => {
      const list = block.getByRole("list", { name: "Zone valve activity" });
      const items = list.getByRole("listitem");
      expectThat(tag, (await items.count()) === 5, `items: ${await items.count()}`);
      const rows = await items.evaluateAll((lis) => lis.map((li) => [li.getAttribute("data-event-id"), li.getAttribute("data-origin"), li.querySelector("[data-origin-label]").innerText.trim()]));
      expectThat(
        tag,
        JSON.stringify(rows) ===
          JSON.stringify([
            ["e5", "user", "User"],
            ["e4", "unknown", "Source unknown"],
            ["e3", "automation", "Automation"],
            ["e2", "user", "User"],
            ["e1", "device", "Device"],
          ]),
        `order/origins: ${JSON.stringify(rows)}`,
      );
      const failed = items.nth(0).locator("[data-status-label=failed]");
      expectThat(tag, (await failed.innerText()).trim() === "Failed" && (await glyphs(failed)).includes("circle-x"), "failed event not drawn with word and shape");
      // Only the real buttons take focus; rows do not.
      const stops = await block.evaluate((el) => [...el.querySelectorAll("a[href],button,input,select,textarea,[tabindex]")].filter((n) => n.tabIndex >= 0).map((n) => n.textContent.trim()));
      expectThat(tag, JSON.stringify(stops) === JSON.stringify(["View command cmd-18", "View command cmd-17"]), `tab stops: ${JSON.stringify(stops)}`);
      await press(page, cond, block.getByRole("button", { name: "View command cmd-18" }));
      expectThat(tag, (await block.locator("[data-viewed]").getAttribute("data-viewed")) === "cmd-18", "the action did not reach the product");
    },
  },
  "activity-oldest-first": {
    scenarios: ["activity-oldest"],
    passive: true,
    check: async (page, block, id, tag) => {
      const ids = await block.locator("li").evaluateAll((lis) => lis.map((li) => li.getAttribute("data-event-id")));
      expectThat(tag, JSON.stringify(ids) === JSON.stringify(["e1", "e2", "e3", "e4", "e5"]), `oldest-first order: ${ids.join(",")}`);
    },
  },
  energy: {
    scenarios: Object.keys(ENERGY),
    passive: true,
    check: async (page, block, id, tag) => ENERGY[id](block, tag),
  },
};

const results = [];
for (const [story, def] of Object.entries(STORIES)) {
  const scenarios = def.scenarios.filter((s) => !ONLY || ONLY.includes(s));
  if (scenarios.length === 0) continue;
  for (const cond of CONDITIONS) {
    const { context, page } = await open(story, cond);
    try {
      if (def.passive && cond.keyboard) {
        const stops = await page.evaluate(() => [...document.querySelectorAll("#storybook-root a[href],#storybook-root button,#storybook-root [tabindex]")].filter((n) => n.tabIndex >= 0).length);
        expectThat(`${story} [keyboard]`, stops === 0, `passive story has ${stops} tab stops`);
        const live = await page.locator('#storybook-root [role="status"], #storybook-root [aria-live], #storybook-root [role="alert"]').count();
        expectThat(`${story} [keyboard]`, live === 0, `passive story has ${live} live regions`);
      }
      for (const id of scenarios) {
        const tag = `${id} [${cond.name}]`;
        const before = failures.length;
        try {
          const block = page.locator(`[data-scenario="${id}"]`);
          if ((await block.count()) !== 1) throw new Error(`scenario block not found`);
          await def.check(page, block, id, tag, cond);
          await blockChecks(page, block, tag, cond);
        } catch (error) {
          failures.push(`${tag}: ${error.message.split("\n")[0]}`);
        }
        results.push(`${failures.length === before ? "ok  " : "FAIL"} ${tag}`);
      }
      await pageChecks(page, `${story} [${cond.name}]`, cond);
      await axe(page, `${story} [${cond.name}]`, cond);
    } catch (error) {
      failures.push(`${story} [${cond.name}]: ${error.message.split("\n")[0]}`);
    } finally {
      await context.close();
    }
  }
}

await browser.close();
server.close();
console.log(results.join("\n"));
if (failures.length) {
  console.error(`\n${failures.map((f) => `  x ${f}`).join("\n")}\n\ncheck:iot-monitoring failed (${failures.length} failures, ${checks} checks).`);
  process.exit(1);
}
console.log(`\ncheck:iot-monitoring ok — ${results.length} scenario runs, ${checks} checks.`);
