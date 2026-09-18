import pc from "picocolors";
import { fetchRegistryIndex } from "../lib/registry.js";

export interface ParityOptions {
  registry: string;
}

// Canonical platform order/abbreviations — mirrors apps/web/src/lib/platform-parity.ts's
// PLATFORMS/PLATFORM_ABBR. Kept local rather than imported: the CLI only talks to the
// registry's JSON contract (`item.platforms`), never to the web app's source directly.
const PLATFORMS = ["React", "SwiftUI", "Compose", "Flutter"] as const;
const PLATFORM_ABBR: Record<(typeof PLATFORMS)[number], string> = {
  React: "RE",
  SwiftUI: "SW",
  Compose: "JC",
  Flutter: "FL",
};

export async function parity(names: string[], options: ParityOptions): Promise<void> {
  const items = await fetchRegistryIndex(options.registry);
  const components = items
    .filter((item) => item.type === "registry:ui")
    .sort((a, b) => a.name.localeCompare(b.name));

  const rows = names.length
    ? names.map((name) => {
        const item = components.find((c) => c.name === name);
        if (!item) throw new Error(`"${name}" isn't in the registry. Run "kinetixui list" to see what's available.`);
        return item;
      })
    : components;

  const nameWidth = Math.max(9, ...rows.map((r) => r.name.length));
  const header = `${"COMPONENT".padEnd(nameWidth)}  ${PLATFORMS.map((p) => PLATFORM_ABBR[p]).join("  ")}  STATUS`;
  console.log(pc.dim(header));

  for (const item of rows) {
    const on = new Set(item.platforms ?? PLATFORMS);
    const marks = PLATFORMS.map((p) => (on.has(p) ? pc.green("✓ ") : pc.dim("— ")));
    const status = item.status ? pc.yellow(item.status) : "";
    console.log(`${item.name.padEnd(nameWidth)}  ${marks.join(" ")}  ${status}`);
  }

  console.log();
  console.log(`${rows.length} of ${components.length} component(s) shown.`);
}
