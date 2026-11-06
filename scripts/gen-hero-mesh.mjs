/**
 * Derives the hero's render + motion data from the owner-supplied polygon mesh.
 *
 * Canonical source: `apps/web/src/components/hero-mesh-source.json`, the
 * coordinates of `OH38WC1.svg` as recorded in `design-assets/polygon/REFERENCE.md`.
 * Nothing here invents geometry. It only classifies the supplied shapes by their
 * source tone, measures each junction's centre, and measures the light routes,
 * so the renderer can light a junction when a pulse actually reaches it rather
 * than on a timer of its own.
 *
 * Output: `apps/web/src/components/hero-mesh.json`. Run with `--check` in CI.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "apps/web/src/components");
const SOURCE = path.join(DIR, "hero-mesh-source.json");
const OUT = path.join(DIR, "hero-mesh.json");

/** The supplied file's own viewBox. */
const VIEW_BOX = "0 0 741.71 860.74";

/**
 * Source tones, as `design-assets/polygon/REFERENCE.md` records them.
 * 1 and 2 are the drawn links, 9 and 14 the junctions, the rest are facets.
 */
const LINK_TONES = new Set(["1", "2"]);
const NODE_TONES = new Set(["9", "14"]);

/**
 * The three light routes. These are the polylines PR #509 authored along this
 * geometry's own edges; they are kept verbatim so the light still travels the
 * supplied graph rather than a path invented for the animation.
 */
const ROUTE_PATHS = [
  "M170.54 84.79 125.89 294.31 394.41 434.17",
  "M193.24 660.91 344.39 665.34 497 490.02 550.73 402.56",
  "M95.71 219.28 187.36 150.65 326.47 177.11 460.16 396.62",
];

/**
 * Walks the subset of path syntax the supplied file uses — M L l v c s Z — and
 * returns the on-curve points. Enough for a bounding box, which is all the
 * junction centres and route lengths need; the shapes themselves are rendered
 * from their original `d`, untouched.
 */
function points(d) {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const out = [];
  let i = 0;
  let cmd = "M";
  let x = 0;
  let y = 0;
  const num = () => Number(tokens[i++]);
  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) {
      cmd = tokens[i++];
      if (cmd === "Z" || cmd === "z") continue;
    }
    if (i >= tokens.length) break;
    switch (cmd) {
      case "M":
      case "L":
        x = num();
        y = num();
        out.push([x, y]);
        break;
      case "m":
      case "l":
        x += num();
        y += num();
        out.push([x, y]);
        break;
      case "v":
        y += num();
        out.push([x, y]);
        break;
      case "V":
        y = num();
        out.push([x, y]);
        break;
      case "h":
        x += num();
        out.push([x, y]);
        break;
      case "H":
        x = num();
        out.push([x, y]);
        break;
      case "c":
        i += 4; // the two control points; only the endpoint lands on the curve
        x += num();
        y += num();
        out.push([x, y]);
        break;
      case "C":
        i += 4;
        x = num();
        y = num();
        out.push([x, y]);
        break;
      case "s":
        i += 2;
        x += num();
        y += num();
        out.push([x, y]);
        break;
      case "S":
        i += 2;
        x = num();
        y = num();
        out.push([x, y]);
        break;
      default:
        i++; // an unknown command: skip its operand rather than loop forever
    }
    if (cmd === "M") cmd = "L";
    if (cmd === "m") cmd = "l";
  }
  return out;
}

const round = (n) => Math.round(n * 100) / 100;
const bounds = (pts) => {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

const source = JSON.parse(await readFile(SOURCE, "utf8"));

const facets = [];
const links = [];
const nodes = [];

source.forEach((shape, index) => {
  if (shape.cx !== undefined) {
    // The one explicit junction circle in the supplied file.
    nodes.push({ i: index, tone: shape.tone, cx: shape.cx, cy: shape.cy, r: shape.r });
    return;
  }
  const pts = points(shape.d);
  const b = bounds(pts);
  const cx = round((b.x0 + b.x1) / 2);
  const cy = round((b.y0 + b.y1) / 2);

  if (NODE_TONES.has(shape.tone)) {
    const r = round(Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2);
    // Tones 9 and 14 cover both small junction marks and facet-sized plates in
    // the supplied file. Only the small ones are junctions; the rest are facets.
    if (r <= 14) nodes.push({ i: index, tone: shape.tone, d: shape.d, cx, cy, r });
    else facets.push({ i: index, tone: shape.tone, d: shape.d, c: [cx, cy] });
    return;
  }
  if (LINK_TONES.has(shape.tone)) {
    links.push({ i: index, tone: shape.tone, d: shape.d });
    return;
  }
  facets.push({ i: index, tone: shape.tone, d: shape.d, c: [cx, cy] });
});

const routes = ROUTE_PATHS.map((d, r) => {
  const pts = points(d);
  const spans = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    spans.push(round(total));
  }
  return {
    d,
    v: pts,
    spans,
    total: round(total),
    // Deliberately not multiples of one another, so the pulses never line up.
    duration: [9.4, 12.7, 15.1][r],
    delay: [0, 4.3, 8.1][r],
  };
});

/**
 * Facet materials. The supplied tones are grayscale values; the rebrand maps
 * them to four Kinetic Weave materials in the order the source tones read, so
 * the depth relationships the artwork already has are the ones that survive.
 */
const MATERIAL = { 3: 0, 11: 0, 13: 0, 4: 1, 10: 1, 5: 2, 15: 2, 6: 3, 14: 3 };
for (const facet of facets) facet.m = MATERIAL[facet.tone] ?? 1;

// A stable shimmer phase per facet, from its own index: no randomness, so the
// committed artifact is reproducible.
facets.forEach((facet, n) => {
  facet.p = round((((n * 2654435761) % 1000) / 1000) * 1);
});

const mesh = {
  $generated: "scripts/gen-hero-mesh.mjs from hero-mesh-source.json — do not edit by hand",
  $source: "OH38WC1.svg — see design-assets/polygon/REFERENCE.md for provenance",
  viewBox: VIEW_BOX,
  facets,
  links,
  nodes,
  routes,
};

const serialised = `${JSON.stringify(mesh, null, 2)}\n`;

if (process.argv.includes("--check")) {
  if ((await readFile(OUT, "utf8").catch(() => null)) !== serialised) {
    console.error(`${OUT} is stale. Run: node scripts/gen-hero-mesh.mjs`);
    process.exit(1);
  }
  console.log(`hero mesh up to date (${facets.length} facets, ${links.length} links, ${nodes.length} junctions)`);
} else {
  await writeFile(OUT, serialised);
  console.log(
    `hero mesh: ${facets.length} facets, ${links.length} link outlines, ${nodes.length} junctions, ` +
      `${routes.length} light routes — all from the supplied ${source.length}-shape source`,
  );
}
