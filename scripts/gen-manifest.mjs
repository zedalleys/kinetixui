/**
 * gen-manifest.mjs — derive component-status.json and platform-parity.json
 * from components.manifest.json, the single source of truth for per-component
 * metadata. Those two files stay as generated, committed output so the web app
 * (apps/web/src/lib/*.ts) and the registry scripts keep reading the shapes
 * they already know.
 *
 *   node scripts/gen-manifest.mjs           write both files
 *   node scripts/gen-manifest.mjs --check   fail if the manifest is invalid or
 *                                           the generated files are stale
 *
 * The platform list is NOT declared here or anywhere downstream — it is derived
 * from the manifest's `platformDefinitions`, which carries each platform's
 * family (web/native), label, abbreviation, maturity and whether its catalogue
 * is complete. Adding a platform means editing that one object.
 *
 * Validates that the manifest lists exactly the `registry:ui` components in
 * registry/registry.json (plus `registry: false` docs-page companions), each
 * with an allowed status and a platform list that includes React and only
 * known platforms. Whether the *source* behind each declared platform really
 * exists is a separate check — scripts/check-platform-source.mjs.
 *
 * It also enforces the rule that makes five-platform guidance possible without
 * five-platform fiction: every (component, platform) pair the component is NOT
 * implemented on must carry a `platformGuidance` entry saying what to show
 * there instead. `platforms` keeps its single meaning — a real KinetixUI
 * implementation exists — and guidance never counts towards it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => JSON.parse(readFileSync(`${root}/${p}`, "utf8"));
const CHECK = process.argv.includes("--check");

const manifest = read("components.manifest.json");
const registry = read("registry/registry.json");
const verification = read("verification.json");
const STATUSES = new Set(["beta", "stable", "deprecated"]);
const FAMILIES = new Set(["web", "native"]);
/**
 * What a platform tab shows when the component is not implemented on that platform.
 *
 *   native-equivalent  the platform already provides the concept (SwiftUI's layoutDirection environment).
 *                      Show its own idiom. There is nothing to port and nothing is planned.
 *   composition        the concept is assembled from other KinetixUI components on that platform.
 *   planned            it should exist and does not yet. Requires a `wave`, so "planned" cannot become a
 *                      permanent parking space for an undecided gap.
 *
 * None of these is parity. `platforms` is parity.
 */
const GUIDANCE_TYPES = new Set(["native-equivalent", "composition", "planned"]);

/**
 * The implementation-maturity ladder, and the evidence each rung costs.
 *
 * This is the whole point of the model, so it is written once, here, and everything downstream reads the
 * result. Two things it deliberately does NOT do:
 *
 *   - It does not accept "the source file exists" as maturity. That was the previous state of affairs:
 *     `platformDefinitions` said SwiftUI was stable, and the only thing behind that was a filename.
 *   - It does not let a platform declare a level its own components have not reached. The declared maturity
 *     in platformDefinitions is a FLOOR the whole catalogue meets, checked below against the evidence, not a
 *     claim in its own right. A single component may sit above it; none may sit below.
 *
 * `preview` is not an evidence rung. It is a package-level statement — "this catalogue is knowingly
 * incomplete" — and it is the one declared value that caps rather than floors, because a reader must not be
 * told a component of an incomplete package is ready.
 */
const LADDER = ["experimental", "preview", "beta", "stable"];
const REQUIRES = {
  // compiles in its platform's CI, and nothing more is claimed
  experimental: ["build"],
  // the semantics assistive technology receives have been checked — the bar for "usable and reviewed"
  beta: ["build", "accessibility"],
  // everything the support policy implies: it behaves, it survives direction and text scaling, its
  // rendering is pinned, and a consumer can actually install it
  stable: ["build", "accessibility", "interaction", "rtl", "largeText", "visual"],
};
const rank = (level) => LADDER.indexOf(level);

/** The highest rung this component's evidence pays for on this platform. */
function earned(evidence, published) {
  let best = "experimental";
  for (const level of ["beta", "stable"]) {
    if (!REQUIRES[level].every((k) => evidence?.[k])) continue;
    if (level === "stable" && !published) continue; // nobody can depend on what they cannot install
    best = level;
  }
  return best;
}
const WAVES = new Set(["primitives", "inputs", "layout", "navigation", "overlays", "data", "advanced"]);

const defs = manifest.platformDefinitions;
const platforms = Object.keys(defs);
const known = new Set(platforms);
const byFamily = (f) => platforms.filter((p) => defs[p].family === f);
/**
 * Platforms whose catalogue is declared complete. Only these carry the "a component missing this platform
 * must say why" rule: a platform still rolling out (Angular) has gaps because it is new, not because anyone
 * decided against porting — calling those "documented exceptions" would be a lie in both directions.
 */
const catalogPlatforms = platforms.filter((p) => defs[p].catalogComplete);

