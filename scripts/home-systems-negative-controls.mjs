/**
 * home-systems-negative-controls.mjs — proof that the homepage hero checks in
 * `scripts/home-systems-browser.mjs` can actually fail.
 *
 * Two of that gate's assertions are numbers rather than yes/no answers, and a
 * number is only evidence once something is known to fall outside it:
 *
 *   1. `worstTextContrast` hides the text before screenshotting what is behind
 *      it. If the hide has not been painted when the shot is taken, the glyphs
 *      are in the shot and the measurement reports the text against its own
 *      antialiasing — a reading near 1:1 that looks exactly like a real defect.
 *      This reproduces that by skipping the hide, so the signature is on record.
 *
 *   2. The hero glow is held inside a band: MIN_TINT says the light spot is
 *      actually there, MAX_TINT says it is still light rather than a wash. This
 *      measures the glow as shipped, then weakens it until it falls under the
 *      floor and saturates it until it goes over the ceiling.
 *
 *      The ceiling control is a flat colour disc, not a sharper blur. Sharpening
 *      the blur was the obvious candidate and it does not work: the gradient's
 *      centre is already its brightest pixel, so `blur(6px)` measures the same
 *      75 as shipped. That near-miss is kept in the table rather than dropped,
 *      so nobody repeats it believing the ceiling is unreachable.
 *
 * Read-only: every mutation is a style tag in one throwaway browser context.
 * Nothing here is committed to the page.
 *
 * Usage: node scripts/home-systems-negative-controls.mjs --base http://127.0.0.1:3000
 */
import { chromium } from "playwright";

const base =
  (process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : null) ?? "http://127.0.0.1:3000";
const LEDE = "h1.kx-hero-title + p";

const luminance = (r, g, b) => {
  const f = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });

async function open(width, extraCss) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("kx-consent", "denied");
    } catch {}
  });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  if (extraCss) await page.addStyleTag({ content: extraCss });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { page, context };
}

/** The gate's own measurement, with the hide optionally skipped. */
async function worstLedeContrast(page, { hide }) {
  const info = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const range = document.createRange();
    range.selectNodeContents(el);
    return {
      lines: [...range.getClientRects()].map((r) => ({ x: r.left, y: r.top, w: r.width, h: r.height })),
      color: getComputedStyle(el).color,
    };
  }, LEDE);
  if (hide) {
    await page.addStyleTag({ content: `${LEDE} { visibility: hidden !important }` });
    await page.waitForFunction((sel) => getComputedStyle(document.querySelector(sel)).visibility === "hidden", LEDE);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  }
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const [r, g, b] = info.color.match(/[\d.]+/g).map(Number);
  const text = luminance(r, g, b);
  let worst = Infinity;
  for (const line of info.lines) {
    const clip = {
      x: Math.round(line.x + scroll.x) + 1,
      y: Math.round(line.y + scroll.y) + 1,
      width: Math.round(line.w) - 2,
      height: Math.round(line.h) - 2,
    };
    if (clip.width < 1 || clip.height < 1 || clip.y < 0) continue;
    const shot = (await page.screenshot({ clip, fullPage: true })).toString("base64");
    const seen = await page.evaluate(async (data) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const f = (c) => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
      let min = 2;
      let max = -1;
      for (let i = 0; i < px.length; i += 4) {
        const l = 0.2126 * f(px[i]) + 0.7152 * f(px[i + 1]) + 0.0722 * f(px[i + 2]);
        if (l < min) min = l;
        if (l > max) max = l;
      }
      return { min, max };
    }, shot);
    worst = Math.min(worst, contrast(text, seen.min), contrast(text, seen.max));
  }
  return worst;
}

/** The gate's glow measurement: the worst per-channel delta the aura adds. */
async function glowTint(page) {
  const pixels = async () => {
    const shot = (await page.locator("section.kx-brand-hero").screenshot()).toString("base64");
    return page.evaluate(async (data) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      return [...ctx.getImageData(0, 0, canvas.width, canvas.height).data];
    }, shot);
  };
  const lit = await pixels();
  await page.addStyleTag({ content: ".kx-polygon-aura { display: none !important }" });
  await page.waitForTimeout(150);
  const unlit = await pixels();
  let tint = 0;
  for (let i = 0; i < Math.min(lit.length, unlit.length); i += 4) {
    for (let c = 0; c < 3; c += 1) tint = Math.max(tint, Math.abs(lit[i + c] - unlit[i + c]));
  }
  return tint;
}

const rows = [];

// 1. The hidden-text instrument.
for (const hide of [true, false]) {
  const { page, context } = await open(1440);
  const worst = await worstLedeContrast(page, { hide });
  rows.push({
    control: hide ? "baseline — the text is hidden before the shot" : "the hide is skipped (the flake)",
    measured: `${worst.toFixed(2)}:1`,
    verdict: worst >= 4.5 ? "passes the 4.5:1 assertion" : "FAILS the 4.5:1 assertion",
  });
  await context.close();
}

