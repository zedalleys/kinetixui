/**
 * Publication evidence and approval rules for the marketing registers (M1, 2026-10-17).
 *
 * Pure functions, so `marketing-publication-rules.test.mjs` can prove each rule FAILS on the input it exists
 * to stop. `check-distribution.mjs` and `check-content-register.mjs` call them on the real registers.
 *
 * The failure these exist to prevent: an asset recorded as published on the strength of a planned date, a
 * draft, or a merged close-out PR. That happened once (LI-005, reverted 2026-10-09 after the short link it was
 * closed out with turned out to be an IoT post). A live URL on the post's own channel is the evidence; a row
 * without one either predates this rule and says why, or is not published.
 */

/** Rows published on or after this date must carry a live URL. Earlier rows may instead explain the gap. */
export const LIVE_URL_REQUIRED_FROM = "2026-10-17";

/** Hosts a live post can be on, per channel. A kinetixui.com URL is a destination, never a post. */
export const CHANNEL_HOSTS = {
  linkedin: ["linkedin.com", "www.linkedin.com", "lnkd.in"],
  x: ["x.com", "twitter.com"],
  devto: ["dev.to"],
  hashnode: ["hashnode.com", ".hashnode.dev"],
  github: ["github.com"],
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function hostAllowed(channel, host) {
  const allowed = CHANNEL_HOSTS[channel];
  if (!allowed) return false;
  return allowed.some((h) => (h.startsWith(".") ? host.endsWith(h) : host === h));
}

/** Problems with the publication evidence of distribution rows and off-calendar entries. */
export function publicationEvidenceProblems(rows = [], offCalendar = []) {
  const problems = [];
  const fail = (where, msg) => problems.push(`${where}: ${msg}`);
  const urlOwners = new Map();
  const claim = (url, where) => {
    const key = url.replace(/\/+$/, "").toLowerCase();
    if (urlOwners.has(key)) fail(where, `liveUrl is already the evidence for ${urlOwners.get(key)} — one post cannot publish two records`);
    else urlOwners.set(key, where);
  };
  const publishedPerChannel = new Map();

  for (const row of rows) {
    const where = `${row.asset ?? "<no asset>"}${row.day ? ` (day ${row.day})` : ""}`;

    if (row.status !== "published") {
      if (row.liveUrl) fail(where, `status is "${row.status}" but a liveUrl is set — a live post means the row is published`);
      continue;
    }

    // Duplicate publication: the same asset published twice on one channel is a repost, not a record.
    const key = `${row.asset}/${row.channel}`;
    if (publishedPerChannel.has(key)) {
      fail(where, `${row.asset} is already logged as published on ${row.channel} (${publishedPerChannel.get(key)}) — a second publication of one asset needs a new asset id`);
    } else publishedPerChannel.set(key, row.date ?? "no date");

    if (!("liveUrl" in row)) {
      fail(where, "published with no liveUrl field — name the live post, or set liveUrl null with a liveUrlGap");
      continue;
    }
    if (row.liveUrl === null) {
      if (!row.liveUrlGap || !String(row.liveUrlGap).trim()) {
        fail(where, "liveUrl is null with no liveUrlGap — say why the repository holds no live URL");
      }
      if (DATE.test(row.date ?? "") && row.date >= LIVE_URL_REQUIRED_FROM) {
        fail(where, `published ${row.date} with no liveUrl — from ${LIVE_URL_REQUIRED_FROM} the live post URL is required before a row is published`);
      }
      continue;
    }
    let url;
    try {
      url = new URL(row.liveUrl);
    } catch {
      fail(where, `liveUrl "${row.liveUrl}" is not a URL`);
      continue;
    }
    if (url.protocol !== "https:") fail(where, `liveUrl "${row.liveUrl}" is not https`);
    const host = url.hostname.toLowerCase();
    if (!hostAllowed(row.channel, host)) {
      fail(where, `liveUrl host "${host}" is not a ${row.channel} host — the evidence must be the post itself, on its own channel`);
    }
    if (row.liveUrlGap) fail(where, "liveUrl is set but so is liveUrlGap — remove the gap once the URL is known");
    claim(row.liveUrl, where);
  }

  for (const off of offCalendar) {
    if (off.url) claim(off.url, `offCalendar ${off.id ?? "<no id>"}`);
  }
  return problems;
}

/** brief -> drafted -> ready -> published, plus an optional, explicit owner approval on ready/published. */
export function approvalProblems(assets = []) {
  const problems = [];
  for (const asset of assets) {
    if (!("approval" in asset)) continue;
    const where = asset.id ?? "<no id>";
    const a = asset.approval;
    if (a === null) continue;
    if (typeof a !== "object" || Array.isArray(a)) {
      problems.push(`${where}: approval is neither null nor an object`);
      continue;
    }
    if (!["ready", "published"].includes(asset.status)) {
      problems.push(`${where}: approval on a "${asset.status}" asset — only ready copy can be approved`);
    }
    if (!a.by || !String(a.by).trim()) problems.push(`${where}: approval has no "by" — approval is a named person's decision`);
    if (!DATE.test(a.on ?? "")) problems.push(`${where}: approval "on" is not YYYY-MM-DD`);
    if (!a.evidence || !String(a.evidence).trim()) {
      problems.push(`${where}: approval has no "evidence" — link the message or PR where it was given`);
    }
  }
  return problems;
}

/**
 * The M1 operating status of an asset, derived and never stored, so it cannot drift from the two registers.
 * The registers keep their own vocabularies (brief/drafted/ready/published and planned/published/skipped/
 * blocked); this maps them onto PLANNED … CANCELLED. SCHEDULED is never derived: nothing in this repository
 * schedules a post, and a state nobody chose is worse than none.
 */
export function m1Status(asset, rows = []) {
  const own = rows.filter((r) => r.asset === asset.id);
  if (asset.status === "published" || own.some((r) => r.status === "published")) return "PUBLISHED";
  if (own.some((r) => r.status === "blocked")) return "BLOCKED";
  if (own.length > 0 && own.every((r) => r.status === "skipped")) return "CANCELLED";
  if (asset.status === "ready") return asset.approval ? "APPROVED" : "READY FOR REVIEW";
  if (asset.status === "drafted") return "DRAFTED";
  return "PLANNED";
}
