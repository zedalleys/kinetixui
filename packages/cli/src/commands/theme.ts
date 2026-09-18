import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import { checkContrast, deriveForegrounds, parseThemeFile, scaffoldThemeFile, toCssBlock } from "../lib/theme.js";
import { assertThemeName } from "../lib/validate.js";

const THEME_DIR = "kinetixui-themes";

function csvPath(cwd: string, name: string): string {
  return path.join(cwd, THEME_DIR, `${name}.csv`);
}

function cssPath(cwd: string, name: string): string {
  return path.join(cwd, THEME_DIR, `${name}.css`);
}

export interface ThemeCreateOptions {
  force: boolean;
}

export async function themeCreate(name: string, options: ThemeCreateOptions): Promise<void> {
  assertThemeName(name);
  const cwd = process.cwd();
  const file = csvPath(cwd, name);

  if (existsSync(file) && !options.force) {
    throw new Error(`${path.relative(cwd, file)} already exists. Pass --force to overwrite it.`);
  }

  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, scaffoldThemeFile(name), "utf8");

  console.log(pc.green("✔"), `Wrote ${path.relative(cwd, file)}`);
  console.log(`Uncomment and edit the tokens you want to override, then run:`);
  console.log(pc.dim(`  kinetixui theme build ${name}`));
}

export interface ThemeBuildOptions {
  failOnContrast: boolean;
}

export async function themeBuild(name: string, options: ThemeBuildOptions): Promise<void> {
  assertThemeName(name);
  const cwd = process.cwd();
  const src = csvPath(cwd, name);

  if (!existsSync(src)) {
    throw new Error(`${path.relative(cwd, src)} doesn't exist. Run "kinetixui theme create ${name}" first.`);
  }

  const text = await readFile(src, "utf8");
  const { values: parsed, errors, unknownTokens } = parseThemeFile(text);

  for (const err of errors) console.log(pc.yellow("!"), err);
  for (const unknown of unknownTokens) console.log(pc.yellow("!"), `"${unknown}" isn't a known token — skipped.`);

  const values = deriveForegrounds(parsed);
  const setCount = Object.keys(values).length;

  if (setCount === 0) {
    throw new Error(`No tokens set in ${path.relative(cwd, src)} — nothing to build. Uncomment at least one line.`);
  }

  const dest = cssPath(cwd, name);
  await writeFile(dest, toCssBlock(values), "utf8");
  console.log(pc.green("✔"), `Wrote ${path.relative(cwd, dest)} (${setCount} token${setCount === 1 ? "" : "s"})`);
  console.log(`Paste it after ${pc.dim('@import "@kinetixui/tokens/css";')} in your global CSS.`);

  console.log();
  console.log(pc.dim("WCAG AA contrast (4.5:1)"));
  const results = checkContrast(values);
  let failed = 0;
  for (const { pair, ratio, pass } of results) {
    const mark = pass ? pc.green("✔") : pc.red("✖");
    if (!pass) failed++;
    console.log(`${mark} ${pair[0]} / ${pair[1]}`, pc.dim(`${ratio.toFixed(2)}:1`));
  }
  if (results.length === 0) {
    console.log(pc.dim("(no checkable pairs — set at least one base + foreground, or just a base to auto-derive one)"));
  }

  console.log();
  console.log("Native (SwiftUI/Compose/Flutter) theme output isn't built yet — this compiles to CSS only.");
  console.log(pc.dim("See https://kinetixui.com/docs/cli#theme for the current scope."));

  if (failed > 0 && options.failOnContrast) {
    process.exitCode = 1;
  }
}
