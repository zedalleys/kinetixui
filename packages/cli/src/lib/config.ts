import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const CONFIG_FILE = "kinetixui.json";

export interface KinetixConfig {
  $schema?: string;
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

/** Resolve an `@/…` alias to a real directory on disk. */
export function resolveAliasDir(cwd: string, config: KinetixConfig, alias: keyof KinetixConfig["aliases"]): string {
  const raw = config.aliases[alias].replace(/^@\//, "");
  return path.join(cwd, config.srcDir ? "src" : "", raw);
}
