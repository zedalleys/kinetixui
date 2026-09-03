import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

export type PackageManager = "pnpm" | "yarn" | "bun" | "npm";

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (existsSync(path.join(cwd, "bun.lockb"))) return "bun";
  return "npm";
}

function installArgs(pm: PackageManager, packages: string[]): string[] {
  return pm === "npm" ? ["install", ...packages] : ["add", ...packages];
}

export function runInstall(cwd: string, pm: PackageManager, packages: string[]): Promise<void> {
  if (packages.length === 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const child = spawn(pm, installArgs(pm, packages), {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`"${pm} ${installArgs(pm, packages).join(" ")}" exited with code ${code}`));
    });
  });
}
