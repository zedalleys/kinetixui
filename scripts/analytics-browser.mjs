/**
 * analytics-browser.mjs — the measurement funnel, in a real browser, against a real build, read off the wire.
 *
 *   cd apps/web && NEXT_PUBLIC_POSTHOG_KEY=phc_localintegrity0000 \
 *     NEXT_PUBLIC_POSTHOG_HOST=https://ingest.analytics-check.invalid \
 *     NEXT_PUBLIC_ANALYTICS_ANY_HOST=true npx next build && npx next start -p 3100 &
 *   node scripts/analytics-browser.mjs [--base http://127.0.0.1:3100]
 *
 * The unit and jsdom tests prove each emitter and the attribution chain with the real SDK. What they cannot
 * prove is that the BUILT site, hydrated in Chromium, sends those events through PostHog's own transport:
 * Next's client navigation, the delegated click listener, the clipboard, touch, the SDK's batching. This does,
 * by intercepting the ingest origin (it never resolves — `.invalid`) and decoding exactly what would be sent.
 *
 * It needs an analytics-ENABLED build: a normal build has no key, so analytics is off and nothing is sent.
 * `NEXT_PUBLIC_ANALYTICS_ANY_HOST` is the documented local-verification switch for the hostname check. Do not
 * deploy that build. Nothing here touches the real PostHog project.
 *
 * Flows, each in a fresh browser context (a fresh visitor):
 *  1. CAMPAIGN — land on the ART-002 destination with its LinkedIn tag, navigate by sidebar link to a component,
 *     then to installation, copy the CLI command. The campaign must be on every event of the one session.
 *  2. HOMEPAGE, KEYBOARD — reach the verification CTA with the keyboard and press Enter.
 *  3. BLOCKS, TOUCH — on a phone-sized, touch-only context, open a block's code, switch platform, copy.
 *  4. TOKENS BRIDGE — land on the ART-002 destination, which alone must send nothing that qualifies; copy its
 *     install command; follow the in-page evaluation link (not the sidebar) to the component it names. The
 *     campaign must survive the navigation, and each action must produce exactly one semantic event.
 * Each asserts the exact event sequence, so a duplicate capture or an event fired on render fails the run.
 */
import { gunzipSync } from "node:zlib";
import { chromium, devices } from "playwright";

const base = (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://127.0.0.1:3100").replace(/\/$/, "");
const INGEST = /^https:\/\/ingest\.analytics-check\.invalid\//;
const CAMPAIGN_URL = "/docs/tokens?utm_source=linkedin&utm_medium=social&utm_campaign=kx_p2_b_token_boundary&utm_content=li_ladder";

const problems = [];
const fail = (flow, msg) => problems.push(`${flow}: ${msg}`);

/** Every payload shape posthog-js uses: gzip, base64 form data, or plain JSON; a batch, an array or one event. */
function decode(body, url) {
  let text;
  if (body[0] === 0x1f && body[1] === 0x8b) text = gunzipSync(body).toString("utf8");
  else {
    text = body.toString("utf8");
    if (text.startsWith("data=")) text = Buffer.from(decodeURIComponent(text.slice(5)), "base64").toString("utf8");
  }
  if (!text.trim()) return [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`undecodable ingest payload to ${url}`);
  }
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.batch) ? parsed.batch : [parsed];
  return list.filter((e) => e && typeof e.event === "string");
}

async function visitor(browser, options = {}) {
  // posthog-js drops events from browsers it recognises as bots — a "HeadlessChrome" user agent or
  // navigator.webdriver — so a headless run sends nothing unless it presents as an ordinary browser. (Which is also why automated traffic
  // does not inflate the live numbers.)
  const userAgent = (options.userAgent ?? (await browser.newContext().then(async (c) => { const ua = await (await c.newPage()).evaluate(() => navigator.userAgent); await c.close(); return ua; }))).replace("HeadlessChrome", "Chrome");
  const context = await browser.newContext({ ...options, userAgent, permissions: ["clipboard-read", "clipboard-write"] });
  const sent = [];
  await context.route(INGEST, async (route) => {
    const req = route.request();
    if (req.method() === "POST") sent.push(...decode(req.postDataBuffer() ?? Buffer.alloc(0), req.url()));
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  const page = await context.newPage();
  /** Hide the page so the SDK flushes its queue (it batches), then wait until `n` product events arrived. */
  const settle = async (n) => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && sent.filter((e) => e.event !== "$pageleave").length < n) {
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      });
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1500); // a duplicate would arrive with or just after the expected batch
    return sent.filter((e) => e.event !== "$pageleave");
  };
  return { context, page, settle, sent };
}

const sequence = (events) => events.map((e) => (e.event === "cta_clicked" ? `cta_clicked:${e.properties.target}` : e.event));

function expectSequence(flow, events, expected) {
  const got = sequence(events);
  if (JSON.stringify(got) !== JSON.stringify(expected)) fail(flow, `expected ${JSON.stringify(expected)}\n      got ${JSON.stringify(got)}`);
}

