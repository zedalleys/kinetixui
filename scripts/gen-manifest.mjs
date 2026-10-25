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

const manifestText = readFileSync(`${root}/components.manifest.json`, "utf8");
const manifest = JSON.parse(manifestText);
const registry = read("registry/registry.json");
const verification = read("verification.json");
const STATUSES = new Set(["beta", "stable", "deprecated"]);

/**
 * The FUNCTIONAL TAXONOMY, and why it is declared in the manifest rather than in the surfaces that use it.
 *
 * Functional category used to be the one catalogue dimension with no canonical source: a 109-entry map in
 * `apps/web/src/lib/site.ts` and a 107-entry map in `scripts/gen-stories.mjs`, each hand-maintained, each
 * claiming in a comment to mirror the other. They had drifted on two slugs, and `categoryOf` fell back to
 * "Data Display" for anything missing, so a component could be filed in one category on the website and
 * another in Storybook, or silently land in Data Display, and nothing anywhere would say so (CAT-BUG-019).
 *
 * Both maps are now generated from `categoryDefinitions` plus each component's `category`, and the fallback
 * is gone: an unknown slug is an error, not a default.
 *
 * `kind` is the distinction the repository already made by accident. `combobox` carries
 * `platformNote: "not a component — a documented composition …"`, and `platform-support.ts` parses that prose
 * to derive `recipes`, which is why the site says "108 components and 1 documented recipe". `kind` states it
 * instead of inferring it from a sentence.
 *
 * `facets` is secondary and non-exclusive. It exists so a reader can see that `address-fields` and `form` are
 * composed field groups rather than primitives, and that `direction-provider` renders nothing — without a
 * one-item "Utilities" category, and without moving anything between Components and Blocks.
 */
const CATEGORIES = Object.keys(manifest.categoryDefinitions ?? {});
const KINDS = new Set(["component", "recipe"]);
const FACETS = new Set(["composed", "utility"]);

/** Keys a manifest entry may carry. A typo like `catagory` must fail, not be ignored. */
const COMPONENT_KEYS = new Set([
  "category", "kind", "facets", "status", "lifecycleReason", "since", "platforms",
  "platformNote", "platformNotes", "platformGuidance", "registry", "composition", "sourceNames",
]);
const MANIFEST_KEYS = new Set(["$schema", "$description", "categoryDefinitions", "retiredCategories", "platformDefinitions", "components"]);
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
 * The VERIFICATION ladder, and the evidence each rung costs.
 *
 * This is a statement about one implementation's automated evidence. It is not the component's lifecycle
 * (`status` — is the API settled?) and it is not the package's maturity (`platformDefinitions[p].maturity` —
 * is the offering a product?). All three were being said with one word, and the word being printed was the
 * one nothing backed up: `platformDefinitions` called SwiftUI stable, and the only thing behind that was a
 * filename. None of the three is derived from either of the others.
 *
 * `preview` is not an evidence rung. It is the package-level statement "this catalogue is knowingly
 * incomplete", and it is the only declared value that caps a verification level — a reader must not be told
 * a component of an incomplete package is verified beyond it.
 *
 * There is no N/A. A kind that does not apply to a component simply is not verified, and reads as a gap. A
 * gap someone has to look at is safer than a gap someone can dismiss.
 */
const LADDER = ["experimental", "preview", "beta", "stable"];
const REQUIRES = {
  // compiles in its platform's CI, and nothing more is claimed
  experimental: ["build"],
  // the semantics assistive technology receives have been checked — the bar for "usable and reviewed"
  beta: ["build", "accessibility"],
  // everything a support promise implies: it behaves, it survives direction and text scaling, its rendering
  // is pinned against a reference, and a consumer can actually install it
  stable: ["build", "accessibility", "interaction", "rtl", "largeText", "visual", "published"],
};
const rank = (level) => LADDER.indexOf(level);

