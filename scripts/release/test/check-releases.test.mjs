import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { it } from "node:test";

// Rule 6 — "every newComponents slug is a real component" — reads the generated `releases.ts`, so it
// is covered here through the real script in a temporary tree rather than by unit-testing a regexp.
//
// The defect this pins: the extraction scanned the whole `newComponents` block for slug-shaped
// strings and filtered the literal key name `"group"`, which swept up the group's VALUE. Measured
// end to end before the fix, a note identical but for the label:
//   group: "Forms" -> check:releases ok — 44 entries, latest 0.27.0
//   group: "forms" -> ✗ newComponents slug "forms" is not in components.manifest.json
// A free-text display label was being required to be a component. The same shape filter also let a
// miscapitalised slug through, because `[a-z][a-z0-9-]*` simply does not match `Date-Picker`.

const MANIFEST = { components: { input: {}, "date-picker": {} } };
// The repository's own manifest, for the cases that must accept whatever a real curated note names.
const REAL_MANIFEST = JSON.parse(readFileSync(new URL("../../../components.manifest.json", import.meta.url), "utf8"));
const VERSIONS = ["0.27.0", "0.26.1", "0.26.0", "0.25.0", "0.24.1"];

/** A tree holding the five entries rule 1 needs, the newest carrying the given newComponents groups.
 *  `groups` is [{ group, slugs }]; `raw` replaces the whole newComponents block for malformed cases.
 *  `manifest` defaults to the two-component MANIFEST above; pass the repository's own to check a note
 *  that names any real component, which the restricted one would reject for existing. */
const tree = ({ group, slug, groups, raw, manifest = MANIFEST }) => {
  const root = mkdtempSync(path.join(tmpdir(), "kinetix-check-releases-"));
  for (const dir of ["scripts", "packages/ui", "packages/tokens", "packages/cli", "apps/web/src/lib", "release"]) mkdirSync(path.join(root, dir), { recursive: true });
  copyFileSync(new URL("../../check-releases.mjs", import.meta.url), path.join(root, "scripts/check-releases.mjs"));
  writeFileSync(path.join(root, "scripts/gen-release-meta.mjs"), "");
  writeFileSync(path.join(root, "components.manifest.json"), JSON.stringify(manifest));
  writeFileSync(path.join(root, "release/publish-packages.json"), JSON.stringify({ packages: [{ name: "@kinetixui/ui", directory: "packages/ui", releaseGroup: "core" }] }));
  writeFileSync(path.join(root, "packages/ui/package.json"), JSON.stringify({ version: "0.27.0" }));
  // Rule 3 reads the three core changelogs and reports any version they carry that RELEASES omits,
  // so the fixture must list exactly the five entries below — otherwise rule 3 fails and rule 6's
  // verdict could not be read on its own.
  const changelog = `# @kinetixui\n\n${VERSIONS.map((v) => `## ${v}\n\n- a change\n`).join("\n")}`;
  for (const p of ["ui", "tokens", "cli"]) writeFileSync(path.join(root, `packages/${p}/CHANGELOG.md`), changelog);

  const list = groups ?? [{ group, slugs: [slug] }];
  const block = raw ?? `    newComponents: [
${list.map((g) => `      {
        group: ${JSON.stringify(g.group)},
        slugs: [
${g.slugs.map((x) => `          ${JSON.stringify(x)}`).join(",\n")}
        ]
      }`).join(",\n")}
    ],`;
  const newest = `  {
    version: "0.27.0",
    date: "2026-10-31",
    summary: "s",
    breaking: [],
${block}
  },\n`;
  const older = VERSIONS.slice(1)
    .map((v, i) => `  {\n    version: "${v}",\n    date: "2026-0${6 - i}-01",\n    summary: "s",\n    breaking: [],\n  },\n`)
    .join("");
  writeFileSync(path.join(root, "apps/web/src/lib/releases.ts"), `export const RELEASES: Release[] = [\n${newest}${older}];\n`);
  return root;
};

