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

import { createHash } from "node:crypto";

/** Rows published on or after this date must carry a live URL. Earlier rows may instead explain the gap. */
export const LIVE_URL_REQUIRED_FROM = "2026-10-17";

/**
 * Hosts a live post can be on, per channel. A kinetixui.com URL is a destination, never a post. lnkd.in is
 * deliberately absent: a short link names no post until someone resolves it, and LI-005's short link resolved
 * to a different post (see the header).
 */
export const CHANNEL_HOSTS = {
  linkedin: ["linkedin.com", "www.linkedin.com"],
  x: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"],
  devto: ["dev.to"],
  hashnode: ["hashnode.com", ".hashnode.dev"],
  github: ["github.com"],
};

/**
 * The post a URL names, per channel, as a key that is the same for every spelling of one post (query string,
 * fragment, trailing slash, www, a LinkedIn /feed/update/ vs /posts/ link). null when the URL is on the right
 * host but names no single post: a profile, a feed, a home page, a tag page.
 */
const POST_IDENTITY = {
  linkedin: (url) => {
    const m = url.pathname.match(/urn:li:(?:activity|share|ugcPost):(\d+)/) ?? url.pathname.match(/^\/posts\/[^/]+-activity-(\d+)-/);
    return m ? `linkedin:activity:${m[1]}` : null;
  },
  x: (url) => {
    const m = url.pathname.match(/^\/[A-Za-z0-9_]+\/status\/(\d+)\/?$/);
    return m ? `x:status:${m[1]}` : null;
  },
  devto: (url) => {
    const m = url.pathname.match(/^\/([A-Za-z0-9_-]+)\/([A-Za-z0-9_-]+)\/?$/);
    return m && !["t", "settings", "search", "top", "enter"].includes(m[1]) ? `devto:${m[1].toLowerCase()}/${m[2].toLowerCase()}` : null;
  },
  hashnode: (url) => {
    const m = url.pathname.match(/^\/(?:post\/)?([A-Za-z0-9_-]+)\/?$/);
    return m ? `hashnode:${url.hostname.toLowerCase()}/${m[1].toLowerCase()}` : null;
  },
  github: (url) => {
    const m = url.pathname.match(/^\/([^/]+)\/([^/]+)\/(discussions|issues|pull|releases\/tag)\/([^/]+)\/?$/);
    return m ? `github:${m[1].toLowerCase()}/${m[2].toLowerCase()}/${m[3]}/${m[4]}` : null;
  },
};

