/**
 * hero-captures.mjs — the owner's capture list, taken from the real running
 * site rather than from a design tool.
 *
 * `scripts/rebrand-browser.mjs` captures the seven cases it asserts on. This
 * adds the ones the owner asked for that no gate needs: the wide desktop, the
 * reduced-motion rest pose, and the hero with keyboard focus actually on it.
 * Nothing here asserts anything; it exists so a human can look.
 *
 * Usage: node scripts/hero-captures.mjs --base http://127.0.0.1:3000 --out <dir>
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const arg = (name, fallback) =>
  process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const base = arg("--base", "http://127.0.0.1:3000");
const out = arg("--out", "design-assets/identity/v1/verification/captures");

const CASES = [
  { name: "wide-1920-light", width: 1920, height: 1100, theme: "light" },
  { name: "wide-1920-dark", width: 1920, height: 1100, theme: "dark" },
  { name: "desktop-1440-light", width: 1440, height: 1030, theme: "light" },
  { name: "desktop-1440-dark", width: 1440, height: 1030, theme: "dark" },
  { name: "tablet-768-light", width: 768, height: 1024, theme: "light" },
  { name: "mobile-390-light", width: 390, height: 844, theme: "light" },
  { name: "mobile-390-dark", width: 390, height: 844, theme: "dark" },
  { name: "narrow-320-light", width: 320, height: 800, theme: "light" },
  { name: "text-200-1280-light", width: 1280, height: 1000, theme: "light", text: 2 },
  { name: "reduced-motion-1440-light", width: 1440, height: 1030, theme: "light", reduced: true },
  { name: "reduced-motion-1440-dark", width: 1440, height: 1030, theme: "dark", reduced: true },
  { name: "keyboard-focus-1440-light", width: 1440, height: 1030, theme: "light", focus: true },
  { name: "keyboard-focus-1440-dark", width: 1440, height: 1030, theme: "dark", focus: true },
];

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
await mkdir(out, { recursive: true });
const record = { base, capturedAt: new Date().toISOString(), cases: [] };

for (const c of CASES) {
  const context = await browser.newContext({
    viewport: { width: c.width, height: c.height },
    colorScheme: c.theme,
    reducedMotion: c.reduced ? "reduce" : "no-preference",
    deviceScaleFactor: 1,
  });
  await context.addInitScript(
    ([theme, text]) => {
      try {
        localStorage.setItem("kx-consent", "denied");
        localStorage.setItem("theme", theme);
      } catch {}
      if (text > 1) {
        document.addEventListener("DOMContentLoaded", () => {
          document.documentElement.style.fontSize = `${16 * text}px`;
        });
      }
    },
    [c.theme, c.text ?? 1],
  );
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  // Record WHICH request failed, so a sandbox egress refusal is not mistaken for a missing asset.
  page.on("requestfailed", (r) => errors.push(`requestfailed ${r.url()} — ${r.failure()?.errorText}`));
  page.on("response", (r) => r.status() >= 400 && errors.push(`http ${r.status()} ${r.url()}`));
  await page.goto(base, { waitUntil: "networkidle" });
  // Let the intro settle so a capture is the composition, not a frame of it.
  await page.waitForTimeout(c.reduced ? 500 : 3000);
  if (c.focus) {
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => document.activeElement?.classList.contains("kx-polygon-interaction"))) break;
    }
    await page.waitForTimeout(400);
  }
  const hero = page.locator("section.kx-brand-hero");
  await hero.screenshot({ path: `${out}/${c.name}.png` });
  const measured = await page.evaluate(() => {
    const h = document.querySelector("section.kx-brand-hero").getBoundingClientRect();
    const s = document.querySelector("svg.kx-hero-mesh").getBoundingClientRect();
    return {
      heroArea: Math.round(h.width * h.height),
      meshShare: Number(((s.width * s.height) / (h.width * h.height)).toFixed(4)),
      focused: document.activeElement?.className?.toString?.().includes("kx-polygon-interaction") ?? false,
      // Reduced motion hides the pulse layer with display:none, so count what is
      // actually painted rather than what is in the DOM.
      pulses: (() => {
        const layer = document.querySelector(".kx-mesh-pulses");
        if (!layer || getComputedStyle(layer).display === "none") return 0;
        return layer.querySelectorAll("circle").length;
      })(),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  record.cases.push({ ...c, ...measured, consoleErrors: errors });
  console.log(
    `${c.name.padEnd(28)} mesh ${(measured.meshShare * 100).toFixed(1)}% of hero` +
      `${measured.focused ? ", hero focused" : ""}` +
      `${measured.pulses ? `, ${measured.pulses} pulse(s)` : ", no pulses (static)"}` +
      `${measured.horizontalOverflow ? "  HORIZONTAL OVERFLOW" : ""}` +
      `${errors.length ? `  ${errors.length} console error(s)` : ""}`,
  );
  await context.close();
}

await browser.close();
await writeFile(`${out}/captures.json`, `${JSON.stringify(record, null, 2)}\n`);
console.log(`\n${record.cases.length} captures → ${out}`);
