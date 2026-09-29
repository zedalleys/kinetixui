/**
 * Marketing visuals, generated as SVG from repository truth.
 *
 *   node scripts/gen-marketing-visuals.mjs           # SVG only
 *   node scripts/gen-marketing-visuals.mjs --png     # also rasterise via the preinstalled Chromium
 *
 * ## Why generate rather than design
 *
 * Every number in these assets is volatile — coverage, the catalogue count, which platforms are published.
 * An image with a baked number is a claim nobody can re-check and nothing will ever correct; six months
 * from now it is a confidently wrong JPEG on someone's timeline. So the counts come from
 * `components.manifest.json` and the generated parity data, the colours and radii come from the real token
 * output, and the whole set is reproducible with one command.
 *
 * SVG on purpose: text-based, diffable in review, no binary churn, and no design tool in the pipeline. PNG
 * is rendered from the same SVG for the feeds that need raster.
 *
 * This is deliberately NOT a graphics framework. It is a few hundred lines of string templates, and if it
 * ever wants to become more than that, the answer is fewer assets rather than more machinery.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = `${ROOT}/marketing/content/visuals`;
mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ brand, from the real tokens */

const tokenSource = readFileSync(`${ROOT}/packages/tokens/dist/web/tokens.js`, "utf8");
const tokens = JSON.parse(tokenSource.slice(tokenSource.indexOf("{"), tokenSource.lastIndexOf("}") + 1));
const c = (ramp, step) => {
  const v = tokens.color?.[ramp]?.[step];
  if (!v) throw new Error(`token color.${ramp}.${step} does not exist — the brand cannot be invented here`);
  return v;
};

/**
 * Dark is the default marketing presentation. One reason, not aesthetics: these assets are mostly
 * architecture diagrams and code, and a dark card is visually distinct in a feed of light-background
 * corporate posts. Light variants are produced only where the content is a product screenshot, which
 * should look like the product's default.
 */
const T = {
  bg: c("blue", 900),
  surface: c("blue", 800),
  fg: c("blue", 50),
  muted: c("blue", 100),
  border: c("blue", 400),
  primary: c("azure", 400),
  warn: c("amber", 400) ?? c("azure", 300),
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  sans: "Inter, ui-sans-serif, system-ui, sans-serif",
};

/* ------------------------------------------------------------------ product truth */

const manifest = JSON.parse(readFileSync(`${ROOT}/components.manifest.json`, "utf8"));
const parity = JSON.parse(readFileSync(`${ROOT}/platform-parity.json`, "utf8"));
const blocks = JSON.parse(readFileSync(`${ROOT}/block-parity.json`, "utf8"));

const entries = Object.entries(manifest.components);
const recipes = entries.filter(([, v]) => /not a component/i.test(v.platformNote ?? "")).map(([k]) => k);
const componentCount = entries.length - recipes.length;
const defs = manifest.platformDefinitions;
const platformRows = Object.entries(defs).map(([name, d]) => ({
  name,
  label: d.label,
  covered: entries.filter(([, v]) => v.platforms.includes(name)).length,
  total: entries.length,
  maturity: d.maturity,
  published: Boolean(d.distribution?.published),
  channel: d.distribution?.channel ?? "—",
}));
const blockTotal = blocks.total ?? blocks.blocks?.length ?? 0;

/* ------------------------------------------------------------------ primitives */

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const W = 1200;

