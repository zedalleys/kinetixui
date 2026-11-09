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
 *   - a row marked planned or not-planned cites no `ui:` or `block:` evidence (a shipped component or block is not
 *     "planned");
 *   - a Pro row is never existing (nothing is behind a paywall today), and a Core-only concern is never Pro:
 *     the rows in CORE_FLOOR must stay tier "core";
 *   - enums are the documented ones, phases are 1–10 or null.
 * It cannot judge whether a "partial" note is fair. That is review's job; the script makes the facts checkable.
 *
 * It also writes the website's discovery index, `discovery-index.json`, from the same data (scripts/business-discovery.mjs
 * documents the derivation), and `--check` fails if that file is stale or the `discovery` block names a family, domain,
 * workflow or row that does not exist.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDiscovery } from "./business-discovery.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "docs/business-capabilities.json");
const DOC = join(ROOT, "docs/BUSINESS-CAPABILITY-ROADMAP.md");
const INDEX = join(ROOT, "discovery-index.json");
// The routes alone, for code that reaches the browser (the analytics route list, breadcrumbs): importing the ~90 KB
// index there would ship it to every page.
const ROUTES = join(ROOT, "discovery-routes.json");
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
// Demand (owner decision D-12a). `unmeasured` means nobody has looked; `unknown` means someone looked and
// found nothing conclusive; `evidenced` means at least one signal with provenance. Absence of evidence is a
// state a row can hold honestly, which is why there is no default and no numeric score — see DEMAND_KEYS.
const DEMAND_STATES = ["unmeasured", "unknown", "evidenced"];
const DEMAND_SOURCES = ["interview", "issue", "discussion", "email", "inbound", "support", "sales", "other"];
const CONFIDENCE = ["low", "medium", "high"];
// Closed key sets. A row cannot grow a `score`, a `total` or a `rank`: demand is signals with provenance, and
// any ordering is computed at read time from those signals rather than stored where it can be edited.
const DEMAND_KEYS = new Set(["state", "signals"]);
const SIGNAL_KEYS = new Set(["date", "source", "ref", "signal", "confidence", "askedForThisCapability", "notes"]);
const SIGNAL_REQUIRED = ["date", "source", "ref", "signal", "confidence", "askedForThisCapability"];
// Two capability names are each listed as an alternative by two different rows. Folding family T's
// `Gantt` into family B's row (D-12a) turned the name check alias-aware, which is what found them; they
// are older than that change and neither is this slice's defect. Repairing one means deciding which row
// should stop claiming the name, and that changes what a published row means — so they are declared here
// rather than guessed at. The register RATCHETS: a name that no longer collides is an error, so it can
// only shrink, and a re-added bare `Gantt` row is caught like anything else.
const KNOWN_NAME_COLLISIONS = [
  { name: "PendingState", why: "C's ResultState row and AB's ProcessingState row both list it. Plausibly two different things — a pending outcome screen and an inline pending indicator — in which case the names must say how they differ. Owner decision." },
  { name: "UnitInput", why: "I's PercentageInput row and AC's DurationInput row both list it. Owner decision: one row owns `UnitInput`, or the two are renamed." },
];
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

const today = new Date().toISOString().slice(0, 10);

// A row's name may list alternatives with " / " (60-odd rows do). The uniqueness check reads every
// alternative, not just the whole string: `GanttChart / Gantt` and a bare `Gantt` row are the same
// capability twice, which is how family B's and family T's Gantt rows both survived a name check.
const seen = new Map();
const collided = new Set();
const waived = new Set();
for (const [i, w] of KNOWN_NAME_COLLISIONS.entries()) {
  if (!w.name || !w.why || w.why.trim() === "") errors.push(`KNOWN_NAME_COLLISIONS[${i}]: needs a name and a reason`);
  if (waived.has(w.name)) errors.push(`KNOWN_NAME_COLLISIONS[${i}]: "${w.name}" is registered twice`);
  waived.add(w.name);
}
const demandErrors = (at, row) => {
  const d = row.demand;
  if (!d || typeof d !== "object" || Array.isArray(d)) return errors.push(`${at}: no demand block`);
  for (const k of Object.keys(d)) if (!DEMAND_KEYS.has(k)) errors.push(`${at}: demand key "${k}" is not part of the model`);
  if (!DEMAND_STATES.includes(d.state)) errors.push(`${at}: demand state "${d.state}"`);
  if (!Array.isArray(d.signals)) return errors.push(`${at}: demand.signals is not an array`);
  // The point of the model: a state that claims evidence must carry it, and a state that claims none
  // must not. Either way the data cannot say one thing and hold another.
  if (d.state === "evidenced" && d.signals.length === 0)
    errors.push(`${at}: demand is "evidenced" with no signals — evidence is the thing that makes it evidenced`);
  if (d.state !== "evidenced" && d.signals.length > 0)
    errors.push(`${at}: demand is "${d.state}" but carries ${d.signals.length} signal(s) — set the state to "evidenced" or remove them`);
  d.signals.forEach((s, i) => {
    const sat = `${at}: demand.signals[${i}]`;
    if (!s || typeof s !== "object" || Array.isArray(s)) return errors.push(`${sat} is not an object`);
    for (const k of Object.keys(s)) if (!SIGNAL_KEYS.has(k)) errors.push(`${sat}: key "${k}" is not part of the model`);
    for (const k of SIGNAL_REQUIRED) if (!(k in s)) errors.push(`${sat}: missing ${k}`);
    if ("date" in s) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) errors.push(`${sat}: date "${s.date}" is not an ISO yyyy-mm-dd day`);
      else if (Number.isNaN(Date.parse(s.date))) errors.push(`${sat}: date "${s.date}" is not a real day`);
      else if (s.date > today) errors.push(`${sat}: date "${s.date}" is in the future`);
    }
    if ("source" in s && !DEMAND_SOURCES.includes(s.source)) errors.push(`${sat}: source "${s.source}"`);
    if ("confidence" in s && !CONFIDENCE.includes(s.confidence)) errors.push(`${sat}: confidence "${s.confidence}"`);
    // Provenance a reader can open, and the asker's own words. Both are what stop a signal being an
    // assertion that someone wanted something.
    if ("ref" in s && (typeof s.ref !== "string" || s.ref.trim() === "")) errors.push(`${sat}: ref is empty — a signal needs a source a reader can open`);
    if ("signal" in s && (typeof s.signal !== "string" || s.signal.trim() === "")) errors.push(`${sat}: signal is empty — record what was actually said`);
    if ("askedForThisCapability" in s && typeof s.askedForThisCapability !== "boolean")
      errors.push(`${sat}: askedForThisCapability must be true or false — it separates "wanted this" from "had this problem"`);
  });
};

