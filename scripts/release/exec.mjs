/**
 * Subprocess boundary.
 *
 * Everything the release tooling runs goes through here, and everything here uses `execFile` with
 * an argument array. Nothing in this file builds a command string, because the strings involved —
 * package names, directories, tarball paths — come from package manifests and from a temp
 * directory, and a release tool is the last place to learn that `"; rm -rf` is a legal npm scope.
 *
 * `shell` is never enabled, which on Windows rules out the `pnpm.cmd` shim entirely — Node refuses
 * to spawn a `.cmd` without one. `packageManagerCommand()` finds something directly spawnable
 * instead.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/** A command name we are willing to pass to `execFile`. Config-supplied, so still checked. */
const SAFE_SCRIPT_NAME = /^[a-z0-9][a-z0-9:_-]*$/i;

export class ExecError extends Error {
  constructor(message, { code, stdout, stderr }) {
    super(message);
    this.name = "ExecError";
    this.code = code;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

/**
 * Run a command. Rejects with an {@link ExecError} carrying both streams on a non-zero exit, so a
 * caller can put the real failure in the report instead of "command failed".
 *
 * @param {string} file
 * @param {string[]} args
 * @param {{cwd?: string, env?: Record<string, string>, timeoutMs?: number}} [options]
 */
export function run(file, args, options = {}) {
  if (!Array.isArray(args)) throw new TypeError("run() takes an argument array, not a command string");
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        cwd: options.cwd,
        env: options.env ?? process.env,
        timeout: options.timeoutMs ?? 20 * 60 * 1000,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        shell: false,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new ExecError(`${file} ${args.join(" ")} failed: ${error.message.split("\n")[0]}`, {
              code: error.code ?? null,
              stdout: String(stdout),
              stderr: String(stderr),
            }),
          );
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

/**
 * A spawnable pnpm.
 *
 * Node refuses to spawn a `.cmd` without a shell (CVE-2024-27980), and turning the shell on is the
 * one thing this file will not do — the arguments include tarball paths and package names. So on
 * Windows the shim is bypassed entirely and pnpm's own JavaScript entry point is run with the
 * current Node. On Linux, where the release actually runs, `pnpm` is a real executable and is
 * spawned directly.
 *
 * pnpm specifically, not npm: `pnpm pack` is what rewrites `workspace:` specs into real versions,
 * and `pnpm publish` is what the release is authenticated for.
 */
export function packageManagerCommand() {
  // An explicit answer, for a machine where pnpm is installed somewhere this cannot guess.
  const override = process.env.KINETIXUI_PNPM;
  if (override) {
    if (!existsSync(override)) throw new Error(`KINETIXUI_PNPM points at ${override}, which does not exist.`);
    return /\.(c|m)?js$/i.test(override) ? { file: process.execPath, prefix: [override] } : { file: override, prefix: [] };
  }

  // Whatever package manager invoked us, when that is pnpm's own JavaScript. This is the CI case
  // and the `pnpm release` case.
  const execpath = process.env.npm_execpath;
  if (execpath && /pnpm[^/\\]*\.(c|m)?js$/i.test(execpath) && existsSync(execpath)) {
    return { file: process.execPath, prefix: [execpath] };
  }

  // A real executable, which is what pnpm/action-setup installs and what the release actually runs
  // on. Nothing below this line matters to a release; it is for developers on Windows.
  if (process.platform !== "win32") return { file: "pnpm", prefix: [] };

  for (const dir of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    const exe = path.join(dir, "pnpm.exe");
    if (existsSync(exe)) return { file: exe, prefix: [] };
    if (!existsSync(path.join(dir, "pnpm.cmd"))) continue;
    for (const relative of ["node_modules/pnpm/bin", "../node_modules/pnpm/bin", "node_modules/corepack/dist"]) {
      for (const entry of ["pnpm.cjs", "pnpm.mjs", "pnpm.js"]) {
        const js = path.join(dir, ...relative.split("/"), entry);
        if (existsSync(js)) return { file: process.execPath, prefix: [js] };
      }
    }
  }
  throw new Error(
    "Could not find a pnpm that can be spawned without a shell, and this refuses to use one " +
      "(the arguments include package names and tarball paths).\n" +
      "Run the release through pnpm itself so npm_execpath points at pnpm's entry point, or set " +
      "KINETIXUI_PNPM to a pnpm executable or its .cjs/.mjs entry point.",
  );
}

/** Run a root package.json script by name. The name is validated because it comes from config. */
export function runRootScript(name, { cwd, env } = {}) {
  if (!SAFE_SCRIPT_NAME.test(name)) throw new Error(`refusing to run an unsafe script name: ${JSON.stringify(name)}`);
  const { file, prefix } = packageManagerCommand();
  return run(file, [...prefix, "run", name], { cwd, env });
}

/**
 * Resolve a repository-relative path and refuse anything that escapes the repository. Directories
 * come from `release/publish-packages.json`, which is trusted, but a typo there should be a clear
 * error rather than a read somewhere unexpected.
 */
export function resolveInside(root, relative) {
  const resolved = path.resolve(root, relative);
  const base = path.resolve(root);
  const inside = resolved === base || resolved.startsWith(base + path.sep);
  if (!inside) throw new Error(`path escapes the repository: ${relative}`);
  return resolved;
}
