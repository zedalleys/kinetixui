/**
 * The distribution register and the distribution documents agree with the rest of the repository.
 *
 * Three failures this exists to prevent, all of them quiet:
 *
 *  1. A DISTRIBUTION ROW THAT DISAGREES WITH THE CONTENT REGISTER. `marketing/content/register.json` is the
 *     canonical index of every asset. If a distribution row names a different destination, campaign or ICP
 *     for the same asset, one of them is wrong and the log would record a post as something it was not.
 *     Every derivable field is therefore re-derived here rather than trusted.
 *
 *  2. A CTA POINTING AT A ROUTE THAT DOES NOT EXIST. A published post cannot be edited. A 404 behind a link
 *     in someone's feed is permanent, and the route list is enumerated from `apps/web/src/app` rather than
 *     written down — the derive-don't-enumerate rule this repository has learned twice.
 *
 *  3. A COMMUNITY ROW THAT ACQUIRED A TRACKED LINK. Community contributions carry no attribution on purpose.
 *     A `utm_campaign` appearing on one is a policy breach that no other check would notice.
 *
 * The campaign rule and the attribution vocabulary are both READ OUT OF THE RUNTIME rather than restated, so
 * this check cannot drift from what `analytics-attribution.ts` will actually keep.
 *
 *   node scripts/check-distribution.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

const content = JSON.parse(readFileSync("marketing/content/register.json", "utf8"));
const register = JSON.parse(readFileSync("marketing/distribution/register.json", "utf8"));
const byId = new Map(content.assets.map((a) => [a.id, a]));

/* ---------------------------------------------- derived, never typed */

/** Routes that exist, enumerated from the app directory. A route is a directory holding a page file. */
function routes(dir = "apps/web/src/app", prefix = "") {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (entry.startsWith("[") || entry.startsWith("_") || entry.startsWith(".")) continue;
    if (statSync(path).isDirectory()) found.push(...routes(path, `${prefix}/${entry}`));
    else if (/^page\.(tsx|mdx)$/.test(entry)) found.push(prefix || "/");
  }
  return found;
}
const ROUTES = new Set(routes());

/** The runtime's own campaign rule and source vocabulary, parsed out of the module that enforces them. */
const attribution = readFileSync("apps/web/src/lib/analytics-attribution.ts", "utf8");

const campaignSource = /^const CAMPAIGN = \/(.+)\/;$/m.exec(attribution);
if (!campaignSource) {
  fail("analytics-attribution.ts", "could not find the CAMPAIGN regex — this check cannot verify campaigns and is failing rather than passing blindly");
}
const CAMPAIGN = campaignSource ? new RegExp(campaignSource[1]) : null;

