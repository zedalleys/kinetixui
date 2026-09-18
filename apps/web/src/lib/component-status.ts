import statusData from "../../../../component-status.json";

export type ComponentStatus = "stable" | "beta" | "deprecated";

/**
 * slug → maturity status. The data lives in `component-status.json` at the
 * repo root (not here) so it's importable from plain Node scripts too
 * (`scripts/gen-registry.mjs`, which embeds it into the CLI registry)
 * without a Next.js dependency — this file is a typed wrapper over it for
 * the web app. Edit `component-status.json`, not this file, to change the
 * data itself.
 */
export const STATUS: Record<string, Exclude<ComponentStatus, "stable">> = statusData.status as Record<
  string,
  Exclude<ComponentStatus, "stable">
>;

export function statusOf(slug: string): ComponentStatus {
  return STATUS[slug] ?? "stable";
}
