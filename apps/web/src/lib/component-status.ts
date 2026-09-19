import statusData from "../../../../component-status.json";

export type ComponentStatus = "stable" | "beta" | "deprecated";

/**
 * slug → lifecycle status. The data lives in `component-status.json` at the
 * repo root (not here) so it's importable from plain Node scripts too
 * (`scripts/gen-registry-index.mjs`, which embeds it into the CLI registry)
 * without a Next.js dependency — this file is a typed wrapper over it for
 * the web app. Edit `component-status.json`, not this file, to change the
 * data itself. `pnpm check:status` guarantees every component has an entry.
 */
const ALL = statusData.status as Record<string, ComponentStatus>;

/** Only the non-stable components — what the gallery badges and filters on. */
export const STATUS: Record<string, Exclude<ComponentStatus, "stable">> = Object.fromEntries(
  Object.entries(ALL).filter(([, s]) => s !== "stable"),
) as Record<string, Exclude<ComponentStatus, "stable">>;

export function statusOf(slug: string): ComponentStatus {
  return ALL[slug] ?? "stable";
}
