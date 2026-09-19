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
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = `${ROOT}/packages/ui/src/components`;
const OUT = `${ROOT}/specs/components`;
const PUBLIC_OUT = `${ROOT}/apps/web/public/specs`;
mkdirSync(OUT, { recursive: true });
mkdirSync(PUBLIC_OUT, { recursive: true });

const manifest = JSON.parse(readFileSync(`${ROOT}/components.manifest.json`, "utf8")).components;
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

// ── props / parts, extracted with the TypeScript compiler ────────────────
// For every exported PascalCase callable (the component and its sub-parts), record the
// props the component itself declares — not the HTML/Radix props it inherits from the
// element or primitive it wraps (an empty `props` means "only inherited element props").
const require = createRequire(`${ROOT}/packages/ui/package.json`);
const ts = require("typescript");
const tsconfig = ts.getParsedCommandLineOfConfigFile(`${ROOT}/packages/ui/tsconfig.json`, {}, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (d) => {
    throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"));
  },
});
const program = ts.createProgram(tsconfig.fileNames, tsconfig.options);
const checker = program.getTypeChecker();

// Props whose declaration lives in a library are inherited surface, not this component's own.
const INHERITED = /[\/]node_modules[\/]/;
const LIB_DTS = /[\/]typescript[\/]lib[\/]lib\.[\w.]*\.d\.ts$/;
const oneLine = (s, max) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

/** Own props of one exported component symbol, or null if it isn't a component. */
function componentOf(sf, exportSymbol) {
  let sym = exportSymbol;
  if (sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
  if (!(sym.flags & ts.SymbolFlags.Value) || !/^[A-Z]/.test(exportSymbol.name)) return null;
  const sigs = checker.getTypeOfSymbolAtLocation(sym, sf).getCallSignatures();
  if (!sigs.length) return null;
  const param = sigs[0].getParameters()[0];
  const props = [];
  if (param) {
    const propsType = checker.getTypeOfSymbolAtLocation(param, sf);
    for (const p of checker.getPropertiesOfType(propsType)) {
      const decl = p.declarations?.[0];
      if (decl) {
        const file = decl.getSourceFile().fileName;
        if (INHERITED.test(file) || LIB_DTS.test(file)) continue;
      }
      const type = checker.getTypeOfSymbolAtLocation(p, sf);
      const required = !(p.flags & ts.SymbolFlags.Optional);
      let typeText = checker.typeToString(type, sf, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
      // `required: false` already says "may be omitted" — don't repeat it as `| undefined`.
      if (!required) typeText = typeText.replace(/ \| undefined$/, "");
      const entry = { name: p.name, type: oneLine(typeText, 140), required };
      const doc = ts.displayPartsToString(p.getDocumentationComment(checker));
      if (doc) entry.description = oneLine(doc, 200);
      props.push(entry);
    }
  }
  return { name: exportSymbol.name, props };
}

function extractComponents(file) {
  const sf = program.getSourceFile(`${SRC}/${file}`);
  const mod = sf && checker.getSymbolAtLocation(sf);
  if (!mod) return [];
  return checker
    .getExportsOfModule(mod)
    .map((s) => componentOf(sf, s))
    .filter(Boolean);
}

// ── one spec per registry component ───────────────────────────────────────
const covered = [];
const companions = [];
for (const [name, meta] of Object.entries(manifest)) {
  if (meta.registry === false) {
    companions.push(name); // docs-page companion shipped inside another component's file
    continue;
  }
  const file = `${name}.tsx`;
  const code = readFileSync(`${SRC}/${file}`, "utf8");
  const variants = /=\s*cva\(/.test(code) ? extractVariants(code) : {};

  const spec = {
    $schema: "https://kinetixui.com/schema/component-spec.json",
    name,
    title: title(name),
    // lifecycle + coverage come from components.manifest.json, not the source
    status: meta.status,
    since: meta.since,
    platforms: meta.platforms,
    variants,
    components: extractComponents(file),
    source: `packages/ui/src/components/${file}`,
  };
  const text = JSON.stringify(spec, null, 2) + "\n";
  writeFileSync(`${OUT}/${name}.json`, text);
  writeFileSync(`${PUBLIC_OUT}/${name}.json`, text);
  covered.push(name);
}

const total = Object.values(manifest).filter((m) => m.registry !== false).length;
const indexText =
  JSON.stringify(
    {
      $schema: "https://kinetixui.com/schema/component-spec-index.json",
      generated: "scripts/gen-component-specs.mjs",
      components: covered,
      // docs-page components with no file of their own (avatar-group ships in avatar.tsx, combobox is a documented composition)
      companions,
      coverage: { covered: covered.length, total },
    },
    null,
    2,
  ) + "\n";
writeFileSync(`${OUT}/index.json`, indexText);
writeFileSync(`${PUBLIC_OUT}/index.json`, indexText);

console.log(`component-specs — ${covered.length} of ${total} components covered`);
