/**
 * The portable Kinetix Create preset.
 *
 * One implementation of the schema, the validation, the canonical form and the codec, consumed by both
 * the website and the CLI. A second copy would drift, and the thing it would drift on is the meaning of a
 * code someone already shared — a preset that decodes differently in two places is worse than no preset.
 *
 * Deliberately dependency-free and platform-neutral: no React, no Next, no `node:` imports, no DOM. It
 * runs in a browser, in a CLI, and in a future exporter that does not exist yet (PR 4), and it describes
 * *intent* rather than output — no resolved CSS, no generated colours, no contrast results. Those are
 * derived from a preset by the theme engine; storing them would freeze today's engine into a code that is
 * meant to outlive it.
 *
 * ## What is in a preset, and what is not
 *
 * IN — the design configuration: `brand`, `neutral`, `radius`, `surface`, `chartPalette`,
 * `manualOverrides`.
 *
 * OUT — `mode` and `previewScene`. Both look like configuration because they sit in the workspace's
 * state, but neither describes the design: one picks which of the two appearances a single configuration
 * generates, the other picks which demo is on screen. Sending someone a preset should not force them
 * into dark mode and the Form scene. They stay local to the workspace.
 *
 * OUT — `style`. It is derived from `radius` + `surface`, in the app and here, so encoding it would
 * create a second place for it to be wrong.
 */

/* ------------------------------------------------------------------ vocabulary */

export const PRESET_VERSION = 1;

/** The codes this build can read. Unknown versions are refused with a clear reason, never guessed at. */
export const SUPPORTED_VERSIONS = [1] as const;

export const NEUTRALS = ["kinetix", "neutral", "cool", "warm", "stone"] as const;
export const RADII = ["square", "small", "default", "rounded", "soft"] as const;
export const SURFACES = ["flat", "bordered", "soft", "elevated"] as const;
export const CHART_PALETTES = ["kinetix", "brand", "categorical", "cool", "warm"] as const;

export type NeutralId = (typeof NEUTRALS)[number];
export type RadiusId = (typeof RADII)[number];
export type SurfaceId = (typeof SURFACES)[number];
export type ChartPaletteId = (typeof CHART_PALETTES)[number];

/**
 * The semantic tokens a manual override may name.
 *
 * This list is the security boundary as much as the schema: a preset can set `--primary`, and it can
 * never set `--anything-else`, because a name not on this list is refused rather than passed through.
 * That is what stops a shared code from carrying an arbitrary custom property (§26).
 *
 * `apps/web/src/lib/theme-builder.ts` re-exports this rather than keeping its own copy.
 */
export const ACCEPTED_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
  "action",
  "action-foreground",
  "link",
  "focus",
  "brand",
  "brand-foreground",
] as const;
export type AcceptedToken = (typeof ACCEPTED_TOKENS)[number];

/** The shipped action blue — the brand that means "generate nothing". */
export const DEFAULT_BRAND = "#1d4ed8";

/* ------------------------------------------------------------------ shape */

/** The portable design configuration. Plain data: strings and one flat string→string map. */
export type PresetConfig = {
  brand: string;
  neutral: NeutralId;
  radius: RadiusId;
  surface: SurfaceId;
  chartPalette: ChartPaletteId;
  manualOverrides: Partial<Record<AcceptedToken, string>>;
};

export const DEFAULT_PRESET: PresetConfig = {
  brand: DEFAULT_BRAND,
  neutral: "kinetix",
  radius: "default",
  surface: "soft",
  chartPalette: "kinetix",
  manualOverrides: {},
};

/** What actually gets encoded: the envelope, carrying a version and only non-default fields. */
type Envelope = {
  v: number;
  brand?: string;
  neutral?: string;
  radius?: string;
  surface?: string;
  chartPalette?: string;
  manualOverrides?: Record<string, string>;
};

/* ------------------------------------------------------------------ limits */

/** A shared code is untrusted input arriving over a URL, so every stage has a ceiling. */
export const LIMITS = {
  /** Longest code accepted, prefix included. A maximal legitimate preset is ~700 characters. */
  code: 4096,
  /** Longest decoded JSON. Base64 expands by 4/3, so this is the real guard. */
  json: 4096,
  /** A hex colour, at most. */
  colour: 7,
  /** More override entries than there are tokens means the payload is not one of ours. */
  overrides: 64,
} as const;

/* ------------------------------------------------------------------ validation */

const HEX = /^#[0-9a-f]{6}$/;

/** Keys that must never be copied from parsed JSON onto an object — prototype pollution, refused by name. */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export type PresetError =
  | { code: "empty"; message: string }
  | { code: "too-long"; message: string }
  | { code: "bad-prefix"; message: string }
  | { code: "unsupported-version"; message: string; version: number }
  | { code: "bad-encoding"; message: string }
  | { code: "bad-json"; message: string }
  | { code: "bad-field"; message: string; field: string };

export type DecodeResult = { ok: true; config: PresetConfig } | { ok: false; error: PresetError };

const fail = (error: PresetError): DecodeResult => ({ ok: false, error });

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Normalize a colour the same way everywhere: trimmed, `#`-prefixed, lower case. */
export function normalizeColour(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  const hashed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return HEX.test(hashed) ? hashed : null;
}

function readEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | PresetError {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    return { code: "bad-field", field, message: `${field} must be one of: ${allowed.join(", ")}` };
  }
  return value as T;
}

/**
 * Turn a decoded envelope into a configuration, or say exactly what was wrong with it.
 *
 * Every field is read explicitly. Nothing is spread, merged or `Object.assign`-ed from the parsed JSON,
 * so an unexpected key cannot reach the config — it is ignored, which is the schema policy this chooses:
 * be strict about the values of keys we know, and silently drop keys we do not. That makes a KX2 code
 * fail on its version rather than on an unfamiliar field, which is the more useful error.
 */
export function validate(raw: unknown): DecodeResult {
  if (!isPlainObject(raw)) return fail({ code: "bad-json", message: "A preset must be a JSON object." });

  const version = raw.v;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return fail({ code: "bad-json", message: "A preset must carry an integer version." });
  }
  if (!(SUPPORTED_VERSIONS as readonly number[]).includes(version)) {
    return fail({
      code: "unsupported-version",
      version,
      message: `This preset is version ${version}; this build reads version ${SUPPORTED_VERSIONS.join(", ")}. Update KinetixUI and try again.`,
    });
  }

  const config: PresetConfig = { ...DEFAULT_PRESET, manualOverrides: {} };

  if (raw.brand !== undefined) {
    if (typeof raw.brand !== "string" || raw.brand.length > LIMITS.colour) {
      return fail({ code: "bad-field", field: "brand", message: "brand must be a hex colour." });
    }
    const colour = normalizeColour(raw.brand);
    if (!colour) return fail({ code: "bad-field", field: "brand", message: `"${raw.brand}" is not a six-digit hex colour.` });
    config.brand = colour;
  }

  for (const [field, allowed] of [
    ["neutral", NEUTRALS],
    ["radius", RADII],
    ["surface", SURFACES],
    ["chartPalette", CHART_PALETTES],
  ] as const) {
    if (raw[field] === undefined) continue;
    const value = readEnum(raw[field], allowed, field);
    if (typeof value !== "string") return fail(value);
    (config as Record<string, unknown>)[field] = value;
  }

  if (raw.manualOverrides !== undefined) {
    if (!isPlainObject(raw.manualOverrides)) {
      return fail({ code: "bad-field", field: "manualOverrides", message: "manualOverrides must be an object." });
    }
    const entries = Object.entries(raw.manualOverrides);
    if (entries.length > LIMITS.overrides) {
      return fail({ code: "bad-field", field: "manualOverrides", message: "Too many overrides." });
    }
    for (const [token, value] of entries) {
      if (FORBIDDEN_KEYS.has(token)) {
        return fail({ code: "bad-field", field: "manualOverrides", message: `"${token}" is not a theme colour.` });
      }
      if (!(ACCEPTED_TOKENS as readonly string[]).includes(token)) {
        // The whole point of the allowlist: a preset can set a semantic token and nothing else.
        return fail({ code: "bad-field", field: "manualOverrides", message: `"${token}" is not a theme colour.` });
      }
      if (typeof value !== "string" || value.length > LIMITS.colour) {
        return fail({ code: "bad-field", field: "manualOverrides", message: `${token} must be a hex colour.` });
      }
      const colour = normalizeColour(value);
      if (!colour) {
        return fail({ code: "bad-field", field: "manualOverrides", message: `${token}: "${value}" is not a six-digit hex colour.` });
      }
      config.manualOverrides[token as AcceptedToken] = colour;
    }
  }

  return { ok: true, config };
}

/* ------------------------------------------------------------------ canonical form */

/**
 * One configuration, one code.
 *
 * Insertion order, hex casing and fields left at their default would otherwise each produce a different
 * string for the same design. Fields are written in a fixed order, colours lower-cased, defaults omitted,
 * and overrides ordered by the token list rather than by however they were typed.
 *
 * Overrides are NOT dropped when they equal the value the engine would generate. Pinning a colour and
 * letting it be generated are different states — the first survives a change to the brand — so the code
 * has to carry the difference.
 */
export function canonicalize(config: PresetConfig): Envelope {
  const envelope: Envelope = { v: PRESET_VERSION };

  const brand = normalizeColour(config.brand) ?? DEFAULT_BRAND;
  if (brand !== DEFAULT_PRESET.brand) envelope.brand = brand;
  if (config.neutral !== DEFAULT_PRESET.neutral) envelope.neutral = config.neutral;
  if (config.radius !== DEFAULT_PRESET.radius) envelope.radius = config.radius;
  if (config.surface !== DEFAULT_PRESET.surface) envelope.surface = config.surface;
  if (config.chartPalette !== DEFAULT_PRESET.chartPalette) envelope.chartPalette = config.chartPalette;

  const overrides: Record<string, string> = {};
  for (const token of ACCEPTED_TOKENS) {
    const value = config.manualOverrides[token];
    if (!value) continue;
    const colour = normalizeColour(value);
    if (colour) overrides[token] = colour;
  }
  if (Object.keys(overrides).length > 0) envelope.manualOverrides = overrides;

  return envelope;
}

