/**
 * Theme override parsing/compiling — the CLI counterpart to the raw editor
 * inside /create (apps/web/src/lib/theme-builder.ts). Ported 1:1 for the
 * same `token,hex` format and the same derived-foreground/contrast-check
 * behavior, so for a file of literal colour rows `kinetixui theme build`
 * writes the same `:root` block the workspace does. The one addition here
 * is `#`-prefixed comment-line support, since this reads a real file
 * (`kinetixui-themes/<name>.csv`) rather than pasted spreadsheet rows.
 *
 * That is now a SUBSET, not the whole of Create. The workspace generates
 * colours from an OKLCH model, emits a `.dark` block alongside `:root`, and
 * writes radius and elevation variables — none of which this format can
 * express, and none of which this file attempts to. A theme built here is a
 * colour override; a theme copied from Create may be more than one.
 */
import { bestTextHex, contrastRatio, hexToHslChannels, isHex, normalizeHex } from "./color-math.js";

/** Tokens the theme builder accepts. */
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
  // role tokens layered over primary/ring — optional; when unset they resolve to primary / ring
  "action",
  "action-foreground",
  "link",
  "focus",
  "brand",
  "brand-foreground",
] as const;
export type AcceptedToken = (typeof ACCEPTED_TOKENS)[number];

/** Sensible current-default hex per token, used only to scaffold a starter file. */
export const EXAMPLE_VALUES: Record<AcceptedToken, string> = {
  background: "#ffffff",
  foreground: "#0f172a",
  card: "#ffffff",
  "card-foreground": "#0f172a",
  popover: "#ffffff",
  "popover-foreground": "#0f172a",
  primary: "#2563eb",
  "primary-foreground": "#ffffff",
  secondary: "#f1f5f9",
  "secondary-foreground": "#0f172a",
  muted: "#f1f5f9",
  "muted-foreground": "#64748b",
  accent: "#f1f5f9",
  "accent-foreground": "#0f172a",
  destructive: "#dc2626",
  "destructive-foreground": "#ffffff",
  border: "#e2e8f0",
  input: "#e2e8f0",
  ring: "#2563eb",
  action: "#2563eb",
  "action-foreground": "#ffffff",
  link: "#2563eb",
  focus: "#2563eb",
  brand: "#0f172a",
  "brand-foreground": "#ffffff",
};

/** base -> its foreground, auto-derived by contrast when the base is set but the foreground isn't. */
const FOREGROUND_OF: Partial<Record<AcceptedToken, AcceptedToken>> = {
  background: "foreground",
  card: "card-foreground",
  popover: "popover-foreground",
  primary: "primary-foreground",
  secondary: "secondary-foreground",
  muted: "muted-foreground",
  accent: "accent-foreground",
  destructive: "destructive-foreground",
  action: "action-foreground",
  brand: "brand-foreground",
};

/** pairs worth a contrast check in the build report. */
export const CONTRAST_PAIRS: [AcceptedToken, AcceptedToken][] = [
  ["background", "foreground"],
  ["card", "card-foreground"],
  ["popover", "popover-foreground"],
  ["primary", "primary-foreground"],
  ["secondary", "secondary-foreground"],
  ["muted", "muted-foreground"],
  ["accent", "accent-foreground"],
  ["destructive", "destructive-foreground"],
  ["action", "action-foreground"],
  ["brand", "brand-foreground"],
];

export type ParsedTheme = {
  values: Partial<Record<AcceptedToken, string>>;
  errors: string[];
  unknownTokens: string[];
};

const isAccepted = (t: string): t is AcceptedToken => (ACCEPTED_TOKENS as readonly string[]).includes(t);

/** Parse a `kinetixui-themes/<name>.csv` file: `token,hex` per line, `#`-prefixed lines ignored. */
export function parseThemeFile(text: string): ParsedTheme {
  const values: Partial<Record<AcceptedToken, string>> = {};
  const errors: string[] = [];
  const unknownTokens: string[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  lines.forEach((line, i) => {
    const cells = line.split(/[,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cells.length < 2) {
      errors.push(`Line ${i + 1}: expected "token,hex" — got "${line}"`);
      return;
    }
    // cells.length >= 2 was just checked above
    const [rawToken, rawHex] = cells as [string, string];
    const token = rawToken.toLowerCase().replace(/^--/, "").replace(/\s+/g, "-");

    if (!isHex(rawHex)) {
      errors.push(`Line ${i + 1}: "${rawHex}" isn't a hex color`);
      return;
    }
    if (!isAccepted(token)) {
      unknownTokens.push(rawToken);
      return;
    }
    values[token] = normalizeHex(rawHex);
  });

  return { values, errors, unknownTokens };
}

/** Fill in any missing `-foreground` for a base color the user did set, by best contrast. */
export function deriveForegrounds(values: Partial<Record<AcceptedToken, string>>) {
  const out = { ...values };
  for (const [base, fg] of Object.entries(FOREGROUND_OF) as [AcceptedToken, AcceptedToken][]) {
    if (out[base] && !out[fg]) out[fg] = bestTextHex(out[base]!);
  }
  return out;
}

/** :root override block — matches what /create tells users to paste after the token import. */
export function toCssBlock(values: Partial<Record<AcceptedToken, string>>): string {
  const lines = ACCEPTED_TOKENS.filter((t) => values[t]).map((t) => `  --${t}: ${hexToHslChannels(values[t]!)};`);
  return `:root {\n${lines.join("\n")}\n}\n`;
}

export type ContrastResult = { pair: [AcceptedToken, AcceptedToken]; ratio: number; pass: boolean };

/** Only pairs where both sides were actually supplied (explicitly or derived). */
export function checkContrast(values: Partial<Record<AcceptedToken, string>>): ContrastResult[] {
  return CONTRAST_PAIRS.filter(([bg, fg]) => values[bg] && values[fg]).map(([bg, fg]) => {
    const ratio = contrastRatio(values[bg]!, values[fg]!);
    return { pair: [bg, fg], ratio, pass: ratio >= 4.5 };
  });
}

/** Starter file content for `kinetixui theme create <name>`. */
export function scaffoldThemeFile(name: string): string {
  const lines = [
    `# ${name} — KinetixUI theme override`,
    "#",
    "# One `token,hex` pair per line. Uncomment (remove the leading `# `) and",
    "# edit any token you want to override; leave the rest commented out to",
    "# keep KinetixUI's default. Run `kinetixui theme build " + name + "` to",
    `# compile this into ${name}.css and get a WCAG AA contrast report.`,
    "#",
    "# Setting a base color (e.g. `primary`) without its `-foreground` pair",
    "# auto-derives the foreground by contrast (best of white/black) — you",
    "# don't have to set both unless you want a specific foreground.",
    "#",
  ];
  for (const token of ACCEPTED_TOKENS) {
    lines.push(`# ${token},${EXAMPLE_VALUES[token]}`);
  }
  return lines.join("\n") + "\n";
}
