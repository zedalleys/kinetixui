/**
 * visual-harness.mjs — the shared instrument behind the rendered visual gates (`check:card-visual`,
 * `check:selection-visual`, `check:entry-visual`): a static server for a built directory, WCAG relative luminance and contrast,
 * a dependency-free PNG decoder for Playwright screenshots, and the live Angular page a gate measures.
 *
 * It holds only the measuring instrument. What each gate asserts — and why it samples where it does —
 * stays in the gate, next to the contract it checks.
 */
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".png": "image/png", ".ico": "image/x-icon" };

/** Serve `dir` on an ephemeral localhost port. Resolves to `{ base, close }`. */
export async function serveStatic(dir) {
  const server = createServer((req, res) => {
    const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = join(dir, p);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!file.startsWith(dir) || !existsSync(file)) return void res.writeHead(404).end();
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

/* ── colour ─────────────────────────────────────────────────────────────── */
export const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
export const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/* ── pixels ─────────────────────────────────────────────────────────────── */
/**
 * Decode a Playwright screenshot. It is always an 8-bit, non-interlaced RGB or RGBA PNG, so a dozen lines
 * of zlib and the five scanline filters cover it — no image library, and nothing to install.
 */
export function decode(png) {
  let i = 8;
  let w = 0, h = 0, channels = 4;
  const idat = [];
  while (i < png.length) {
    const len = png.readUInt32BE(i);
    const type = png.toString("ascii", i + 4, i + 8);
    const body = png.subarray(i + 8, i + 8 + len);
    if (type === "IHDR") {
      w = body.readUInt32BE(0);
      h = body.readUInt32BE(4);
      if (body[8] !== 8 || body[12] !== 0) throw new Error("visual-harness: unexpected PNG (bit depth or interlace)");
      channels = { 2: 3, 6: 4 }[body[9]];
      if (!channels) throw new Error(`visual-harness: unexpected PNG colour type ${body[9]}`);
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    i += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * channels;
  const out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? line[x - channels] : 0;
      const up = prev[x];
      const ul = x >= channels ? prev[x - channels] : 0;
      let add = 0;
      if (filter === 1) add = left;
      else if (filter === 2) add = up;
      else if (filter === 3) add = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - ul;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - ul);
        add = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
      }
      line[x] = (line[x] + add) & 0xff;
    }
    for (let x = 0; x < w; x++) {
      out[(y * w + x) * 4] = line[x * channels];
      out[(y * w + x) * 4 + 1] = line[x * channels + 1];
      out[(y * w + x) * 4 + 2] = line[x * channels + 2];
      out[(y * w + x) * 4 + 3] = channels === 4 ? line[x * channels + 3] : 255;
    }
    prev = line;
  }
  return { w, h, data: out };
}

/* ── Angular subjects ───────────────────────────────────────────────────── */
/**
 * Build the Angular browser harness (packages/ui-angular/browser) into a fresh directory: the fixtures compiled
 * AOT with strict templates, bootstrapped as a live, zoneless Angular application, with the generated token
 * CSS and the package's styles.css linked byte for byte. `KX_ANGULAR_HARNESS_DIR` points at one already built
 * (CI builds it once and every gate reuses it); otherwise each caller builds its own.
 */
export function buildAngularHarness(name = "angular") {
  const prebuilt = process.env.KX_ANGULAR_HARNESS_DIR;
  if (prebuilt) {
    if (!existsSync(join(prebuilt, "index.html"))) throw new Error(`${name}: KX_ANGULAR_HARNESS_DIR=${prebuilt} holds no built harness`);
    const dir = mkdtempSync(join(tmpdir(), `kx-${name}-ng-`));
    cpSync(prebuilt, dir, { recursive: true });
    return dir;
  }
  const dir = mkdtempSync(join(tmpdir(), `kx-${name}-ng-`));
  execFileSync("node", [join(root, "packages/ui-angular/browser/build.mjs"), dir], { cwd: root, stdio: ["ignore", "ignore", "inherit"] });
  if (!existsSync(join(dir, "index.html"))) throw new Error(`${name}: the Angular harness did not build`);
  return dir;
}

