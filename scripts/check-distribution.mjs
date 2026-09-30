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

/* ---------------------------------------------- paid amplification */

/**
 * Amplification is NOT an act of publishing, so it is not a row: this file's first line says one row per act
 * of publishing, and a boost of an already-published post is a different fact about the same act. It gets its
 * own log, and the row it amplifies points at it so nobody can read the row's counts without seeing that paid
 * distribution overlapped them.
 *
 * The rule these checks exist to protect is the measurement one. A LinkedIn boost normally promotes the
 * original post carrying the original tagged URL, so paid and organic arrivals are indistinguishable in
 * first-party data. An entry without its caveat would let a later reader quote a boosted asset's sessions as
 * organic performance, which is the specific mistake this log is here to prevent.
 */
const AMPLIFICATION_TYPES = new Set(["boosted-post", "ad-campaign"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const amplification = register.amplification ?? [];
const ampIds = new Set();

for (const amp of amplification) {
  const where = `amplification ${amp.id ?? "<no id>"}`;
  if (!amp.id || !/^amp-\d{3}$/.test(amp.id)) fail(where, "id is not amp-NNN");
  if (ampIds.has(amp.id)) fail(where, "duplicate amplification id");
  ampIds.add(amp.id);

  if (!AMPLIFICATION_TYPES.has(amp.type)) fail(where, `type "${amp.type}" is not boosted-post/ad-campaign`);
  if (!CHANNELS.has(amp.channel)) fail(where, `channel "${amp.channel}" is not in the register's own channel list`);

  // Amplifying something that never went out is a category error, not a typo.
  const asset = byId.get(amp.asset);
  if (!asset) { fail(where, `no such asset in marketing/content/register.json: ${amp.asset}`); continue; }
  if (asset.status !== "published") fail(where, `amplifies "${amp.asset}", which the content register says is "${asset.status}" — you cannot boost what has not published`);
  if (amp.channel !== asset.channel) fail(where, `channel "${amp.channel}" but the content register says "${asset.channel}"`);

  // Unknowns stay null. A guessed number is worse than an absent one, so the shape allows only null or a value.
  if (amp.durationDays !== null && !(Number.isInteger(amp.durationDays) && amp.durationDays > 0)) {
    fail(where, "durationDays is neither null nor a positive whole number of days");
  }
  for (const k of ["startedOn", "endedOn"]) {
    if (amp[k] !== null && !DATE.test(amp[k] ?? "")) fail(where, `${k} is neither null nor YYYY-MM-DD — never guess a boost window`);
  }

  // The shape declares these as an object once the platform reports them, else null. A string like
  // "unknown" or an empty array would sail through a null-check and put a placeholder measurement into
  // the authoritative log, which is the one thing this file must not contain.
  for (const k of ["spend", "platformMetrics"]) {
    if (amp[k] === null) continue;
    if (typeof amp[k] !== "object" || Array.isArray(amp[k])) {
      fail(where, `${k} is neither null nor an object — a placeholder is not a measurement`);
    } else if (Object.keys(amp[k]).length === 0) {
      fail(where, `${k} is an empty object — leave it null until the platform reports something`);
    }
  }

  // The caveat is the point of the record. Without it the log is decoration.
  if (!amp.note) fail(where, "no note — an amplification nobody can interpret later is not a record");
  else if (!/not purely organic/i.test(amp.note)) {
    fail(where, "the note does not carry the measurement rule — it must say in so many words that traffic in this window is not purely organic");
  }

  // Both directions, so the pointer and the log cannot drift apart.
  const rows = register.rows.filter((r) => r.asset === amp.asset && r.channel === amp.channel && r.status === "published");
  if (rows.length === 0) fail(where, `no published ${amp.channel} row for ${amp.asset} to amplify`);
  else if (!rows.some((r) => r.amplification === amp.id)) {
    fail(where, `no published ${amp.channel} row for ${amp.asset} points back at ${amp.id} — add "amplification": "${amp.id}" to it`);
  }
}

const ampById = new Map(amplification.map((a) => [a.id, a]));
for (const row of register.rows) {
  if (!row.amplification) continue;
  const where = `${row.asset}${row.day ? ` (day ${row.day})` : ""}`;
  const amp = ampById.get(row.amplification);

  // Existence is not enough. A row that merely names a real id would show as paid-amplified while the
  // entry describes a different asset entirely, and the forward check above would still pass as long as
  // the correct row also points at it — so the pointer has to resolve to an entry about THIS row.
  if (!amp) {
    fail(where, `points at amplification "${row.amplification}", which is not in the amplification log`);
    continue;
  }
  if (amp.asset !== row.asset) fail(where, `points at ${amp.id}, which amplifies "${amp.asset}", not this row`);
  if (amp.channel !== row.channel) fail(where, `points at ${amp.id}, which is a ${amp.channel} amplification on a ${row.channel} row`);
  if (row.status !== "published") fail(where, `is "${row.status}" but points at ${amp.id} — you cannot amplify a post that has not gone out`);
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
    `${ROUTES.size} routes verified, ${SOURCES.size} attribution sources read from the runtime, ` +
    `${amplification.length} paid amplification${amplification.length === 1 ? "" : "s"}.`,
);