/** Nothing raw on the wire: no query string, no utm_* key or value, no raw referrer. Genuine traffic is never marked diagnostic. */
function expectClean(flow, events, { diagnostic = false } = {}) {
  const wire = JSON.stringify(events);
  if (!diagnostic && wire.includes('"kx_traffic_type"')) fail(flow, "marked genuine traffic as diagnostic");
  for (const [what, re] of [["a query string in a URL property", /https?:\/\/[^"]*\?/], ["a utm_ key", /"\$?(session_entry_|initial_)?utm_/], ["the raw referrer", /lnkd\.in\/secret/]]) {
    if (re.test(wire)) fail(flow, `sent ${what}`);
  }
}

// `AutomationControlled` off clears navigator.webdriver, the SDK's other bot signal (see the user agent below).
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined, args: ["--disable-blink-features=AutomationControlled"] });
const evidence = {};

/* ---------------------------------------------------------------- 1. campaign → evaluation → intent */
{
  const flow = "campaign";
  const { context, page, settle } = await visitor(browser, { viewport: { width: 1280, height: 900 } });
  await page.goto(base + CAMPAIGN_URL, { referer: "https://lnkd.in/secret-path?trk=abc", waitUntil: "networkidle" });
  await page.locator('aside a[href="/docs/components/button"]').first().click();
  await page.waitForURL("**/docs/components/button");
  await page.locator('aside a[href="/docs/installation"]').first().click();
  await page.waitForURL("**/docs/installation");
  const fence = page.locator("pre", { hasText: "npx @kinetixui/cli add button" }).first();
  await fence.hover();
  await page.locator("div.group", { has: fence }).getByRole("button", { name: "Copy code" }).click();
  const events = await settle(7);
  expectSequence(flow, events, ["$pageview", "docs_viewed", "$pageview", "component_viewed", "$pageview", "installation_viewed", "cli_command_copied"]);
  for (const e of events) {
    const p = e.properties;
    if (p.kx_campaign !== "kx_p2_b_token_boundary" || p.kx_source !== "linkedin" || p.kx_landing_page !== "/docs/tokens" || p.kx_content !== "li_ladder") {
      fail(flow, `${e.event} lost its attribution: ${JSON.stringify({ kx_campaign: p.kx_campaign, kx_source: p.kx_source, kx_landing_page: p.kx_landing_page, kx_content: p.kx_content })}`);
    }
  }
  const sessions = new Set(events.map((e) => e.properties.$session_id));
  if (sessions.size !== 1 || [...sessions][0] == null) fail(flow, `expected one $session_id, got ${[...sessions].join(", ")}`);
  expectClean(flow, events);
  evidence[flow] = events.map((e) => ({ event: e.event, page: e.properties.page, component: e.properties.component, package: e.properties.package, kx_campaign: e.properties.kx_campaign, kx_source: e.properties.kx_source, kx_landing_page: e.properties.kx_landing_page, session: e.properties.$session_id, url: e.properties.$current_url }));
  await context.close();
}

/* ---------------------------------------------------------------- 2. homepage verification CTA, keyboard only */
{
  const flow = "homepage-keyboard";
  const { context, page, settle } = await visitor(browser, { viewport: { width: 1280, height: 900 } });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const cta = page.locator('a[data-analytics-cta="view_verification"]');
  await cta.focus();
  await page.keyboard.press("Enter");
  await page.waitForURL("**/docs/platforms");
  const events = await settle(4);
  expectSequence(flow, events, ["$pageview", "cta_clicked:view_verification", "$pageview", "docs_viewed"]);
  const click = events.find((e) => e.event === "cta_clicked");
  if (click && click.properties.source !== "homepage_verification") fail(flow, `cta source ${click.properties.source}`);
  if (events.some((e) => e.properties.kx_source !== "direct")) fail(flow, "a direct visit was attributed to something");
  expectClean(flow, events);
  evidence[flow] = events.map((e) => ({ event: e.event, target: e.properties.target, source: e.properties.source, page: e.properties.page, kx_source: e.properties.kx_source }));
  await context.close();
}

/* ---------------------------------------------------------------- 3. blocks gallery on a touch phone */
{
  const flow = "blocks-touch";
  const { context, page, settle } = await visitor(browser, { ...devices["Pixel 7"] });
  await page.goto(base + "/blocks", { waitUntil: "networkidle" });
  const block = page.locator("section[id]").first();
  const slug = await block.getAttribute("id");
  await block.getByRole("tab", { name: "code" }).tap();
  const tabs = block.getByRole("tablist", { name: /implementation platform/ }).getByRole("tab");
  const platformTab = tabs.nth(1);
  const platformLabel = (await platformTab.textContent())?.trim();
  await platformTab.tap();
  await block.getByRole("button", { name: "Copy" }).tap();
  const events = await settle(3);
  expectSequence(flow, events, ["$pageview", "platform_selected", "block_code_copied"]);
  for (const e of events.slice(1)) {
    if (e.properties.block !== slug || e.properties.source !== "blocks_gallery" || !e.properties.platform) fail(flow, `${e.event} props ${JSON.stringify({ block: e.properties.block, source: e.properties.source, platform: e.properties.platform })}`);
  }
  expectClean(flow, events);
  evidence[flow] = { slug, platformLabel, events: events.map((e) => ({ event: e.event, block: e.properties.block, platform: e.properties.platform, source: e.properties.source })) };
  await context.close();
}

