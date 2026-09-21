/**
 * Privacy-safe acquisition attribution: WHERE a visit came from, in a small closed vocabulary.
 *
 * It is directional evidence, not causal truth: a simple, inspectable model with no multi-touch and no
 * probabilistic logic. Two views of the same normalised record:
 *  - SESSION ENTRY — how this browsing session (a tab's sessionStorage) began. Derived once, on the first page
 *    of the session, and never overwritten by later navigation or a later UTM in the same session.
 *  - FIRST TOUCH — how this anonymous browser was first acquired. localStorage, write-once.
 *
 * NOTHING RAW EVER LEAVES THIS MODULE. The query string is read here and nowhere else in analytics; each value
 * is normalised the moment it is read (closed taxonomy, strict patterns) and the raw text is discarded. The
 * referrer is classified to a category, never kept. Click ids (gclid, fbclid, …) are never read at all. What is
 * exposed is a flat object of `kx_*` properties, and `sanitizeAttributionProps` re-validates every one on its way
 * out (defence in depth: storage is user-editable and so untrusted).
 *
 * PRECEDENCE (documented in ANALYTICS.md):
 *  source   1. a utm_source that maps to a known source
 *           2. a recognised external referrer
 *           3. "other" if something was tagged or referred but is unrecognised (never the raw value)
 *           4. "direct"
 *  medium   1. a utm_medium that maps to a known medium
 *           2. inferred from the source (google → organic, linkedin → social, …)
 *  campaign only a utm_campaign matching `kx_[a-z0-9][a-z0-9_-]{0,62}`; otherwise omitted, never inferred
 *  content  only a strict slug, and only alongside a valid campaign
 *
 * No cookies, no server, no dependency: only URLSearchParams and Web Storage. Storage that is blocked or full
 * degrades to "attribution missing" and never throws.
 */
import { SAFE_VALUE, cleanPath } from "./analytics-safe";
import { siteConfig } from "./site";

/* ------------------------------------------------------------------ taxonomy */

export const ATTRIBUTION_SOURCES = [
  "direct",
  "google",
  "bing",
  "duckduckgo",
  "github",
  "linkedin",
  "x",
  "reddit",
  "devto",
  "hashnode",
  "producthunt",
  "youtube",
  "newsletter",
  "other",
] as const;
export type AttributionSource = (typeof ATTRIBUTION_SOURCES)[number];

export const ATTRIBUTION_MEDIUMS = ["organic", "social", "community", "referral", "email", "launch", "video", "direct", "other"] as const;
export type AttributionMedium = (typeof ATTRIBUTION_MEDIUMS)[number];

/** A referrer is a website, so a newsletter is not one. */
export const ATTRIBUTION_REFERRERS = ATTRIBUTION_SOURCES.filter((s) => s !== "newsletter");
export type AttributionReferrer = Exclude<AttributionSource, "newsletter">;

/** Campaigns are ours: `kx_` + a slug. Anything else is omitted rather than "cleaned" into something misleading. */
const CAMPAIGN = /^kx_[a-z0-9][a-z0-9_-]{0,62}$/;
const CONTENT = /^[a-z0-9][a-z0-9_-]{0,63}$/;

// Maps, not objects: `utm_source=constructor` must not find Object.prototype members.
const SOURCE_ALIASES = new Map<string, AttributionSource>([
  ["google", "google"],
  ["google.com", "google"],
  ["google_search", "google"],
  ["google-search", "google"],
  ["googlesearch", "google"],
  ["bing", "bing"],
  ["bing.com", "bing"],
  ["duckduckgo", "duckduckgo"],
  ["duckduckgo.com", "duckduckgo"],
  ["ddg", "duckduckgo"],
  ["github", "github"],
  ["github.com", "github"],
  ["linkedin", "linkedin"],
  ["linkedin.com", "linkedin"],
  ["lnkd.in", "linkedin"],
  ["x", "x"],
  ["x.com", "x"],
  ["twitter", "x"],
  ["twitter.com", "x"],
  ["t.co", "x"],
  ["reddit", "reddit"],
  ["reddit.com", "reddit"],
  ["devto", "devto"],
  ["dev.to", "devto"],
  ["dev_to", "devto"],
  ["dev-to", "devto"],
  ["hashnode", "hashnode"],
  ["hashnode.com", "hashnode"],
  ["hashnode.dev", "hashnode"],
  ["producthunt", "producthunt"],
  ["product_hunt", "producthunt"],
  ["product-hunt", "producthunt"],
  ["producthunt.com", "producthunt"],
  ["youtube", "youtube"],
  ["youtube.com", "youtube"],
  ["youtu.be", "youtube"],
  ["newsletter", "newsletter"],
]);

