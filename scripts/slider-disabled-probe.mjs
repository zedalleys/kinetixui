/**
 * A disabled library Slider, measured in Chromium: is the thumb (the element with `role="slider"`) reported
 * disabled, and does it look disabled? Run after `pnpm build-storybook`: `node scripts/slider-disabled-probe.mjs`.
 *
 * It serves the built Storybook and opens the Slider Playground story (the real `@kinetixui/ui` Slider, mounted
 * client side, with the library's CSS), reading the `role="slider"` node from Chromium's accessibility tree (CDP)
 * and the computed style of the thumb and its ancestors:
 *   - control: a native `<input type="range" disabled>`. It must read as disabled, or this probe is blind;
 *   - `disabled: false`: not reported disabled, full opacity;
 *   - `disabled: true`: reported disabled, dimmed.
 * Before the Slider fix the disabled thumb was reported enabled at full opacity (Radix put `aria-disabled` only on
 * the role-less root, and the `disabled:` styles targeted a span). `aria-valuetext` is not measured here: Storybook
 * URL args only carry declared controls; `components-form.test.tsx` covers it.
 * Writes `evidence/website-dogfooding/slider-disabled.json`; exits non-zero when any of the three does not hold.
 */
import fs from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const staticDir = join(process.cwd(), "apps/docs/storybook-static");
if (!fs.existsSync(join(staticDir, "index.json"))) {
  console.error("apps/docs/storybook-static not found — run `pnpm build-storybook` first.");
  process.exit(2);
}
const out = process.env.KX_EVIDENCE_OUT || "evidence/website-dogfooding/slider-disabled.json";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let file = join(staticDir, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, ""));
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(staticDir) || !fs.existsSync(file)) return void res.writeHead(404).end();
  res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

/** The first `role="slider"` node in the accessibility tree, and the element's style, for the selector given. */
async function measure(page, selector) {
  const cdp = await page.context().newCDPSession(page);
  const el = page.locator(selector).first();
  await el.waitFor({ state: "attached" });
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const ax = nodes.find((n) => n.role?.value === "slider" && !n.ignored);
  const prop = (k) => ax?.properties?.find((p) => p.name === k)?.value?.value;
  const style = await el.evaluate((e) => {
    const s = getComputedStyle(e);
    return { opacity: s.opacity, pointerEvents: s.pointerEvents, tabIndex: e.tabIndex };
  });
  return {
    inAccessibilityTree: Boolean(ax),
    reportedDisabled: prop("disabled") === true,
    reportedFocusable: prop("focusable") === true,
    reportedValueText: prop("valuetext") ?? null,
    ariaDisabled: await el.getAttribute("aria-disabled"),
    ariaValueText: await el.getAttribute("aria-valuetext"),
    dataDisabled: (await el.getAttribute("data-disabled")) !== null,
    rootAriaDisabled: await el.evaluate((e) => e.parentElement?.closest("[aria-disabled]")?.getAttribute("aria-disabled") ?? null),
    // what the reader sees: the element's own opacity times every ancestor's (the Slider dims its root)
    effectiveOpacity: await el.evaluate((e) => {
      let o = 1;
      for (let n = e; n; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return Math.round(o * 100) / 100;
    }),
    ...style,
  };
}

const story = (args) => `${base}/iframe.html?id=form-inputs-slider--playground&viewMode=story${args ? `&args=${args}` : ""}`;
const results = {};
try {
  const page = await browser.newPage();
  // control: a disabled native range, as the site's battery and signal ranges are
  await page.setContent('<!doctype html><html><body><input type="range" disabled aria-label="Battery" value="40"></body></html>');
  results.nativeDisabled = await measure(page, 'input[type="range"]');

  for (const [name, args] of [
    ["sliderEnabled", "disabled:!false"],
    ["sliderDisabled", "disabled:!true"],
  ]) {
    await page.goto(story(args), { waitUntil: "load" });
    await page.locator('[role="slider"]').first().waitFor({ state: "attached", timeout: 15000 });
    results[name] = await measure(page, '[role="slider"]');
  }
} finally {
  await browser.close();
  server.close();
}

fs.writeFileSync(out, JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
const problems = [];
if (!results.nativeDisabled.reportedDisabled) problems.push("the control (a disabled native range) did not read as disabled: the probe is blind");
if (results.sliderEnabled.reportedDisabled || results.sliderEnabled.effectiveOpacity < 1) problems.push("an enabled Slider reads or looks disabled");
if (!results.sliderDisabled.reportedDisabled) problems.push("a disabled Slider's thumb is not reported disabled");
if (results.sliderDisabled.effectiveOpacity >= 1) problems.push("a disabled Slider is drawn at full opacity");
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("slider-disabled ok — the disabled thumb is reported disabled and drawn dimmed; the enabled one is neither.");
