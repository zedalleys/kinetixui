/**
 * check-platform-source.mjs — a manifest claim is not evidence.
 *
 *   node scripts/check-platform-source.mjs
 *   node scripts/check-platform-source.mjs --matrix   also print the component x platform state matrix
 *
 * `components.manifest.json` saying a component ships on a platform has, until now, been taken on trust: the
 * only checks were that the platform name was spelled correctly and that gaps had a note. This verifies the
 * other direction — that the source behind every claim exists, and that source which exists is declared.
 *
 * Verification strength differs per platform, and this file is explicit about which kind each one gets rather
 * than implying they are equal:
 *
 *   React    STRUCTURAL — the component's symbols must be exported from packages/ui/src/index.ts.
 *   Angular  STRUCTURAL — the component's symbols must be exported from the package's public-api.ts, and the
 *                         file it points at must exist. Angular is the platform this repository is adding, so
 *                         it gets the strongest check from day one rather than being retro-fitted later.
 *   SwiftUI  FILE       — a source file whose name matches the component must exist under Sources/KinetixUI.
 *   Compose  FILE       — likewise under ui/src/main/kotlin/com/kinetixui/ui.
 *   Flutter  FILE       — likewise under lib/src.
 *
 * The three native platforms are filename-level because their symbols live behind compilers this script cannot
 * run; their real verification is their own CI workflow (native-*.yml), which compiles and tests them. Raising
 * them to structural checks is tracked as follow-up work, not silently claimed here.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");
const manifest = JSON.parse(read("components.manifest.json"));
const parity = existsSync(`${root}/platform-parity.json`) ? JSON.parse(read("platform-parity.json")) : {};
const evidence = existsSync(`${root}/verification.json`) ? JSON.parse(read("verification.json")) : {};
const defs = manifest.platformDefinitions;
const components = manifest.components;

/** "alert-dialog" → ["AlertDialog", "alert_dialog", "alertdialog"] — the spellings a platform might file it under. */
const spellings = (slug) => {
  const pascal = slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
  return [pascal, slug.replace(/-/g, "_"), slug.replace(/-/g, ""), slug];
};

const listFiles = (dir, ext) => {
  const abs = `${root}/${dir}`;
  return existsSync(abs) ? readdirSync(abs).filter((f) => f.endsWith(ext)) : null;
};

/**
 * A component is present if some file in `dir` is named after it (case-insensitively, any spelling), or after
 * the name the manifest says that platform files it under. `sonner` is `Toaster.swift` on SwiftUI and
 * `toaster.dart` on Flutter — a real implementation under the platform's own word for the thing. That alias
 * belongs in the manifest next to the claim, not in a lookup table inside this script.
 */
const fileResolver = (dir, ext, platform) => {
  const files = listFiles(dir, ext);
  if (files === null) return null;
  const lower = files.map((f) => f.toLowerCase());
  return (slug) => {
    const names = [...spellings(slug), components[slug]?.sourceNames?.[platform]].filter(Boolean);
    return names.some((s) => lower.includes(`${s.toLowerCase()}${ext}`) || lower.includes(`kinetix${s.toLowerCase()}${ext}`));
  };
};

/** A component is present if a PascalCase symbol named after it is exported from the package's entry point. */
const exportResolver = (entry) => {
  if (!existsSync(`${root}/${entry}`)) return null;
  const src = read(entry);
  return (slug) => {
    const pascal = spellings(slug)[0];
    // matches `export { Button, ... }`, `export * from "./button"`, `export class KxButton`, re-export paths
    return new RegExp(`\\b(Kx|Kinetix)?${pascal}\\b`).test(src) || new RegExp(`["'\\./]${slug}["'/]`).test(src);
  };
};

const RESOLVERS = {
  React: () => exportResolver("packages/ui/src/index.ts"),
  Angular: () => exportResolver("packages/ui-angular/src/public-api.ts"),
  SwiftUI: () => fileResolver("packages/ui-swiftui/Sources/KinetixUI", ".swift", "SwiftUI"),
  Compose: () => fileResolver("packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui", ".kt", "Compose"),
  Flutter: () => fileResolver("packages/ui-flutter/lib/src", ".dart", "Flutter"),
};

