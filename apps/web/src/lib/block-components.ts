/**
 * Which catalogue components a block's React version is built from, read from its real source.
 *
 * /blocks used to say "add the components it uses with `npx @kinetixui/cli add …`" and leave the reader to guess
 * the list. The list is in the block's React file already: its `@kinetixui/ui` import. A named export becomes a
 * component when its kebab-case name is an installable registry item (`Card` → `card`); parts of a component
 * (`CardHeader`, `SelectItem`) are not items and come along with their parent. Nothing is typed by hand, so a
 * block that starts using another component lists it on the next build.
 *
 * This is the React version's list. The native and Angular versions compose the same components in their own
 * idiom, but their files are not read here, so the list is only ever shown as React's.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import manifest from "../../../../blocks.manifest.json";
import registry from "../../public/r/registry.json";

/** Every component the CLI can add: the registry's `registry:ui` items. */
export const INSTALLABLE: ReadonlySet<string> = new Set(registry.items.filter((i) => i.type === "registry:ui").map((i) => i.name));

/** "SegmentedControlItem" → "segmented-control-item" */
export const kebab = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/** The names a source file imports from `@kinetixui/ui`, aliases resolved to the exported name. */
export function kinetixImports(source: string): string[] {
  return [...source.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']@kinetixui\/ui["']/g)].flatMap((m) =>
    m[1]!
      .split(",")
      .map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0]!.trim())
      .filter(Boolean),
  );
}

/** The installable components among those imports, sorted, each once. */
export function componentsFromBlockSource(source: string, installable: ReadonlySet<string> = INSTALLABLE): string[] {
  return [...new Set(kinetixImports(source).map(kebab).filter((slug) => installable.has(slug)))].sort();
}

const REPO_ROOT = join(process.cwd(), "../..");

/** Block slug → the components its React source uses. Read at build time; the page is static. */
export function blockComponents(): Record<string, string[]> {
  const blocks = manifest.blocks as Record<string, { sources: Record<string, string> }>;
  return Object.fromEntries(
    Object.entries(blocks).flatMap(([slug, b]) => {
      const file = b.sources.React;
      return file ? [[slug, componentsFromBlockSource(readFileSync(join(REPO_ROOT, file), "utf8"))]] : [];
    }),
  );
}