// 2. The glow band.
for (const [label, css] of [
  ["baseline — the glow as shipped", null],
  ["aura at opacity 0.45 (a light spot that stops reading as one)", ".kx-polygon-aura { opacity: .45 }"],
  ["aura at blur(6px) instead of 22px — does NOT reach the ceiling", ".kx-polygon-aura { filter: blur(6px) }"],
  [
    "aura as a flat saturated disc (colour on the page, not atmosphere)",
    ".kx-polygon-aura { background: radial-gradient(circle closest-side, #28c7d9 0%, #28c7d9 70%, #28c7d900 100%) !important }",
  ],
]) {
  const { page, context } = await open(1440, css);
  const tint = await glowTint(page);
  rows.push({
    control: label,
    measured: `${tint} per-channel delta`,
    verdict: tint < 55 ? "FAILS the MIN_TINT floor" : tint > 110 ? "FAILS the MAX_TINT ceiling" : "inside the band",
  });
  await context.close();
}

// 3. The first view: the artwork's edges, and the install command against the fold.
const EDGE_INK = 12;
const firstView = async (width, height, css) => {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("kx-consent", "denied");
    } catch {}
  });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  if (css) await page.addStyleTag({ content: css });
  await page.waitForTimeout(350);
  const below = await page.evaluate(() => {
    const copy = document.querySelector("[data-hero-copy]");
    const beta = [...copy.querySelectorAll("a")].pop();
    return Math.round(beta.getBoundingClientRect().bottom) - window.innerHeight;
  });
  const lit = (await page.screenshot()).toString("base64");
  await page.addStyleTag({ content: ".kx-hero-polygon { visibility: hidden !important }" });
  await page.waitForTimeout(150);
  const unlit = (await page.screenshot()).toString("base64");
  const edges = await page.evaluate(
    async ([a, b, W, H, T]) => {
      const load = (d) =>
        new Promise((r) => {
          const i = new Image();
          i.onload = () => r(i);
          i.src = `data:image/png;base64,${d}`;
        });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const px = (img) => {
        const c = document.createElement("canvas");
        c.width = W;
        c.height = H;
        const x = c.getContext("2d");
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, W, H).data;
      };
      const A = px(ia);
      const B = px(ib);
      const ink = (x, y) => {
        const i = (y * W + x) * 4;
        return Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]);
      };
      let end = 0;
      let fold = 0;
      for (let y = 0; y < H; y += 1) if (ink(W - 1, y) > T) end += 1;
      for (let x = 0; x < W; x += 1) if (ink(x, H - 1) > T) fold += 1;
      return { end, fold };
    },
    [lit, unlit, width, height, EDGE_INK],
  );
  await context.close();
  return { ...edges, below };
};

const PORTRAIT_HEIGHT = "@media (min-width: 64rem) { .kx-hero-polygon { block-size: auto !important } .kx-hero-mesh { block-size: auto !important } }";
const EXTRA_BLEED =
  "@media (min-width: 64rem) { .kx-hero-polygon { margin-inline-end: calc(-1 * (50vw - min(50vw, 48rem)) - 4rem) !important } }";
const OLD_MASK =
  "@media (min-width: 64rem) { .kx-hero-mesh { -webkit-mask-image: radial-gradient(ellipse 78% 72% at 46% 48%, #000 0%, #000 52%, #0009 74%, #0000 97%) !important; mask-image: radial-gradient(ellipse 78% 72% at 46% 48%, #000 0%, #000 52%, #0009 74%, #0000 97%) !important } }";

for (const [label, css] of [
  ["baseline — the first view as shipped", null],
  ["the polygon takes its height from the portrait artwork again", PORTRAIT_HEIGHT],
  ["the trailing bleed takes 4rem past the viewport again", EXTRA_BLEED],
  ["the old mask, whose radii reach their transparent stop outside the box", OLD_MASK],
  ["all three together — the hero as it was before the fix", `${PORTRAIT_HEIGHT} ${EXTRA_BLEED} ${OLD_MASK}`],
]) {
  const r = await firstView(1920, 1030, css);
  const broken = [];
  if (r.end > 0) broken.push(`${r.end}px of mesh ink on the trailing edge`);
  if (r.fold > 0) broken.push(`${r.fold}px cut by the fold`);
  if (r.below > 0) broken.push(`the beta line ${r.below}px below the fold`);
  rows.push({
    control: label,
    measured: `trailing ${r.end}, fold ${r.fold}, beta line ${r.below <= 0 ? `${-r.below}px above` : `${r.below}px below`} the fold`,
    verdict: broken.length ? `FAILS the first-view assertions — ${broken.join("; ")}` : "passes the first-view assertions",
  });
}

await browser.close();
console.table(rows);
