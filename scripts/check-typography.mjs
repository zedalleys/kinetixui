/**
 * check-typography.mjs — components and the website must use the type-scale aliases
 * (`text-label-md`, `text-body-md`, …), not re-derive them from literals.
 *
 *   node scripts/check-typography.mjs
 *
 * 1. packages/ui/src/components: flags arbitrary `text-[Npx]` font sizes and `tracking-[…px]`
 *    letter-spacing. The scale lives in tailwind.config.ts (mirrors tokens/semantic/typography.json).
 *    A line that genuinely has no scale equivalent is exempted with a trailing `// type-ok` marker or
 *    listed in ALLOWED below (existing one-offs; the list may only shrink).
 *
 * 2. apps/web/src: flags every absolute font size — `text-[Npx]` / `text-[length:Npt]` utilities, a
 *    `font-size` in px or pt in CSS, and a numeric or px `fontSize` in TSX. A px size cannot follow
 *    the reader's text setting, and the site's 9–11px literals were how its compact labels fell below
 *    the 12px floor. There is no inline marker here: the only exemptions are WEB_ALLOWED, counted per
 *    file with the reason written down, and a stale count fails as loudly as a new literal, so the
 *    list can only shrink. The site-only aliases in apps/web/tailwind.config.ts must stay relative and
 *    each must carry a written reason in that file.
 *
 * What this cannot see — a size inherited from a parent, or set by a stylesheet it does not read — is
 * measured in the browser by scripts/web-quality-browser.mjs (`type`).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = `${root}/packages/ui/src/components`;
const RE = /text-\[\d+(?:\.\d+)?px\]|tracking-\[[^\]]*px\]/g;

// file → count of pre-existing literals with no matching scale step.
const ALLOWED = {
  "app-bar.tsx": 1, // 15px brand title
  "description-list.tsx": 1, // 10px mono caps term
  "markdown-editor.tsx": 1, // 13px mono editor text
  "tab-bar.tsx": 1, // 10px badge
};

const errors = [];
for (const f of readdirSync(dir).filter((n) => n.endsWith(".tsx"))) {
  const lines = readFileSync(`${dir}/${f}`, "utf8").split("\n");
  let n = 0;
  lines.forEach((line, i) => {
    if (line.includes("type-ok")) return;
    const m = line.match(RE);
    if (m) {
      n += m.length;
      if (n > (ALLOWED[f] ?? 0)) errors.push(`${f}:${i + 1}: ${m.join(" ")} — use a text-<style> alias`);
    }
  });
  if (n < (ALLOWED[f] ?? 0)) errors.push(`${f}: allowlist is stale (${n} literals, allowed ${ALLOWED[f]}) — lower it in check-typography.mjs`);
}
/* ── 2. apps/web ────────────────────────────────────────────────────────────────────────────── */

const webDir = `${root}/apps/web/src`;
const WEB_RE = {
  // Tailwind arbitrary absolute sizes: text-[11px], text-[length:10px], text-[9pt]
  utility: /text-\[(?:length:)?\d+(?:\.\d+)?(?:px|pt|pc)\]/g,
  // CSS: font-size: 11px
  css: /font-size:\s*\d+(?:\.\d+)?(?:px|pt)\b/g,
  // TSX style objects and SVG-label props: fontSize: 11, fontSize: "11px"
  tsx: /\bfontSize:\s*(?:\d|["'`]\d+(?:\.\d+)?(?:px|pt)["'`])/g,
};

/**
 * file (relative to apps/web/src) → { n: literals it may still hold, why }. Drawn text only: SVG <text> whose px are
 * user units inside a viewBox that scales with the drawing, and the Open Graph card, which is a PNG. None of it is a
 * CSS text size a reader would expect to follow their setting. May only shrink.
 */
const WEB_ALLOWED = {
  "components/building-ops/floor-plan.tsx": {
    n: 6,
    why: "SVG <text> zone and corridor labels inside the viewBox-scaled floor plan (user units, not CSS text)",
  },
  "components/infographic/world-map.tsx": {
    n: 2,
    why: "SVG <text> hub and node labels inside the viewBox-scaled world map (user units, not CSS text)",
  },
  "app/opengraph-image.tsx": {
    n: 5,
    why: "satori renders this into a 1200×630 PNG; its px are image pixels, not a page text size",
  },
  "app/globals.css": {
    n: 2,
    why: ".kx-fan-label / .kx-fan-note: SVG <text> in the aria-hidden hero token fan (user units, viewBox-scaled)",
  },
};

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = `${dir}/${n}`;
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const webFiles = walk(webDir).filter((p) => /\.(tsx|ts|css|mdx|md)$/.test(p) && !/\.(test|spec)\.tsx?$/.test(p));
const webSeen = new Set();
let webTotal = 0;
for (const path of webFiles) {
  const rel = path.slice(webDir.length + 1);
  const ext = rel.split(".").pop();
  const rules = [WEB_RE.utility, ...(ext === "css" ? [WEB_RE.css] : []), ...(ext === "tsx" ? [WEB_RE.tsx] : [])];
  const allowed = WEB_ALLOWED[rel]?.n ?? 0;
  let n = 0;
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, i) => {
      const hits = rules.flatMap((re) => line.match(re) ?? []);
      if (!hits.length) return;
      n += hits.length;
      if (n > allowed) {
        errors.push(
          `apps/web/src/${rel}:${i + 1}: ${hits.join(" ")} — an absolute font size on the website. Use a type-scale ` +
            `alias (text-label-md / text-body-sm for compact UI, 12px; text-code for source), or a relative unit.`,
        );
      }
    });
  if (n) webSeen.add(rel);
  webTotal += n;
  if (allowed && n < allowed) {
    errors.push(`apps/web/src/${rel}: WEB_ALLOWED is stale (${n} literals, allowed ${allowed}) — lower it in check-typography.mjs`);
  }
}
for (const rel of Object.keys(WEB_ALLOWED)) {
  if (!webSeen.has(rel) && !webFiles.some((p) => p.endsWith(`/${rel}`))) {
    errors.push(`apps/web/src/${rel}: listed in WEB_ALLOWED but does not exist — remove the entry`);
  } else if (!webSeen.has(rel)) {
    errors.push(`apps/web/src/${rel}: WEB_ALLOWED is stale (0 literals) — remove the entry`);
  }
}

// The site-only aliases: relative, and each one explained where it is defined.
const siteCfg = readFileSync(`${root}/apps/web/tailwind.config.ts`, "utf8");
const siteSizes = [...siteCfg.matchAll(/^\s*"?([\w-]+)"?:\s*\["([^"]+)",\s*\{\s*lineHeight:\s*"([^"]+)"/gm)];
const RELATIVE = /^(0|\d*\.?\d+(rem|em))$/;
for (const [, name, size, lh] of siteSizes) {
  if (!RELATIVE.test(size) || !RELATIVE.test(lh)) {
    errors.push(`apps/web/tailwind.config.ts: text-${name} is ${size} / ${lh} — site type roles must be rem or em`);
  }
  if (!siteCfg.includes(`- \`${name}\`:`)) {
    errors.push(`apps/web/tailwind.config.ts: text-${name} has no "- \`${name}\`: <reason>" line — say why the scale lacks it`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(
  `check:typography ok — components on the type scale; apps/web holds ${webTotal} absolute font size(s), ` +
    `all drawn text listed in WEB_ALLOWED; ${siteSizes.length} site-only alias(es) relative and documented.`,
);
