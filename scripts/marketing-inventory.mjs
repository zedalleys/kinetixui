/**
 * The campaign inventory, derived from the two registers and the visual manifest. Prints, writes nothing.
 *
 *   pnpm marketing:inventory          markdown table + counts
 *   pnpm marketing:inventory --json   the same rows as JSON
 *
 * Every column is read from a canonical file, so the inventory cannot disagree with the registers the way a
 * hand-typed table would. The M1 status (PLANNED … CANCELLED) is derived by m1Status() and never stored.
 * Planned dates come from calendar day offsets (day 1 = 2026-09-29, marketing/content/calendar.md).
 */
import { readFileSync } from "node:fs";
import { m1Status } from "./marketing-publication-rules.mjs";

const content = JSON.parse(readFileSync("marketing/content/register.json", "utf8"));
const distribution = JSON.parse(readFileSync("marketing/distribution/register.json", "utf8"));
const visuals = JSON.parse(readFileSync("marketing/content/visuals/manifest.json", "utf8"));
const produced = new Set(visuals.assets.map((v) => v.id));
const rows = distribution.rows;

const DAY_ONE = Date.UTC(2026, 8, 29);
const plannedDate = (day) => (day ? new Date(DAY_ONE + (day - 1) * 86_400_000).toISOString().slice(0, 10) : null);
const familyOf = (id) => Object.entries(content.families).find(([, f]) => f.assets.includes(id))?.[0] ?? null;
const today = new Date().toISOString().slice(0, 10);

const inventory = content.assets.map((a) => {
  const published = rows.find((r) => r.asset === a.id && r.status === "published");
  const row = published ?? rows.find((r) => r.asset === a.id);
  const status = m1Status(a, rows);
  const planned = plannedDate(a.day);
  const flags = [];
  if (status === "PUBLISHED" && !published?.liveUrl) flags.push("no live URL");
  if (a.visual && !produced.has(a.visual)) flags.push(`visual ${a.visual} not produced`);
  if (a.kind !== "brief" && !a.url) flags.push("no tracked link");
  if (status !== "PUBLISHED" && status !== "CANCELLED" && planned && planned < today) flags.push("past planned date");
  if (row?.blockedBy) flags.push(`blocked: ${row.blockedBy.slice(0, 60)}${row.blockedBy.length > 60 ? "…" : ""}`);
  return {
    id: a.id,
    family: familyOf(a.id),
    channel: a.channel,
    icp: a.icp,
    pillar: a.pillar,
    planned,
    actual: published?.date ?? null,
    status,
    liveUrl: published?.liveUrl ?? null,
    destination: a.destination ?? null,
    campaign: a.campaign ?? null,
    utm_content: a.utm_content ?? null,
    visual: a.visual ?? null,
    approval: a.approval ? `${a.approval.by} ${a.approval.on}` : null,
    flags,
  };
});

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(inventory, null, 2));
  process.exit(0);
}

const cell = (v) => (v === null || v === undefined || v === "" ? "—" : String(v).replaceAll("|", "\\|"));
console.log(`Campaign inventory — derived ${today} from content/register.json, distribution/register.json, visuals/manifest.json\n`);
console.log("| Asset | Family | Channel | ICP | Pillar | Planned | Actual | Status | Live URL | Destination | utm_campaign / utm_content | Visual | Flags |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
for (const r of inventory) {
  const utm = r.campaign ? `${r.campaign} / ${r.utm_content}` : null;
  console.log(
    `| ${r.id} | ${cell(r.family)} | ${r.channel} | ${r.icp} | ${r.pillar} | ${cell(r.planned)} | ${cell(r.actual)} | ${r.status} | ${cell(r.liveUrl)} | ${cell(r.destination)} | ${cell(utm)} | ${cell(r.visual)} | ${cell(r.flags.join("; "))} |`,
  );
}

const count = (pred) => inventory.filter(pred).length;
const byStatus = inventory.reduce((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
console.log(`\nAssets: ${inventory.length} · ${Object.entries(byStatus).map(([s, n]) => `${s} ${n}`).join(" · ")}`);
console.log(`Published with a live URL: ${count((r) => r.status === "PUBLISHED" && r.liveUrl)} · published without one: ${count((r) => r.status === "PUBLISHED" && !r.liveUrl)}`);
console.log(`Approved and unpublished: ${count((r) => r.status === "APPROVED")}`);
console.log(`Past their planned date and unpublished: ${count((r) => r.flags.includes("past planned date"))}`);
const missingVisuals = [...new Set(inventory.filter((r) => r.visual && !produced.has(r.visual)).map((r) => r.visual))];
console.log(`Visuals referenced but not produced: ${missingVisuals.length ? missingVisuals.join(", ") : "none"}`);
console.log(`Off-calendar posts logged: ${(distribution.offCalendar ?? []).length} · paid amplifications: ${(distribution.amplification ?? []).length}`);
