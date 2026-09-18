export type ViolationKind = "color" | "spacing";

export interface LintViolation {
  file: string;
  line: number;
  kind: ViolationKind;
  snippet: string;
}

/**
 * Strip comments before scanning, so a hex color or arbitrary-value mention
 * inside a `//` or `/* *\/` comment doesn't get flagged as real source. Best
 * effort, not a real tokenizer: block comments are removed outright (safe —
 * this codebase's target files don't nest them or hide strings that span
 * one); line comments are only stripped when the `//` isn't immediately
 * preceded by `:`, so a `"https://…"` string survives.
 */
export function stripComments(text: string): string {
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return noBlocks.replace(/(^|[^:])\/\/.*$/gm, (_m, pre: string) => pre);
}

const HEX = "(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})";

/** Tailwind color utilities that accept an arbitrary value, e.g. `bg-[#1a2b3c]`. */
const COLOR_UTILITY_PREFIXES = [
  "bg",
  "text",
  "border",
  "fill",
  "stroke",
  "ring",
  "from",
  "via",
  "to",
  "outline",
  "decoration",
  "caret",
  "accent",
  "shadow",
  "divide",
];

export const COLOR_PATTERNS: RegExp[] = [
  // bg-[#1a2b3c], text-[#fff], ring-[#1a2b3c80] …
  new RegExp(`\\b(?:${COLOR_UTILITY_PREFIXES.join("|")})-\\[#${HEX}\\]`, "g"),
  // style={{ color: "#1a2b3c" }} / a plain CSS declaration `color: #1a2b3c;`
  new RegExp(`:\\s*["']?#${HEX}["']?`, "g"),
];

/** Box-model spacing utilities that accept an arbitrary value — not `w-`/`h-` sizing.
 *  The leading `-?` wraps the whole alternation (not just the first branch) so
 *  negative arbitrary values apply uniformly, e.g. `-top-[10px]`/`-inset-[6px]`,
 *  not just `-mt-[10px]`. */
const SPACING_UTILITY_PATTERN =
  "-?(?:(?:p|m)[trblxy]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left)";
const SPACING_VALUE = "-?[\\d.]+(?:px|rem|em|%)?";

export const SPACING_PATTERNS: RegExp[] = [
  new RegExp(`\\b(?:${SPACING_UTILITY_PATTERN})-\\[${SPACING_VALUE}\\]`, "g"),
];

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function snippetAround(text: string, index: number, length: number): string {
  const lineStart = text.lastIndexOf("\n", index) + 1;
  let lineEnd = text.indexOf("\n", index);
  if (lineEnd === -1) lineEnd = text.length;
  return text.slice(lineStart, lineEnd).trim().slice(0, 120) || text.slice(index, index + length);
}

export function lintText(file: string, rawText: string): LintViolation[] {
  const text = stripComments(rawText);
  const violations: LintViolation[] = [];
  const seen = new Set<string>();

  const scan = (patterns: RegExp[], kind: ViolationKind) => {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text))) {
        const line = lineOf(text, match.index);
        const key = `${kind}:${line}:${match.index}`;
        if (!seen.has(key)) {
          seen.add(key);
          violations.push({ file, line, kind, snippet: snippetAround(text, match.index, match[0].length) });
        }
        if (match[0].length === 0) pattern.lastIndex++;
      }
    }
  };

  scan(COLOR_PATTERNS, "color");
  scan(SPACING_PATTERNS, "spacing");

  violations.sort((a, b) => a.line - b.line);
  return violations;
}

export const LINT_EXTENSIONS = [".tsx", ".jsx", ".ts", ".js", ".css"];
