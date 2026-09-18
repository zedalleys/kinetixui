/**
 * Generate specs/components/<name>.json + specs/components/index.json from
 * the @kinetixui/ui source — a platform-independent contract manifest per
 * component: its variant axes and each axis's option names (not the
 * Tailwind class-string values, which are implementation detail). Mirrored
 * to apps/web/public/specs/ so they're served statically at
 * kinetixui.com/specs/<name>.json, the same way apps/web/public/r/ serves
 * the registry items — `kinetixui inspect <name>` reads them from there.
 *
 * Auto-generated, not hand-maintained, same reasoning as registry.json and
 * the token CSS: a hand-written manifest drifts from the real component
 * within a few PRs. Source of truth is each component's own `cva(...)`
 * call (`class-variance-authority`) — only components that define one are
 * covered; the rest (composite/structural components with no variant-axis
 * matrix in this sense) are out of scope for this generator.
 *
 *   node scripts/gen-component-specs.mjs   (then: pnpm build:registry)
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = `${ROOT}/packages/ui/src/components`;
const OUT = `${ROOT}/specs/components`;
const PUBLIC_OUT = `${ROOT}/apps/web/public/specs`;
mkdirSync(OUT, { recursive: true });
mkdirSync(PUBLIC_OUT, { recursive: true });

const title = (name) => name.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");

/** Replace string-literal and line-comment contents with filler so brace/
 *  colon scanning below never mistakes a Tailwind class's own punctuation
 *  (`data-[state=open]:animate-in`) for real object structure. Same length
 *  as the input, so nothing else needs re-indexing. */
function mask(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "*") {
      // block comment (doc comments in this codebase routinely wrap terms
      // in backticks — must be stripped before the quote/template check
      // below, or an odd backtick count inside one desyncs everything after)
      let j = i + 2;
      while (j < src.length && !(src[j] === "*" && src[j + 1] === "/")) j++;
      j = Math.min(j + 2, src.length);
      out += " ".repeat(j - i);
      i = j;
    } else if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === quote) { j++; break; }
        j++;
      }
      out += "x".repeat(j - i);
      i = j;
    } else if (c === "/" && src[i + 1] === "/") {
      let j = i;
      while (j < src.length && src[j] !== "\n") j++;
      out += " ".repeat(j - i);
      i = j;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** Index of the char matching the opener at `openIdx` (masked text only —
 *  no strings/comments left to confuse the count). */
function findMatching(masked, openIdx, openCh, closeCh) {
  let depth = 0;
  for (let i = openIdx; i < masked.length; i++) {
    if (masked[i] === openCh) depth++;
    else if (masked[i] === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Parse `{ key: <value>, key2: <value2>, ... }`'s interior (masked text,
 *  no outer braces) into an ordered `{ key, value }` list — `value` is the
 *  raw (masked) text between the colon and the next top-level comma, so a
 *  nested `{...}`/`[...]`/`(...)` value comes back whole, brace-balanced. */
function topLevelEntries(block) {
  const entries = [];
  let i = 0;
  while (i < block.length) {
    while (i < block.length && /[\s,]/.test(block[i])) i++;
    if (i >= block.length) break;
    const idStart = i;
    while (i < block.length && /[\w$]/.test(block[i])) i++;
    const key = block.slice(idStart, i);
    while (i < block.length && /\s/.test(block[i])) i++;
    if (!key || block[i] !== ":") {
      // not a `key:` at this position — skip to the next top-level comma
      let d = 0;
      while (i < block.length) {
        if ("{[(".includes(block[i])) d++;
        else if ("}])".includes(block[i])) d--;
        else if (block[i] === "," && d === 0) { i++; break; }
        i++;
      }
      continue;
    }
    i++; // skip ':'
    while (i < block.length && /\s/.test(block[i])) i++;
    const valueStart = i;
    let d = 0;
    while (i < block.length) {
      if ("{[(".includes(block[i])) d++;
      else if ("}])".includes(block[i])) {
        if (d === 0) break; // closer belongs to the enclosing block — stop, don't consume
        d--;
      } else if (block[i] === "," && d === 0) break;
      i++;
    }
    entries.push({ key, value: block.slice(valueStart, i) });
    if (block[i] === ",") i++;
  }
  return entries;
}

/** All `variants: { axis: { option: ..., ... }, ... }` axes across every
 *  `cva(...)` call in the file, merged into one flat map. */
function extractVariants(code) {
  const masked = mask(code);
  const merged = {};
  const callRe = /=\s*cva\(/g;
  let m;
  while ((m = callRe.exec(masked))) {
    const parenStart = masked.indexOf("(", m.index);
    const parenEnd = findMatching(masked, parenStart, "(", ")");
    if (parenEnd === -1) continue;
    const callBody = masked.slice(parenStart + 1, parenEnd);
    // "variants:" (lowercase v) never matches inside "compoundVariants:" /
    // "defaultVariants:" — both are camelCase with a capital V.
    const variantsIdx = callBody.indexOf("variants:");
    if (variantsIdx === -1) continue;
    const braceStart = callBody.indexOf("{", variantsIdx);
    if (braceStart === -1) continue;
    const braceEnd = findMatching(callBody, braceStart, "{", "}");
    if (braceEnd === -1) continue;
    const variantsBlock = callBody.slice(braceStart + 1, braceEnd);

    for (const { key: axisName, value } of topLevelEntries(variantsBlock)) {
      if (!value.startsWith("{")) continue; // a non-object axis value — skip
      const axisBlock = value.slice(1, value.endsWith("}") ? -1 : value.length);
      const options = topLevelEntries(axisBlock).map((e) => e.key);
      if (options.length) merged[axisName] = options;
    }
  }
  return merged;
}

const files = readdirSync(SRC).filter((f) => f.endsWith(".tsx")).sort();
const covered = [];

for (const file of files) {
  const name = file.replace(/\.tsx$/, "");
  const code = readFileSync(`${SRC}/${file}`, "utf8");
  if (!/=\s*cva\(/.test(code)) continue;

  const variants = extractVariants(code);
  if (Object.keys(variants).length === 0) continue;

  const spec = {
    $schema: "https://kinetixui.com/schema/component-spec.json",
    name,
    title: title(name),
    variants,
    source: `packages/ui/src/components/${file}`,
  };
  const text = JSON.stringify(spec, null, 2) + "\n";
  writeFileSync(`${OUT}/${name}.json`, text);
  writeFileSync(`${PUBLIC_OUT}/${name}.json`, text);
  covered.push(name);
}

const indexText =
  JSON.stringify(
    {
      $schema: "https://kinetixui.com/schema/component-spec-index.json",
      generated: "scripts/gen-component-specs.mjs",
      components: covered,
    },
    null,
    2,
  ) + "\n";
writeFileSync(`${OUT}/index.json`, indexText);
writeFileSync(`${PUBLIC_OUT}/index.json`, indexText);

console.log(`component-specs — ${covered.length} of ${files.length} components covered (cva-based only)`);
