import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { CONFIG_FILE, DEFAULT_REGISTRY, readConfig, resolveAliasDir, type KinetixConfig } from "../lib/config.js";
import { fetchRegistryIndex } from "../lib/registry.js";

type Level = "pass" | "warn" | "fail";

const ICON: Record<Level, string> = { pass: pc.green("✔"), warn: pc.yellow("!"), fail: pc.red("✖") };

function report(level: Level, message: string): Level {
  console.log(ICON[level], message);
  return level;
}

export async function doctor(): Promise<void> {
  const cwd = process.cwd();
  const levels: Level[] = [];

  let config: KinetixConfig | null = null;
  if (!existsSync(path.join(cwd, CONFIG_FILE))) {
    levels.push(report("fail", `No ${CONFIG_FILE} found — run "kinetixui init" first.`));
  } else {
    try {
      config = await readConfig(cwd);
      levels.push(report("pass", `${CONFIG_FILE} found and parses.`));
    } catch {
      levels.push(report("fail", `${CONFIG_FILE} exists but isn't valid JSON.`));
    }
  }

  if (config) {
    for (const alias of ["components", "ui", "lib"] as const) {
      const dir = resolveAliasDir(cwd, config, alias);
      if (existsSync(dir)) {
        levels.push(report("pass", `"${alias}" alias resolves to ${path.relative(cwd, dir) || "."}`));
      } else {
        levels.push(report("warn", `"${alias}" alias points to ${path.relative(cwd, dir) || "."}, which doesn't exist yet.`));
      }
    }

    const cssPath = path.join(cwd, config.srcDir ? "src" : "", config.tailwind.css);
    if (existsSync(cssPath)) {
      levels.push(report("pass", `Tailwind CSS file found at ${path.relative(cwd, cssPath)}`));
    } else {
      levels.push(report("warn", `Tailwind CSS file not found at ${path.relative(cwd, cssPath)} — the token contract has nowhere to land.`));
    }
  }

  let registryNames: Set<string> | null = null;
  try {
    const items = await fetchRegistryIndex(DEFAULT_REGISTRY);
    registryNames = new Set(items.filter((item) => item.type === "registry:ui").map((item) => item.name));
    levels.push(report("pass", `Registry reachable (${DEFAULT_REGISTRY}) — ${registryNames.size} component(s) listed.`));
  } catch (err) {
    levels.push(report("fail", `Registry unreachable at ${DEFAULT_REGISTRY}: ${(err as Error).message}`));
  }

  if (config && registryNames) {
    const uiDir = resolveAliasDir(cwd, config, "ui");
    if (existsSync(uiDir)) {
      const files = (await readdir(uiDir)).filter((f) => f.endsWith(".tsx"));
      const unknown = files.filter((f) => !registryNames!.has(f.replace(/\.tsx$/, "")));
      if (unknown.length === 0) {
        levels.push(report("pass", `Every .tsx file in ${path.relative(cwd, uiDir)} matches a name in the registry.`));
      } else {
        levels.push(
          report(
            "warn",
            `${unknown.length} file(s) in ${path.relative(cwd, uiDir)} don't match any current registry name (hand-written, or removed from the registry since you added them): ${unknown.join(", ")}`,
          ),
        );
      }
    }
  }

  const passed = levels.filter((l) => l === "pass").length;
  const warned = levels.filter((l) => l === "warn").length;
  const failed = levels.filter((l) => l === "fail").length;

  console.log();
  console.log(`${passed} passed, ${warned} warned, ${failed} failed`);

  if (failed > 0) process.exitCode = 1;
}