const sourceBlock = /export const ATTRIBUTION_SOURCES = \[([^\]]+)\]/.exec(attribution);
if (!sourceBlock) {
  fail("analytics-attribution.ts", "could not find ATTRIBUTION_SOURCES — refusing to validate utm_source against a guess");
}
const SOURCES = new Set(sourceBlock ? [...sourceBlock[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : []);

const mediumBlock = /export const ATTRIBUTION_MEDIUMS = \[([^\]]+)\]/.exec(attribution);
const MEDIUMS = new Set(mediumBlock ? [...mediumBlock[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]) : []);

/* ---------------------------------------------- the register */

const CHANNELS = new Set(register.channels);
const STATUSES = new Set(["planned", "published", "skipped", "blocked"]);
/** Channels that deliberately carry no tracked link. README.md §5. */
const UNTRACKED = new Set(["community", "outreach"]);

if (!Array.isArray(register.rows) || register.rows.length === 0) fail("register", "no rows");

const seen = new Set();
for (const row of register.rows ?? []) {
  const where = `${row.asset ?? "<no asset>"}${row.day ? ` (day ${row.day})` : ""}`;
  const key = `${row.asset}/${row.channel}/${row.date ?? "planned"}`;
  if (seen.has(key)) fail(where, "duplicate row — the same asset logged twice on the same channel and date");
  seen.add(key);

  if (!STATUSES.has(row.status)) fail(where, `status "${row.status}" is not planned/published/skipped/blocked`);
  if (!CHANNELS.has(row.channel)) fail(where, `channel "${row.channel}" is not in the register's own channel list`);

  // A published row without a date or a result is a row nobody can learn from.
  if (row.status === "published") {
    if (!row.date) fail(where, "published with no date");
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) fail(where, `date "${row.date}" is not YYYY-MM-DD`);
    if (!row.result) fail(where, "published with no result — an unrecorded outcome is why the log exists");
  } else if (row.date) {
    fail(where, `status is "${row.status}" but a date is set — fill the date after publishing, not before`);
  }
  if (row.status === "blocked" && !row.blockedBy) fail(where, "blocked with no blockedBy");

  const asset = byId.get(row.asset);
  if (!asset) {
    fail(where, "no such asset in marketing/content/register.json");
    continue;
  }

  // Every derivable field is re-derived. A register that agrees only with itself is a second source of truth.
  if (row.icpHypothesis !== asset.icp) fail(where, `icpHypothesis "${row.icpHypothesis}" but the content register says "${asset.icp}"`);
  if (row.pillar !== asset.pillar) fail(where, `pillar "${row.pillar}" but the content register says "${asset.pillar}"`);
  if (row.channel !== asset.channel && !(row.channel === "hashnode" && asset.channel === "devto")) {
    fail(where, `channel "${row.channel}" but the content register says "${asset.channel}"`);
  }
  if ((row.day ?? null) !== (asset.day ?? null)) fail(where, `day ${row.day} but the calendar says ${asset.day}`);

  // The two registers mean the same thing by "published" or they mean nothing. A row saying an asset went
  // out while the content register still calls it `ready` is the drift that makes a second source of truth.
  if (row.status === "published" && asset.status !== "published") {
    fail(where, `logged as published but the content register still says "${asset.status}" — close the asset out too`);
  }
  if ((row.visual ?? null) !== (asset.visual ?? null)) fail(where, `visual "${row.visual}" but the content register says "${asset.visual}"`);

  if ((row.destination ?? null) !== (asset.destination ?? null)) {
    fail(where, `destination "${row.destination}" but the content register says "${asset.destination}"`);
  }
  if (row.destination && !ROUTES.has(row.destination)) {
    fail(where, `destination "${row.destination}" is not a route in apps/web/src/app — a published link cannot be edited`);
  }

  if (UNTRACKED.has(row.channel)) {
    if (row.attribution) fail(where, `a ${row.channel} row carries attribution — these channels are untracked on purpose (distribution/README.md §5)`);
    if (row.destination) fail(where, `a ${row.channel} row carries a destination — a link is not the contribution`);
  } else {
    const a = row.attribution;
    if (!a) {
      fail(where, "no attribution — an unattributed post on a tracked channel teaches us nothing");
    } else {
      if (!SOURCES.has(a.utm_source)) fail(where, `utm_source "${a.utm_source}" is not in ATTRIBUTION_SOURCES — it would normalise to "other"`);
      if (!MEDIUMS.has(a.utm_medium)) fail(where, `utm_medium "${a.utm_medium}" is not in ATTRIBUTION_MEDIUMS`);
      if (CAMPAIGN && !CAMPAIGN.test(a.utm_campaign)) fail(where, `campaign "${a.utm_campaign}" would be DROPPED by analytics-attribution.ts`);
      if (a.utm_campaign !== asset.campaign) fail(where, `campaign "${a.utm_campaign}" but the content register says "${asset.campaign}"`);
      if (a.utm_content !== asset.utm_content) fail(where, `utm_content "${a.utm_content}" but the content register says "${asset.utm_content}"`);
      // The asset's built URL is canonical. If the row disagrees with it, the row is what gets pasted.
      for (const [k, v] of Object.entries(a)) {
        if (!asset.url.includes(`${k}=${v}`)) fail(where, `${k}=${v} is not in the asset's built url`);
      }
    }
  }

  if (!row.metricToWatch) fail(where, "no metricToWatch — a post nobody will look at afterwards is a post that cannot inform anything");
}

/* ---------------------------------------------- the registers agree about "published" */