/** True when this configuration is the shipped default — the case where a code carries no design at all. */
export function isDefaultPreset(config: PresetConfig): boolean {
  const envelope = canonicalize(config);
  return Object.keys(envelope).length === 1;
}

/* ------------------------------------------------------------------ base64url */

/**
 * Base64url, implemented here rather than reached for.
 *
 * `btoa` is browser-only, `Buffer` is Node-only, and `TextEncoder` would drag a DOM or Node lib into the
 * types of a module whose whole point is depending on neither. It is 30 lines of table lookup.
 *
 * The payload is ASCII by construction — canonical JSON over hex colours, enum names and token names,
 * every one of which the validator restricts to ASCII. So bytes are code units, and anything outside
 * that range is not a code this produced and is refused rather than interpreted.
 */
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const REVERSE = new Map<string, number>([...ALPHABET].map((c, i) => [c, i]));

function toBase64Url(text: string): string | null {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) return null;
    bytes.push(code);
  }

  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += ALPHABET[a >> 2];
    out += ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)];
    if (b === undefined) break;
    out += ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)];
    if (c === undefined) break;
    out += ALPHABET[c & 63];
  }
  return out;
}

function fromBase64Url(code: string): string | null {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const char of code) {
    const value = REVERSE.get(char);
    if (value === undefined) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      const byte = (buffer >> bits) & 0xff;
      // Non-ASCII cannot appear in a payload this produced, so it is a decode failure, not a character.
      if (byte > 0x7f) return null;
      out += String.fromCharCode(byte);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ codec */

export const PRESET_PREFIX = "KX";

/** `KX1_…` — the version is readable without decoding anything, which is what makes KX2 possible. */
export function encodePreset(config: PresetConfig): string {
  const payload = toBase64Url(JSON.stringify(canonicalize(config)));
  // Unreachable with a validated config — canonicalize only emits ASCII — but an encoder that could
  // silently produce a code nothing can read is worth refusing out loud.
  if (payload === null) throw new Error("Preset contains a value that cannot be encoded.");
  return `${PRESET_PREFIX}${PRESET_VERSION}_${payload}`;
}

/**
 * The one entry point. Everything a future KX2 needs is here: the prefix says which version arrived, the
 * validator for that version turns it into that version's shape, and a migration step brings it forward.
 * No `if (version === 1)` anywhere else, in the UI or in the CLI.
 */
export function decodePreset(input: string): DecodeResult {
  const code = extractCode(input);
  if (!code) return fail({ code: "empty", message: "No preset code found." });
  if (code.length > LIMITS.code) return fail({ code: "too-long", message: "That preset code is too long to be one of ours." });

  const match = /^KX(\d+)_(.*)$/s.exec(code);
  if (!match) {
    return fail({ code: "bad-prefix", message: "A preset code starts with KX1_." });
  }

  const version = Number(match[1]);
  if (!(SUPPORTED_VERSIONS as readonly number[]).includes(version)) {
    return fail({
      code: "unsupported-version",
      version,
      message: `This preset is version ${version}; this build reads version ${SUPPORTED_VERSIONS.join(", ")}. Update KinetixUI and try again.`,
    });
  }

  const json = fromBase64Url(match[2] ?? "");
  if (json === null) return fail({ code: "bad-encoding", message: "That preset code is not valid base64url." });
  if (json.length > LIMITS.json) return fail({ code: "too-long", message: "That preset is larger than any real one." });

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail({ code: "bad-json", message: "That preset code does not contain a readable preset." });
  }

  // The prefix carries the version; a payload that disagrees with it is not something to guess about.
  if (isPlainObject(parsed) && parsed.v === undefined) parsed.v = version;

  const result = validate(parsed);
  return result.ok ? { ok: true, config: migrate(result.config, version) } : result;
}

/**
 * Bring a validated older configuration forward. Nothing to do at V1 — it exists so that the day KX2
 * lands, the change is a case in this function and not a search through the codebase.
 */
function migrate(config: PresetConfig, from: number): PresetConfig {
  switch (from) {
    case 1:
      return config;
    default:
      return config;
  }
}

/**
 * Accept a bare code or a full share URL. Someone who copies the address bar has copied a URL, and
 * refusing it would be pedantry — but only the `preset` parameter is read, and it is read with a parser
 * rather than a regular expression over the whole string.
 */
export function extractCode(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (text.length > LIMITS.code * 2) return null;

  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      // `getAll` then `at(0)`: a repeated ?preset= takes the first, deterministically, rather than
      // whatever the platform's `get` happens to pick.
      const values = url.searchParams.getAll(PRESET_PARAM);
      const first = values[0];
      return first === undefined ? null : first.trim();
    } catch {
      return null;
    }
  }
  return text;
}

export const PRESET_PARAM = "preset";

/** The canonical share URL for a preset. `origin` lets the CLI and the site agree without a hard-coded host. */
export function presetUrl(config: PresetConfig, origin: string): string {
  return `${origin.replace(/\/$/, "")}/create?${PRESET_PARAM}=${encodePreset(config)}`;
}
