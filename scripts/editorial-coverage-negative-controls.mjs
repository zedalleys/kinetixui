#!/usr/bin/env node
/**
 * Negative controls for the editorial coverage gate.
 *
 * A gate that passes is not the same as a gate that works. Each control breaks coverage in one specific way,
 * runs the real test file, and requires it to fail with the rule that is supposed to catch it. The last
 * control does the opposite: it adds a legitimate entry and requires the gate to go green, so that the gate
 * is shown to permit growth rather than merely forbidding change.
 *
 * Every file is restored from the bytes read before the edit, and the restore is checked by sha256.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEB = join(ROOT, "apps/web");
const EDITORIAL = join(WEB, "src/lib/component-editorial.ts");
const BASELINE = join(WEB, "src/lib/component-editorial.baseline.json");
const TEST = "src/lib/component-editorial.coverage.test.ts";

const sha = (s) => createHash("sha256").update(s).digest("hex");

/** Run the coverage test file. Returns { ok, output }. */
function runGate() {
  try {
    const out = execFileSync("pnpm", ["--filter", "@kinetixui/web", "exec", "vitest", "run", TEST], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ok: true, output: out };
  } catch (e) {
    return { ok: false, output: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/** One entry's full text, so a control can move or duplicate a real entry rather than invent a shape. */
function entryBlock(src, slug) {
  const start = src.search(new RegExp(`^ {2}(?:"${slug}"|${slug}):\\s*\\{`, "m"));
  if (start < 0) throw new Error(`entry ${slug} not found`);
  let i = src.indexOf("{", start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  const end = src.indexOf("\n", i) + 1;
  return { start, end, text: src.slice(start, end) };
}

const CONTROLS = [
  {
    id: "EC-1",
    what: "remove an entry that the baseline says is covered",
    expect: "coverage lost without being retired",
    apply: (src) => {
      const b = entryBlock(src, "tooltip");
      return { editorial: src.slice(0, b.start) + src.slice(b.end) };
    },
  },
  {
    id: "EC-2",
    what: "add an entry for a component that has no page",
    expect: "is not a component page",
    apply: (src) => {
      const b = entryBlock(src, "tooltip");
      // Quoted: a hyphenated key is not a valid identifier, and an unquoted one makes this a syntax error —
      // which the gate would "catch" for entirely the wrong reason.
      const fake = b.text.replace(/^ {2}(?:"tooltip"|tooltip):/m, '  "not-a-real-component":');
      return { editorial: src.slice(0, b.end) + fake + src.slice(b.end) };
    },
  },
  {
    id: "EC-3",
    what: "declare the same entry twice",
    expect: "declared more than once",
    apply: (src) => {
      const b = entryBlock(src, "tooltip");
      return { editorial: src.slice(0, b.end) + b.text + src.slice(b.end) };
    },
  },
  {
    id: "EC-4",
    what: "rename an entry, so the count holds but the identity is lost",
    expect: "coverage lost without being retired",
    apply: (src) => {
      const b = entryBlock(src, "tooltip");
      // `popover` already exists, so renaming to it would duplicate; use a real page with no entry.
      const renamed = b.text.replace(/^ {2}(?:"tooltip"|tooltip):/m, "  accordion:");
      return { editorial: src.slice(0, b.start) + renamed + src.slice(b.end) };
    },
  },
  {
    id: "EC-5",
    what: "retire an entry with no reason",
    expect: "is retired with no reason",
    apply: (src) => {
      const b = entryBlock(src, "tooltip");
      const base = JSON.parse(readFileSync(BASELINE, "utf8"));
      base.retired = { tooltip: "tbd" };
      base.approvedFloor = base.approvedFloor - 1;
      return { editorial: src.slice(0, b.start) + src.slice(b.end), baseline: `${JSON.stringify(base, null, 2)}\n` };
    },
  },
  {
    id: "EC-6",
    what: "drop below the approved floor even though every slug is properly retired",
    expect: "to be greater than or equal to",
    apply: (src) => {
      const b = entryBlock(src, "tooltip");
      const base = JSON.parse(readFileSync(BASELINE, "utf8"));
      base.retired = { tooltip: "superseded by popover, which answers the same question with a focusable surface" };
      // floor deliberately NOT lowered: this is the case where a batch is quietly undone.
      return { editorial: src.slice(0, b.start) + src.slice(b.end), baseline: `${JSON.stringify(base, null, 2)}\n` };
    },
  },
];

/** The positive control: a legitimate new entry must be allowed without touching any ceiling. */
const POSITIVE = {
  id: "EC-7",
  what: "add a legitimate new entry and list it in the baseline",
  apply: (src) => {
    const b = entryBlock(src, "tooltip");
    const added = b.text.replace(/^ {2}(?:"tooltip"|tooltip):/m, "  accordion:");
    const base = JSON.parse(readFileSync(BASELINE, "utf8"));
    base.covered = [...base.covered, "accordion"].sort();
    base.approvedFloor = base.covered.length;
    return { editorial: src.slice(0, b.end) + added + src.slice(b.end), baseline: `${JSON.stringify(base, null, 2)}\n` };
  },
};

const originalEditorial = readFileSync(EDITORIAL, "utf8");
const originalBaseline = readFileSync(BASELINE, "utf8");
const editorialSha = sha(originalEditorial);
const baselineSha = sha(originalBaseline);

let failures = 0;

function restore() {
  writeFileSync(EDITORIAL, originalEditorial);
  writeFileSync(BASELINE, originalBaseline);
  const okE = sha(readFileSync(EDITORIAL, "utf8")) === editorialSha;
  const okB = sha(readFileSync(BASELINE, "utf8")) === baselineSha;
  if (!okE || !okB) {
    console.error("  !! RESTORE FAILED — the working tree is dirty, fix before trusting anything");
    process.exit(2);
  }
}

for (const c of CONTROLS) {
  const patch = c.apply(originalEditorial);
  writeFileSync(EDITORIAL, patch.editorial);
  if (patch.baseline) writeFileSync(BASELINE, patch.baseline);
  const { ok, output } = runGate();
  restore();
  if (ok) {
    console.log(`✗ ${c.id} ${c.what} → gate PASSED; it should have failed with "${c.expect}"`);
    failures++;
  } else if (!output.includes(c.expect)) {
    console.log(`✗ ${c.id} ${c.what} → gate failed, but not with "${c.expect}" (wrong rule fired)`);
    failures++;
  } else {
    console.log(`✓ ${c.id} ${c.what} → caught by "${c.expect}"; restored sha256 ${editorialSha.slice(0, 12)}… matches`);
  }
}

{
  const patch = POSITIVE.apply(originalEditorial);
  writeFileSync(EDITORIAL, patch.editorial);
  if (patch.baseline) writeFileSync(BASELINE, patch.baseline);
  const { ok, output } = runGate();
  restore();
  if (ok) {
    console.log(`✓ ${POSITIVE.id} ${POSITIVE.what} → gate green, as it must be`);
  } else {
    console.log(`✗ ${POSITIVE.id} ${POSITIVE.what} → gate FAILED; growth must be allowed\n${output.slice(-700)}`);
    failures++;
  }
}

const final = runGate();
console.log(`gate after all controls: ${final.ok ? "green" : "RED"}`);
if (!final.ok || failures) process.exit(1);
