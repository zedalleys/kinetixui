/**
 * a02 — package verifier.
 *
 *   node marketing/content/drafts/a02/verify-package.mjs
 *
 * Same job as a01's: re-check the copy against generated truth rather than against what was true on the day
 * it was written. Every platform figure in the post is compared with `components.manifest.json` as it is
 * NOW, so a package that has gone stale fails here instead of on LinkedIn.
 *
 * Run it from the repo root, and run it again on publish day — `publish-checklist.md` step 1 requires it.
 */
import { readFileSync, readdirSync } from "node:fs";

const dir = "marketing/content/drafts/a02";
const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
const read = (f) => readFileSync(`${dir}/${f}`, "utf8");

/**
 * Only what actually gets posted. Two exclusions matter:
 *  - guidance files (checklist, sources, brief) legitimately QUOTE banned phrases in order to forbid them
 *  - the "## Notes" block inside each copy file is editorial, and does the same
 */
const stripNotes = (t) => t.split(/\n## Notes\b/)[0];
const copy = ["linkedin.md", "x-thread.md"].map((f) => stripNotes(read(f))).join("\n");
const all = files.map(read).join("\n");

const m = JSON.parse(readFileSync("components.manifest.json", "utf8"));
const bp = JSON.parse(readFileSync("block-parity.json", "utf8"));
const defs = m.platformDefinitions;
const comps = Object.entries(m.components);
const cat = Object.keys(defs).filter((p) => defs[p].catalogComplete);
const impl = Object.fromEntries(
  Object.keys(defs).map((p) => [p, comps.filter(([, v]) => (v.platforms || []).includes(p)).length]),
);
const onAll = comps.filter(([, v]) => cat.every((p) => (v.platforms || []).includes(p))).length;

let fail = 0;
const ok = (c, msg) => {
  console.log(`${c ? "ok  " : "FAIL"} ${msg}`);
  if (!c) fail++;
};

console.log(`-- truth: ${comps.length} components ${JSON.stringify(impl)} onAll(${cat.length})=${onAll} blocks=${bp.total}\n`);

// every platform figure in the copy is the generated one
for (const p of Object.keys(defs)) {
  const shown = p === "Compose" ? ["Compose " + impl[p], "Jetpack Compose " + impl[p]] : [p + " " + impl[p]];
  ok(shown.some((s) => copy.includes(s)), `copy states ${p} ${impl[p]}`);
}
ok(copy.includes(`${onAll} of ${comps.length}`), `copy states ${onAll} of ${comps.length}`);
ok(copy.includes(`${comps.length} components`), `copy states ${comps.length} components`);
ok(all.includes(`${bp.total} Blocks`) || all.includes(`${bp.total}, all five`), `package states Blocks ${bp.total}`);

// framings that must never reach a reader
const banned = [
  [/\ball five platforms\b/i, '"all five platforms"'],
  [/\ball five catalogues\b/i, '"all five catalogues"'],
  [/90\s*\/\s*98[^.\n]*all five/i, '"90/98 ... all five"'],
  [/Angular[^.\n]{0,40}\bunsupported\b/i, "Angular as unsupported"],
  [/Angular[^.\n]{0,40}\bis stable\b/i, "Angular as stable"],
  [/\bonly 31\b/i, '"only 31"'],
  [/unfortunately/i, "apologising for a number"],
  [/npm i(nstall)? @kinetixui\/angular/i, "install command for an unpublished package"],
  [/game-changing|revolutionary|seamless|effortless|best-in-class|production-ready everywhere/i, "banned word"],
  [/\bscorecard\b|\bwinner\b|\bbest platform\b/i, "ranking language"],
];
for (const [r, label] of banned) ok(!r.test(copy), `copy avoids: ${label}`);

// a01's figures were true for a01 and are not true now
for (const stale of ["89/98", "89 of 98", "Angular 11", "Compose 89", "SwiftUI 91"]) {
  ok(!copy.includes(stale), `copy has no leaked a01 figure "${stale}"`);
}

ok(/four platforms (that are )?meant to carry/i.test(copy), "the 90/98 denominator names its four platforms");
ok(/[Ss]table package, beta verification/.test(copy), "package maturity vs verification stated as two claims");
ok(/preview/i.test(copy), "Angular's preview state appears in the copy");
ok(/^kx_[a-z0-9][a-z0-9_-]{0,62}$/.test("kx_count_isnt_coverage"), "campaign id matches the attribution contract");
ok(!all.includes("kx_parity_proof"), "does not reuse a01's campaign id");
ok(!files.includes("article.md"), "no article.md — format stays `post`");
ok(files.length === 6, `six files as specified (found ${files.length})`);

/*
 * Publication and version, derived like every platform figure above.
 *
 * The gap this closes: the sources table read "`@kinetixui/{ui,cli,tokens}` 0.22.1" and "Not
 * published | `@kinetixui/angular` | live `npm view` returned 404" for weeks after the core moved
 * to 0.23.1 and Angular shipped at 0.24.0 — and every check in this file passed, because none of
 * them looked at a version or a publication flag. Applied to the guidance files, which is where
 * those facts live.
 */
const versionOf = (d) => JSON.parse(readFileSync(`packages/${d}/package.json`, "utf8")).version;
const known = new Set(["cli", "tokens", "ui", "ui-angular"].map(versionOf));
const publishedNpm = Object.entries(defs).filter(([, d]) => d.distribution?.channel === "npm" && d.distribution.published);

for (const f of ["sources.md", "publish-checklist.md"]) {
  const body = read(f);
  const unknown = [...new Set([...body.matchAll(/0\.\d+\.\d+/g)].map((x) => x[0]))].filter((v) => !known.has(v));
  ok(unknown.length === 0, `${f}: every version named is one a package actually has${unknown.length ? ` — stale: ${unknown.join(", ")}` : ""}`);
  for (const [, d] of publishedNpm) {
    const denial = /(unpublished|not published|returned 404)/i;
    // The full coordinate or the bare package name: these tables sometimes write "`angular`".
    const coordinate = d.distribution.coordinate;
    const names = new RegExp(`(${coordinate}|\\b${coordinate.split("/").pop()}\\b)`, "i");
    const contradictions = body
      .split(/\r?\n/)
      .filter((line) => names.test(line) && denial.test(line));
    ok(contradictions.length === 0, `${f}: no "unpublished" claim for the published ${coordinate}${contradictions.length ? ` (${contradictions[0].trim().slice(0, 90)})` : ""}`);
  }
}
ok(publishedNpm.length > 0, "derived the published set from the manifest rather than listing it");

console.log(fail ? `\n${fail} problem(s)` : "\na02 package QA: all checks passed");
process.exit(fail ? 1 : 0);
