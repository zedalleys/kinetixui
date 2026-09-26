/**
 * Rendering the plan.
 *
 * Three views of one object: a human one for a terminal, a JSON one for anything downstream, and a
 * Markdown one for the GitHub Actions step summary. None of them is parsed by anything else — the
 * JSON view exists precisely so that nothing has to parse the prose.
 *
 * All three are organised by release cohort, because "which release is this package part of" is
 * the question a reader most needs answered: `core` moving while `angular` stands still is normal,
 * and a flat list makes that look like a mistake.
 *
 * No secrets pass through here. The plan carries package names, versions, directories and registry
 * verdicts; tokens live in the environment and never enter it.
 */

const tick = "✓";
const skip = "○";
const cross = "✗";

/** @param {ReturnType<import("./plan.mjs").buildPlan>} plan */
export function formatPlan(plan) {
  const lines = ["KinetixUI npm release plan", ""];
  const width = Math.max(0, ...[...plan.publish, ...plan.alreadyPublished, ...plan.private].map((t) => t.name.length));

  for (const cohort of plan.cohorts) {
    const members = [...cohort.publish, ...cohort.alreadyPublished].sort(byName);
    lines.push(`${cohort.group.toUpperCase()}`);
    lines.push(`  version: ${cohort.version ?? "-"}${cohort.sameVersion ? "" : "  (independent versions allowed)"}`);
    lines.push("  registry:");
    if (members.length === 0) lines.push("    (no packages)");
    for (const target of members) {
      if (!plan.registryConsulted) {
        lines.push(`    ? ${target.name.padEnd(width)} unknown (registry not consulted)`);
        continue;
      }
      const published = cohort.alreadyPublished.includes(target);
      lines.push(`    ${published ? skip : tick} ${target.name.padEnd(width)} ${published ? "already published" : "unpublished"}`);
    }
    lines.push("  publish:");
    if (cohort.publish.length === 0) lines.push(plan.registryConsulted ? "    none" : "    (registry not consulted)");
    for (const target of cohort.publish) {
      const from = target.allowlist?.artifactDirectory;
      lines.push(`    ${target.name}@${target.version}${from ? `  ← ${from}` : ""}`);
    }
    lines.push("");
  }

  lines.push("PRIVATE / EXCLUDED");
  if (plan.private.length === 0) lines.push("  (none)");
  for (const target of plan.private) lines.push(`  ${tick} ${target.name.padEnd(width)} ${target.version ?? "-"} — private`);

  if (plan.errors.length > 0) {
    lines.push("", "ERRORS");
    for (const error of plan.errors) lines.push(...error.split("\n").map((line) => `  ${cross} ${line}`.trimEnd()));
  }

  return lines.join("\n");
}

const byName = (a, b) => a.name.localeCompare(b.name);

/** The machine-readable view. Stable key order so a diff of two runs is readable. */
export function planToJson(plan) {
  const strip = ({ name, version }) => ({ name, version });
  return {
    ok: plan.ok,
    registry: plan.registryUrl,
    registryConsulted: plan.registryConsulted,
    cohorts: plan.cohorts.map((cohort) => ({
      group: cohort.group,
      sameVersion: cohort.sameVersion,
      version: cohort.version,
      publish: cohort.publish.map(strip),
      alreadyPublished: cohort.alreadyPublished.map(strip),
    })),
    publish: plan.publish.map(strip),
    alreadyPublished: plan.alreadyPublished.map(strip),
    private: plan.private.map(strip),
    errors: plan.errors,
  };
}

/** The GitHub Actions step summary: cohort, package, version, registry state, publish/skip, source. */
export function planToMarkdown(plan, { title = "KinetixUI npm release" } = {}) {
  const lines = [`## ${title}`, ""];
  for (const cohort of plan.cohorts) {
    lines.push(`### ${cohort.group} — ${cohort.version ?? "-"}`, "");
    const members = [...cohort.publish, ...cohort.alreadyPublished].sort(byName);
    if (members.length === 0) {
      lines.push("_no packages_", "");
      continue;
    }
    lines.push("| package | version | registry | action | artifact |", "| --- | --- | --- | --- | --- |");
    for (const target of members) {
      const publishing = cohort.publish.includes(target);
      const registry = plan.registryConsulted ? (publishing ? "unpublished" : "published") : "not consulted";
      const source = target.allowlist?.artifactDirectory ?? target.directory ?? "";
      lines.push(`| \`${target.name}\` | ${target.version} | ${registry} | ${publishing ? "**publish**" : "skip"} | \`${source}\` |`);
    }
    lines.push("");
  }
  lines.push("### Private / excluded", "");
  if (plan.private.length === 0) lines.push("- _none_");
  else for (const target of plan.private) lines.push(`- \`${target.name}@${target.version ?? "-"}\``);
  lines.push("");
  if (plan.errors.length > 0) {
    lines.push("### Errors", "");
    for (const error of plan.errors) lines.push("```", error, "```", "");
  }
  return lines.join("\n");
}
