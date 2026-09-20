/**
 * release-notes.mjs — GitHub Release markdown for a version, from the curated changelog data.
 *
 *   pnpm release:notes 0.21.0            print the notes to stdout
 *   pnpm release:notes 0.21.0 --out f.md write them to a file instead
 *
 * Paste the output into a new GitHub Release for the tag `@kinetixui/ui@<version>`, then set
 * `githubReleaseUrl` on that entry in apps/web/src/lib/releases.ts so /docs/changelog links to it.
 * This script never talks to GitHub and never publishes anything.
 *
 * Source of truth is apps/web/src/lib/releases.ts (the human-curated RELEASES array) plus the generated
 * release-packages.json, exactly as the site reads them — nothing is copied into another file. Node
 * can't import that .ts file directly (it imports package.json without an import attribute), so it is
 * transpiled here with the repo's own TypeScript and evaluated with those two JSON imports supplied.
 *
 * Exits 1 with a clear message for an unknown version, 2 for bad usage.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://kinetixui.com";
const REPO = "https://github.com/zedalleys/kinetixui";
const require = createRequire(import.meta.url);

const read = (p) => readFileSync(`${root}/${p}`, "utf8");

/**
 * Evaluate apps/web/src/lib/releases.ts and return its exports (RELEASES, releaseTypeAt, packagesChanged, …).
 * @returns {any}
 */
export function loadReleaseData() {
  const ts = require("typescript");
  const { outputText } = ts.transpileModule(read("apps/web/src/lib/releases.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  });
  const modules = {
    "package.json": JSON.parse(read("packages/ui/package.json")),
    "release-packages.json": JSON.parse(read("apps/web/src/lib/release-packages.json")),
  };
  const localRequire = (id) => {
    const key = Object.keys(modules).find((k) => id.endsWith(k));
    if (!key) throw new Error(`release-notes: releases.ts imports "${id}", which this script does not provide`);
    return modules[key];
  };
  const exports = {};
  new Function("require", "exports", "module", outputText)(localRequire, exports, { exports });
  if (!Array.isArray(exports.RELEASES)) throw new Error("release-notes: could not read RELEASES from apps/web/src/lib/releases.ts");
  return exports;
}

const KIND_ORDER = ["breaking", "security", "accessibility", "new", "improved", "fixed", "deprecated"];
const KIND_LABEL = {
  breaking: "Breaking",
  security: "Security",
  accessibility: "Accessibility",
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
  deprecated: "Deprecated",
};

const titleCase = (slug) => slug.split("-").map((s) => s[0].toUpperCase() + s.slice(1)).join(" ");
const absolute = (href) => (href.startsWith("/") ? `${SITE}${href}` : href);

/** Markdown for one release. Throws (with the known versions) when `version` has no entry. */
export function renderReleaseNotes(data, version) {
  const { RELEASES, releaseTypeAt, packagesChanged } = data;
  const index = RELEASES.findIndex((r) => r.version === version);
  if (index < 0) {
    throw new Error(`unknown version "${version}". Known versions: ${RELEASES.slice(0, 8).map((r) => r.version).join(", ")}${RELEASES.length > 8 ? ", …" : ""}`);
  }
  const r = RELEASES[index];
  const type = releaseTypeAt(index);
  const out = [];

  out.push(`## KinetixUI ${r.version}`, "", `**${type} release · ${r.date}**`, "", r.summary, "");

  const packages = packagesChanged(r.version);
  if (packages) {
    out.push("### Packages", "");
    for (const [key, changed] of [["ui", packages.ui], ["tokens", packages.tokens], ["cli", packages.cli]]) {
      out.push(`- \`@kinetixui/${key}@${r.version}\` — ${changed ? "changed" : "version bump only"}`);
    }
    out.push("");
  }

  if (r.newComponents?.length) {
    const manifest = JSON.parse(read("components.manifest.json")).components;
    out.push("### New components", "");
    for (const g of r.newComponents) {
      const items = g.slugs.map((slug) => {
        const name = titleCase(slug);
        const platforms = manifest[slug]?.platforms;
        const label = existsSync(`${root}/apps/web/src/app/docs/components/${slug}`) ? `[${name}](${SITE}/docs/components/${slug})` : name;
        return platforms?.length ? `${label} (${platforms.join(", ")})` : label;
      });
      out.push(`- **${g.group}** — ${items.join(", ")}`);
    }
    out.push("");
  }

  out.push("### Changes", "");
  const kinds = [...KIND_ORDER, undefined];
  let any = false;
  for (const kind of kinds) {
    const group = r.changes.filter((c) => c.kind === kind);
    if (group.length === 0) continue;
    any = true;
    if (kind) out.push(`#### ${KIND_LABEL[kind]}`, "");
    for (const c of group) {
      const link = c.href ? ` ([docs](${absolute(c.href)}))` : "";
      out.push(`- **${c.title}**${c.body ? ` — ${c.body}` : ""}${link}`);
    }
    out.push("");
  }
  if (!any) out.push("_No changes listed._", "");

  // `breaking` is a claim: [] means "none, and I checked"; undefined means the entry predates that audit.
  out.push("### Breaking changes", "");
  if (r.breaking === undefined) out.push("_Not audited for this release (it predates breaking-change tracking)._", "");
  else if (r.breaking.length === 0) out.push("None.", "");
  else out.push(...r.breaking.map((b) => `- ${b}`), "");

  if (r.migration) out.push("### Migration", "", r.migration, "");

  if (r.limitations?.length) {
    out.push("### Known limitations", "", ...r.limitations.map((l) => `- ${l}`), "");
  }

  out.push(
    "### Links",
    "",
    `- Changelog: ${SITE}/docs/changelog#${r.version}`,
    `- npm: https://www.npmjs.com/package/@kinetixui/ui/v/${r.version}`,
    `- Tag: ${REPO}/tree/@kinetixui/ui@${r.version}`,
    `- Package changelogs: ${REPO}/blob/main/packages/ui/CHANGELOG.md`,
    "",
  );

  return out.join("\n");
}

function main(argv) {
  const args = argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outFile = outIndex >= 0 ? args[outIndex + 1] : undefined;
  const positional = args.filter((a, i) => !a.startsWith("--") && (outIndex < 0 || i !== outIndex + 1));
  if (positional.length !== 1 || (outIndex >= 0 && !outFile)) {
    console.error("usage: pnpm release:notes <version> [--out <file>]\n  e.g. pnpm release:notes 0.21.0");
    return 2;
  }
  const version = positional[0].replace(/^v/, "");
  let notes;
  try {
    notes = renderReleaseNotes(loadReleaseData(), version);
  } catch (err) {
    console.error(`release:notes: ${err.message}`);
    return 1;
  }
  if (outFile) {
    writeFileSync(outFile, notes);
    console.error(`release:notes: wrote ${version} to ${outFile}`);
  } else {
    process.stdout.write(notes);
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main(process.argv));