const errors = [];
for (const [p, d] of Object.entries(defs)) {
  if (!FAMILIES.has(d.family)) errors.push(`platformDefinitions.${p}: family must be "web" or "native", not "${d.family}"`);
  for (const k of ["label", "abbr", "package", "dir"]) if (!d[k]) errors.push(`platformDefinitions.${p}: missing "${k}"`);
  if (typeof d.catalogComplete !== "boolean") errors.push(`platformDefinitions.${p}: catalogComplete must be a boolean`);
  if (rank(d.maturity) === -1) errors.push(`platformDefinitions.${p}: maturity must be one of ${LADDER.join(", ")}`);
  if (!d.distribution || typeof d.distribution.published !== "boolean" || !d.distribution.channel) {
    errors.push(`platformDefinitions.${p}: needs a distribution block with a channel and a boolean "published"`);
  }
}

const slugs = registry.items.filter((i) => i.type === "registry:ui").map((i) => i.name);
for (const s of slugs) if (!(s in manifest.components)) errors.push(`${s}: missing from components.manifest.json`);
for (const [s, c] of Object.entries(manifest.components)) {
  if (c.registry === false) {
    if (slugs.includes(s)) errors.push(`${s}: marked registry:false but is a registry item`);
  } else if (!slugs.includes(s)) errors.push(`${s}: in manifest but not a registry component (set registry:false for a docs-only companion)`);
  if (!STATUSES.has(c.status)) errors.push(`${s}: invalid status "${c.status}"`);
  if (!/^\d+\.\d+\.\d+$/.test(c.since ?? "")) errors.push(`${s}: since must be a semver like "0.4.1" (the release it first shipped in)`);
  if (!Array.isArray(c.platforms) || !c.platforms.includes("React")) errors.push(`${s}: platforms must be a list including React`);
  else for (const p of c.platforms) if (!known.has(p)) errors.push(`${s}: unknown platform "${p}" (known: ${platforms.join(", ")})`);
  for (const p of Object.keys(c.platformNotes ?? {})) if (!known.has(p)) errors.push(`${s}: platformNotes has unknown platform "${p}"`);

  // every platform the component is NOT on needs guidance, and every guidance entry needs a platform it is
  // really absent from — a stale entry for a platform that has since been ported reads as "no port exists"
  const guidance = c.platformGuidance ?? {};
  for (const [p, g] of Object.entries(guidance)) {
    if (!known.has(p)) { errors.push(`${s}: platformGuidance has unknown platform "${p}"`); continue; }
    if (c.platforms.includes(p)) errors.push(`${s}: platformGuidance names ${p}, but ${s} IS implemented on ${p} — delete the stale entry`);
    if (!GUIDANCE_TYPES.has(g.type)) errors.push(`${s}: platformGuidance.${p}.type must be one of ${[...GUIDANCE_TYPES].join(", ")}`);
    if (g.type === "planned") {
      if (!WAVES.has(g.wave)) errors.push(`${s}: platformGuidance.${p} is planned, so it needs a wave (${[...WAVES].join(", ")})`);
      if (g.reason) errors.push(`${s}: platformGuidance.${p} is planned — the wave is the reason, drop the prose`);
    } else if (!g.reason || g.reason.length < 40) {
      errors.push(`${s}: platformGuidance.${p} is "${g.type}" and needs a real reason, not "${g.reason ?? ""}"`);
    }
  }
  const uncovered = platforms.filter((p) => !c.platforms.includes(p) && !guidance[p]);
  if (uncovered.length) errors.push(`${s}: no platformGuidance for ${uncovered.join(", ")} — every platform tab must have something truthful to show`);
  // a gap on a complete-catalogue platform is a decision, and a decision has to be written down
  const missing = catalogPlatforms.filter((p) => !c.platforms.includes(p));
  if (missing.length && !c.platformNote && !missing.every((p) => c.platformNotes?.[p])) {
    errors.push(`${s}: not on ${missing.join(", ")} — add a platformNote (or platformNotes per platform) saying why`);
  }
}
/* ── implementation maturity, computed from the evidence ──────────────────── */

const evidenceOf = (slug, platform) => verification.components?.[slug]?.[platform];

/** slug → platform → the rung this implementation has actually earned, capped by its platform's ceiling. */
const maturity = {};
for (const [slug, c] of Object.entries(manifest.components)) {
  const per = {};
  for (const platform of c.platforms) {
    const level = earned(evidenceOf(slug, platform), defs[platform].distribution?.published);
    // `preview` is a package-level statement — the catalogue is knowingly incomplete — so it caps everything
    // inside it. Any other declared maturity is a FLOOR the platform guarantees, not a lid: a Compose button
    // with interaction and semantics tests reads as beta even while the platform overall is experimental,
    // because hiding that would make the per-component data useless and the progress invisible.
    per[platform] = defs[platform].maturity === "preview" ? "preview" : level;
    if (!evidenceOf(slug, platform)) {
      errors.push(`${slug}: declared on ${platform} but verification.json has no evidence for it — run \`pnpm gen:verification\``);
    }
  }
  maturity[slug] = per;
}

