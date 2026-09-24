/**
 * check-platform-code.mjs — every snippet the component pages show must be real, and every platform tab must
 * be honest about what kind of answer it is giving.
 *
 *   node scripts/check-platform-code.mjs
 *
 * `apps/web/src/registry/platform-code.ts` carries the hand-written SwiftUI / Compose / Flutter snippet for
 * each demo on a component page. Until this check existed, nothing verified any of it: the snippets were
 * hand-typed, and an API that never existed read exactly like one that did. It did happen — `chart-demo`
 * advertised a Compose `KinetixChart` that had no source file, under a comment describing Flutter's
 * CustomPaint implementation.
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
 * Angular gets neither exception: it has no hand-written tier at all. Every Angular snippet comes from a
 * template the Angular compiler type-checks, so a hand-written Angular entry in platform-code.ts is rejected
 * outright rather than symbol-checked.
 *
 * The third job is the guidance contract. A component page shows a tab for all five platforms. Where the
 * component is not implemented on one, `components.manifest.json` must declare `platformGuidance` for it:
 *
 *   native-equivalent / composition   there IS a snippet, and the page labels it as not a port.
 *   planned                           there is NOT a snippet; the page says which wave it is in.
 *
 * Both directions are enforced. A snippet with no declaration is indistinguishable from a false claim of
 * support; a declaration with no snippet is a tab that promises an answer and shows nothing.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");

const src = read("apps/web/src/registry/platform-code.ts");
const manifest = JSON.parse(read("components.manifest.json"));
const components = manifest.components;

/** platform-code.ts / usage-examples key → the manifest platform it documents. */
const PLATFORM_OF = { angular: "Angular", swift: "SwiftUI", kotlin: "Compose", dart: "Flutter" };
/** The ones platform-code.ts may still carry by hand. Angular is deliberately absent. */
const HAND_WRITTEN = ["swift", "kotlin", "dart"];
const SNIPPET_RE = {
  angular: /\n {4}angular: `([\s\S]*?)`,\n/,
  swift: /\n {4}swift: `([\s\S]*?)`,\n/,
  kotlin: /\n {4}kotlin: `([\s\S]*?)`,\n/,
  dart: /\n {4}dart: `([\s\S]*?)`,\n/,
};
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

const generated = existsSync(`${root}/apps/web/src/registry/usage-examples.generated.ts`)
  ? read("apps/web/src/registry/usage-examples.generated.ts")
  : "";

/** Whether the generated module carries this demo key for this platform. */
const generatedHas = (key, platform) => {
  const at = generated.indexOf(`  "${key}": {`);
  if (at === -1) return false;
  const block = generated.slice(at, generated.indexOf("\n  },", at));
  return block.includes(`"${platform}":`);
};

const errors = [];
const stats = { generated: 0, symbols: 0, guidance: 0 };

const keyRe = /^ {2}"([^"]+)": \{$/gm;
let m;
const keys = [];
while ((m = keyRe.exec(src))) keys.push({ key: m[1], at: m.index });
if (keys.length === 0) errors.push("platform-code.ts: parsed no entries — has its shape changed?");

/** The guidance entry that lets `key` show a snippet for `platform` without claiming a port, or null. */
const guidanceFor = (slug, platform) => {
  const g = components[slug]?.platformGuidance?.[platform];
  return g && g.type !== "planned" ? g : null;
};

for (let i = 0; i < keys.length; i++) {
  const { key } = keys[i];
  const body = src.slice(keys[i].at, i + 1 < keys.length ? keys[i + 1].at : src.length);
  const slug = key.replace(DEMO_SUFFIX, "");
  if (!components[slug]) {
    errors.push(`${key}: does not map to a component in components.manifest.json (tried "${slug}")`);
    continue;
  }

  if (SNIPPET_RE.angular.test(body)) {
    errors.push(`${key}: has a hand-written Angular snippet. Angular examples live in packages/ui-angular/src/usage and are extracted by \`pnpm gen:usage\`, so the compiler checks them.`);
  }

  for (const p of HAND_WRITTEN) {
    const mm = body.match(SNIPPET_RE[p]);
    if (!mm) continue;
    const snippet = mm[1];
    const platform = PLATFORM_OF[p];
    const supported = components[slug].platforms.includes(platform);
    const guidance = guidanceFor(slug, platform);

    if (!supported && !guidance) {
      errors.push(
        `${key}: shows a ${platform} snippet, but ${slug} is not on ${platform}. Declare platformGuidance.${platform} in components.manifest.json (composition or native-equivalent, with a reason); otherwise delete it.`,
      );
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
    if (guidance) stats.guidance++;
    else stats.symbols++;
  }
}

/**
 * The other direction: a component that declares a native-equivalent or a composition has promised the page
 * something to render. The demo key is the component's own `<slug>-demo`, which is what the component page
 * mounts.
 */
const handWrittenKeys = new Set(keys.map((k) => k.key));
const handWrittenHas = (key, p) => {
  const entry = keys.find((k) => k.key === key);
  if (!entry) return false;
  const i = keys.indexOf(entry);
  const body = src.slice(entry.at, i + 1 < keys.length ? keys[i + 1].at : src.length);
  return SNIPPET_RE[p].test(body);
};
const TAB_OF = Object.fromEntries(Object.entries(PLATFORM_OF).map(([tab, platform]) => [platform, tab]));

for (const [slug, c] of Object.entries(components)) {
  for (const [platform, g] of Object.entries(c.platformGuidance ?? {})) {
    if (g.type === "planned") continue;
    const tab = TAB_OF[platform];
    if (!tab) {
      errors.push(`${slug}: platformGuidance names ${platform}, which has no code tab — guidance can only be shown where a tab exists`);
      continue;
    }
    const key = `${slug}-demo`;
    if (!generatedHas(key, tab) && !handWrittenHas(key, tab)) {
      errors.push(
        `${slug}: declares ${platform} guidance ("${g.type}") but there is no ${key} snippet for it — the tab would show a reason and no code. Add a kx-usage region, or a platform-code.ts entry.`,
      );
    }
    stats.guidance += 0; // counted above for hand-written; generated ones are counted with the generated total
  }
}

// Angular is fully generated, so every Angular implementation must have an example — there is no other tier
// it could fall back to.
for (const [slug, c] of Object.entries(components)) {
  if (!c.platforms.includes("Angular")) continue;
  if (!generatedHas(`${slug}-demo`, "angular")) {
    errors.push(`${slug}: declared on Angular but has no ${slug}-demo example in packages/ui-angular/src/usage — the Angular tab would be empty`);
  }
}

const generatedKeys = [...generated.matchAll(/^ {2}"([a-z0-9-]+)": {$/gm)].map((m) => m[1]);
void handWrittenKeys;
console.log(
  `  ${new Set([...keys.map((k) => k.key), ...generatedKeys]).size} demo keys — ${generatedKeys.length} with compiled examples, ` +
    `${stats.symbols} symbol-checked, ${stats.guidance} labelled as guidance rather than a port`,
);
if (errors.length) {
  console.error(`\n${errors.map((e) => `  x ${e}`).join("\n")}`);
  console.error(`\ncheck:platform-code failed — ${errors.length} problem(s).`);
  process.exit(1);
}
console.log("check:platform-code ok — every snippet is backed by a real API, and every gap says what it is.");