for (const family of data.families) {
  for (const row of family.capabilities) {
    const at = `${family.id} / ${row.name}`;
    for (const alt of row.name.split(" / ")) {
      const prior = seen.get(alt);
      if (prior) {
        collided.add(alt);
        if (!waived.has(alt))
          errors.push(`${at}: capability name "${alt}" is already claimed by ${prior} — one capability, two rows`);
      } else seen.set(alt, at);
    }
    demandErrors(at, row);
    // "—" renders as "no dependency" in the table and passes every shape check while naming nothing.
    // An empty array says the same thing and a checker can read it.
    if (row.dependsOn.includes("—"))
      errors.push(`${at}: dependsOn contains "—" — use an empty array for "no dependency"`);
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
    if ((row.status === "planned" || row.status === "not-planned") && row.evidence.some((r) => r.startsWith("block:")))
      errors.push(`${at}: ${row.status} but cites a published block`);
    if (row.tier === "pro" && row.status === "existing") errors.push(`${at}: a Pro row cannot be existing`);
    if (row.tier === "pro" && row.target !== "pro-candidate") errors.push(`${at}: Pro rows target pro-candidate`);
    if (row.tier === "pro" && CORE_FLOOR.some((re) => re.test(row.name))) errors.push(`${at}: on the Core floor, cannot be Pro`);
  }
}

// The ratchet: a registered collision that no longer collides is debt someone paid off, so the entry has
// to go. Without this the register would quietly outlive the defect it documents.
for (const w of KNOWN_NAME_COLLISIONS)
  if (!collided.has(w.name))
    errors.push(`KNOWN_NAME_COLLISIONS: "${w.name}" no longer collides — remove it from the register`);

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

const discovery = buildDiscovery(data, manifest, blocks);
errors.push(...discovery.errors);

if (errors.length) {
  console.error(`✗ business capability roadmap — ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}

const next = doc.slice(0, a) + out + doc.slice(b + END.length);
const nextIndex = `${JSON.stringify(discovery.index, null, 2)}\n`;
const nextRoutes = `${JSON.stringify(
  {
    $comment: "GENERATED by `pnpm gen:capabilities` from the `discovery` block of docs/business-capabilities.json. Do not edit.",
    routes: ["/capabilities", ...discovery.index.domains.filter((d) => d.page).map((d) => `/use-cases/${d.id}`)],
  },
  null,
  2,
)}\n`;
if (check) {
  if (next !== doc) {
    console.error("✗ docs/BUSINESS-CAPABILITY-ROADMAP.md is stale — run `pnpm gen:capabilities`.");
    process.exit(1);
  }
  for (const [file, want] of [[INDEX, nextIndex], [ROUTES, nextRoutes]]) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== want) {
      console.error(`✗ ${file.slice(ROOT.length + 1)} is stale — run \`pnpm gen:capabilities\`.`);
      process.exit(1);
    }
  }
  console.log(
    `✓ business capability roadmap — ${all.length} capabilities, every evidence reference resolves, tables current; ` +
      `discovery index current (${discovery.index.capabilities.length} capability groups, ${discovery.index.domains.length} domains, ${discovery.index.workflows.length} workflows).`,
  );
} else {
  writeFileSync(DOC, next);
  writeFileSync(INDEX, nextIndex);
  writeFileSync(ROUTES, nextRoutes);
  console.log(`✓ wrote ${all.length} capability rows into docs/BUSINESS-CAPABILITY-ROADMAP.md and the discovery index into discovery-index.json`);
}