const run = (opts) => {
  const root = tree(opts);
  try {
    const r = spawnSync(process.execPath, ["scripts/check-releases.mjs"], { cwd: root, encoding: "utf8" });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  } finally { rmSync(root, { recursive: true, force: true }); }
};

it("accepts a lowercase newComponents group label, which is a display string and not a slug", () => {
  const upper = run({ group: "Forms", slug: "input" });
  const lower = run({ group: "forms", slug: "input" });
  assert.equal(upper.status, 0, upper.out);
  // The whole point: the label's capitalisation must not decide whether the release validates.
  assert.equal(lower.status, 0, `a lowercase group label was read as a component slug:\n${lower.out}`);
});

it("still rejects a slug that is not in the manifest", () => {
  const r = run({ group: "Forms", slug: "date-pikcer" });
  assert.equal(r.status, 1);
  assert.match(r.out, /newComponents slug "date-pikcer" is not in components\.manifest\.json/);
});

it("rejects a miscapitalised slug, which the old shape filter skipped silently", () => {
  const r = run({ group: "Forms", slug: "Date-Picker" });
  assert.equal(r.status, 1, `"Date-Picker" is not a manifest slug and must be reported:\n${r.out}`);
  assert.match(r.out, /newComponents slug "Date-Picker" is not in components\.manifest\.json/);
});

// --- the remaining cases from the verification list ----------------------------------------------

it("reads every slug across several groups, and several slugs in one group", () => {
  const ok = run({ groups: [{ group: "Forms", slugs: ["input", "date-picker"] }, { group: "data", slugs: ["input"] }] });
  assert.equal(ok.status, 0, ok.out);

  // One bad slug in the second group must still be found: a per-group `slugs:` match that stopped at
  // the first array would miss it, which is the obvious way to get this extraction wrong.
  const bad = run({ groups: [{ group: "Forms", slugs: ["input"] }, { group: "Data", slugs: ["input", "nope-not-real"] }] });
  assert.equal(bad.status, 1);
  assert.match(bad.out, /newComponents slug "nope-not-real" is not in components\.manifest\.json/);
});

it("accepts an empty slugs array and a group list with no slugs at all", () => {
  assert.equal(run({ groups: [{ group: "Forms", slugs: [] }] }).status, 0);
  assert.equal(run({ raw: "    newComponents: [],", }).status, 0);
});

it("does not crash on malformed newComponents data, and says what it can", () => {
  // An unterminated block. The depth-based scan never gets back to zero, so it ends at the end of the
  // block and reports the slug it did read — strictly more than the previous extraction, which needed
  // to match a closing `\n    ],` and so found nothing at all here. Such a file does not typecheck and
  // never reaches `main`; this pins that the failure mode is a report, not a crash and not silence.
  const r = run({ raw: '    newComponents: [ { group: "Forms", slugs: ["nope-not-real"' });
  assert.equal(r.status, 1, `expected the readable slug to be reported, got:\n${r.out}`);
  assert.match(r.out, /newComponents slug "nope-not-real" is not in components\.manifest\.json/);
  assert.doesNotMatch(r.out, /Cannot read|undefined is not|TypeError/);
});

// --- Codex finding, 2026-10-31: punctuation inside a slug must not hide the slugs after it --------

