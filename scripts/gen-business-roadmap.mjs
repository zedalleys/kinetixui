#!/usr/bin/env node
/**
 * gen-business-roadmap.mjs — renders the capability tables of docs/BUSINESS-CAPABILITY-ROADMAP.md from
 * docs/business-capabilities.json, and checks that the roadmap does not claim what the repo does not have.
 *
 *   node scripts/gen-business-roadmap.mjs          rewrite the generated region of the roadmap
 *   node scripts/gen-business-roadmap.mjs --check  fail if it is stale, or if any row is untruthful
 *
 * What "untruthful" means here, mechanically:
 *   - every evidence reference resolves: `ui:<slug>` is a components.manifest.json entry, `iot:<Name>` is
 *     exported from @kinetixui/iot/react, `block:<slug>` is a blocks.manifest.json entry, `file:<path>` exists;
 *   - a row marked existing or partial cites at least one piece of evidence (nothing is "existing" on say-so);
 *   - a row marked planned or not-planned cites no `ui:` evidence (a shipped component is not "planned");
 *   - a Pro row is never existing (nothing is behind a paywall today), and a Core-only concern is never Pro:
 *     the rows in CORE_FLOOR must stay tier "core";
 *   - enums are the documented ones, phases are 1–10 or null.
 * It cannot judge whether a "partial" note is fair. That is review's job; the script makes the facts checkable.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "docs/business-capabilities.json");
const DOC = join(ROOT, "docs/BUSINESS-CAPABILITY-ROADMAP.md");
const BEGIN = "<!-- BEGIN GENERATED: capability tables (pnpm gen:capabilities) -->";
const END = "<!-- END GENERATED: capability tables -->";
const check = process.argv.includes("--check");

const LAYERS = { L1: "L1 Core primitive", L2: "L2 Enterprise", L3: "L3 Domain", L4: "L4 Block" };
const TARGETS = {
  "cross-platform-core": "Cross-platform Core",
  "web-first-enterprise": "Web-first Enterprise",
  "react-domain": "React-only Domain",
  block: "Block / composition",
  "pro-candidate": "Pro candidate",
};
const STATUSES = ["existing", "partial", "planned", "not-planned"];
const DELIVERY = ["component", "block", "recipe"];
const TIERS = ["core", "pro"];
// Never paywalled (Core/Pro rule 1). A row whose name matches one of these must stay Core.
const CORE_FLOOR = [/^Core motion$/, /^IoT /, /^RequestedState/, /^StatusBanner/, /^AppShell/, /^OTPInput$/, /^FileUploader$/, /^Calendar$/];

const manifest = JSON.parse(readFileSync(join(ROOT, "components.manifest.json"), "utf8")).components;
const blocks = JSON.parse(readFileSync(join(ROOT, "blocks.manifest.json"), "utf8")).blocks;
const iotIndex = readFileSync(join(ROOT, "packages/iot/src/react/index.ts"), "utf8");
const iotExports = new Set(
  [...iotIndex.matchAll(/export\s*\{([^}]*)\}/g)].flatMap((m) =>
    m[1].split(",").map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()).filter(Boolean),
  ),
);

const data = JSON.parse(readFileSync(DATA, "utf8"));
const errors = [];

const resolve = (ref) => {
  const [kind, ...rest] = ref.split(":");
  const target = rest.join(":");
  if (kind === "ui") return Boolean(manifest[target]);
  if (kind === "iot") return iotExports.has(target);
  if (kind === "block") return Boolean(blocks[target]);
  if (kind === "file") return existsSync(join(ROOT, target));
  return false;
};

const seen = new Set();
for (const family of data.families) {
  for (const row of family.capabilities) {
    const at = `${family.id} / ${row.name}`;
    if (seen.has(row.name)) errors.push(`${at}: duplicate capability name`);
    seen.add(row.name);
    if (!LAYERS[row.layer]) errors.push(`${at}: layer "${row.layer}"`);
    if (!TARGETS[row.target]) errors.push(`${at}: target "${row.target}"`);
    if (!STATUSES.includes(row.status)) errors.push(`${at}: status "${row.status}"`);
    if (!DELIVERY.includes(row.delivery)) errors.push(`${at}: delivery "${row.delivery}"`);
    if (!TIERS.includes(row.tier)) errors.push(`${at}: tier "${row.tier}"`);
    if (row.phase !== null && !(Number.isInteger(row.phase) && row.phase >= 1 && row.phase <= 10))
      errors.push(`${at}: phase ${row.phase}`);
    for (const ref of row.evidence) if (!resolve(ref)) errors.push(`${at}: evidence "${ref}" does not resolve`);
    if ((row.status === "existing" || row.status === "partial") && row.evidence.length === 0)
      errors.push(`${at}: ${row.status} with no evidence`);
    if ((row.status === "planned" || row.status === "not-planned") && row.evidence.some((r) => r.startsWith("ui:")))
      errors.push(`${at}: ${row.status} but cites a shipped component`);
    if (row.tier === "pro" && row.status === "existing") errors.push(`${at}: a Pro row cannot be existing`);
    if (row.tier === "pro" && row.target !== "pro-candidate") errors.push(`${at}: Pro rows target pro-candidate`);
    if (row.tier === "pro" && CORE_FLOOR.some((re) => re.test(row.name))) errors.push(`${at}: on the Core floor, cannot be Pro`);
  }
}

// The status column a reader sees, in the brief's vocabulary.
const shown = (row) => {
  if (row.tier === "pro") return "Pro candidate";
  if (row.status === "not-planned") return "not planned";
  if (row.status === "existing" && row.delivery === "recipe") return "recipe";
  if (row.status === "existing" && row.delivery === "block") return "block";
  if (row.status === "planned" && row.delivery !== "component") return `planned (${row.delivery})`;
  return row.status;
};
const cell = (s) => String(s).replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ");
const evidence = (row) =>
  row.evidence
    .map((r) => {
      const [kind, ...rest] = r.split(":");
      const t = rest.join(":");
      return kind === "file" ? `\`${t.split("/").pop()}\`` : `${kind}:${t}`;
    })
    .join(", ") || "—";

const all = data.families.flatMap((f) => f.capabilities.map((c) => ({ ...c, family: f })));
const count = (pred) => all.filter(pred).length;

let out = `${BEGIN}\n\n`;
out += `${all.length} capabilities in ${data.families.length} families. `;
out += `Existing ${count((r) => r.status === "existing" && r.tier === "core")}, `;
out += `partial ${count((r) => r.status === "partial")}, `;
out += `planned ${count((r) => r.status === "planned" && r.tier === "core")}, `;
out += `Pro candidate ${count((r) => r.tier === "pro")}, `;
out += `not planned ${count((r) => r.status === "not-planned")}.\n\n`;

out += "### Summary by phase\n\n| Phase | Capabilities |\n| --- | --- |\n";
for (const p of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, null]) {
  const rows = all.filter((r) => r.phase === p);
  if (!rows.length) continue;
  out += `| ${p ?? "—"} | ${cell(rows.map((r) => r.name).join(", "))} |\n`;
}
out += "\n";

for (const family of data.families) {
  out += `### ${family.id}. ${family.title}\n\n`;
  out += "| Capability | Parts | Layer | Core/Pro | Platform target | Status | Evidence | Depends on | Phase | Notes |\n";
  out += "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n";
  for (const r of family.capabilities) {
    out += `| ${cell(r.name)} | ${cell(r.parts.join(", ") || "—")} | ${LAYERS[r.layer]} | ${r.tier === "pro" ? "Pro" : "Core"} | ${TARGETS[r.target]} | ${shown(r)} | ${cell(evidence(r))} | ${cell(r.dependsOn.join(", ") || "—")} | ${r.phase ?? "—"} | ${cell(r.notes)} |\n`;
  }
  out += "\n";
}
out += END;

const doc = readFileSync(DOC, "utf8");
const a = doc.indexOf(BEGIN);
const b = doc.indexOf(END);
if (a < 0 || b < 0) errors.push(`${DOC}: generated-region markers missing`);

if (errors.length) {
  console.error(`✗ business capability roadmap — ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

const next = doc.slice(0, a) + out + doc.slice(b + END.length);
if (check) {
  if (next !== doc) {
    console.error("✗ docs/BUSINESS-CAPABILITY-ROADMAP.md is stale — run `pnpm gen:capabilities`.");
    process.exit(1);
  }
  console.log(`✓ business capability roadmap — ${all.length} capabilities, every evidence reference resolves, tables current.`);
} else {
  writeFileSync(DOC, next);
  console.log(`✓ wrote ${all.length} capability rows into docs/BUSINESS-CAPABILITY-ROADMAP.md`);
}
