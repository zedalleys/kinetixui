import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const CONFIG_FILE = "kinetixui.json";
export const DEFAULT_REGISTRY = "https://kinetixui.com/r";

export interface KinetixConfig {
  $schema?: string;
  /**
   * Where `add` / `list` / `inspect` fetch from, for this project.
   *
   * Optional, and absent from a freshly written config: the default is the hosted registry and most
   * projects should leave it alone. It exists because the default origin is a single point of failure for
   * every install — `add` has no offline mode — and the only way to point somewhere else used to be
   * `--registry` on every single invocation, which does not survive a CI script or a new colleague.
   *
   * A team that mirrors the registry JSON sets this once. `--registry` still wins when given, so nothing
   * about the existing flag changes.
   */
  registry?: string;
  tailwind: { css: string };
  aliases: {
    components: string;
    ui: string;
    lib: string;
    utils: string;
  };
  srcDir: boolean;
}

export const DEFAULT_CONFIG: KinetixConfig = {
  $schema: "https://kinetixui.com/schema/config.json",
  tailwind: { css: "app/globals.css" },
  aliases: {
    components: "@/components",
    ui: "@/components/ui",
    lib: "@/lib",
    utils: "@/lib/utils",
  },
  srcDir: false,
};

export async function readConfig(cwd: string): Promise<KinetixConfig | null> {
  const file = path.join(cwd, CONFIG_FILE);
  if (!existsSync(file)) return null;
  return JSON.parse(await readFile(file, "utf8")) as KinetixConfig;
}

export async function writeConfig(cwd: string, config: KinetixConfig): Promise<void> {
  await writeFile(path.join(cwd, CONFIG_FILE), JSON.stringify(config, null, 2) + "\n", "utf8");
}

/**
 * The registry this project should use: the flag if it says something other than the default, then the
 * project's own `registry`, then the default.
 *
 * The flag is compared against `DEFAULT_REGISTRY` rather than checked for presence because Commander
 * fills the option in with that default, so "not passed" and "passed the default" are the same value by
 * the time a command sees it. They also mean the same thing, so collapsing them costs nothing — and it
 * keeps every command signature and `--help` output exactly as they were.
 */
export async function resolveRegistry(cwd: string, fromFlag?: string): Promise<string> {
  if (fromFlag && fromFlag !== DEFAULT_REGISTRY) return fromFlag;
  const config = await readConfig(cwd);
  return config?.registry?.trim() || DEFAULT_REGISTRY;
}

/** Resolve an `@/…` alias to a real directory on disk. */
export function resolveAliasDir(cwd: string, config: KinetixConfig, alias: keyof KinetixConfig["aliases"]): string {
  const raw = config.aliases[alias].replace(/^@\//, "");
  return path.join(cwd, config.srcDir ? "src" : "", raw);
}