/**
 * The page a visual gate measures for Angular: the live harness mounting one fixture (src/fixtures/<fixture>),
 * written as `light.html` and `dark.html`. `layout` is the only local CSS: it places the fixture's groups on
 * the page and styles no control. Angular renders the components in the browser, so hover, focus, keyboard
 * and state changes run through the package's own templates and bindings — the subject is the application,
 * not a copy of its markup.
 *
 * Returns the directory, for `serveStatic`. A page is usable once `waitForAngular` resolves.
 */
export function buildAngularSubject(fixture, { name, layout }) {
  const dir = buildAngularHarness(name);
  const index = readFileSync(join(dir, "index.html"), "utf8");
  for (const theme of ["light", "dark"]) {
    writeFileSync(
      join(dir, `${theme}.html`),
      index
        .replace('<html lang="en">', `<html lang="en" data-kx-fixture="${fixture}" data-kx-theme="${theme}"${theme === "dark" ? ' class="dark"' : ""}>`)
        .replace("</head>", `<style>${layout}</style></head>`),
    );
  }
  return dir;
}

/** Wait until the harness has bootstrapped and Angular is stable; fail loudly if it could not. */
export async function waitForAngular(page) {
  await page.waitForSelector("html[data-kx-ready], html[data-kx-error]", { state: "attached", timeout: 20_000 });
  const { error, ngVersion } = await page.evaluate(() => ({
    error: document.documentElement.dataset.kxError,
    // Angular stamps the root component's host with the runtime version when it bootstraps the application.
    ngVersion: document.querySelector("kx-fixture")?.getAttribute("ng-version") ?? null,
  }));
  if (error) throw new Error(`Angular harness: ${error}`);
  if (!ngVersion) throw new Error("Angular harness: the fixture has no ng-version — Angular did not bootstrap it");
  return ngVersion;
}

/** After an interaction: let Angular's change detection run before reading the DOM back. */
export const settleAngular = (page) => page.evaluate(() => window.kxHarness.settle());

/* ── frames ─────────────────────────────────────────────────────────────── */
/**
 * A screenshot of the region around `rect` (CSS pixels, padded by `pad`), with accessors in page CSS pixels:
 * `at(x, y)`, `row(y, x0, x1)` / `column(x, y0, y1)` (every device pixel along the line), and
 * `changed(other)` — how many sampled pixels differ from another frame of the same region by more than 1.03:1.
 * `check:composite-visual` uses it; the older gates still carry their own copy of the same few lines.
 */
export const framer =
  ({ dpr, pad }) =>
  async (page, rect) => {
    const clip = { x: rect.x - pad, y: rect.y - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad };
    const img = decode(await page.screenshot({ clip }));
    const idx = (x, y) => (Math.round((y - clip.y) * dpr) * img.w + Math.round((x - clip.x) * dpr)) * 4;
    return {
      at(x, y) {
        const i = idx(x, y);
        return [img.data[i], img.data[i + 1], img.data[i + 2]];
      },
      row(y, x0, x1) {
        const out = [];
        for (let x = x0; x <= x1; x += 1 / dpr) out.push(this.at(x, y));
        return out;
      },
      column(x, y0, y1) {
        const out = [];
        for (let y = y0; y <= y1; y += 1 / dpr) out.push(this.at(x, y));
        return out;
      },
      changed(other, min = 1.03) {
        let n = 0;
        for (let i = 0; i < img.data.length; i += 4 * 3) {
          const a = [img.data[i], img.data[i + 1], img.data[i + 2]];
          const b = [other.img.data[i], other.img.data[i + 1], other.img.data[i + 2]];
          if (contrast(a, b) > min) n++;
        }
        return n;
      },
      img,
    };
  };