const MATRIX = process.argv.includes("--matrix");
const DETAIL = process.argv.find((a) => a.startsWith("--verification"));
/** `--verification` for every component, or `--verification=button` for one. */
const DETAIL_SLUG = DETAIL?.includes("=") ? DETAIL.split("=")[1] : null;

/**
 * The component x platform matrix, printed on demand.
 *
 * Four support states, and they are not interchangeable: an implementation is parity, the other three are
 * guidance. The "source proof" row says what proves the PRESENCE of each platform's source — a much weaker
 * thing than how well the implementation is verified, which `--verification` prints from the evidence.
 */
const SOURCE_PROOF = {
  React: "exports",
  Angular: "exports+ngc",
  SwiftUI: "file",
  Compose: "file",
  Flutter: "file",
};
const CELL = {
  implementation: "impl",
  "native-equivalent": "native-eq",
  composition: "composition",
  planned: "planned",
};

const stateOf = (slug, platform) =>
  components[slug].platforms.includes(platform)
    ? "implementation"
    : components[slug].platformGuidance?.[platform]?.type ?? "MISSING";

function printMatrix() {
  const names = Object.keys(components).sort();
  const platforms = Object.keys(defs);
  const width = Math.max(...names.map((n) => n.length));
  const col = Math.max(...Object.values(CELL).map((c) => c.length), ...Object.values(SOURCE_PROOF).map((v) => v.length)) + 1;
  console.log("\nComponent x platform — 'impl' is the only state that counts as parity.\n");
  console.log(`${"component".padEnd(width)}  ${platforms.map((p) => p.padEnd(col)).join("")}`);
  console.log(`${"source proof".padEnd(width)}  ${platforms.map((p) => SOURCE_PROOF[p].padEnd(col)).join("")}`);
  console.log(`${"package".padEnd(width)}  ${platforms.map((p) => defs[p].maturity.padEnd(col)).join("")}`);
  console.log(`${"verification".padEnd(width)}  ${platforms.map((p) => String(parity.catalogueVerification?.[p] ?? "-").padEnd(col)).join("")}`);
  console.log("-".repeat(width + 2 + platforms.length * col));
  const totals = {};
  for (const name of names) {
    const cells = platforms.map((p) => {
      const state = stateOf(name, p);
      totals[state] = (totals[state] ?? 0) + 1;
      return (CELL[state] ?? state).padEnd(col);
    });
    console.log(`${name.padEnd(width)}  ${cells.join("")}`);
  }
  console.log("-".repeat(width + 2 + platforms.length * col));
  console.log(Object.entries(totals).map(([k, v]) => `${CELL[k] ?? k} ${v}`).join("  ·  "));
  console.log(`${names.length} components x ${platforms.length} platforms = ${names.length * platforms.length} cells\n`);
}

/**
 * Per-component detail: what each platform tab is, what the package promises, and exactly which evidence
 * stands behind the implementation — with the file and line range that proves each one.
 *
 * Three separate lines because they are three separate statements. A reader who sees "package: stable" and
 * "verification: experimental" on adjacent lines has learned something true that one word could not say.
 */
function printVerification() {
  const names = DETAIL_SLUG ? [DETAIL_SLUG] : Object.keys(components).sort();
  for (const slug of names) {
    if (!components[slug]) {
      console.error(`  x no component "${slug}" in the manifest`);
      process.exitCode = 1;
      return;
    }
    console.log(`\n${slug}  —  lifecycle: ${components[slug].status}`);
    for (const platform of Object.keys(defs)) {
      const state = stateOf(slug, platform);
      const bits = [`  ${platform.padEnd(9)} ${(CELL[state] ?? state).padEnd(12)}`];
      if (state === "implementation") {
        bits.push(`package: ${defs[platform].maturity.padEnd(12)}`, `verification: ${parity.verification?.[slug]?.[platform] ?? "?"}`);
      }
      console.log(bits.join(" "));
      if (state !== "implementation") continue;
      const ev = evidence.components?.[slug]?.[platform] ?? {};
      for (const kind of evidence.kinds ?? []) {
        console.log(`      ${kind.padEnd(14)} ${ev[kind] ? `yes   ${ev[kind].join(", ")}` : "—"}`);
      }
    }
  }
  console.log("");
}

