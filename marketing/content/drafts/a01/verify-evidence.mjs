// a01 — evidence verification.
//
//   node marketing/content/drafts/a01/verify-evidence.mjs
//
// Re-checks every commit-derived claim in sources.md against git. Run it before publishing,
// and again if the article is ever edited: the historical numbers are the load-bearing part
// of the piece, and they are the ones nobody re-reads.
//
// Scoped to this campaign on purpose. It is not a general archaeology tool and should not
// grow into one — a later campaign gets its own short script.
//
// Every ref uses ~1. On Windows these run through cmd.exe, where ^ is the escape character
// and is eaten silently; that once made a before/after diff compare a commit to itself and
// report success.
import { execFileSync } from "node:child_process";

const git = (args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 80e6 });
const show = (ref, path) => git(["show", `${ref}:${path}`]);
const json = (ref, path) => JSON.parse(show(ref, path));

const results = [];
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ ok, label, actual, expected });
};

// ── coverage before/after the platform-source correction ────────────────────
const FOUR = ["React", "SwiftUI", "Compose", "Flutter"];
const coverage = (m) => {
  const names = Object.keys(m.components);
  const per = Object.fromEntries(FOUR.map((p) => [p, names.filter((n) => m.components[n].platforms.includes(p)).length]));
  return { total: names.length, ...per, allFour: names.filter((n) => FOUR.every((p) => m.components[n].platforms.includes(p))).length };
};
const before = json("34e5b06~1", "components.manifest.json");
const after = json("34e5b06", "components.manifest.json");
check("coverage BEFORE (34e5b06~1)", coverage(before), { total: 98, React: 98, SwiftUI: 91, Compose: 90, Flutter: 91, allFour: 90 });
check("coverage AFTER (34e5b06)", coverage(after), { total: 98, React: 98, SwiftUI: 90, Compose: 89, Flutter: 90, allFour: 89 });

// ── the three manifest entries ──────────────────────────────────────────────
check("direction-provider BEFORE platforms", before.components["direction-provider"].platforms, ["React", "SwiftUI", "Compose", "Flutter"]);
check("direction-provider BEFORE had no note", before.components["direction-provider"].platformNote ?? null, null);
check("direction-provider AFTER platforms", after.components["direction-provider"].platforms, ["React"]);
check("direction-provider AFTER has a note", typeof after.components["direction-provider"].platformNote, "string");
check("combobox BEFORE note", before.components["combobox"].platformNote, "standing non-port");
check("combobox BEFORE had no composition", before.components["combobox"].composition ?? null, null);
check("combobox AFTER composition", after.components["combobox"].composition, "command");
check("sonner BEFORE had no sourceNames", before.components["sonner"].sourceNames ?? null, null);
check("sonner AFTER sourceNames", after.components["sonner"].sourceNames, { SwiftUI: "Toaster", Flutter: "toaster" });

// ── platform-code.ts before the snippet verification pass ───────────────────
const pc = show("c3de388~1", "apps/web/src/registry/platform-code.ts");
const keyRe = /^ {2}"([^"]+)": \{$/gm;
let m;
const keys = [];
while ((m = keyRe.exec(pc))) keys.push({ key: m[1], at: m.index });
const RE = { swift: /\n {4}swift: `([\s\S]*?)`,\n/, kotlin: /\n {4}kotlin: `([\s\S]*?)`,\n/, dart: /\n {4}dart: `([\s\S]*?)`,\n/ };
const syms = { swift: new Set(), kotlin: new Set(), dart: new Set() };
let snippets = 0;
for (let i = 0; i < keys.length; i++) {
  const body = pc.slice(keys[i].at, i + 1 < keys.length ? keys[i + 1].at : pc.length);
  for (const p of ["swift", "kotlin", "dart"]) {
    const mm = body.match(RE[p]);
    if (!mm) continue;
    snippets++;
    for (const s of mm[1].match(/\bKinetix[A-Za-z0-9]+/g) || []) syms[p].add(s);
  }
}
check("platform-code BEFORE demo keys", keys.length, 100);
check("platform-code BEFORE snippets", snippets, 300);
check("platform-code BEFORE symbols", { swift: syms.swift.size, kotlin: syms.kotlin.size, dart: syms.dart.size }, { swift: 164, kotlin: 182, dart: 175 });

// ── the chart + data-table diffs ────────────────────────────────────────────
const diff = git(["show", "c3de388", "--format=", "--", "apps/web/src/registry/platform-code.ts"]);
check("chart-demo removed KinetixChart", /^-.*KinetixChart\(/m.test(diff), true);
check("chart-demo removed KinetixChartPoint", /^-.*KinetixChartPoint\(/m.test(diff), true);
check("chart comment said CustomPaint", /^-.*CustomPaint bar chart/m.test(diff), true);
check("data-table removed KinetixDataColumn", /^-.*KinetixDataColumn\(/m.test(diff), true);
check("data-table added KinetixColumn cell=", /^\+.*KinetixColumn\("Invoice", cell = /m.test(diff), true);
check("data-table rows -> data", /^-\s*rows = invoices,/m.test(diff) && /^\+\s*data = invoices,/m.test(diff), true);

// ── blocks before the rewrite ───────────────────────────────────────────────
const blocks = show("41fe16b~1", "apps/web/src/app/blocks/blocks-content.tsx");
check("blocks-content BEFORE line count", blocks.split("\n").length - 1, 952);
check("blocks had id=\"email\"", /id="email"/.test(blocks), true);
check("blocks preview had id=\"bl-email\"", /id="bl-email"/.test(blocks), true);
check("'from a single source' occurrences", (blocks.match(/from a single source/g) || []).length, 4);

// ── the guardrail scripts, and when they landed ─────────────────────────────
const added = (path) => git(["log", "--diff-filter=A", "--format=%h", "--", path]).trim().split("\n").pop();
check("check-platform-source.mjs added in", added("scripts/check-platform-source.mjs"), "34e5b06");
check("check-platform-code.mjs added in", added("scripts/check-platform-code.mjs"), "c3de388");
check("check-block-source.mjs added in", added("scripts/check-block-source.mjs"), "41fe16b");

let bad = 0;
for (const r of results) {
  if (!r.ok) bad++;
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.label}`);
  if (!r.ok) console.log(`       expected ${JSON.stringify(r.expected)}\n       actual   ${JSON.stringify(r.actual)}`);
}
console.log(`\n${results.length - bad}/${results.length} claims verified`);
process.exit(bad ? 1 : 0);
