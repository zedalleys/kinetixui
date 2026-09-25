/**
 * The token vocabulary, the pairs worth a contrast check, and the `token,hex` parser.
 *
 * Was `apps/web/src/lib/theme-builder.ts`, named after the tool that became /create. Nothing in it is
 * web-specific — it is text in, validated token/colour pairs out — so it moved here with the rest of the
 * resolution so the CLI can validate a preset's overrides the same way the workspace does.
 */
import { ACCEPTED_TOKENS, type AcceptedToken } from "@kinetixui/create-preset";
import { isHex, normalizeHex, bestTextHex, hexToHslChannels, guaranteedContrast } from "./color-math";

/**
 * Tokens the builder accepts and previews — re-exported from the preset codec, which owns the list.
 * It has to: the codec validates a shared preset without the app loaded, and a second copy here would
 * be a second answer to "is this a real token name", which is the check that keeps arbitrary CSS out.
 */
export { ACCEPTED_TOKENS, type AcceptedToken };


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

/** pairs worth a contrast check in the preview. */
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

export type ParsedPalette = {
  values: Partial<Record<AcceptedToken, string>>;
  errors: string[];
  unknownTokens: string[];
};

const isAccepted = (t: string): t is AcceptedToken => (ACCEPTED_TOKENS as readonly string[]).includes(t);

/** Parse pasted or uploaded CSV/TSV text: `token,hex` per line, header row optional. */
export function parsePaletteText(text: string): ParsedPalette {
  const values: Partial<Record<AcceptedToken, string>> = {};
  const errors: string[] = [];
  const unknownTokens: string[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  lines.forEach((line, i) => {
    const cells = line.split(/[,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
    const [rawToken, rawHex] = cells;
    if (rawToken === undefined || rawHex === undefined) {
      if (lines.length > 1) errors.push(`Row ${i + 1}: expected "token, hex" — got "${line}"`);
      return;
    }
    const token = rawToken.toLowerCase().replace(/^--/, "").replace(/\s+/g, "-");

    // header row: "token"/"name" in col 1, or col 2 isn't a hex — skip silently
    if (i === 0 && (!isHex(rawHex) || /^(token|name|key)$/i.test(token))) return;

    if (!isHex(rawHex)) {
      errors.push(`Row ${i + 1}: "${rawHex}" isn't a hex color`);
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

/** CSS custom-property style object (HSL channels, matching hsl(var(--x)) usage across @kinetixui/ui). */
export function toCssVarStyle(values: Partial<Record<AcceptedToken, string>>): Record<string, string> {
  const style: Record<string, string> = {};
  for (const [token, hex] of Object.entries(values)) {
    if (hex) style[`--${token}`] = hexToHslChannels(hex);
  }
  return style;
}

/** Copy-pasteable :root block for the user's own project. */
export function toCssBlock(values: Partial<Record<AcceptedToken, string>>): string {
  const lines = ACCEPTED_TOKENS.filter((t) => values[t]).map((t) => `  --${t}: ${hexToHslChannels(values[t]!)};`);
  return `:root {\n${lines.join("\n")}\n}`;
}

export type ContrastResult = { pair: [AcceptedToken, AcceptedToken]; ratio: number; pass: boolean };

/**
 * Only pairs where both sides were actually supplied (explicitly or derived).
 *
 * Measured on the guaranteed value — see `guaranteedContrast`. The workspace renders through
 * `hsl(var(--x))`, which rounds hue to whole degrees and saturation and lightness to whole percent, and
 * that costs up to 0.37 of a ratio — enough to put a pair the panel called 4.52 at 4.43 on the screen
 * beside it. A contrast panel that disagrees with its own preview is worse than none.
 */
export function checkContrast(values: Partial<Record<AcceptedToken, string>>): ContrastResult[] {
  return CONTRAST_PAIRS.filter(([bg, fg]) => values[bg] && values[fg]).map(([bg, fg]) => {
    const ratio = guaranteedContrast(values[bg]!, values[fg]!);
    return { pair: [bg, fg], ratio, pass: ratio >= 4.5 };
  });
}
