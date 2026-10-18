/**
 * marketing-stop-gate-browser.mjs — the LI-001 attribution stop gate, in a real browser, against a local build.
 *
 *   cd apps/web && NEXT_PUBLIC_POSTHOG_KEY=phc_localintegrity0000 \
 *     NEXT_PUBLIC_POSTHOG_HOST=https://ingest.analytics-check.invalid \
 *     NEXT_PUBLIC_ANALYTICS_ANY_HOST=true npx next build && npx next start -p 3100 &
 *   node scripts/marketing-stop-gate-browser.mjs [--base http://127.0.0.1:3100] [--asset LI-001] [--out evidence.json]
 *
 * `--url <tagged url>` checks that URL instead of the register's, expecting exactly the parameters it carries. It is
 * how the negative controls run: a URL with `utm_medium=article` must FAIL, because the runtime replaces that medium.
 *
 * What this proves, and what it does not. It loads the asset's tagged URL exactly as the content register builds it
 * (the origin swapped for the local build), hydrates the built site in Chromium and decodes what posthog-js would
 * send, by intercepting an ingest origin that never resolves. So it proves the URL's parameters survive the
 * runtime parser, client-side navigation and the SDK's transport, and that the diagnostic and internal marks
 * reach the wire. It does NOT prove that production PostHog received anything: that needs the real link opened on
 * kinetixui.com and the event found in the project (the publish packet's last step). Nothing here touches the real
 * PostHog project, and the analytics-enabled build it needs must never be deployed.
 *
 * Flows, each in a fresh browser context (a fresh visitor):
 *  1. DIAGNOSTIC — the tagged URL plus `&kx_traffic=diagnostic`; one real click on the page; then a sidebar link to
 *     /docs/installation. Every event must carry the campaign, source, medium and content, the landing page, and
 *     `kx_traffic_type: "diagnostic"`, in one session.
 *  2. AUDIENCE (negative control) — the same URL without the flag, and no input at all. The campaign must arrive and
 *     `kx_traffic_type` must not; and a page that was only loaded must send no `page_engaged`.
 *  3. INTERNAL — `/?kx_traffic=internal` once, then the tagged URL in a NEW TAB of the same browser (localStorage is
 *     shared, sessionStorage is not). The tagged visit must carry `kx_traffic_type: "internal"`.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { chromium } from "playwright";

const arg = (name, fallback) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback);
const base = arg("--base", "http://127.0.0.1:3100").replace(/\/$/, "");
const assetId = arg("--asset", "LI-001");
const out = arg("--out", null);
const override = arg("--url", null);
const INGEST = /^https:\/\/ingest\.analytics-check\.invalid\//;

const register = JSON.parse(readFileSync("marketing/content/register.json", "utf8"));
const asset = register.assets.find((a) => a.id === assetId);
if (!override && !asset?.url) {
  console.error(`stop-gate: ${assetId} has no url in marketing/content/register.json`);
  process.exit(2);
}
const tagged = new URL(override ?? asset.url);
const expected = {
  kx_campaign: tagged.searchParams.get("utm_campaign"),
  kx_source: tagged.searchParams.get("utm_source"),
  kx_medium: tagged.searchParams.get("utm_medium"),
  kx_content: tagged.searchParams.get("utm_content"),
  kx_landing_page: tagged.pathname,
};
const localUrl = (extra = "") => `${base}${tagged.pathname}${tagged.search}${extra}`;

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

// posthog-js drops events from a "HeadlessChrome" user agent and from navigator.webdriver, so the visitor presents
// as an ordinary browser (the same arrangement as scripts/analytics-browser.mjs).
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined, args: ["--disable-blink-features=AutomationControlled"] });
const userAgent = await browser.newContext().then(async (c) => {
  const ua = await (await c.newPage()).evaluate(() => navigator.userAgent);
  await c.close();
  return ua.replace("HeadlessChrome", "Chrome");
});

async function visitor() {
  const context = await browser.newContext({ userAgent, viewport: { width: 1280, height: 900 } });
  const sent = [];
  await context.route(INGEST, async (route) => {
    const req = route.request();
    if (req.method() === "POST") sent.push(...decode(req.postDataBuffer() ?? Buffer.alloc(0), req.url()));
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  /** Hide the page so the SDK flushes its batch, then wait until `n` non-pageleave events arrived. */
  const settle = async (page, n) => {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline && sent.filter((e) => e.event !== "$pageleave").length < n) {
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      });
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1500);
    return sent.filter((e) => e.event !== "$pageleave");
  };
  return { context, sent, settle };
}

