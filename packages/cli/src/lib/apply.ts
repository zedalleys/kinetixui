import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveAliasDir, type KinetixConfig } from "./config.js";
import type { RegistryFile, RegistryItem } from "./registry.js";

/** Where a registry file lands on disk, given the project's alias config. */
export function targetPath(cwd: string, config: KinetixConfig, file: RegistryFile): string {
  if (file.target === "app/globals.css") {
    return path.join(cwd, config.srcDir ? "src" : "", config.tailwind.css);
  }
  const dir = file.type === "registry:lib" ? resolveAliasDir(cwd, config, "lib") : resolveAliasDir(cwd, config, "ui");
  return path.join(dir, path.basename(file.target));
}

export interface ApplyResult {
  deps: Set<string>;
  written: string[];
  skipped: string[];
}

export async function writeItems(
  cwd: string,
  config: KinetixConfig,
  items: Iterable<RegistryItem>,
  overwrite: boolean,
): Promise<ApplyResult> {
  const deps = new Set<string>();
  const written: string[] = [];
  const skipped: string[] = [];

  for (const item of items) {
    for (const dep of item.dependencies ?? []) deps.add(dep);

    for (const file of item.files) {
      const dest = path.resolve(targetPath(cwd, config, file));
      const root = path.resolve(cwd);
      if (dest !== root && !dest.startsWith(root + path.sep)) {
        // targetPath already basenames the registry-supplied filename; this
        // catches a kinetixui.json whose aliases / css path escape the project.
        throw new Error(`Refusing to write outside the project: ${path.relative(root, dest)}`);
      }
      const rel = path.relative(cwd, dest);

      if (existsSync(dest) && !overwrite) {
        skipped.push(rel);
        continue;
      }

      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, file.content, "utf8");
      written.push(rel);
    }
  }

  return { deps, written, skipped };
}
