/** Before the first core upload, require notes dated for the actual UTC release day.
 * Already-published core versions retain their date during partial/tag-only recovery.
 */
export function releaseDateErrors({ plan, source, today = new Date().toISOString().slice(0, 10) }) {
  const core = plan.publish.find((target) => target.releaseGroup === "core");
  if (!core || plan.alreadyPublished.some((target) => target.releaseGroup === "core")) return [];
  const block = source.slice(source.indexOf("export const RELEASES")).split(/\n  \{\n    version: "/)
    .slice(1).find((entry) => entry.startsWith(`${core.version}"`));
  const date = block?.match(/date: "([^"]+)"/)?.[1];
  return date === today ? [] : [
    `Core ${core.version} release notes are dated ${date ?? "<missing>"}; first publication requires ${today} (UTC). Refresh the Version PR release date and obtain approval before merging. No package was published.`,
  ];
}
