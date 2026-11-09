#!/usr/bin/env node
/**
 * Prove that staging accepts a real `## <version>` release heading and refuses the five things that
 * look like one.
 *
 *   node scripts/publish/flutter-changelog-heading-controls.mjs
 *
 * This runs the real scripts/publish/stage-flutter-package.mjs against throwaway copies of
 * packages/ui-flutter whose CHANGELOG.md is replaced per case. The committed changelog is never
 * touched, nothing is uploaded and no registry is contacted.
 *
 * WHY A BEHAVIOURAL CONTROL AND NOT A SOURCE CHECK. The preflight's
 * VI-FLUTTER-CHANGELOG-GATES-VERSION asserts that staging *has* a changelog gate. It passed for
 * months while the gate was `changelog.includes(version)` — a substring test that accepted the
 * version appearing in a sentence. A check that the mechanism is present cannot tell a sound test
 * from an unsound one; only running it can. The accepting case is what makes the refusals evidence:
 * a gate that refuses everything is indistinguishable from a broken one until the day a release
 * needs it to pass.
 */
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));
const stagingScript = join(root, "scripts/publish/stage-flutter-package.mjs");
const sourcePackage = join(root, "packages/ui-flutter");

const VERSION = "0.1.0";

/** Each case replaces CHANGELOG.md wholesale. `accepts` is the expected exit-zero-ness. */
const CASES = [
  {
    id: "heading",
    accepts: true,
    why: "an exact `## 0.1.0` release heading is what pub.dev renders as the entry for this version",
    changelog: `# Changelog\n\n## ${VERSION}\n\n- First preview.\n`,
  },
  {
    id: "heading-with-date",
    accepts: true,
    why: "a title or date after the version is still a release heading for that version",
    changelog: `# Changelog\n\n## ${VERSION} - 2026-11-09\n\n- First preview.\n`,
  },
  {
    id: "prose-mention",
    accepts: false,
    why: "`Preparing for 0.1.0` renders as a paragraph; this is the exact shape that made the old substring test pass on a changelog with no release section at all",
    changelog: `# Changelog\n\n## Unreleased\n\nPreparing for ${VERSION}. Nothing is released yet.\n`,
  },
  {
    id: "wrong-heading-level",
    accepts: false,
    why: "`### 0.1.0` is a subsection of whatever release precedes it, not a release of its own",
    changelog: `# Changelog\n\n## Unreleased\n\n### ${VERSION}\n\n- Not a release section.\n`,
  },
  {
    id: "longer-version",
    accepts: false,
    why: "`## 0.1.0-beta.1` documents a different, earlier version that merely starts with these characters",
    changelog: `# Changelog\n\n## ${VERSION}-beta.1\n\n- A prerelease, not this release.\n`,
  },
  {
    id: "commented-out",
    accepts: false,
    why: "an HTML comment renders as nothing, so a heading inside one documents the release to no reader",
    changelog: `# Changelog\n\n<!-- ## ${VERSION} -->\n\n- Drafted but not published.\n`,
  },
  {
    id: "commented-out-multiline",
    accepts: false,
    why: "the same thing across several lines, where the heading is on a line of its own and looks like a heading to a line-by-line reader",
    changelog: `# Changelog\n\n<!--\n## ${VERSION}\n\n- Drafted but not published.\n-->\n`,
  },
  {
    id: "inside-code-fence",
    accepts: false,
    why: "a fenced block is an example of a heading, not a heading",
    changelog: `# Changelog\n\nWrite entries like this:\n\n\`\`\`markdown\n## ${VERSION}\n\n- What changed.\n\`\`\`\n`,
  },
  {
    id: "nested-fence-with-a-longer-delimiter",
    accepts: false,
    why: "a four-backtick block containing a three-backtick line is still open, so a heading after that line is still code — found in review, and it failed open",
    changelog: `# Changelog\n\nNesting an example inside an example:\n\n\`\`\`\`markdown\n\`\`\`\n## ${VERSION}\n\`\`\`\`\n`,
  },
  {
    id: "fence-boundaries-inside-a-literal-comment",
    accepts: false,
    why: "the fence boundaries between a literal `<!--` and a later `-->` inside examples must not be deleted; stripping comments file-wide first moved which block the heading belonged to — found in review, and it failed open",
    changelog: `# Changelog\n\n\`\`\`markdown\n<!--\n\`\`\`\n-->\n\`\`\`markdown\n## ${VERSION}\n\`\`\`\n`,
  },
  {
    id: "tilde-fence",
    accepts: false,
    why: "a tilde fence is a fence too, so a heading inside one is an example",
    changelog: `# Changelog\n\n~~~markdown\n## ${VERSION}\n~~~\n`,
  },
  {
    id: "heading-after-an-example-holding-an-unmatched-comment-marker",
    accepts: true,
    why: "a literal `<!--` inside a fenced example is code, so it must not swallow the real release heading that follows — the fail-closed half of the same review finding",
    changelog: `# Changelog\n\n\`\`\`markdown\n<!-- how to hide an entry\n\`\`\`\n\n## ${VERSION}\n\n- First preview.\n`,
  },
  {
    id: "heading-with-a-trailing-comment",
    accepts: true,
    why: "a comment after the version does not stop the line rendering as a release heading",
    changelog: `# Changelog\n\n## ${VERSION} <!-- cut 2026-11-09 -->\n\n- First preview.\n`,
  },
  {
    id: "heading-on-the-same-line-as-a-comment-close",
    accepts: false,
    why: "CommonMark ends an HTML block at the line carrying `-->`, so the rest of that line is part of the block and not a heading",
    changelog: `# Changelog\n\n<!-- drafted\n--> ## ${VERSION}\n\n- Not a heading.\n`,
  },
  {
    id: "unrelated-number",
    accepts: false,
    why: "a line that happens to contain the number is not an entry",
    changelog: `# Changelog\n\n## Unreleased\n\n- Tested against Flutter 0.1.0 tooling.\n`,
  },
];