/* ---------------------------------------------------------------- 4. /docs/tokens → evaluation, through the page's own bridge */
{
  const flow = "tokens-bridge";
  const { context, page, settle } = await visitor(browser, { viewport: { width: 1280, height: 900 } });
  await page.goto(base + CAMPAIGN_URL, { referer: "https://lnkd.in/secret-path?trk=abc", waitUntil: "networkidle" });

  // The landing alone: a pageview and docs_viewed, neither of which is Qualified Evaluation or Adoption Intent.
  const landed = await settle(2);
  expectSequence(flow, landed, ["$pageview", "docs_viewed"]);

  const install = page.locator("pre", { hasText: "npm install @kinetixui/tokens" });
  const installBlock = page.locator("main div.group", { has: install }).first();
  await installBlock.hover();
  await installBlock.getByRole("button", { name: "Copy code" }).click();

  // The evaluation link in the page body — main content, not the sidebar, which flow 1 already covers.
  const bridge = page.locator('main a[href="/docs/components/button"]').first();
  await bridge.scrollIntoViewIfNeeded();
  await bridge.click();
  await page.waitForURL("**/docs/components/button");

  const events = await settle(5);
  expectSequence(flow, events, ["$pageview", "docs_viewed", "install_command_copied", "$pageview", "component_viewed"]);
  const copy = events.find((e) => e.event === "install_command_copied");
  if (copy && (copy.properties.package !== "@kinetixui/tokens" || copy.properties.source !== "docs_page")) fail(flow, `install copy props ${JSON.stringify({ package: copy.properties.package, source: copy.properties.source })}`);
  const view = events.find((e) => e.event === "component_viewed");
  if (view && view.properties.component !== "button") fail(flow, `component_viewed for ${view.properties.component}`);
  for (const e of events) {
    const p = e.properties;
    if (p.kx_campaign !== "kx_p2_b_token_boundary" || p.kx_source !== "linkedin" || p.kx_landing_page !== "/docs/tokens") {
      fail(flow, `${e.event} lost its attribution: ${JSON.stringify({ kx_campaign: p.kx_campaign, kx_source: p.kx_source, kx_landing_page: p.kx_landing_page })}`);
    }
  }
  const sessions = new Set(events.map((e) => e.properties.$session_id));
  if (sessions.size !== 1 || [...sessions][0] == null) fail(flow, `expected one $session_id, got ${[...sessions].join(", ")}`);
  expectClean(flow, events);
  evidence[flow] = events.map((e) => ({ event: e.event, page: e.properties.page, component: e.properties.component, package: e.properties.package, kx_campaign: e.properties.kx_campaign, kx_landing_page: e.properties.kx_landing_page, session: e.properties.$session_id, url: e.properties.$current_url }));
  await context.close();
}

/* ---------------------------------------------------------------- 5. a diagnostic probe marks itself, and only itself */
{
  // marketing/analytics.md §11 "Diagnostic traffic": reporting drops any session holding a marked event, so the mark
  // must reach every event the tab sends — the SDK's own $pageleave included — and the marker must not leave as a URL.
  const flow = "diagnostic";
  const { context, page, settle, sent } = await visitor(browser, { viewport: { width: 1280, height: 900 } });
  await page.goto(base + "/docs/installation?kx_traffic=diagnostic", { waitUntil: "networkidle" });
  await page.locator('aside a[href="/docs/components/button"]').first().click();
  await page.waitForURL("**/docs/components/button");
  const events = await settle(4);
  expectSequence(flow, events, ["$pageview", "installation_viewed", "$pageview", "component_viewed"]);
  const leaves = () => sent.filter((e) => e.event === "$pageleave");
  for (let i = 0; i < 20 && leaves().length === 0; i++) {
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await page.waitForTimeout(500);
  }
  if (leaves().length === 0) fail(flow, "no $pageleave arrived to check");
  for (const e of [...events, ...leaves()]) if (e.properties.kx_traffic_type !== "diagnostic") fail(flow, `${e.event} is not marked diagnostic`);
  if (JSON.stringify(sent).includes("kx_traffic=")) fail(flow, "sent the kx_traffic query parameter");
  expectClean(flow, sent, { diagnostic: true });
  evidence[flow] = [...events, ...leaves()].map((e) => ({ event: e.event, kx_traffic_type: e.properties.kx_traffic_type, kx_source: e.properties.kx_source, session: e.properties.$session_id, url: e.properties.$current_url }));
  await context.close();
}

await browser.close();

console.log(JSON.stringify(evidence, null, 2));
if (problems.length) {
  console.error(`\nanalytics-browser: ${problems.length} problem(s)\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log("\nanalytics-browser: OK — campaign → evaluation → intent, keyboard CTA, touch block copy, the /docs/tokens bridge and a diagnostic probe all sent exactly the expected events");