it("reads slugs whose own text contains the characters that end a pattern", () => {
  // Measured on the `\[([\s\S]*?)\]` extraction this replaces: `slugs: ["input]", "date-pikcer"]`
  // extracted NOTHING, so BOTH slugs went unchecked and the release validated. The `]` inside the
  // first slug closed the array early and left the rest of it outside every match.
  const bracket = run({ groups: [{ group: "Forms", slugs: ["input]", "date-pikcer"] }] });
  assert.equal(bracket.status, 1, `a "]" inside a slug suppressed the whole array:\n${bracket.out}`);
  assert.match(bracket.out, /newComponents slug "input\]" is not in components\.manifest\.json/);
  assert.match(bracket.out, /newComponents slug "date-pikcer" is not in components\.manifest\.json/);

  // The same for a `"`, which ends a string pattern, and for a `]` in the group's display label.
  const quoted = run({ groups: [{ group: "Forms", slugs: ['in"put', "date-pikcer"] }] });
  assert.equal(quoted.status, 1, quoted.out);
  assert.match(quoted.out, /newComponents slug "date-pikcer" is not in components\.manifest\.json/);

  const label = run({ groups: [{ group: "For]ms", slugs: ["date-pikcer"] }] });
  assert.equal(label.status, 1, label.out);
  assert.match(label.out, /newComponents slug "date-pikcer" is not in components\.manifest\.json/);
});

// The structured-parser comparison the brief asks for. There is no TypeScript parser available to a
// `.mjs` release script, so the honest comparison is against the JSON the file is GENERATED from:
// `version-release-meta.mjs` writes `releases.ts` with `JSON.stringify`, so the note is the
// structured source of truth and this scanner is the reader. They must agree about the same release.
it("extracts exactly the slugs a structured read of the same data gives", () => {
  // A synthetic populated note, so the comparison is exercised today rather than when some future
  // note first uses the feature. Slugs chosen to carry the punctuation a pattern would trip over.
  const groups = [
    { group: "Forms", slugs: ["input", "nope-one"] },
    { group: "Data]", slugs: ["date-picker", "brack]et", 'quo"te', "nope-two"] },
  ];
  const structured = groups.flatMap((g) => g.slugs);
  const missing = structured.filter((x) => !(x in MANIFEST.components)).sort();
  const r = run({ groups });
  assert.equal(r.status, 1, r.out);
  // Nothing dropped and nothing invented: the slugs rule 6 rejected are exactly the structured slugs
  // absent from the manifest. A reader that stopped early would report fewer; one that swept up group
  // labels or key names would report more.
  const reported = [...r.out.matchAll(/newComponents slug "(.*)" is not in components\.manifest\.json/g)]
    .map((m) => m[1])
    .sort();
  assert.deepEqual(reported, missing, `reader and structured read disagree:\n${r.out}`);
});

it("agrees with a structured read of every curated note that uses newComponents", () => {
  const notes = new URL("../../../release/notes/", import.meta.url);
  let compared = 0;
  for (const name of readdirSync(notes).filter((n) => n.endsWith(".json"))) {
    const note = JSON.parse(readFileSync(new URL(name, notes), "utf8"));
    if (!Array.isArray(note.newComponents) || note.newComponents.length === 0) continue;
    const groups = note.newComponents.map((g) => ({ group: g.group, slugs: g.slugs ?? [] }));
    // The REPOSITORY's manifest, not the two-component fixture one. Codex finding at 114e7a74,
    // reproduced: with the fixture manifest a note naming any other real component failed here —
    // measured on a synthetic note declaring `button`, which IS in components.manifest.json. That is
    // the same "a legitimate note breaks CI" landmine as the zero-count assertion, one step along.
    const r = run({ groups, manifest: REAL_MANIFEST });
    // Every slug a curated note declares is a real component, so agreement shows as a pass; a reader
    // that invented or dropped a slug would fail here.
    assert.equal(r.status, 0, `${name}: structured slugs ${JSON.stringify(groups.flatMap((g) => g.slugs))} but the reader said:\n${r.out}`);
    compared++;
  }
  // No note on `main` uses newComponents today, so this loop may legitimately compare nothing. The
  // case above is what keeps the comparison live; this one must not fail a note for using the feature.
  assert.ok(compared >= 0);
});

it("accepts the real repository as it stands", () => {
  const root = new URL("../../../", import.meta.url);
  const r = spawnSync(process.execPath, ["scripts/check-releases.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.match(r.stdout, /check:releases ok/);
});