/** The highest rung this implementation's evidence pays for. */
function earned(evidence) {
  let best = "experimental";
  for (const level of ["beta", "stable"]) {
    if (REQUIRES[level].every((k) => evidence?.[k])) best = level;
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

/* ── manifest shape ───────────────────────────────────────────────────────────
 * Checked before anything reads a value, so a misspelled key fails loudly
 * instead of being silently skipped by every consumer below.
 */
for (const k of Object.keys(manifest)) {
  if (!MANIFEST_KEYS.has(k)) errors.push(`manifest: unknown top-level key "${k}" (allowed: ${[...MANIFEST_KEYS].join(", ")})`);
}
for (const k of MANIFEST_KEYS) if (!(k in manifest)) errors.push(`manifest: missing top-level key "${k}"`);

/**
 * Duplicate slugs, which `JSON.parse` cannot report: a repeated key silently keeps the last value, so a
 * component pasted twice with two different categories would validate and generate from whichever copy
 * happened to come second.
 */
{
  const seen = new Set();
  const dupes = new Set();
  const body = manifestText.slice(manifestText.indexOf('"components"'));
  for (const [, slug] of body.matchAll(/^\s{4}"([a-z0-9-]+)":\s*\{/gm)) {
    if (seen.has(slug)) dupes.add(slug);
    seen.add(slug);
  }
  for (const s of dupes) errors.push(`${s}: appears twice in components — JSON keeps only the last copy, so delete one`);
}

if (!CATEGORIES.length) errors.push(`manifest: categoryDefinitions must declare at least one category`);
for (const [label, def] of Object.entries(manifest.categoryDefinitions ?? {})) {
  if (!def || typeof def.rule !== "string" || def.rule.length < 20) {
    errors.push(`categoryDefinitions["${label}"]: needs a "rule" saying what belongs in it, so an assignment can be argued with`);
  }
  for (const k of Object.keys(def ?? {})) {
    if (k !== "rule" && k !== "formerly") errors.push(`categoryDefinitions["${label}"]: unknown key "${k}"`);
  }
}

/**
 * `formerly` carries a category's previous labels, so a shared `/components?cat=Form%20Inputs` link still
 * filters after a rename instead of silently matching nothing. A former label must not collide with a current
 * one, and two categories must not both claim it, or the alias has no single answer.
 */
{
  const current = new Set(CATEGORIES);
  const claimed = new Map();
  for (const [label, def] of Object.entries(manifest.categoryDefinitions ?? {})) {
    if (!("formerly" in (def ?? {}))) continue;
    if (!Array.isArray(def.formerly) || !def.formerly.length) {
      errors.push(`categoryDefinitions["${label}"]: formerly must be a non-empty array of previous labels, or absent`);
      continue;
    }
    for (const prev of def.formerly) {
      if (current.has(prev)) errors.push(`categoryDefinitions["${label}"]: formerly lists "${prev}", which is itself a current category`);
      if (claimed.has(prev)) errors.push(`categoryDefinitions["${label}"]: formerly lists "${prev}", already claimed by "${claimed.get(prev)}"`);
      claimed.set(prev, label);
    }
  }
}

/**
 * `retiredCategories` carries a category that was removed and did NOT become one other category, so
 * `formerly` cannot answer for it. `Foundations` is the case: its nine components went to five different
 * categories, so a redirect would have to pick one and be wrong for a reader four times out of five.
 *
 * Without this, `/components?cat=Foundations` and `/components?cat=Nonsense` render the identical dead end —
 * a reader who followed a link someone sent them is told the same thing as a reader who mistyped, while all
 * nine components are still published under other names. Listing the successors is what lets the gallery
 * say what happened instead.
 *
 * A retired label must not be a current category or a `formerly` value — those already have answers — and
 * every successor must be a current category that actually holds something, or the page offers a chip that
 * leads nowhere. Successors are held in `categoryOrder` order so the chips read in the catalogue's own
 * order rather than whatever order someone typed.
 */
{
  const current = new Set(CATEGORIES);
  const claimed = new Map(
    Object.entries(manifest.categoryDefinitions ?? {})
      .flatMap(([label, def]) => (Array.isArray(def?.formerly) ? def.formerly.map((prev) => [prev, label]) : [])),
  );
  const counts = new Map(
    CATEGORIES.map((label) => [label, Object.values(manifest.components ?? {}).filter((c) => c.category === label).length]),
  );
  for (const [label, def] of Object.entries(manifest.retiredCategories ?? {})) {
    const at = `retiredCategories["${label}"]`;
    if (current.has(label)) errors.push(`${at}: is a current category, so it is not retired`);
    if (claimed.has(label)) errors.push(`${at}: is also a "formerly" label of "${claimed.get(label)}", which already answers for it`);
    for (const k of Object.keys(def ?? {})) {
      if (!["retiredIn", "becauseIt", "successors"].includes(k)) errors.push(`${at}: unknown key "${k}"`);
    }
    if (!def?.retiredIn) errors.push(`${at}: needs "retiredIn", the slice that retired it`);
    if (typeof def?.becauseIt !== "string" || def.becauseIt.length < 20) {
      errors.push(`${at}: needs "becauseIt", one clause the page can print after "was retired because it"`);
    }
    if (!Array.isArray(def?.successors) || !def.successors.length) {
      errors.push(`${at}: successors must be a non-empty array of the categories its components went to`);
      continue;
    }
    if (new Set(def.successors).size !== def.successors.length) errors.push(`${at}: successors lists the same category twice`);
    for (const s of def.successors) {
      if (!current.has(s)) errors.push(`${at}: successor "${s}" is not a current category`);
      else if (!counts.get(s)) errors.push(`${at}: successor "${s}" holds no components, so its chip would lead to an empty view`);
    }
    const ordered = CATEGORIES.filter((c) => def.successors.includes(c));
    if (ordered.join("|") !== def.successors.filter((s) => current.has(s)).join("|")) {
      errors.push(`${at}: successors must be in categoryOrder order — ${ordered.join(", ")}`);
    }
  }
}

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
  for (const k of Object.keys(c)) {
    if (!COMPONENT_KEYS.has(k)) errors.push(`${s}: unknown key "${k}" — check the spelling (allowed: ${[...COMPONENT_KEYS].join(", ")})`);
  }
  // the functional taxonomy. No default: an entry with no category is a missing decision, and the website
  // used to answer it with "Data Display" rather than with an error.
  if (!c.category) errors.push(`${s}: has no category — pick one of ${CATEGORIES.join(" | ")} (categoryDefinitions carries each rule)`);
  else if (!CATEGORIES.includes(c.category)) errors.push(`${s}: category "${c.category}" is not in categoryDefinitions (${CATEGORIES.join(" | ")})`);
  if (!c.kind) errors.push(`${s}: has no kind — "component" if it exports an API, "recipe" if it is a documented composition`);
  else if (!KINDS.has(c.kind)) errors.push(`${s}: kind must be "component" or "recipe", not "${c.kind}"`);
  if ("facets" in c) {
    if (!Array.isArray(c.facets) || !c.facets.length) errors.push(`${s}: facets must be a non-empty array, or absent`);
    else {
      for (const f of c.facets) if (!FACETS.has(f)) errors.push(`${s}: unknown facet "${f}" (${[...FACETS].join(", ")})`);
      if (new Set(c.facets).size !== c.facets.length) errors.push(`${s}: facets repeats a value`);
    }
  }
  // A recipe has no export of its own, so it cannot be a registry component someone installs.
  if (c.kind === "recipe" && c.registry !== false) errors.push(`${s}: is kind "recipe" but is a registry component — a recipe has no source to install`);
  /**
   * `kind` and the prose must agree.
   *
   * "not a component" in a platformNote is load-bearing outside this repo: marketing/CLAIMS.md B2 makes the
   * phrasing a condition of quoting the entry count at all, and two pinned marketing drafts still derive the
   * recipe list by matching it. `kind` is now what the site and the stats scripts read, so if the two could
   * disagree the public number and the catalogue would quietly part company.
   */
  const saysRecipe = /not a component/i.test(c.platformNote ?? "");
  if (c.kind === "recipe" && !saysRecipe) {
    errors.push(`${s}: is kind "recipe" but its platformNote does not say "not a component" — say so there too, or make it a component`);
  }
  if (c.kind === "component" && saysRecipe) {
    errors.push(`${s}: its platformNote says "not a component" but kind is "component" — set kind "recipe", or reword the note`);
  }
  if (!STATUSES.has(c.status)) errors.push(`${s}: invalid status "${c.status}"`);
  /**
   * A beta component must say why it is beta, and a stable one must not carry a stale reason.
   *
   * Until now `beta` meant "shipped this cycle, promote next one" — all twelve beta components landed in
   * 0.12.0 and were still beta at 0.22.1, which made the label mean "nobody ran the chore" rather than
   * anything about the API. A required reason is what stops that from being possible again.
   */
  if (c.status === "beta" && (c.lifecycleReason ?? "").length < 40) {
    errors.push(`${s}: is lifecycle beta but has no lifecycleReason — say what about its product or API is unresolved, or promote it`);
  }
  if (c.status !== "beta" && c.lifecycleReason) {
    errors.push(`${s}: is "${c.status}" but still carries a lifecycleReason — delete it`);
  }
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
/* ── verification level, computed from the evidence ───────────────────────── */

const evidenceOf = (slug, platform) => verification.components?.[slug]?.[platform];

/** slug → platform → the verification rung this implementation's evidence pays for. */
const verificationLevel = {};
for (const [slug, c] of Object.entries(manifest.components)) {
  const per = {};
  for (const platform of c.platforms) {
    const level = earned(evidenceOf(slug, platform));
    // A `preview` PACKAGE caps the verification of everything inside it: a reader must not be told a
    // component of a knowingly incomplete package is verified beyond preview. Every other package maturity
    // leaves verification alone — a Compose button with interaction and semantics tests reads beta even
    // though most of the Compose catalogue is experimental, because hiding that would make the per-component
    // data useless and the progress invisible.
    per[platform] = defs[platform].maturity === "preview" ? "preview" : level;
    if (!evidenceOf(slug, platform)) {
      errors.push(`${slug}: declared on ${platform} but verification.json has no evidence for it — run \`pnpm gen:verification\``);
    }
  }
  verificationLevel[slug] = per;
  /**
   * The other direction, which nothing checked: evidence recorded for a platform the manifest says the
   * component is NOT on. A platform badge means "this library carries it", so the two files contradicting
   * each other is exactly the over-claim the badges were suspected of (CAT-BUG-016 found 0 of these across
   * 545 cells; this keeps that at 0 instead of re-auditing it by hand).
   */
  for (const platform of Object.keys(verification.components?.[slug] ?? {})) {
    if (!c.platforms.includes(platform)) {
      errors.push(`${slug}: verification.json records ${platform} evidence, but the manifest does not list ${platform} — one of the two is wrong`);
    }
  }
}

/**
 * The catalogue's verification level per platform: the MINIMUM across its declared components, never an
 * average and never a percentage.
 *
 * A well-tested Button cannot compensate for an unverified Dialog, because a reader applies the platform's
 * word to the component they are about to use. The per-component levels stay visible separately, so a
 * platform whose floor is experimental can still show which of its components have climbed.
 */
const catalogueVerification = Object.fromEntries(
  platforms.map((p) => {
    const levels = Object.values(verificationLevel).map((per) => per[p]).filter(Boolean);
    if (!levels.length) return [p, null];
    return [p, levels.reduce((low, l) => (rank(l) < rank(low) ? l : low), "stable")];
  }),
);

/** The ladder must stay self-consistent: a higher rung cannot ask for less than a lower one. */
for (let i = 1; i < ["experimental", "beta", "stable"].length; i++) {
  const [lower, higher] = [["experimental", "beta", "stable"][i - 1], ["experimental", "beta", "stable"][i]];
  const missing = REQUIRES[lower].filter((k) => !REQUIRES[higher].includes(k));
  if (missing.length) errors.push(`maturity ladder: "${higher}" drops ${missing.join(", ")}, which "${lower}" requires`);
}
if (!REQUIRES.stable.includes("published")) {
  errors.push(`maturity ladder: "stable" must require "published" — nobody can depend on what they cannot install`);
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
  verificationLadder: LADDER,
  verificationRequires: REQUIRES,
  /** slug → platform → verification rung. Computed from verification.json; never hand-written. */
  verification: Object.fromEntries(entries.map(([s]) => [s, verificationLevel[s]])),
  /** How many components sit on each rung, per platform — the honest shape of a platform's catalogue. */
  verificationCounts: Object.fromEntries(
    platforms.map((p) => [
      p,
      Object.fromEntries(LADDER.map((l) => [l, entries.filter(([s]) => verificationLevel[s][p] === l).length]).filter(([, n]) => n > 0)),
    ]),
  ),
  /** The floor: the weakest verification level in each platform's declared catalogue. Never an average. */
  catalogueVerification,
  /**
   * slug → platform → the evidence kinds that hold, WITHOUT the source references.
   *
   * verification.json carries the file-and-line proof behind every one of these, and it stays out of the
   * browser: the component page only needs to render six ticks and a dash, not 98 KB of paths. Scripts and
   * server-rendered pages read the full file; this is the client-safe projection of it.
   */
  verificationEvidence: Object.fromEntries(
    entries
      .filter(([s]) => verification.components?.[s])
      .map(([s]) => [
        s,
        Object.fromEntries(
          Object.entries(verification.components[s]).map(([p, kinds]) => [p, Object.keys(kinds).sort()]),
        ),
      ]),
  ),
  /** How many components hold each kind, per platform. Printed as "21 / 98", never as a tick. */
  evidenceCounts: verification.totals,
  /**
   * The kinds a test passage may claim (`// kx-verify: <kind>`), copied from verification.json. The others,
   * `build` and `published`, are facts the manifest declares. The split is what lets a page read a zero
   * truthfully: a claimable kind at 0 means no test records that evidence yet (the generator records only
   * positive evidence and has no N/A), while `published` at 0 means the package is not on a registry.
   */
  claimableEvidence: verification.claimableKinds,
};

/**
 * The functional taxonomy, for the website's category map, filters and counts, and for the Storybook
 * grouping. One file, so there is nothing left to keep in sync by hand.
 */
const taxonomy = {
  $schema: "https://kinetixui.com/schema/component-taxonomy.json",
  $description:
    `slug → functional category, kind and facets, plus the declared category order and the rule behind each ` +
    `category. ${GENERATED} Consumed by apps/web/src/lib/component-taxonomy.ts (the website's category map, ` +
    `filters and counts) and scripts/gen-stories.mjs (the Storybook group titles). There is no default ` +
    `category: a slug missing here is an error in both consumers, not a silent "Data Display".`,
  categoryOrder: CATEGORIES,
  /** previous label → the category it is now, so a shared ?cat= link survives a rename. */
  categoryAliases: Object.fromEntries(
    Object.entries(manifest.categoryDefinitions)
      .flatMap(([label, def]) => (def.formerly ?? []).map((prev) => [prev, label])),
  ),
  /** retired label → why it went and where its components are now, for the categories a rename cannot answer. */
  retiredCategories: manifest.retiredCategories ?? {},
  categories: Object.fromEntries(
    CATEGORIES.map((label) => [
      label,
      {
        rule: manifest.categoryDefinitions[label].rule,
        count: entries.filter(([, c]) => c.category === label).length,
        ...(manifest.categoryDefinitions[label].formerly ? { formerly: manifest.categoryDefinitions[label].formerly } : {}),
      },
    ]),
  ),
  kinds: Object.fromEntries(
    [...KINDS].map((k) => [k, entries.filter(([, c]) => c.kind === k).length]),
  ),
  /** facet → the slugs carrying it. A reader's answer to "which of these are composed field groups?". */
  facets: Object.fromEntries(
    [...FACETS].map((f) => [f, entries.filter(([, c]) => c.facets?.includes(f)).map(([s]) => s)]),
  ),
  components: Object.fromEntries(
    entries.map(([s, c]) => [s, { category: c.category, kind: c.kind, ...(c.facets ? { facets: c.facets } : {}) }]),
  ),
};

let stale = false;
for (const [file, data] of [["component-status.json", status], ["platform-parity.json", parity], ["component-taxonomy.json", taxonomy]]) {
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
    `guidance ${Object.entries(guidanceCounts).map(([t, n]) => `${t} ${n}`).join(", ")}; ` +
    `${CATEGORIES.length} categories (${CATEGORIES.map((c) => `${c} ${taxonomy.categories[c].count}`).join(", ")}); ` +
    `kinds ${Object.entries(taxonomy.kinds).map(([k, n]) => `${k} ${n}`).join(", ")}.`,
);
