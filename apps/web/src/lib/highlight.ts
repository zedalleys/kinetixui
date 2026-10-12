/**
 * A deliberately small syntax highlighter for the homepage's implementation explorer.
 *
 * The site has no highlighter dependency outside MDX (rehype-pretty-code runs at MDX compile time only), and
 * the explorer shows five short, real source files. Pulling a client-side highlighter onto the homepage for
 * that would cost far more than it buys, so this runs on the server at build time and ships plain spans.
 *
 * It colours four things and nothing else: comments, strings, keywords and capitalised type names. It is not a
 * parser and does not try to be one — a misclassified token is a colour, never a changed character. The test
 * pins the property that matters: joining the tokens back together reproduces the source exactly.
 */

export type TokenKind = "comment" | "string" | "keyword" | "type" | "plain";
/** One coloured run. Serializable, so a server component can hand it to a client component. */
export type Token = [kind: TokenKind, text: string];
export type HighlightLanguage = "tsx" | "ts" | "css" | "swift" | "kotlin" | "dart";

const KEYWORDS: Record<HighlightLanguage, string[]> = {
  tsx: ["import", "from", "export", "const", "let", "return", "function", "as", "typeof", "extends", "new", "if", "else", "true", "false", "null", "undefined"],
  ts: ["import", "from", "export", "const", "let", "return", "function", "class", "abstract", "readonly", "extends", "implements", "protected", "private", "public", "new", "if", "else", "true", "false", "null", "this", "void", "type"],
  css: ["@media", "@supports", "!important"],
  swift: ["import", "public", "private", "struct", "var", "let", "some", "init", "return", "if", "else", "true", "false", "self", "func", "static"],
  kotlin: ["import", "package", "fun", "val", "var", "if", "else", "return", "true", "false", "null", "private", "internal", "object", "class", "when"],
  dart: ["import", "class", "extends", "final", "const", "return", "required", "this", "super", "true", "false", "null", "if", "else", "void", "static", "late"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Tokenise `source` into lines of coloured runs. Block comments may span lines, so a small amount of state is
 * carried from one line to the next; everything else is per line.
 */
export function highlight(source: string, language: HighlightLanguage): Token[][] {
  const keywords = KEYWORDS[language];
  const word = new RegExp(`^(?:${keywords.map(escape).join("|")})(?![\\w-])`);
  const lineComment = language === "css" ? null : "//";
  let inBlock = false;
  const lines: Token[][] = [];

  for (const line of source.split("\n")) {
    const out: Token[] = [];
    const push = (kind: TokenKind, text: string) => {
      if (!text) return;
      const last = out[out.length - 1];
      if (last && last[0] === kind) last[1] += text;
      else out.push([kind, text]);
    };
    let i = 0;
    while (i < line.length) {
      const rest = line.slice(i);
      if (inBlock) {
        const end = rest.indexOf("*/");
        if (end < 0) {
          push("comment", rest);
          i = line.length;
        } else {
          push("comment", rest.slice(0, end + 2));
          i += end + 2;
          inBlock = false;
        }
        continue;
      }
      if (rest.startsWith("/*")) {
        inBlock = true;
        push("comment", "/*");
        i += 2;
        continue;
      }
      if (lineComment && rest.startsWith(lineComment)) {
        push("comment", rest);
        break;
      }
      const quote = rest[0];
      if (quote === '"' || quote === "'" || quote === "`") {
        let j = 1;
        while (j < rest.length && rest[j] !== quote) j += rest[j] === "\\" ? 2 : 1;
        push("string", rest.slice(0, j + 1));
        i += j + 1;
        continue;
      }
      // a keyword only at a word boundary: `important` inside an identifier is not `import`
      const prev = line[i - 1];
      if (!prev || !/[\w$@-]/.test(prev)) {
        const kw = word.exec(rest);
        if (kw) {
          push("keyword", kw[0]);
          i += kw[0].length;
          continue;
        }
        const type = /^[A-Z][A-Za-z0-9_]*/.exec(rest);
        if (type) {
          push("type", type[0]);
          i += type[0].length;
          continue;
        }
        const ident = /^[\w$@-]+/.exec(rest);
        if (ident) {
          push("plain", ident[0]);
          i += ident[0].length;
          continue;
        }
      }
      push("plain", rest[0]!);
      i += 1;
    }
    lines.push(out);
  }
  return lines;
}