if (process.argv.includes("--list")) {
  for (const testCase of CASES) console.log(testCase.id);
  process.exit(0);
}

const workspace = mkdtempSync(join(tmpdir(), "flutter-changelog-controls-"));
const failures = [];

for (const testCase of CASES) {
  const packageDir = join(workspace, testCase.id);
  cpSync(sourcePackage, packageDir, { recursive: true });
  writeFileSync(join(packageDir, "CHANGELOG.md"), testCase.changelog, "utf8");

  const run = spawnSync(process.execPath, [stagingScript, VERSION, `--package-dir=${packageDir}`], {
    encoding: "utf8",
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const accepted = run.status === 0;

  if (accepted !== testCase.accepts) {
    failures.push(
      testCase.accepts
        ? `${testCase.id}: staging REFUSED a changelog it must accept — ${testCase.why}. A gate that refuses everything proves nothing.\n${output}`
        : `${testCase.id}: staging ACCEPTED ${VERSION} — ${testCase.why}. That publishes a permanent version whose changelog does not document it.`,
    );
    continue;
  }

  /* A refusal for some other reason would make the control prove nothing — the pubspec rewrite and
   * the name assertion run before this gate and can fail on their own. */
  if (!testCase.accepts && !output.includes(`has no \`## ${VERSION}\` release heading`)) {
    failures.push(
      `${testCase.id}: staging refused, but not because of the missing release heading, so this control proves nothing.\n${output}`,
    );
    continue;
  }

  console.log(`ok: ${testCase.id} — staging ${testCase.accepts ? "accepts" : "refuses"} ${VERSION} (${testCase.why})`);
}

rmSync(workspace, { recursive: true, force: true });

if (failures.length > 0) {
  for (const failure of failures) console.error(`::error::${failure}`);
  process.exit(1);
}

console.log(
  `PASS: the changelog gate accepts a \`## ${VERSION}\` release heading and refuses ${CASES.filter((c) => !c.accepts).length} shapes that look like one.`,
);