/** The canonical post key for a URL on a known channel, or for an off-calendar URL whose channel is given. */
export function postKey(channel, href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const identify = POST_IDENTITY[channel];
  if (identify && hostAllowed(channel, url.hostname.toLowerCase())) return identify(url);
  // Unknown channel: still compare like with like, ignoring query, fragment and trailing slash.
  return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "").toLowerCase()}`;
}

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
  const claim = (key, where) => {
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
    if (!hostAllowed(row.channel, host)) continue;
    const post = postKey(row.channel, row.liveUrl);
    if (!post) {
      fail(where, `liveUrl "${row.liveUrl}" is on ${row.channel} but names no single post — link the post itself, not a profile, feed or home page`);
      continue;
    }
    claim(post, where);
  }

  for (const off of offCalendar) {
    const key = off.url ? postKey(off.channel, off.url) : null;
    if (key) claim(key, `offCalendar ${off.id ?? "<no id>"}`);
  }
  return problems;
}

/** Approvals given on or after this date must pin the exact copy they approve (`approval.copy`). */
export const COPY_PIN_REQUIRED_FROM = "2026-10-18";

/**
 * The words an approval pins, in the two layouts the drafts use:
 *  - a lettered variant (`a01/linkedin.md` § A): under the `## <section> — …` heading, the text between the first
 *    two `---` lines before the next heading (the span above them is an editor's note, not copy);
 *  - a register entry (`content/linkedin.md` § LI-008): a heading with no such pair, where everything from the
 *    heading to the closing `---` (or the next heading) is the entry, its campaign line included.
 * That is exactly what gets pasted, so it is what an approval pins. Returns null when the heading is missing.
 */
export function sectionText(markdown, section) {
  const lines = String(markdown).split("\n");
  const start = lines.findIndex((l) => new RegExp(`^## ${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end < 0) end = lines.length;
  const rules = [];
  for (let i = start + 1; i < end; i++) if (lines[i].trim() === "---") rules.push(i);
  const [from, to] = rules.length >= 2 ? [rules[0] + 1, rules[1]] : [start + 1, rules[0] ?? end];
  const text = lines.slice(from, to).join("\n").trim();
  return text === "" ? null : text;
}

/** A whole draft file without its front matter: what an approval pins when the asset is the file (a thread). */
export function fileCopyText(markdown) {
  const body = String(markdown).replace(/\r\n/g, "\n");
  const m = body.match(/^---\n[\s\S]*?\n---\n/);
  return (m ? body.slice(m[0].length) : body).trim();
}

/** sha256 of a section's text with line endings normalised and trailing whitespace removed from each line. */
export function copyHash(text) {
  const normal = String(text).replace(/\r\n/g, "\n").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();
  return createHash("sha256").update(normal, "utf8").digest("hex");
}

/**
 * Which span of its file an asset's copy is, so a pin cannot point at some other, stable text:
 *  - `variant` on the asset names a lettered section (a01/linkedin.md holds LI-001 as A and LI-002 as B);
 *  - otherwise a `## <asset id>` heading in the file is the asset's entry (content/linkedin.md, content/x.md);
 *  - otherwise a file that is this asset's alone is pinned whole; a shared one needs a `variant`.
 */
export function expectedPin(asset, assets, body) {
  if (asset.variant !== undefined) {
    if (typeof asset.variant !== "string" || !asset.variant.trim()) return { problem: "variant must be a non-empty section name" };
    return { section: asset.variant };
  }
  if (sectionText(body, asset.id) !== null) return { section: asset.id };
  const shared = assets.some((o) => o !== asset && o.file === asset.file);
  if (shared) return { problem: `${asset.file} holds other assets too — set "variant" to the section that is this asset's copy` };
  return { section: undefined };
}

/**
 * brief -> drafted -> ready -> published, plus an optional, explicit owner approval on ready/published.
 *
 * `readFile` is injected so the rule stays pure for its tests. An approval given from COPY_PIN_REQUIRED_FROM must
 * carry `copy: { file, section?, sha256 }` (no section: the whole file after its front matter), and the hash must
 * match that text as it is now: an approval is for
 * exact words, so copy edited after approval fails until the owner approves again. An asset flagged `stale`
 * (current-state claims that no longer hold) cannot carry an approval at all.
 */
export function approvalProblems(assets = [], readFile = null) {
  const problems = [];
  for (const asset of assets) {
    const where = asset.id ?? "<no id>";
    if ("stale" in asset && asset.stale !== null) {
      const st = asset.stale;
      if (typeof st !== "object" || Array.isArray(st) || !st.reason || !String(st.reason).trim() || !DATE.test(st.since ?? "")) {
        problems.push(`${where}: stale must be { reason, since: YYYY-MM-DD } — say what no longer holds and since when`);
      }
    }
    if (!("approval" in asset)) continue;
    const a = asset.approval;
    if (a === null) continue;
    if (typeof a !== "object" || Array.isArray(a)) {
      problems.push(`${where}: approval is neither null nor an object`);
      continue;
    }
    if (!["ready", "published"].includes(asset.status)) {
      problems.push(`${where}: approval on a "${asset.status}" asset — only ready copy can be approved`);
    }
    if (asset.stale && asset.status !== "published") {
      problems.push(`${where}: approval on copy flagged stale (${asset.stale.reason ?? "no reason"}) — refresh the claims, then ask again`);
    }
    if (!a.by || !String(a.by).trim()) problems.push(`${where}: approval has no "by" — approval is a named person's decision`);
    if (!DATE.test(a.on ?? "")) problems.push(`${where}: approval "on" is not YYYY-MM-DD`);
    if (!a.evidence || !String(a.evidence).trim()) {
      problems.push(`${where}: approval has no "evidence" — link the message or PR where it was given`);
    }
    if (!a.copy) {
      if (DATE.test(a.on ?? "") && a.on >= COPY_PIN_REQUIRED_FROM && asset.status !== "published") {
        problems.push(`${where}: approval from ${COPY_PIN_REQUIRED_FROM} must pin the approved words — add copy: { file, section?, sha256 }`);
      }
      continue;
    }
    const { file, section, sha256 } = a.copy;
    if (!file || (section !== undefined && (typeof section !== "string" || !section.trim())) || !/^[0-9a-f]{64}$/.test(sha256 ?? "")) {
      problems.push(`${where}: approval.copy needs a file, an optional non-empty section and a sha256 hex digest`);
      continue;
    }
    if (file !== asset.file) {
      problems.push(`${where}: approval.copy pins ${file}, but this asset's copy is ${asset.file ?? "(no file)"} — a pin must cover the words being approved`);
      continue;
    }
    if (!readFile) continue;
    let body;
    try {
      body = readFile(file);
    } catch {
      problems.push(`${where}: approval.copy file ${file} cannot be read`);
      continue;
    }
    const expected = expectedPin(asset, assets, body);
    if (expected.problem) {
      problems.push(`${where}: ${expected.problem}`);
      continue;
    }
    if (section !== expected.section) {
      problems.push(`${where}: approval.copy pins ${section === undefined ? "the whole file" : `section "${section}"`}, but this asset's copy is ${expected.section === undefined ? "the whole file" : `section "${expected.section}"`} — a pin must cover the words being approved`);
      continue;
    }
    const text = section === undefined ? fileCopyText(body) : sectionText(body, section);
    const label = section === undefined ? file : `${file} § ${section}`;
    if (text === null) problems.push(`${where}: approval.copy section "${section}" is not in ${file} (no "## ${section}" heading with copy under it)`);
    else if (copyHash(text) !== sha256) {
      problems.push(`${where}: the approved copy (${label}) changed after approval on ${a.on} — the owner approved different words; ask again`);
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
  if (asset.status === "ready") return asset.approval && !asset.stale ? "APPROVED" : "READY FOR REVIEW";
  if (asset.status === "drafted") return "DRAFTED";
  return "PLANNED";
}
