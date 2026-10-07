#!/usr/bin/env node
/**
 * Every published package's README links only to things its readers can reach.
 *
 * A README ships twice: on GitHub, where a relative link resolves against the repository, and inside the npm
 * tarball, where it is the package's page on npmjs.com and the file in `node_modules`. Those are not the same
 * place. A link such as `../../docs/iot/DEVICE-INTERACTION-CONTRACT.md` works on GitHub and points outside the
 * tarball everywhere else, because `docs/` is not part of any package; whether npmjs.com rewrites it to the
 * repository depends on how it treats `repository.directory`, which is not something CI can check offline.
 *
 * So the rule is the one that holds in every place a README is read: a relative link must stay inside the
 * package's own directory and name a file that exists there. Anything else is an absolute URL. Offline: it reads
 * the release allowlist and the READMEs, nothing more.
 *
 * Phase 3D. Reproduced before the fix: `packages/iot/README.md` linked the device contract twice with
 * `../../docs/…`.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const allowlist = JSON.parse(readFileSync(path.join(root, "release/publish-packages.json"), "utf8"));

/** Markdown link and image targets, and HTML href/src attributes. Code spans and fenced blocks are skipped. */
function targets(markdown) {
  const prose = markdown.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
  const found = [];
  for (const m of prose.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) found.push(m[1]);
  for (const m of prose.matchAll(/^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/gm)) found.push(m[1]);
  for (const m of prose.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/g)) found.push(m[1]);
  return found;
}

const problems = [];
let checked = 0;
for (const pkg of allowlist.packages) {
  const dir = path.join(root, pkg.directory);
  const readme = path.join(dir, "README.md");
  if (!existsSync(readme)) continue;
  for (const target of targets(readFileSync(readme, "utf8"))) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target.startsWith("//")) continue;
    checked++;
    const file = decodeURIComponent(target.split("#")[0].split("?")[0]);
    const resolved = path.resolve(dir, file);
    const inside = resolved === dir || resolved.startsWith(dir + path.sep);
    if (!inside) problems.push(`${pkg.name}: README links "${target}", which leaves the package directory — npm readers cannot follow it. Use an absolute URL.`);
    else if (!existsSync(resolved)) problems.push(`${pkg.name}: README links "${target}", which does not exist in ${pkg.directory}.`);
  }
}

if (problems.length) {
  console.error(`check:package-readmes — ${problems.length} problem(s):\n` + problems.map((p) => `  ${p}`).join("\n"));
  process.exit(1);
}
console.log(`check:package-readmes ok — ${allowlist.packages.length} published packages, ${checked} relative link(s), all inside their package.`);
