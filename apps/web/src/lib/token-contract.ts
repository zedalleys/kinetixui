/**
 * The resolved semantic contract, both themes — mirrors
 * packages/tokens/dist/web/globals.css + globals.dark.css.
 * Used by /themes and the docs <TokenTable>.
 */
export type TokenRow = { token: string; light: string; dark: string; note?: string };

/** hex (case-insensitive) -> the semantic token it backs, light theme. Built from TOKEN_CONTRACT below. */
export function tokenNameForHex(hex: string): string | undefined {
  const h = hex.toLowerCase();
  return TOKEN_CONTRACT.find((r) => r.light.toLowerCase() === h)?.token;
}

export const TOKEN_CONTRACT: TokenRow[] = [
  { token: "background", light: "#ffffff", dark: "#050c11" },
  { token: "foreground", light: "#050c11", dark: "#f0f7ff" },
  { token: "card", light: "#ffffff", dark: "#0b1821", note: "synthesized" },
  { token: "popover", light: "#ffffff", dark: "#0b1821", note: "synthesized" },
  { token: "primary", light: "#1d4ed8", dark: "#60a5fa" },
  { token: "primary-foreground", light: "#f0f7ff", dark: "#050c11" },
  { token: "secondary", light: "#c7cfc7", dark: "#2e362e" },
  { token: "secondary-foreground", light: "#465245", dark: "#e3e7e3" },
  { token: "muted", light: "#f6f6f6", dark: "#102432" },
  { token: "muted-foreground", light: "#6d6d6d", dark: "#92b2c8" },
  { token: "accent", light: "#f0f7ff", dark: "#102432" },
  { token: "accent-foreground", light: "#1d4ed8", dark: "#f0f7ff" },
  { token: "destructive", light: "#ec5047", dark: "#dd6a6a" },
  { token: "success", light: "#5d6d5c", dark: "#90a08f" },
  { token: "warning", light: "#f97907", dark: "#ffc975" },
  { token: "border", light: "#92b2c8", dark: "#395a70" },
  { token: "ring", light: "#1d4ed8", dark: "#60a5fa", note: "synthesized" },
];
