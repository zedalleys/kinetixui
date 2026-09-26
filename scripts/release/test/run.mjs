/**
 * run.mjs — the release tooling's test entry point.
 *
 *   node scripts/release/test/run.mjs
 *
 * Node's `--test` only accepts a directory on newer versions; on the Node 22 that CI runs, passing
 * one makes it try to load the directory as a module:
 *
 *   Error: Cannot find module '/home/runner/work/kinetixui/kinetixui/scripts/release/test'
 *
 * A shell glob would fix it on Linux and macOS and quietly fail on Windows, where an npm script
 * runs under cmd.exe and nothing expands `*.test.mjs`. So the files are discovered here, in Node,
 * and passed explicitly — the same list on every platform and every version, sorted so a failure
 * is reproducible in the order it was reported.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL(".", import.meta.url));
const files = readdirSync(dir)
  .filter((name) => name.endsWith(".test.mjs"))
  .sort()
  .map((name) => path.join(dir, name));

if (files.length === 0) {
  console.error(`No *.test.mjs files found in ${dir}. That is a broken checkout, not an empty test run.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", "--test-reporter=spec", ...files], {
  stdio: "inherit",
  windowsHide: true,
  shell: false,
});

if (result.error) {
  console.error(`Could not start the test runner: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
