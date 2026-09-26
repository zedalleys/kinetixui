/**
 * Rendering the plan.
 *
 * Three views of one object: a human one for a terminal, a JSON one for anything downstream, and a
 * Markdown one for the GitHub Actions step summary. None of them is parsed by anything else — the
 * JSON view exists precisely so that nothing has to parse the prose.
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

  lines.push("ALLOWLIST");
  if (plan.publish.length === 0 && plan.alreadyPublished.length === 0) lines.push("  (none)");
  for (const target of [...plan.publish, ...plan.alreadyPublished].sort(byName)) {
    lines.push(`  ${tick} ${target.name.padEnd(nameWidth(plan))} ${target.version}`);
  }

  lines.push("", "PRIVATE / EXCLUDED");
  if (plan.private.length === 0) lines.push("  (none)");
  for (const target of plan.private) {
    lines.push(`  ${tick} ${target.name.padEnd(nameWidth(plan))} ${target.version ?? "-"} — private`);
  }

  lines.push("", "REGISTRY");
  if (!plan.registryConsulted) {
    lines.push("  — registry not consulted; this is the offline contract only");
  }
  for (const target of [...plan.publish, ...plan.alreadyPublished].sort(byName)) {
    if (!plan.registryConsulted) {
      lines.push(`  ? ${target.name}@${target.version} unknown`);
      continue;
    }
    const published = plan.alreadyPublished.includes(target);
    lines.push(`  ${published ? skip : tick} ${target.name}@${target.version} ${published ? "already published — skip" : "unpublished"}`);
  }

  lines.push("", "PUBLISH");
  if (plan.publish.length === 0) {
    lines.push("  (nothing — every allowlisted version is already on the registry)");
  }
  for (const target of plan.publish) lines.push(`  ${target.name}@${target.version}`);

  if (plan.errors.length > 0) {
    lines.push("", "ERRORS");
    for (const error of plan.errors) lines.push(...error.split("\n").map((line) => `  ${cross} ${line}`.trimEnd()));
  }

  return lines.join("\n");
}

const byName = (a, b) => a.name.localeCompare(b.name);
const nameWidth = (plan) =>
  Math.max(0, ...[...plan.publish, ...plan.alreadyPublished, ...plan.private].map((t) => t.name.length));

/** The machine-readable view. Stable key order so a diff of two runs is readable. */
export function planToJson(plan) {
  const strip = ({ name, version }) => ({ name, version });
  return {
    ok: plan.ok,
    version: plan.version,
    registry: plan.registryUrl,
    registryConsulted: plan.registryConsulted,
    publish: plan.publish.map(strip),
    alreadyPublished: plan.alreadyPublished.map(strip),
    private: plan.private.map(strip),
    errors: plan.errors,
  };
}

/** The GitHub Actions step summary. */
export function planToMarkdown(plan, { title = "KinetixUI npm release" } = {}) {
  const lines = [`## ${title}`, ""];
  const section = (heading, items, render) => {
    lines.push(`### ${heading}`);
    if (items.length === 0) lines.push("- _none_");
    else for (const item of items) lines.push(`- ${render(item)}`);
    lines.push("");
  };
  if (plan.alreadyPublished.length > 0) {
    section("Already published", plan.alreadyPublished, (t) => `\`${t.name}@${t.version}\``);
  }
  section("Publishing", plan.publish, (t) => `\`${t.name}@${t.version}\``);
  section("Private / excluded", plan.private, (t) => `\`${t.name}@${t.version ?? "-"}\``);
  if (plan.errors.length > 0) {
    lines.push("### Errors", "");
    for (const error of plan.errors) lines.push("```", error, "```", "");
  }
  return lines.join("\n");
}