const card = (h, body, { bg = T.bg } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" font-family="${T.sans}">
<rect width="${W}" height="${h}" fill="${bg}"/>
<rect x="0" y="0" width="${W}" height="6" fill="${T.primary}"/>
${body}
<text x="64" y="${h - 36}" font-size="20" fill="${T.muted}" opacity="0.75">kinetixui.com</text>
</svg>`;

/**
 * The smallest font any asset may use.
 *
 * A social client scales a 1200px card to roughly 390px, dividing every size by about three. At 16px on the
 * canvas that is 5px in the feed — not small, absent. The first pass of these assets used 15–18px for
 * secondary labels and `render-marketing-visuals.mjs` failed eight of nine for exactly that. Clamping here
 * rather than at each call site makes the rule structural: a new asset cannot reintroduce the problem by
 * passing a smaller number.
 *
 * 20px on a 1200px canvas lands at ~6.5px in a 390px feed, which is the floor the render check enforces.
 */
const MIN_FONT = 20;

const text = (x, y, s, { size = 24, fill = T.fg, weight = 400, font = T.sans, anchor = "start", opacity = 1 } = {}) =>
  `<text x="${x}" y="${y}" font-size="${Math.max(size, MIN_FONT)}" font-weight="${weight}" fill="${fill}" font-family="${font}" text-anchor="${anchor}" opacity="${opacity}">${esc(s)}</text>`;

const box = (x, y, w, h, { fill = T.surface, stroke = T.border, r = 12, dash = null, opacity = 1 } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2"${dash ? ` stroke-dasharray="${dash}"` : ""} opacity="${opacity}"/>`;

const arrow = (x1, y1, x2, y2, { stroke = T.primary, dash = null } = {}) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="2.5"${dash ? ` stroke-dasharray="${dash}"` : ""} marker-end="url(#a)"/>`;

const defsBlock = `<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${T.primary}"/></marker></defs>`;

/** Heading block used by every asset. Returns [svg, nextY]. */
const head = (eyebrow, title, sub) => {
  /*
   * Fit the headline to the canvas rather than hoping 46px is small enough.
   *
   * Three assets shipped with the title running off the right edge, and the font-size check passed all
   * three because the type was large — which was the problem. Bold Inter averages ~0.54em per character,
   * so the largest size that fits the 1072px text column is derived from the string itself.
   */
  const size = Math.min(46, Math.floor((W - 128) / (title.length * 0.54)));
  let s = text(64, 92, eyebrow, { size: 20, fill: T.primary, weight: 600, font: T.mono });
  s += text(64, 150, title, { size, weight: 700 });
  let y = 150;
  if (sub) { s += text(64, 196, sub, { size: 23, fill: T.muted }); y = 196; }
  return [s, y + 60];
};

const assets = [];
const emit = (id, svg, meta) => {
  writeFileSync(`${OUT}/${id}.svg`, svg + "\n");
  assets.push({ id, ...meta });
};

/* ------------------------------------------------------------------ VIS-001 · uncontrolled drift */

{
  const [h1, y0] = head("the problem", "Difference is fine. Drift is not.",
    "Platforms should differ where the platform differs. They should not differ by accident.");
  const col = (x, label, vals, faded) =>
    box(x, y0, 300, 230) +
    text(x + 24, y0 + 44, label, { size: 22, weight: 600 }) +
    vals.map((v, i) => text(x + 24, y0 + 90 + i * 40, v, { size: 20, font: T.mono, fill: faded?.[i] ? T.primary : T.muted })).join("");

  const body = defsBlock + h1
    + text(64, y0 - 18, "DAY 1 — one intent, three platforms", { size: 18, font: T.mono, fill: T.muted })
    + col(64, "Web", ["padding  16", "radius   12", "accent   #1d4ed8"])
    + col(414, "iOS", ["padding  16", "radius   12", "accent   #1d4ed8"])
    + col(764, "Android", ["padding  16", "radius   12", "accent   #1d4ed8"])
    + text(64, y0 + 300, "MONTH 6 — nobody decided this", { size: 18, font: T.mono, fill: T.primary })
    + (() => {
        const yy = y0 + 330;
        const c2 = (x, label, vals, changed) =>
          box(x, yy, 300, 230, { stroke: T.primary, dash: "6 5" }) +
          text(x + 24, yy + 44, label, { size: 22, weight: 600 }) +
          vals.map((v, i) => text(x + 24, yy + 90 + i * 40, v, { size: 20, font: T.mono, fill: changed.includes(i) ? T.primary : T.muted })).join("");
        return c2(64, "Web", ["padding  20", "radius   12", "accent   #1d4ed8"], [0])
          + c2(414, "iOS", ["padding  16", "radius   16", "accent   #1d4ed8"], [1])
          + c2(764, "Android", ["padding  16", "radius   12", "accent   #1f4a63"], [2]);
      })()
    + text(64, y0 + 620, "Each change was locally correct. None was written anywhere the others could see.", { size: 22, fill: T.fg })
    + text(64, y0 + 656, "A shared token source makes the difference a decision instead of an accident.", { size: 22, fill: T.muted });

  emit("VIS-001", card(y0 + 730, body), {
    brief: "VIS-001", type: "architecture", audience: "p2", pillar: "a",
    content: ["LI-003", "X-005"], claims: ["A1", "A2"],
    note: "Constructed illustration, not a screenshot of a real app. Values are illustrative and labelled as such.",
    alt: "Two rows of three panels — Web, iOS and Android. On day one all three show padding 16, radius 12 and the same accent colour. At month six each has drifted in a different property: web padding 20, iOS radius 16, Android a different accent. Caption: each change was locally correct, none was written anywhere the others could see.",
  });
}

/* ------------------------------------------------------------------ VIS-003 · token architecture (generated) */

{
  const targets = [
    ["Web", "CSS custom properties"],
    ["iOS", "Swift constants"],
    ["Android", "Kotlin objects"],
    ["Flutter", "Dart constants"],
  ];
  const [h1, y0] = head("tokens — generated", "One source. Every platform's own output.",
    "This flow is for tokens. Components are a different story — see the companion card.");
  const srcY = y0;
  let body = defsBlock + h1
    + box(64, srcY, 380, 120, { fill: T.surface, stroke: T.primary })
    + text(88, srcY + 46, "tokens/ — DTCG source", { size: 22, weight: 600 })
    + text(88, srcY + 82, "one file, hand-written", { size: 19, fill: T.muted, font: T.mono })
    + box(520, srcY + 20, 200, 80, { fill: T.bg, stroke: T.border })
    + text(620, srcY + 68, "generators", { size: 20, anchor: "middle", fill: T.fg })
    + arrow(450, srcY + 60, 514, srcY + 60);
  targets.forEach(([label, shape], i) => {
    const y = srcY + 140 + i * 92;
    body += arrow(726, srcY + 60, 790, y + 34)
      + box(796, y, 340, 68, { fill: T.bg })
      + text(820, y + 30, label, { size: 21, weight: 600 })
      + text(820, y + 54, shape, { size: 17, fill: T.muted, font: T.mono });
  });
  const endY = srcY + 140 + targets.length * 92;
  body += text(64, endY + 40, "Generated files are build artifacts, committed and reviewed —", { size: 22, fill: T.fg })
    + text(64, endY + 74, "so a value changed once moves every platform in one commit.", { size: 22, fill: T.muted });

  emit("VIS-003", card(endY + 150, body), {
    brief: "VIS-003", type: "architecture", audience: "p2", pillar: "b",
    content: ["ART-002", "LI-005", "X-004"], claims: ["A1", "A2"],
    alt: "A single DTCG token source feeding a generator, which produces four outputs: CSS custom properties for web, Swift constants for iOS, Kotlin objects for Android and Dart constants for Flutter. Caption notes the generated files are committed build artifacts, so one value change moves every platform in one commit.",
  });
}

/* ------------------------------------------------------------------ VIS-008 · component architecture (companion) */

{
  const [h1, y0] = head("components — written", "Five implementations. One contract.",
    "Nothing here is generated from anything else. That is the point.");
  let body = defsBlock + h1
    + box(400, y0, 400, 96, { fill: T.surface, stroke: T.primary })
    + text(600, y0 + 42, "component contract", { size: 22, weight: 600, anchor: "middle" })
    + text(600, y0 + 72, "name, variants, states, tokens", { size: 17, anchor: "middle", fill: T.muted, font: T.mono });
  const rows = platformRows.map((p) => p);
  const colW = Math.floor((W - 128 - (rows.length - 1) * 16) / rows.length);
  rows.forEach((p, i) => {
    const x = 64 + i * (colW + 16);
    const y = y0 + 190;
    body += arrow(600, y0 + 100, x + colW / 2, y - 6, { dash: "5 4" })
      + box(x, y, colW, 150)
      + text(x + 16, y + 38, p.label, { size: 19, weight: 600 })
      + text(x + 16, y + 70, "hand-written", { size: 16, fill: T.primary, font: T.mono })
      + text(x + 16, y + 98, `${p.covered} / ${p.total}`, { size: 22, weight: 700, font: T.mono })
      + text(x + 16, y + 124, p.maturity, { size: 15, fill: T.muted, font: T.mono });
  });
  const endY = y0 + 190 + 150;
  body += text(64, endY + 46, "Dashed arrows mean “implements”, not “compiles into”.", { size: 22, fill: T.fg })
    + text(64, endY + 80, "Coverage and maturity are generated from the manifest, gaps included.", { size: 22, fill: T.muted });

  emit("VIS-008", card(endY + 156, body), {
    brief: "new — companion to VIS-003 (brief §7)", type: "architecture", audience: "p1", pillar: "f",
    content: ["LI-007", "X-008"], claims: ["A2", "A3", "B2", "B4"],
    alt: `A component contract at the top with dashed arrows down to ${rows.length} independent implementations — ${rows.map((p) => `${p.label} ${p.covered} of ${p.total}`).join(", ")} — each labelled hand-written. Caption: dashed arrows mean implements, not compiles into.`,
  });
}

/* ------------------------------------------------------------------ VIS-009 · verification pipeline */

{
  const examples = [
    ["a component claims SwiftUI", "check:platform-source", "no SwiftUI source → build fails"],
    ["a docs page shows Compose code", "check:platform-code", "symbol not in the package → build fails"],
    ["a registry item ships a file", "check:registry-deps", "undeclared import → build fails"],
  ];
  const [h1, y0] = head("verification", "A claim without source fails the build.",
    "Three of these caught false claims in this repository before anyone read them.");
  let body = defsBlock + h1;
  const stages = ["CLAIM", "SOURCE", "CHECK", "CI", "PUBLIC"];
  stages.forEach((s, i) => {
    const x = 64 + i * 222;
    body += box(x, y0, 190, 60, { fill: i === 4 ? T.surface : T.bg, stroke: i === 4 ? T.primary : T.border })
      + text(x + 95, y0 + 38, s, { size: 19, weight: 600, anchor: "middle", font: T.mono });
    if (i < stages.length - 1) body += arrow(x + 194, y0 + 30, x + 218, y0 + 30);
  });
  examples.forEach(([claim, check, outcome], i) => {
    const y = y0 + 110 + i * 112;
    body += box(64, y, 1072, 92)
      + text(88, y + 36, claim, { size: 21, fill: T.fg })
      + text(88, y + 68, check, { size: 18, fill: T.primary, font: T.mono })
      + text(1112, y + 54, outcome, { size: 18, fill: T.muted, anchor: "end", font: T.mono });
  });
  const endY = y0 + 110 + examples.length * 112;
  body += text(64, endY + 42, "The marketing copy is under the same gates as the code.", { size: 22, fill: T.fg });

  emit("VIS-009", card(endY + 120, body), {
    brief: "new — brief §8", type: "architecture", audience: "p1", pillar: "a",
    content: ["LI-004", "X-003", "X-009", "ART-001"], claims: ["B1", "E6"],
    alt: "A pipeline reading claim, source, check, CI, public. Below it three real examples: a component claiming SwiftUI checked by check:platform-source; a docs page showing Compose code checked by check:platform-code; a registry item's files checked by check:registry-deps. Each fails the build when the claim outruns the source.",
  });
}

/* ------------------------------------------------------------------ VIS-006 · coverage, derived */

{
  const [h1, y0] = head("platform coverage", "Three different facts. Not one.",
    "A row of logos would imply they are one. They are not.");
  let body = h1
    + text(64, y0 - 8, "PLATFORM", { size: 16, font: T.mono, fill: T.muted })
    + text(400, y0 - 8, "COVERAGE", { size: 16, font: T.mono, fill: T.muted })
    + text(730, y0 - 8, "PACKAGE", { size: 16, font: T.mono, fill: T.muted })
    + text(940, y0 - 8, "INSTALLABLE", { size: 16, font: T.mono, fill: T.muted });
  platformRows.forEach((p, i) => {
    const y = y0 + 18 + i * 78;
    const pct = p.covered / p.total;
    body += box(64, y, 1072, 62, { fill: i % 2 ? T.bg : T.surface, stroke: T.border, r: 8 })
      + text(88, y + 40, p.label, { size: 22, weight: 600 })
      + `<rect x="400" y="${y + 26}" width="180" height="12" rx="6" fill="${T.bg}" stroke="${T.border}"/>`
      + `<rect x="400" y="${y + 26}" width="${Math.round(180 * pct)}" height="12" rx="6" fill="${T.primary}"/>`
      + text(600, y + 40, `${p.covered}/${p.total}`, { size: 19, font: T.mono, fill: T.muted })
      + text(730, y + 40, p.maturity, { size: 19, font: T.mono, fill: T.fg })
      + text(940, y + 40, p.published ? "npm · yes" : "source only",
             { size: 19, font: T.mono, fill: p.published ? T.primary : T.muted });
  });
  const endY = y0 + 18 + platformRows.length * 78;
  body += text(64, endY + 40, `${componentCount} components${recipes.length ? ` + ${recipes.length} documented recipe${recipes.length > 1 ? "s" : ""}` : ""} · ${blockTotal} blocks · generated from the manifest`,
    { size: 21, fill: T.muted, font: T.mono });

  emit("VIS-006", card(endY + 120, body), {
    brief: "VIS-006", type: "product-proof", audience: "p1", pillar: "a",
    content: ["LI-008", "X-007", "X-011", "LI-010"], claims: ["B2", "B3", "B4", "C1", "C2", "C3"],
    alt: `A coverage table with one row per platform: ${platformRows.map((p) => `${p.label}, ${p.covered} of ${p.total}, package ${p.maturity}, ${p.published ? "installable from " + p.channel : "not installable — build from source"}`).join("; ")}. Footer: ${componentCount} components plus ${recipes.length} documented recipe, ${blockTotal} blocks, generated from the manifest.`,
  });
}

/* ------------------------------------------------------------------ VIS-007 · adoption ladder */

{
  const rungs = [
    ["01 · TOKENS", "Keep every component you have", "Install the token package. On Flutter the theme adapters style stock widgets — nothing of ours in your tree."],
    ["02 · COMPONENTS", "Copy what you need", "The CLI writes source into your repo and installs what those files import. Yours to edit."],
    ["03 · BLOCKS", "Whole patterns", `${blockTotal} composed sections with real source on every platform that lists them.`],
  ];
  const [h1, y0] = head("adoption", "Start smaller than the product.",
    "Three independent entry points. Stopping at the first is a real answer.");
  let body = h1;
  rungs.forEach(([n, title, blurb], i) => {
    const y = y0 + i * 148;
    const first = i === 0;
    body += box(64, y, 1072, 124, { fill: first ? T.surface : T.bg, stroke: first ? T.primary : T.border })
      + text(92, y + 42, n, { size: 18, font: T.mono, fill: first ? T.primary : T.muted })
      + text(92, y + 80, title, { size: 26, weight: 600 })
      + text(500, y + 56, blurb.slice(0, 62), { size: 19, fill: T.muted })
      + text(500, y + 84, blurb.slice(62), { size: 19, fill: T.muted });
    if (first) body += text(1112, y + 42, "you can stop here", { size: 18, anchor: "end", fill: T.primary, font: T.mono });
  });
  emit("VIS-007", card(y0 + rungs.length * 148 + 100, body), {
    brief: "VIS-007", type: "adoption", audience: "p2", pillar: "b",
    content: ["LI-009", "X-010"], claims: ["D2", "D3"],
    alt: "Three adoption rungs. One, tokens: keep every component you have, highlighted and marked you can stop here. Two, components: copy what you need, the CLI writes source into your repo. Three, blocks: whole composed patterns with real source per platform.",
  });
}

/* ------------------------------------------------------------------ VIS-005 · two trades */

{
  const [h1, y0] = head("the trade", "Neither is a mistake.", "Know which one you are buying.");
  const column = (x, title, nodes, note, accent) =>
    box(x, y0, 520, 400, { stroke: accent }) +
    text(x + 28, y0 + 48, title, { size: 26, weight: 700, fill: accent }) +
    nodes.map((n, i) => text(x + 28, y0 + 100 + i * 46, n, { size: 20, font: T.mono, fill: T.muted })).join("") +
    text(x + 28, y0 + 352, note, { size: 19, fill: T.fg });
  const body = h1
    + column(64, "One runtime", ["your code", "  ↓", "a drawing layer", "  ↓", "every platform"], "Cost lives at the edges.", T.muted)
    + column(616, "Native implementations", ["a shared contract", "  ↓", "five implementations", "  ↓", "each platform's idiom"], "Cost lives in the maintenance.", T.primary)
    + text(64, y0 + 452, "KinetixUI takes the second. The gaps get published instead of abstracted away.", { size: 22, fill: T.fg });
  emit("VIS-005", card(y0 + 530, body), {
    brief: "VIS-005", type: "architecture", audience: "p2", pillar: "f",
    content: ["LI-007", "X-008"], claims: ["A2", "A3"],
    alt: "Two columns presented as equals. Left, one runtime: your code into a drawing layer into every platform, cost at the edges. Right, native implementations: a shared contract into five implementations in each platform's idiom, cost in the maintenance.",
  });
}

/* ------------------------------------------------------------------ VIS-002 · manifest → every surface */

{
  const surfaces = ["coverage table", "component pages", "platform docs", "marketing copy"];
  const [h1, y0] = head("one source", "One manifest. Every surface.",
    "The alternative is a sentence in a docs page that nothing ever reads again.");
  let body = defsBlock + h1
    + box(420, y0, 360, 96, { fill: T.surface, stroke: T.primary })
    + text(600, y0 + 44, "components.manifest.json", { size: 21, weight: 600, anchor: "middle", font: T.mono })
    + text(600, y0 + 74, "the only declaration", { size: 17, anchor: "middle", fill: T.muted });
  surfaces.forEach((s, i) => {
    const x = 64 + i * 272;
    const y = y0 + 200;
    body += arrow(600, y0 + 100, x + 120, y - 6)
      + box(x, y, 240, 72)
      + text(x + 120, y + 44, s, { size: 19, anchor: "middle" });
  });
  const y2 = y0 + 200 + 72;
  body += box(420, y2 + 80, 360, 72, { stroke: T.primary, dash: "6 5" })
    + text(600, y2 + 124, "check:platform-source", { size: 20, anchor: "middle", fill: T.primary, font: T.mono })
    + arrow(600, y2 + 78, 600, y0 + 104, { dash: "5 4" })
    + text(64, y2 + 200, "The check reads the manifest back against the filesystem.", { size: 22, fill: T.fg })
    + text(64, y2 + 234, "It found a component claiming three native platforms with an implementation on none.", { size: 22, fill: T.muted });

  emit("VIS-002", card(y2 + 310, body), {
    brief: "VIS-002", type: "architecture", audience: "p1", pillar: "c",
    content: ["LI-004", "X-003"], claims: ["B1"],
    alt: "components.manifest.json at the centre with arrows out to four surfaces: coverage table, component pages, platform docs and marketing copy. A dashed arrow from check:platform-source points back at the manifest. Caption: it found a component claiming three native platforms with an implementation on none.",
  });
}

/* ------------------------------------------------------------------ social preview (GitHub, 1280x640) */

{
  const h = 640, w = 1280;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${T.sans}">
<rect width="${w}" height="${h}" fill="${T.bg}"/>
<rect x="0" y="0" width="${w}" height="8" fill="${T.primary}"/>
${text(80, 190, "KinetixUI", { size: 76, weight: 700 })}
${text(80, 268, "A design system for teams on more than one platform", { size: 34, fill: T.fg })}
${text(80, 318, "with cross-platform claims verified against source in CI.", { size: 34, fill: T.primary })}
${(() => {
  // The cards are sized to their labels, not to a single width, because one label is an outlier:
  // "Jetpack Compose" measures 196px at size 20 against 89px for the next widest (Angular). Five
  // equal cards have to fit the 1120px between the 80px margins, and fitting 196px plus padding
  // would need every card to be 228 wide — 1140px before a single gap. The old layout used 208 and
  // the label painted 8px past its own rectangle.
  //
  // Shrinking the label is not available: MIN_FONT clamps every string to 20px so that a card scaled
  // to a 390px feed stays readable, and it silently clamped an attempt to set 17 here. Shortening
  // the label is not available either — it is the platform's name, from the manifest.
  //
  // So each card takes the width its own label needs, and the leftover is shared as equal gaps.
  // CHAR_W is a calibrated upper bound for Inter 600 at 20px: the five real labels measure between
  // 11.1 and 13.1 px per character, so 13.5 over-estimates every one of them. Over-estimating is the
  // safe direction — it buys slack rather than spending it. Verify after changing any of this: SVG
  // text paints past its rectangle silently, so an overflow shows up in a screenshot and in nothing
  // a DOM scan reports.
  const pad = 16, MIN_CARD = 200, CHAR_W = 13.5, ROW = 1120, LEFT = 80;
  const widths = platformRows.map((p) => Math.max(MIN_CARD, pad * 2 + Math.ceil(p.label.length * CHAR_W)));
  const gap = Math.floor((ROW - widths.reduce((a, b) => a + b, 0)) / (widths.length - 1));
  let x = LEFT;
  return platformRows.map((p, i) => {
    const cardX = x;
    x += widths[i] + gap;
    return box(cardX, 390, widths[i], 118, { fill: T.surface, r: 10 })
      + text(cardX + pad, 428, p.label, { size: 20, weight: 600 })
      + text(cardX + pad, 462, `${p.covered}/${p.total}`, { size: 26, weight: 700, font: T.mono, fill: T.primary })
      + text(cardX + pad, 490, p.published ? "on npm" : "from source", { size: 20, font: T.mono, fill: T.muted });
  }).join("");
})()}
${text(80, 578, "MIT · kinetixui.com", { size: 22, fill: T.muted, font: T.mono })}
</svg>`;
  emit("SOCIAL-PREVIEW", svg, {
    brief: "brief §14", type: "social-preview", audience: "neutral", pillar: "a",
    content: ["github"], claims: ["B2", "B4", "C1", "C2", "C3"], dimensions: `${w}x${h}`,
    note: "GitHub social preview. Upload is a repository setting — manual action.",
    alt: `KinetixUI social preview. Heading: a design system for teams on more than one platform, with cross-platform claims verified against source in CI. ${platformRows.map((p) => `${p.label} ${p.covered} of ${p.total}, ${p.published ? "on npm" : "from source"}`).join("; ")}. MIT.`,
  });
}

/* ------------------------------------------------------------------ manifest */

const manifestOut = {
  $comment:
    "Generated by scripts/gen-marketing-visuals.mjs from components.manifest.json, platform-parity.json, " +
    "block-parity.json and the real token output. Do not hand-edit: regenerate with `pnpm gen:visuals`. " +
    "Every count here is derived, so no asset can carry a number the product has moved past.",
  generated: new Date().toISOString().slice(0, 10),
  defaultTheme: "dark",
  regenerate: "pnpm gen:visuals",
  assets: assets.map((a) => ({
    dimensions: `${W}x(auto)`,
    generated: true,
    ...a,
    file: `marketing/content/visuals/${a.id}.svg`,
  })),
};
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifestOut, null, 2) + "\n");

console.log(`gen:visuals — ${assets.length} SVG asset(s) in marketing/content/visuals/`);
for (const a of assets) console.log(`  ${a.id.padEnd(16)} ${a.type.padEnd(16)} ${(a.content ?? []).join(", ")}`);
