/**
 * theme-isolation.mjs — colour/theme state stays where it belongs, and the focus ring follows the theme.
 * Measured in Chromium against the production site.
 *
 *   pnpm build:web && pnpm --filter @kinetixui/web start &   (then)   pnpm check:theme-isolation
 *   node scripts/theme-isolation.mjs --base http://127.0.0.1:3000
 *
 * Four kinds of colour state exist on the site, and this holds the lines between them
 * (docs/audits/COLOR-THEMING-MATURITY-AUDIT.md §9):
 *
 *   site theme       next-themes' `.dark` on <html> — the header toggle
 *   preview theme    a `.theme-light` / `.dark` subtree (Create's Light/Dark switch, the Theming page panels)
 *   generated theme  Create's design, written as inline custom properties on the preview root only
 *   direction        `dir`, owned by the component preview toolbar — not by any colour control
 *
 * What it asserts, with the site in light AND in dark:
 *
 *   shell        changing the theme colour in Create changes nothing outside the preview: <html> class,
 *                style and dir, the :root tokens, the header's computed colour
 *   focus        a keyboard-focused Button in the preview draws its ring in the preview's `--focus`, not
 *                the shipped azure — and on a brand that is not blue those are different colours
 *   leak-in      a Light preview on a dark page resolves the LIGHT action / focus / grouped-surface /
 *                focus-ring values, on Create and on the Theming page's light panel
 *   direction    with <html dir="rtl">, changing the theme colour leaves dir alone; the colour still applies
 *   invalid      a malformed hex is marked invalid and leaves the preview's colours as they were
 *   reset        Reset puts the preview back on the shipped tokens and drops `?preset=` from the URL
 *   navigation   a design does not follow the reader to another page
 *
 * Every assertion compares two renderings in the same run, so fonts and antialiasing do not enter into it.
 */
import { chromium } from "playwright";

const base = process.argv.find((a) => a.startsWith("--base="))?.slice(7) ?? process.argv[process.argv.indexOf("--base") + 1] ?? "http://127.0.0.1:3000";
const GREEN = "#16a34a";

const failures = [];
const check = (ok, label, detail = "") => {
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
};

/** `"143 82% 35%"` -> [r,g,b] 0-255, the way the browser resolves hsl(). */
function hslChannelsToRgb(channels) {
  const [h, s, l] = channels.trim().split(/\s+/).map((v) => parseFloat(v));
  const S = s / 100, L = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = S * Math.min(L, 1 - L);
  const f = (n) => L - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
const rgbOf = (css) => (css.match(/rgba?\(([^)]+)\)/)?.[1] ?? "").split(",").slice(0, 3).map((v) => Math.round(parseFloat(v)));
const near = (a, b) => a.length === 3 && b.length === 3 && a.every((v, i) => Math.abs(v - b[i]) <= 2);
const lum = ([r, g, b]) => {
  const c = [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** What lives outside the preview, as one comparable string. */
const shellState = (page) =>
  page.evaluate(() => {
    const html = document.documentElement;
    const rootCs = getComputedStyle(html);
    const header = document.querySelector("header");
    return JSON.stringify({
      cls: html.className,
      style: html.getAttribute("style"),
      dir: html.getAttribute("dir"),
      vars: ["--primary", "--action", "--focus", "--background", "--shadow-focus"].map((n) => rootCs.getPropertyValue(n).trim()),
      header: header ? [getComputedStyle(header).color, getComputedStyle(header).backgroundColor] : null,
    });
  });

const previewVars = (page, names) =>
  page.evaluate((names) => {
    const cs = getComputedStyle(document.querySelector("[data-create-preview-root]"));
    return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]));
  }, names);

async function setHex(page, hex) {
  const input = page.locator("[id$='-hex']").first();
  await input.fill(hex);
  await input.press("Enter");
  await page.waitForTimeout(150);
}

/** Keyboard-focus the first preview button and read its ring and the preview's own focus / background. */
async function focusedRing(page) {
  await page.locator("[data-create-preview-root] button").first().focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  return page.evaluate(() => {
    const root = document.querySelector("[data-create-preview-root]");
    const a = document.activeElement;
    const cs = getComputedStyle(root);
    return {
      inPreview: root.contains(a) && a.tagName === "BUTTON" && a.matches(":focus-visible"),
      boxShadow: getComputedStyle(a).boxShadow,
      focus: cs.getPropertyValue("--focus").trim(),
      background: cs.getPropertyValue("--background").trim(),
    };
  });
}

