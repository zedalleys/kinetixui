import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { CONFIG_FILE, readConfig, resolveAliasDir } from "../lib/config.js";
import { LINT_EXTENSIONS, lintText, type LintViolation } from "../lib/lint.js";

export interface LintOptions {
  fail: boolean;
}

const SUGGESTION: Record<LintViolation["kind"], string> = {
  color: "consider a semantic token utility instead (e.g. bg-primary, text-foreground)",
  spacing: "consider a token-backed spacing utility instead (e.g. p-4, gap-2)",
};

async function collectFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  const walk = async (current: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        await walk(full);
      } else if (entry.isFile() && LINT_EXTENSIONS.includes(path.extname(entry.name))) {
        files.push(full);
      }
    }
  };
  await walk(dir);
  return files;
}

export async function lint(targetArg: string | undefined, options: LintOptions): Promise<void> {
  const cwd = process.cwd();

  let dirs: string[];
  if (targetArg) {
    dirs = [path.resolve(cwd, targetArg)];
  } else {
    if (!existsSync(path.join(cwd, CONFIG_FILE))) {
      throw new Error(`No ${CONFIG_FILE} found — run "kinetixui init" first, or pass a path: kinetixui lint <path>`);
    }
    const config = await readConfig(cwd);
    if (!config) throw new Error(`${CONFIG_FILE} exists but isn't valid JSON.`);
    dirs = [resolveAliasDir(cwd, config, "components"), resolveAliasDir(cwd, config, "ui")];
  }

  const seenFiles = new Set<string>();
  const files: string[] = [];
  for (const dir of dirs) {
    for (const file of await collectFiles(dir)) {
      if (!seenFiles.has(file)) {
        seenFiles.add(file);
        files.push(file);
      }
    }
  }

  if (files.length === 0) {
    console.log(pc.dim(`No ${LINT_EXTENSIONS.join("/")} files found in ${dirs.map((d) => path.relative(cwd, d) || ".").join(", ")}.`));
    return;
  }

  let totalViolations = 0;
  let filesWithViolations = 0;

  for (const file of files) {
    const text = await readFile(file, "utf8");
    const violations = lintText(file, text);
    if (violations.length === 0) continue;

    filesWithViolations++;
    const rel = path.relative(cwd, file);
    for (const v of violations) {
      totalViolations++;
      console.log(
        `${pc.yellow("!")} ${pc.bold(`${rel}:${v.line}`)} — hardcoded ${v.kind}: ${pc.dim(v.snippet)}`,
      );
      console.log(`  ${pc.dim(SUGGESTION[v.kind])}`);
    }
  }

  console.log();
  if (totalViolations === 0) {
    console.log(pc.green("✔"), `${files.length} file${files.length === 1 ? "" : "s"} scanned, no hardcoded colors or spacing found.`);
  } else {
    console.log(
      `${totalViolations} violation${totalViolations === 1 ? "" : "s"} in ${filesWithViolations} of ${files.length} file${files.length === 1 ? "" : "s"} scanned.`,
    );
    console.log(
      pc.dim(
        "Checks unknown/deprecated tokens, accessibility violations and cross-platform inconsistencies aren't covered yet — see https://kinetixui.com/docs/cli#lint.",
      ),
    );
    if (options.fail) process.exitCode = 1;
  }
}