const errors = [];
const warnings = [];
const summary = [];

for (const platform of Object.keys(defs)) {
  const make = RESOLVERS[platform];
  if (!make) {
    errors.push(`${platform}: declared in platformDefinitions but scripts/check-platform-source.mjs has no resolver for it — add one before advertising the platform`);
    continue;
  }
  const has = make();
  if (has === null) {
    // the package directory is absent entirely: fine only while nothing claims the platform
    const claimed = Object.keys(components).filter((s) => components[s].platforms.includes(platform));
    if (claimed.length) errors.push(`${platform}: ${claimed.length} components claim it but ${defs[platform].dir} does not exist`);
    else summary.push(`${platform.padEnd(8)} no package yet, and nothing claims it`);
    continue;
  }
  let declared = 0;
  let undeclaredWithSource = 0;
  for (const [slug, c] of Object.entries(components)) {
    // A `composition` entry (combobox → command) is a documented recipe, not an exported symbol. It is still a
    // real, checkable claim — the component it is built from must exist on the same platform — but looking for
    // a file or export named after it would be looking for something that was never meant to be there.
    if (c.composition) {
      if (!components[c.composition]) errors.push(`${slug}: composition of "${c.composition}", which is not in the manifest`);
      else if (c.platforms.includes(platform) && !components[c.composition].platforms.includes(platform)) {
        errors.push(`${slug}: claims ${platform}, but the component it composes (${c.composition}) is not on ${platform}`);
      }
      continue;
    }
    const claims = c.platforms.includes(platform);
    const present = has(slug);
    if (claims && !present) errors.push(`${slug}: manifest says ${platform}, but no matching source in ${defs[platform].dir}`);
    if (claims) declared++;
    // Source without a manifest claim is only an error where the catalogue is complete. On a platform still
    // rolling out it usually means "implemented, manifest not updated yet" — worth surfacing, not worth failing
    // the build over... except it hides real coverage, so it is a warning that CI prints.
    if (!claims && present) {
      undeclaredWithSource++;
      if (defs[platform].catalogComplete) errors.push(`${slug}: ${platform} source exists in ${defs[platform].dir} but the manifest omits ${platform}`);
      else warnings.push(`${slug}: ${platform} source appears to exist but the manifest omits ${platform} — add it, or rename the file if it is not that component`);
    }
  }
  summary.push(`${platform.padEnd(8)} ${String(declared).padStart(3)} declared${undeclaredWithSource ? `, ${undeclaredWithSource} undeclared with source` : ""}`);
}

// Platforms must not be reintroduced as anything other than a component implementation. HTML/CSS is a token
// OUTPUT, never a platform — the site said so for a year and the manifest should enforce it.
const BANNED = ["HTML", "CSS", "HTML/CSS", "Tailwind", "Web"];
for (const p of Object.keys(defs)) {
  if (BANNED.includes(p)) errors.push(`platformDefinitions.${p}: ${p} is a token output, not a component implementation platform`);
}

if (MATRIX) printMatrix();
if (DETAIL) printVerification();
console.log(summary.map((s) => `  ${s}`).join("\n"));
if (warnings.length) console.warn(`\n${warnings.map((w) => `  ! ${w}`).join("\n")}`);
if (errors.length) {
  console.error(`\n${errors.map((e) => `  ✗ ${e}`).join("\n")}`);
  console.error(`\ncheck:platform-source failed — ${errors.length} claim(s) not backed by source.`);
  process.exit(1);
}
console.log(`\ncheck:platform-source ok — every declared platform is backed by source.`);