const MEDIUM_ALIASES = new Map<string, AttributionMedium>([
  ["organic", "organic"],
  ["social", "social"],
  ["social-media", "social"],
  ["social_media", "social"],
  ["community", "community"],
  ["referral", "referral"],
  ["email", "email"],
  ["e-mail", "email"],
  ["launch", "launch"],
  ["video", "video"],
  ["direct", "direct"],
]);

const DEFAULT_MEDIUM: Record<AttributionSource, AttributionMedium> = {
  direct: "direct",
  google: "organic",
  bing: "organic",
  duckduckgo: "organic",
  github: "referral",
  linkedin: "social",
  x: "social",
  reddit: "community",
  devto: "community",
  hashnode: "community",
  producthunt: "launch",
  youtube: "video",
  newsletter: "email",
  other: "other",
};

/** Hostname suffixes per referrer category (`host === d` or `host` ends with `.d`). Google has country domains. */
const REFERRER_DOMAINS: ReadonlyArray<readonly [AttributionReferrer, readonly string[]]> = [
  ["bing", ["bing.com"]],
  ["duckduckgo", ["duckduckgo.com"]],
  ["github", ["github.com"]],
  ["linkedin", ["linkedin.com", "lnkd.in"]],
  ["x", ["x.com", "twitter.com", "t.co"]],
  ["reddit", ["reddit.com", "redd.it"]],
  ["devto", ["dev.to"]],
  ["hashnode", ["hashnode.com", "hashnode.dev"]],
  ["producthunt", ["producthunt.com"]],
  ["youtube", ["youtube.com", "youtu.be"]],
];
const GOOGLE_HOST = /^(?:[a-z0-9-]+\.)*google\.[a-z]{2,3}(?:\.[a-z]{2})?$/;

/* ------------------------------------------------------------------ normalisers (pure) */

const MAX_RAW = 100;
const clean = (raw: string | null | undefined) => (raw ? raw.trim().toLowerCase().replace(/^www\./, "") : "");

/** A tagged source → a taxonomy member, or "other". Absent/empty → undefined. The raw value is never returned. */
export function normalizeSource(raw: string | null | undefined): AttributionSource | undefined {
  const v = clean(raw);
  if (!v || v.length > MAX_RAW) return v ? "other" : undefined;
  return SOURCE_ALIASES.get(v) ?? "other";
}

/** A tagged medium → a KNOWN medium, or undefined (an unknown medium is not forwarded as "other"; inference decides). */
export function normalizeMedium(raw: string | null | undefined): AttributionMedium | undefined {
  const v = clean(raw);
  return v && v.length <= MAX_RAW ? MEDIUM_ALIASES.get(v) : undefined;
}

/** Exactly `kx_[a-z0-9][a-z0-9_-]{0,62}` (case-sensitive), else undefined. Never sanitised into another value. */
export function normalizeCampaign(raw: string | null | undefined): string | undefined {
  return raw && CAMPAIGN.test(raw) ? raw : undefined;
}

/** A strict slug, and only when there is a valid campaign for it to belong to. */
export function normalizeContent(raw: string | null | undefined, campaign: string | undefined): string | undefined {
  return campaign && raw && CONTENT.test(raw) ? raw : undefined;
}

export interface ReferrerClass {
  category: AttributionReferrer;
  /** a website other than ours referred the visit */
  external: boolean;
}

/**
 * document.referrer → a category. Only the hostname is ever examined, and only to choose a category: no path, query,
 * hash, credentials or port survive, and an unknown hostname becomes "other" without being kept. No referrer, a
 * non-web referrer or one of our own pages is "direct" (an internal referrer never overwrites acquisition).
 */