/**
 * The other direction. `published` in the content register asserts that an act of publishing happened, and
 * the act is what this log records — so an asset can only claim it once a row here carries the date and the
 * result. Without this, both checks pass on an asset marked published that nothing ever went out for.
 */
const publishedRows = new Set(register.rows.filter((r) => r.status === "published").map((r) => r.asset));
for (const asset of content.assets) {
  if (asset.status === "published" && !publishedRows.has(asset.id)) {
    fail(asset.id, "the content register says published, but no row here logs the act — add the row with its date and result");
  }
}

/* ---------------------------------------------- the documents */

/**
 * Asset ids and routes named in prose are checked too. A plan naming an asset that does not exist is the
 * most likely way this set of documents goes wrong, because prose has no schema.
 */
const DOCS = ["marketing/distribution/README.md", "marketing/distribution/first-14-days.md", "marketing/distribution/github.md", "marketing/distribution/outreach.md"];
const ID_SHAPE = /\b(?:LI|X|ART|COM|VIS|MOT)-\d{3}\b/g;
const visuals = new Set(JSON.parse(readFileSync("marketing/content/visuals/manifest.json", "utf8")).assets.map((v) => v.id));
const motion = new Set([...readFileSync("marketing/content/motion-briefs.md", "utf8").matchAll(/\bMOT-\d{3}\b/g)].map((m) => m[0]));
const briefs = new Set([...readFileSync("marketing/content/visual-briefs.md", "utf8").matchAll(/\bVIS-\d{3}\b/g)].map((m) => m[0]));

for (const doc of DOCS) {
  if (!existsSync(doc)) { fail(doc, "referenced document does not exist"); continue; }
  const text = readFileSync(doc, "utf8");

  for (const id of new Set(text.match(ID_SHAPE) ?? [])) {
    const known = byId.has(id) || visuals.has(id) || motion.has(id) || briefs.has(id);
    if (!known) fail(doc, `names "${id}", which is not in the content register, the visual manifest, the visual briefs or the motion briefs`);
  }

  /*
   * Routes in backticks, e.g. `/docs/tokens`. A route named in prose is usually a CTA destination, and a CTA
   * pointing at a 404 is unfixable once posted.
   *
   * `notYetRoutes` is the deliberate exception: a route discussed precisely BECAUSE it does not exist yet.
   * The first run of this check flagged `/blog` three times, which is the seo.md decision not to build one
   * until three articles have run off-site. Keeping the exception explicit means a genuinely wrong route
   * still fails, and adding one is a visible edit rather than a silently weaker rule.
   */
  const notYetRoutes = new Set(register.notYetRoutes ?? []);
  for (const route of new Set([...text.matchAll(/`(\/[a-z0-9/-]*)`/g)].map((m) => m[1]))) {
    if (ROUTES.has(route) || notYetRoutes.has(route)) continue;
    fail(doc, `names route "${route}", which does not exist in apps/web/src/app. If that is the point, add it to notYetRoutes in the register`);
  }
}

/** Every community asset must be represented, and must still be rules-gated. */
for (const asset of content.assets.filter((a) => a.channel === "community")) {
  const row = register.rows.find((r) => r.asset === asset.id);
  if (!row) fail(asset.id, "a community brief with no row in the distribution register");
  else if (row.blockedBy !== "LIVE RULE CHECK REQUIRED") {
    fail(asset.id, `blockedBy is "${row.blockedBy}" — community rules were not readable from this environment and no rule may be assumed`);
  }
}

/* ---------------------------------------------- report */

if (problems.length) {
  console.error(`check:distribution FAILED — ${problems.length} problem${problems.length === 1 ? "" : "s"}\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

const counts = register.rows.reduce((acc, r) => ((acc[r.channel] = (acc[r.channel] ?? 0) + 1), acc), {});
const published = register.rows.filter((r) => r.status === "published").length;
console.log(
  `check:distribution ok — ${register.rows.length} rows (${published} published), ` +
    `${Object.entries(counts).map(([c, n]) => `${c} ${n}`).join(", ")}; ` +
    `${ROUTES.size} routes verified, ${SOURCES.size} attribution sources read from the runtime.`,
);