/** The crisp 1px layer of a computed box-shadow (the ring itself, not the halo). */
const ringEdge = (boxShadow) => {
  const layer = boxShadow.split(/,(?![^(]*\))/).map((s) => s.trim()).find((s) => /0px 0px 0px 1px$/.test(s));
  return layer ? rgbOf(layer) : [];
};

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
const lightValues = {};
try {
  for (const scheme of ["light", "dark"]) {
    console.log(`\n=== site theme: ${scheme} ===`);
    const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto(`${base}/create`, { waitUntil: "networkidle" });
    check(
      (await page.evaluate(() => document.documentElement.classList.contains("dark"))) === (scheme === "dark"),
      "the site is in the expected theme",
    );

    // ── focus ring at the shipped theme, then on a green brand ───────────────────
    const shipped = await focusedRing(page);
    check(shipped.inPreview, "a preview Button takes keyboard focus");
    const shellBefore = await shellState(page);
    await setHex(page, GREEN);
    const shellAfter = await shellState(page);
    check(shellBefore === shellAfter, "shell: a new theme colour changes nothing outside the preview", shellBefore === shellAfter ? "" : `${shellBefore} -> ${shellAfter}`);

    const green = await focusedRing(page);
    const edge = ringEdge(green.boxShadow);
    const want = hslChannelsToRgb(green.focus);
    check(green.focus !== shipped.focus, "focus: the green brand moved --focus", `${shipped.focus} -> ${green.focus}`);
    check(near(edge, want), "focus: the Button's ring is drawn in the preview's --focus", `ring ${edge} vs --focus ${want}`);
    check(!near(edge, ringEdge(shipped.boxShadow)), "focus: the ring is no longer the shipped azure", `${edge}`);
    const r = ratio(edge, hslChannelsToRgb(green.background));
    check(r >= 3, "focus: the themed ring clears 3:1 on the preview background", `${r.toFixed(2)}:1`);

    // ── preview Light on this page ─────────────────────────────────────────
    const tokens = ["--action", "--focus", "--surface-grouped", "--shadow-focus", "--shadow-focus-destructive", "--brand"];
    await page.goto(`${base}/create`, { waitUntil: "networkidle" });
    const lightPreview = await previewVars(page, tokens);
    if (scheme === "light") Object.assign(lightValues, lightPreview);
    else {
      const leaked = tokens.filter((n) => lightPreview[n] !== lightValues[n]);
      check(leaked.length === 0, "leak-in: Create's Light preview on a dark page resolves light tokens", leaked.map((n) => `${n} "${lightPreview[n]}" vs "${lightValues[n]}"`).join("; "));
    }

    // ── direction is not a colour control's business ───────────────────────────
    await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    const before = await previewVars(page, ["--action"]);
    await setHex(page, GREEN);
    const after = await previewVars(page, ["--action"]);
    check((await page.evaluate(() => document.documentElement.getAttribute("dir"))) === "rtl", "direction: a theme colour change leaves <html dir> alone");
    check(before["--action"] !== after["--action"], "direction: the colour still applies under rtl");
    await page.evaluate(() => document.documentElement.removeAttribute("dir"));

    // ── invalid input ──────────────────────────────────────────────────────
    const valid = await previewVars(page, ["--action", "--focus", "--primary"]);
    const hex = page.locator("[id$='-hex']").first();
    await hex.fill("#12345z");
    await hex.press("Enter");
    await page.waitForTimeout(150);
    check((await hex.getAttribute("aria-invalid")) === "true", "invalid: a malformed hex is marked invalid");
    check(JSON.stringify(await previewVars(page, ["--action", "--focus", "--primary"])) === JSON.stringify(valid), "invalid: the preview keeps its last valid colours");

    // ── reset ──────────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.waitForTimeout(150);
    const reset = await previewVars(page, ["--action", "--focus"]);
    check(reset["--action"] === lightValues["--action"] && reset["--focus"] === lightValues["--focus"], "reset: the preview is back on the shipped tokens", JSON.stringify(reset));
    check(!page.url().includes("preset="), "reset: no preset is left in the URL");

    // ── navigation ─────────────────────────────────────────────────────────
    await setHex(page, GREEN);
    await page.goto(`${base}/docs/components/button`, { waitUntil: "networkidle" });
    const elsewhere = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--action").trim());
    const designStored = await page.evaluate(() => Object.keys(localStorage).filter((k) => k !== "theme"));
    check(JSON.parse(shellBefore).vars[1] === elsewhere, "navigation: another page renders the shipped --action", elsewhere);
    check(designStored.length === 0, "navigation: no design is persisted in storage", designStored.join(", "));

    // ── the Theming page's light panel ──────────────────────────────────────
    await page.goto(`${base}/docs/theming`, { waitUntil: "networkidle" });
    const panel = await page.evaluate((tokens) => {
      const el = document.querySelector(".theme-light");
      if (!el) return null;
      const cs = getComputedStyle(el);
      return Object.fromEntries(tokens.map((n) => [n, cs.getPropertyValue(n).trim()]));
    }, tokens);
    check(panel !== null, "theming page: a light panel exists");
    if (panel) {
      const leaked = tokens.filter((n) => panel[n] !== lightValues[n]);
      check(leaked.length === 0, "leak-in: the Theming page's light panel resolves light tokens", leaked.map((n) => `${n} "${panel[n]}"`).join("; "));
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(failures.length ? `\nFAIL (${failures.length}) — theme state leaked or the focus ring ignored the theme.` : "\nPASS — theme state is isolated and the focus ring follows --focus.");
process.exit(failures.length ? 1 : 0);