export function classifyReferrer(referrer: string | null | undefined, ownHostname: string): ReferrerClass {
  const direct: ReferrerClass = { category: "direct", external: false };
  if (!referrer) return direct;
  let host: string;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return direct;
    host = url.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return direct;
  }
  if (!host) return direct;
  const own = ownHostname.toLowerCase().replace(/^www\./, "");
  if (host === own || host.endsWith(`.${own}`)) return direct;
  if (GOOGLE_HOST.test(host)) return { category: "google", external: true };
  for (const [category, domains] of REFERRER_DOMAINS) {
    if (domains.some((d) => host === d || host.endsWith(`.${d}`))) return { category, external: true };
  }
  return { category: "other", external: true };
}

/* ------------------------------------------------------------------ the record */

export interface Attribution {
  source: AttributionSource;
  medium: AttributionMedium;
  campaign?: string;
  content?: string;
  referrer: AttributionReferrer;
  /** a clean pathname, no query or hash */
  landing?: string;
}

export interface AttributionInput {
  /** `location.search` — read here and only here */
  search: string;
  referrer: string;
  pathname: string;
  ownHostname: string;
}

/** Only the four allowed keys are read; each is normalised at once and the raw values go out of scope. */
function readAcquisitionParams(search: string) {
  const params = new URLSearchParams(search);
  const source = normalizeSource(params.get("utm_source"));
  const medium = normalizeMedium(params.get("utm_medium"));
  const campaign = normalizeCampaign(params.get("utm_campaign"));
  const content = normalizeContent(params.get("utm_content"), campaign);
  return { source, medium, campaign, content };
}

/** The exact precedence in the header comment. Pure: the same input always gives the same record. */
export function deriveAttribution(input: AttributionInput): Attribution {
  const tagged = readAcquisitionParams(input.search);
  const ref = classifyReferrer(input.referrer, input.ownHostname);

  let source: AttributionSource;
  if (tagged.source && tagged.source !== "other") source = tagged.source;
  else if (ref.category !== "direct" && ref.category !== "other") source = ref.category;
  else if (tagged.source === "other" || ref.category === "other") source = "other";
  else source = "direct";

  // an unrecognised external site still tells us it was a referral
  const inferred = source === "other" && ref.external ? "referral" : DEFAULT_MEDIUM[source];
  const landing = cleanPath(input.pathname) ?? undefined;

  const result: Attribution = { source, medium: tagged.medium ?? inferred, referrer: ref.category };
  if (tagged.campaign) result.campaign = tagged.campaign;
  if (tagged.content) result.content = tagged.content;
  if (landing) result.landing = landing;
  return result;
}

/* ------------------------------------------------------------------ flat, validated properties */

type Field = "source" | "medium" | "campaign" | "content" | "referrer" | "landing_page";

const isMember = (list: readonly string[], v: unknown): v is string => typeof v === "string" && list.includes(v);

const FIELD_VALID: Record<Field, (v: unknown) => boolean> = {
  source: (v) => isMember(ATTRIBUTION_SOURCES, v),
  medium: (v) => isMember(ATTRIBUTION_MEDIUMS, v),
  campaign: (v) => typeof v === "string" && CAMPAIGN.test(v),
  content: (v) => typeof v === "string" && CONTENT.test(v),
  referrer: (v) => isMember(ATTRIBUTION_REFERRERS, v),
  landing_page: (v) => typeof v === "string" && cleanPath(v) === v && SAFE_VALUE.test(v),
};

const KX_KEY = /^kx_(first_)?(source|medium|campaign|content|referrer|landing_page)$/;

/** A record → `kx_source`, … or `kx_first_source`, …; only the fields that are present. */
export function toProps(a: Attribution, prefix: "kx_" | "kx_first_"): Record<string, string> {
  const out: Record<string, string> = { [`${prefix}source`]: a.source, [`${prefix}medium`]: a.medium, [`${prefix}referrer`]: a.referrer };
  if (a.campaign) out[`${prefix}campaign`] = a.campaign;
  if (a.content) out[`${prefix}content`] = a.content;
  if (a.landing) out[`${prefix}landing_page`] = a.landing;
  return out;
}

/**
 * Remove every `kx_*` property that is not a valid attribution value, and every unknown `kx_*` key. Runs in the
 * PostHog `before_send`, so nothing can carry attribution out that this module would not have produced. Content is
 * dropped unless a valid campaign travels with it.
 */
