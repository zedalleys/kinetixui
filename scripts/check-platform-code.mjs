/**
 * check-platform-code.mjs — every native snippet the component pages show must be real.
 *
 *   node scripts/check-platform-code.mjs
 *
 * `apps/web/src/registry/platform-code.ts` carries the SwiftUI / Compose / Flutter snippet for each demo on a
 * component page. Until this check existed, nothing verified any of it: the snippets were hand-typed, and an
 * API that never existed read exactly like one that did. It did happen — `chart-demo` advertised a Compose
 * `KinetixChart` that has no source file, under a comment describing Flutter's CustomPaint implementation.
 *
 * Two levels of proof, and this file is explicit about which each snippet gets rather than implying they are
 * equal:
 *
 *   GENERATED  the snippet is extracted from a `kx-usage` region in a file the platform's CI compiles, and is
 *              checked for drift against it. This is the real thing, and the direction every snippet is
 *              migrating in (scripts/gen-usage-examples.mjs).
 *   SYMBOLS    the snippet is still hand-written, but every `Kinetix*` identifier in it must be declared in
 *              that platform's package. That cannot prove the arguments are right; it does prove the API
 *              exists, which is the failure that actually reached the website.
 *
 * It also enforces that a snippet for a platform the component is NOT on — a composition shown in place of a
 * port — is declared as such in `compositions`, with a reason. Those are legitimate and useful, but a reader
 * has to be told, and an undeclared one is indistinguishable from a false claim of support.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");

const src = read("apps/web/src/registry/platform-code.ts");
const manifest = JSON.parse(read("components.manifest.json"));
const components = manifest.components;

/** platform-code.ts key → the manifest platform it documents. */
const PLATFORM_OF = { swift: "SwiftUI", kotlin: "Compose", dart: "Flutter" };
const SNIPPET_RE = { swift: /\n {4}swift: `([\s\S]*?)`,\n/, kotlin: /\n {4}kotlin: `([\s\S]*?)`,\n/, dart: /\n {4}dart: `([\s\S]*?)`,\n/ };
/** A demo key is `<slug>` plus one of these variants. */
const DEMO_SUFFIX = /-(demo|variants|sizes|states)$/;

/** Every `Kinetix*` identifier a package declares anywhere in its source. */
const declaredSymbols = (dir, ext) => {
  const out = new Set();
  if (!existsSync(`${root}/${dir}`)) return out;
  const walk = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${f.name}`;
      if (f.isDirectory()) walk(p);
      else if (f.name.endsWith(ext)) for (const s of readFileSync(p, "utf8").match(/\bKinetix[A-Za-z0-9]+/g) || []) out.add(s);
    }
  };
  walk(`${root}/${dir}`);
  return out;
};
const DECLARED = {
  swift: declaredSymbols("packages/ui-swiftui/Sources/KinetixUI", ".swift"),
  kotlin: declaredSymbols("packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui", ".kt"),
  dart: declaredSymbols("packages/ui-flutter/lib", ".dart"),
};

const compositions = JSON.parse(read("platform-code-compositions.json")).compositions;
const generated = existsSync(`${root}/apps/web/src/registry/usage-examples.generated.ts`)
  ? read("apps/web/src/registry/usage-examples.generated.ts")
  : "";

/** Whether the generated module already carries this demo key for this platform. */
const generatedHas = (key, platform) => {
  const at = generated.indexOf(`  "${key}": {`);
  if (at === -1) return false;
  const block = generated.slice(at, generated.indexOf("\n  },", at));
  return block.includes(`"${platform}":`);
};

const errors = [];
const stats = { generated: 0, symbols: 0, composition: 0 };

const keyRe = /^ {2}"([^"]+)": \{$/gm;
let m;
const keys = [];
while ((m = keyRe.exec(src))) keys.push({ key: m[1], at: m.index });
if (keys.length === 0) errors.push("platform-code.ts: parsed no entries — has its shape changed?");

for (let i = 0; i < keys.length; i++) {
  const { key } = keys[i];
  const body = src.slice(keys[i].at, i + 1 < keys.length ? keys[i + 1].at : src.length);
  const slug = key.replace(DEMO_SUFFIX, "");
  if (!components[slug]) {
    errors.push(`${key}: does not map to a component in components.manifest.json (tried "${slug}")`);
    continue;
  }

  for (const p of Object.keys(PLATFORM_OF)) {
    const mm = body.match(SNIPPET_RE[p]);
    if (!mm) continue;
    const snippet = mm[1];
    const platform = PLATFORM_OF[p];
    const supported = components[slug].platforms.includes(platform);
    const composition = compositions[key];
    const declaredComposition = composition?.platforms?.includes(platform) ? composition : null;

    if (!supported && !declaredComposition) {
      errors.push(
        `${key}: shows a ${platform} snippet, but ${slug} is not on ${platform}. If this is the composition to use instead of a port, declare it in platform-code-compositions.json with a reason; otherwise delete it.`,
      );
    }
    if (supported && declaredComposition) {
      errors.push(`${key}: declared as a ${platform} composition, but ${slug} IS on ${platform} — the declaration is stale`);
    }

    // A migrated key MOVES out of platform-code.ts rather than being copied: holding both a compiled
    // example and a hand-written snippet is exactly the duplication this whole change removes.
    if (generatedHas(key, p)) {
      errors.push(`${key}: has a compiled ${platform} example AND a hand-written snippet — delete the platform-code.ts entry`);
      continue;
    }

    const unknown = [...new Set(snippet.match(/\bKinetix[A-Za-z0-9]+/g) || [])].filter((s) => !DECLARED[p].has(s));
    if (unknown.length) {
      errors.push(`${key}: ${platform} snippet uses ${unknown.join(", ")} — no such symbol in that package`);
      continue;
    }
    if (declaredComposition) stats.composition++;
    else stats.symbols++;
  }
}

// A declaration with no snippet left behind is dead weight that will mislead the next reader.
for (const [key, entry] of Object.entries(compositions)) {
  if (!keys.find((k) => k.key === key)) { errors.push(`platform-code-compositions.json: "${key}" is not a key in platform-code.ts`); continue; }
  for (const platform of entry.platforms ?? []) {
    if (!Object.values(PLATFORM_OF).includes(platform)) errors.push(`platform-code-compositions.json: "${key}" names unknown platform "${platform}"`);
  }
  if (!entry.reason || entry.reason.length < 30) errors.push(`platform-code-compositions.json: "${key}" needs a real reason, not "${entry.reason ?? ""}"`);
}

const generatedKeys = [...generated.matchAll(/^ {2}"([a-z0-9-]+)": {$/gm)].map((m) => m[1]);
console.log(
  `  ${keys.length + generatedKeys.length} demo keys — ${generatedKeys.length} from compiled source, ` +
    `${stats.symbols} symbol-checked, ${stats.composition} declared compositions`,
);
if (errors.length) {
  console.error(`\n${errors.map((e) => `  x ${e}`).join("\n")}`);
  console.error(`\ncheck:platform-code failed — ${errors.length} problem(s).`);
  process.exit(1);
}
console.log("check:platform-code ok — every native snippet is backed by a real API.");
