/**
 * The 30-day content register is internally consistent, and every campaign link is one the analytics
 * pipeline will actually keep.
 *
 * The failure this exists to prevent is specific and quiet: `analytics-attribution.ts` DROPS a campaign it
 * does not recognise rather than guessing, so a malformed `utm_campaign` produces no attribution at all. A
 * month of posts can go out, work, and be unattributable — and nothing anywhere would have complained. The
 * regex below is therefore not a style rule; it is the same rule the runtime enforces, applied before
 * publication instead of after.
 *
 *   node scripts/check-content-register.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";

const register = JSON.parse(readFileSync("marketing/content/register.json", "utf8"));
const problems = [];
const fail = (id, msg) => problems.push(`${id}: ${msg}`);

/** The runtime's rule, from apps/web/src/lib/analytics-attribution.ts. Kept identical on purpose. */
const CAMPAIGN = /^kx_[a-z0-9][a-z0-9_-]{0,62}$/;
/** marketing/analytics.md §8: kx_<icp>_<pillar>_<asset>. */
const CANONICAL = /^kx_(p1|p2|neutral)_[a-g]_[a-z0-9][a-z0-9_]*$/;

const ICPS = new Set(["p1", "p2", "neutral"]);
const PILLARS = new Set(["a", "b", "c", "d", "e", "f", "g"]);
const STAGES = new Set(["awareness", "discovery", "evaluation", "adoption_intent"]);
const seen = new Set();

for (const asset of register.assets) {
  const { id } = asset;
  if (!id) { problems.push("an asset has no id"); continue; }
  if (seen.has(id)) fail(id, "duplicate id");
  seen.add(id);

  if (!ICPS.has(asset.icp)) fail(id, `icp "${asset.icp}" is not p1/p2/neutral`);
  if (!PILLARS.has(asset.pillar)) fail(id, `pillar "${asset.pillar}" is not one of CONTENT-PILLARS.md a–g`);
  if (!STAGES.has(asset.stage)) fail(id, `stage "${asset.stage}" is not a funnel stage from analytics.md §1`);
  if (!asset.file) fail(id, "no file — an asset nobody can find is not an asset");
  else if (!existsSync(asset.file)) fail(id, `file does not exist: ${asset.file}`);

  // A linkable asset needs a destination AND attribution. Community briefs deliberately have neither:
  // a tracked link dropped into someone else's thread is the instinct this project should not have.
  const linkable = asset.kind !== "brief";
  if (linkable) {
    if (!asset.destination) fail(id, "no destination — every CTA has to land somewhere specific");
    if (!asset.campaign) fail(id, "no campaign — an unattributed asset teaches us nothing");
    if (!asset.url) fail(id, "no url built from the campaign");
  }

  if (asset.campaign) {
    if (!CAMPAIGN.test(asset.campaign)) {
      fail(id, `campaign "${asset.campaign}" would be DROPPED by analytics-attribution.ts`);
    } else if (!CANONICAL.test(asset.campaign)) {
      fail(id, `campaign "${asset.campaign}" is not kx_<icp>_<pillar>_<asset> (analytics.md §8)`);
    } else {
      const [, icp, pillar] = /^kx_(p1|p2|neutral)_([a-g])_/.exec(asset.campaign);
      if (icp !== asset.icp) fail(id, `campaign says icp "${icp}", asset says "${asset.icp}"`);
      if (pillar !== asset.pillar) fail(id, `campaign says pillar "${pillar}", asset says "${asset.pillar}"`);
    }
    if (asset.url && !asset.url.includes(`utm_campaign=${asset.campaign}`)) {
      fail(id, "url does not carry its own campaign");
    }
    /*
     * The campaign must actually appear in the asset's own file.
     *
     * Without this the register can name a campaign nothing else knows about — which is exactly what
     * happened while this phase was being written: the register invented per-asset campaign names while the
     * draft files carried a different, single-campaign scheme, and every other check passed. A register that
     * agrees only with itself is a second source of truth wearing a validator.
     */
    if (asset.file && existsSync(asset.file)) {
      /*
       * For a multi-file campaign package (`drafts/<id>/`) the campaign is carried across the package: a01's
       * LinkedIn post links to the article, not to kinetixui.com, so the tagged URL lives in `measurement.md`
       * and `publish-checklist.md` rather than in the post itself. Searching the package is what "the campaign
       * is declared somewhere the operator will see it" actually means. A single-file asset is checked alone.
       */
      const dir = /^(marketing\/content\/drafts\/[^/]+)\//.exec(asset.file)?.[1];
      const scope = dir
        ? readdirSync(dir).map((f) => readFileSync(`${dir}/${f}`, "utf8")).join("\n")
        : readFileSync(asset.file, "utf8");
      if (!scope.includes(asset.campaign)) {
        fail(id, `campaign "${asset.campaign}" appears nowhere in ${dir ?? asset.file}`);
      }
    }
  }

  if (asset.derived_from && !register.assets.some((x) => x.id === asset.derived_from)) {
    fail(id, `derived_from "${asset.derived_from}" is not an asset in this register`);
  }
  if (asset.visual && !register.visuals.includes(asset.visual)) {
    fail(id, `visual "${asset.visual}" is not in the visuals list`);
  }
}

/* Families must reference real assets, or the repurposing map is decoration. */
for (const [family, def] of Object.entries(register.families)) {
  if (!seen.has(def.spine)) fail(family, `spine "${def.spine}" is not an asset`);
  for (const member of def.assets) {
    if (!seen.has(member) && !register.visuals.includes(member)) {
      fail(family, `member "${member}" is neither an asset nor a visual`);
    }
  }
}

/* No stale version string in any asset copy. Evergreen content must not name a version. */
const VERSION = /\b0\.\d+\.\d+\b/;
for (const file of [...new Set(register.assets.map((a) => a.file))].filter(Boolean)) {
  if (!existsSync(file)) continue;
  const body = readFileSync(file, "utf8");
  // Provenance lines are a record of when something was checked, not a claim about now.
  const current = body.replace(/^.*(verified|re-derived|freeze|Numbers).*$/gim, "");
  const hit = VERSION.exec(current);
  if (hit) problems.push(`${file}: names version ${hit[0]} outside a provenance line — evergreen copy should not`);
}

const linkable = register.assets.filter((a) => a.kind !== "brief");
if (problems.length > 0) {
  console.error(`check:content — ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  ✖ ${p}`);
  process.exit(1);
}
console.log(
  `check:content ok — ${register.assets.length} assets (${linkable.length} linkable, all attributed), ` +
    `${Object.keys(register.families).length} families, ${register.visuals.length} visual briefs.`,
);