export function sanitizeAttributionProps(bag: Record<string, unknown>): void {
  for (const key of Object.keys(bag)) {
    const m = KX_KEY.exec(key);
    if (key.startsWith("kx_") && !m) {
      delete bag[key];
      continue;
    }
    if (!m) continue;
    const field = m[2] as Field;
    if (!FIELD_VALID[field](bag[key])) delete bag[key];
    else if (field === "content" && !FIELD_VALID.campaign(bag[`kx_${m[1] ?? ""}campaign`])) delete bag[key];
  }
}

/* ------------------------------------------------------------------ storage (untrusted, may be blocked) */

const SESSION_KEY = "kx_analytics_session_v1";
const FIRST_TOUCH_KEY = "kx_analytics_first_touch_v1";

type Where = "session" | "local";

function store(where: Where): Storage | null {
  try {
    return where === "session" ? window.sessionStorage : window.localStorage; // the getter itself can throw
  } catch {
    return null;
  }
}

/** Re-validates everything read back: storage is editable by the visitor, so it is never trusted as-is. */
function parseStored(value: unknown): Attribution | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!FIELD_VALID.source(v.source) || !FIELD_VALID.medium(v.medium) || !FIELD_VALID.referrer(v.referrer)) return null;
  const out: Attribution = { source: v.source as AttributionSource, medium: v.medium as AttributionMedium, referrer: v.referrer as AttributionReferrer };
  if (FIELD_VALID.campaign(v.campaign)) {
    out.campaign = v.campaign as string;
    if (FIELD_VALID.content(v.content)) out.content = v.content as string;
  }
  if (FIELD_VALID.landing_page(v.landing)) out.landing = v.landing as string;
  return out;
}

function read(where: Where, key: string): Attribution | null {
  try {
    const raw = store(where)?.getItem(key);
    return raw ? parseStored(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function write(where: Where, key: string, a: Attribution): boolean {
  try {
    const s = store(where);
    if (!s) return false;
    s.setItem(key, JSON.stringify(a));
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ lifecycle */

/** Mirrors PostHog's own `respect_dnt`: with Do Not Track on, nothing is persisted either. */
function doNotTrack(): boolean {
  try {
    const w = window as unknown as { doNotTrack?: unknown };
    const n = navigator as unknown as { doNotTrack?: unknown; msDoNotTrack?: unknown };
    const v = n.doNotTrack ?? w.doNotTrack ?? n.msDoNotTrack;
    return v === "1" || v === "yes" || v === true;
  } catch {
    return false;
  }
}

function browserInput(): AttributionInput | null {
  if (typeof window === "undefined") return null;
  return {
    search: window.location.search,
    referrer: document.referrer,
    pathname: window.location.pathname,
    ownHostname: new URL(siteConfig.url).hostname,
  };
}

let context: Readonly<Record<string, string>> = Object.freeze({});

/**
 * Establish this page load's attribution. Called ONCE, by `startAnalytics`, only after the config gate has said
 * analytics is on — so dev, tests, previews, missing config and Do Not Track never persist anything.
 *
 *  - session: reuse the session's stored record; otherwise derive from THIS page (the first of the session) and store it.
 *    A later page's UTM, and any later navigation, never replaces it.
 *  - first touch: reuse the stored record; otherwise write this session's record. Write-once. If it cannot be
 *    persisted it is omitted rather than claimed, because it would then just be "this session" again.
 *  - blocked storage: the session record is kept in memory for the life of the page, first touch is omitted.
 */
export function initAttribution(input: AttributionInput | null = browserInput(), dnt: boolean = doNotTrack()): void {
  context = Object.freeze({});
  if (!input || dnt) return;

  let session = read("session", SESSION_KEY);
  if (!session) {
    session = deriveAttribution(input);
    write("session", SESSION_KEY, session);
  }

  let first = read("local", FIRST_TOUCH_KEY);
  if (!first) {
    first = write("local", FIRST_TOUCH_KEY, session) ? session : null;
  }

  context = Object.freeze({ ...toProps(session, "kx_"), ...(first ? toProps(first, "kx_first_") : {}) });
}

/** The attribution properties for every outgoing event. Empty until (and unless) `initAttribution` ran. */
export function getAttributionContext(): Readonly<Record<string, string>> {
  return context;
}

/** Test-only. */
export function resetAttributionForTests() {
  context = Object.freeze({});
}