/**
 * A platform may not advertise a rung one of its own components has not reached.
 *
 * The minimum, not an average: "SwiftUI is stable" is a statement a reader applies to whichever component
 * they are about to use, so it has to be true of the weakest one. This is the check that would have caught
 * the state this whole model was built to fix — a filename standing in for evidence.
 */
for (const [platform, d] of Object.entries(defs)) {
  const declared = d.maturity;
  if (declared === "preview") continue; // a deliberate "this catalogue is incomplete" statement, not an evidence claim
  const shortfall = Object.entries(maturity)
    .filter(([, per]) => per[platform] && rank(per[platform]) < rank(declared))
    .map(([slug]) => slug);
  if (shortfall.length) {
    const worst = shortfall.slice(0, 3).join(", ");
    errors.push(
      `platformDefinitions.${platform}: declares "${declared}", but ${shortfall.length} of its components reach only a lower rung ` +
        `(${worst}${shortfall.length > 3 ? ", …" : ""}). Lower the declared maturity, or add the verification that earns it.`,
    );
  }
}

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}

const entries = Object.entries(manifest.components).sort(([a], [b]) => a.localeCompare(b));
const GENERATED = "GENERATED from components.manifest.json by `pnpm gen:manifest` — edit the manifest, not this file.";
const inOrder = (list) => platforms.filter((p) => list.includes(p));

const status = {
  $schema: "https://kinetixui.com/schema/component-status.json",
  $description: `slug → lifecycle status ("beta" | "stable" | "deprecated"), one entry per component. ${GENERATED} Consumed by apps/web/src/lib/component-status.ts and scripts/gen-registry-index.mjs (which omits "stable").`,
  status: Object.fromEntries(entries.map(([s, c]) => [s, c.status])),
};

const parity = {
  $schema: "https://kinetixui.com/schema/platform-parity.json",
  $description: `Which platforms carry each component. \`components\` is explicit for every slug — there is no "absent means everywhere" rule, so a newly added platform can never be silently claimed for a component that does not have it. ${GENERATED} Consumed by apps/web/src/lib/platform-parity.ts and scripts/gen-registry-index.mjs.`,
  platforms,
  platformDefinitions: defs,
  webPlatforms: byFamily("web"),
  nativePlatforms: byFamily("native"),
  catalogPlatforms,
  platformAbbr: Object.fromEntries(platforms.map((p) => [p, defs[p].abbr])),
  coverage: Object.fromEntries(platforms.map((p) => [p, entries.filter(([, c]) => c.platforms.includes(p)).length])),
  components: Object.fromEntries(entries.map(([s, c]) => [s, inOrder(c.platforms)])),
  notes: Object.fromEntries(entries.filter(([, c]) => c.platformNote).map(([s, c]) => [s, c.platformNote])),
  platformNotes: Object.fromEntries(entries.filter(([, c]) => c.platformNotes).map(([s, c]) => [s, c.platformNotes])),
  guidance: Object.fromEntries(entries.filter(([, c]) => c.platformGuidance).map(([s, c]) => [s, c.platformGuidance])),
  /** The ladder itself, so the website explains the same rules this file enforces rather than its own copy. */
  maturityLadder: LADDER,
  maturityRequires: REQUIRES,
  /** slug → platform → rung. Computed from verification.json; never hand-written. */
  maturity: Object.fromEntries(entries.map(([s]) => [s, maturity[s]])),
  /** How many components sit on each rung, per platform — the honest shape of a platform's catalogue. */
  maturityCounts: Object.fromEntries(
    platforms.map((p) => [
      p,
      Object.fromEntries(LADDER.map((level) => [level, entries.filter(([s]) => maturity[s][p] === level).length]).filter(([, n]) => n > 0)),
    ]),
  ),
};

let stale = false;
for (const [file, data] of [["component-status.json", status], ["platform-parity.json", parity]]) {
  const out = JSON.stringify(data, null, 2) + "\n";
  if (CHECK) {
    if (readFileSync(`${root}/${file}`, "utf8") !== out) {
      console.error(`  ✗ ${file} is stale — run \`pnpm gen:manifest\``);
      stale = true;
    }
  } else writeFileSync(`${root}/${file}`, out);
}
if (stale) process.exit(1);
const coverage = platforms.map((p) => `${p} ${parity.coverage[p]}`).join(", ");
const full = entries.filter(([, c]) => catalogPlatforms.every((p) => c.platforms.includes(p))).length;
const guidanceCounts = {};
for (const [, c] of entries) for (const g of Object.values(c.platformGuidance ?? {})) guidanceCounts[g.type] = (guidanceCounts[g.type] ?? 0) + 1;
console.log(
  `${CHECK ? "check:manifest ok" : "gen:manifest"} — ${entries.length} components (${coverage}); ` +
    `${full} on all ${catalogPlatforms.length} complete-catalogue platforms; ` +
    `guidance ${Object.entries(guidanceCounts).map(([t, n]) => `${t} ${n}`).join(", ")}.`,
);