const pick = (e) => ({
  event: e.event,
  kx_campaign: e.properties.kx_campaign,
  kx_source: e.properties.kx_source,
  kx_medium: e.properties.kx_medium,
  kx_content: e.properties.kx_content,
  kx_landing_page: e.properties.kx_landing_page,
  kx_traffic_type: e.properties.kx_traffic_type ?? null,
  source: e.properties.source,
  url: e.properties.$current_url,
  session: e.properties.$session_id,
});

function expectAttributed(flow, events) {
  for (const e of events) {
    for (const [key, value] of Object.entries(expected)) {
      if (e.properties[key] !== value) fail(flow, `${e.event} has ${key}=${JSON.stringify(e.properties[key])}, expected ${JSON.stringify(value)}`);
    }
  }
  const wire = JSON.stringify(events);
  if (/https?:\/\/[^"]*\?/.test(wire)) fail(flow, "a URL property kept its query string");
  if (/"\$?(session_entry_|initial_)?utm_/.test(wire)) fail(flow, "a utm_ key reached the wire");
}

const evidence = { asset: override ? null : assetId, url: tagged.href, expected, base, flows: {} };

/* ---------------------------------------------------------------- 1. diagnostic */
{
  const flow = "diagnostic";
  const { context, settle } = await visitor();
  const page = await context.newPage();
  await page.goto(localUrl("&kx_traffic=diagnostic"), { waitUntil: "networkidle" });
  await page.mouse.click(640, 450); // a real (trusted) input through CDP: page_engaged
  await page.locator('aside a[href="/docs/installation"]').first().click();
  await page.waitForURL("**/docs/installation");
  const events = await settle(page, 5);
  const names = events.map((e) => e.event);
  for (const name of ["$pageview", "docs_viewed", "page_engaged", "installation_viewed"]) {
    if (!names.includes(name)) fail(flow, `no ${name} (got ${JSON.stringify(names)})`);
  }
  if (names.filter((n) => n === "page_engaged").length > 2) fail(flow, `page_engaged sent more than once per page view: ${JSON.stringify(names)}`);
  expectAttributed(flow, events);
  for (const e of events) if (e.properties.kx_traffic_type !== "diagnostic") fail(flow, `${e.event} is not marked diagnostic`);
  const sessions = new Set(events.map((e) => e.properties.$session_id));
  if (sessions.size !== 1) fail(flow, `expected one session, got ${sessions.size}`);
  evidence.flows[flow] = events.map(pick);
  await context.close();
}

/* ---------------------------------------------------------------- 2. audience (negative control) */
{
  const flow = "audience";
  const { context, settle } = await visitor();
  const page = await context.newPage();
  await page.goto(localUrl(), { waitUntil: "networkidle" });
  const events = await settle(page, 2);
  expectAttributed(flow, events);
  for (const e of events) if ("kx_traffic_type" in e.properties) fail(flow, `${e.event} is marked ${e.properties.kx_traffic_type} without the flag`);
  if (events.some((e) => e.event === "page_engaged")) fail(flow, "page_engaged sent for a page nobody touched");
  if (!events.some((e) => e.event === "$pageview")) fail(flow, "no $pageview");
  evidence.flows[flow] = events.map(pick);
  await context.close();
}

/* ---------------------------------------------------------------- 3. internal */
{
  const flow = "internal";
  const { context, sent, settle } = await visitor();
  const first = await context.newPage();
  await first.goto(`${base}/?kx_traffic=internal`, { waitUntil: "networkidle" });
  await settle(first, 1);
  sent.length = 0; // keep only the tagged visit in the new tab
  const page = await context.newPage();
  await page.goto(localUrl(), { waitUntil: "networkidle" });
  const events = await settle(page, 2);
  expectAttributed(flow, events);
  for (const e of events) if (e.properties.kx_traffic_type !== "internal") fail(flow, `${e.event} is not marked internal in a new tab of a marked browser`);
  evidence.flows[flow] = events.map(pick);
  await context.close();
}

await browser.close();

if (out) writeFileSync(out, JSON.stringify(evidence, null, 2) + "\n");
for (const [flow, events] of Object.entries(evidence.flows)) {
  console.log(`\n${flow}`);
  for (const e of events) console.log(`  ${e.event.padEnd(20)} ${e.kx_source}/${e.kx_medium} ${e.kx_campaign}/${e.kx_content} landing=${e.kx_landing_page} traffic=${e.kx_traffic_type}`);
}
if (problems.length) {
  console.error(`\nstop-gate (browser): ${problems.length} problem(s)\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nstop-gate (browser) ok — ${assetId}'s link survives the parser, navigation and the SDK transport, marked when asked and only then.`);
console.log("This is a local build with an intercepted ingest. Production delivery is verified only in PostHog.");
