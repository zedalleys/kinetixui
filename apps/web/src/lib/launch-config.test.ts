// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `.claude/launch.json` has to start this app the way the app expects to be started.
 *
 * It lives in the web app's suite because the web app is what it launches, and because that needs no
 * new test wiring — `apps/web` already reads sibling packages this way.
 *
 * The defect these exist for: both configurations ran Next from the repository root and passed
 * `apps/web` as Next's project-directory argument. Next accepts that and serves the right app, so
 * the page loaded and looked plausible — but it does not change the *process working directory*, and
 * `apps/web/tailwind.config.ts` resolves its content globs against that. From the root, `./src/**`
 * and `../../packages/ui/**` match nothing at all. Tailwind warned that `content` was empty and
 * generated no utilities: 62,873 bytes of CSS with zero `.flex`, `.grid` or `.rounded-lg` rules,
 * across a page carrying 206 elements that needed them.
 *
 * So the assertion below is not "the JSON looks like this". It is the mechanism itself: resolve the
 * real Tailwind globs against the configured working directory and require that they point at real
 * directories. Move the cwd back to the root and this fails, naming the glob that stopped resolving.
 *
 * What is deliberately NOT here is a test that boots the dev server and inspects computed styles.
 * Booting Next costs ~10s of compile per run to re-prove the step this already proves statically,
 * and the repository's one server-booting suite (`check:a11y-site`) runs against a production build
 * in its own workflow. The browser verification for this change was done by hand and recorded in the
 * pull request instead.
 */

const repoRoot = path.resolve("../..");
const launch = JSON.parse(readFileSync(path.join(repoRoot, ".claude/launch.json"), "utf8")) as {
  version: string;
  configurations: { name: string; cwd?: string; runtimeExecutable: string; runtimeArgs: string[]; port?: number }[];
};

const configFor = (name: string) => {
  const found = launch.configurations.find((entry) => entry.name === name);
  expect(found, `.claude/launch.json has no "${name}" configuration`).toBeTruthy();
  return found!;
};

/** Where the process actually starts. `cwd` is relative to the repository root. */
const workingDirectoryOf = (name: string) => path.resolve(repoRoot, configFor(name).cwd ?? ".");

const WEB = path.resolve(repoRoot, "apps/web");

describe.each([
  ["web", "dev", 3000],
  ["web-prod", "start", 3100],
] as const)("the %s launch", (name, subcommand, port) => {
  it("runs from apps/web, not from the repository root", () => {
    expect(configFor(name).cwd, `"${name}" must declare a working directory`).toBeTruthy();
    expect(workingDirectoryOf(name)).toBe(WEB);
  });

  it(`runs \`next ${subcommand}\``, () => {
    const args = configFor(name).runtimeArgs;
    expect(args.some((arg) => arg.includes("next"))).toBe(true);
    expect(args).toContain(subcommand);
  });

  it(`serves on port ${port}, consistently between the port field and the arguments`, () => {
    const config = configFor(name);
    expect(config.port).toBe(port);
    const flag = config.runtimeArgs.indexOf("-p");
    expect(flag, "the port should be passed explicitly, so the two cannot drift").toBeGreaterThan(-1);
    expect(config.runtimeArgs[flag + 1]).toBe(String(port));
  });

  /**
   * The exact regression: `next <subcommand> apps/web` from the root. It works well enough to look
   * fine, which is why it has to be named rather than left to the cwd assertion alone.
   */
  it("does not pass a project directory instead of changing directory", () => {
    const args = configFor(name).runtimeArgs;
    const positional = args.slice(args.indexOf(subcommand) + 1).filter((arg) => !arg.startsWith("-"));
    // `-p 3000` contributes "3000"; anything path-shaped after the subcommand is the bug.
    for (const arg of positional) {
      expect(arg, `"${name}" passes ${arg} as Next's project directory — set cwd instead`).not.toMatch(/[/\\]|^apps$/);
    }
  });

  it("names an executable that exists from that working directory", () => {
    const [entry] = configFor(name).runtimeArgs;
    expect(configFor(name).runtimeExecutable).toBe("node");
    expect(existsSync(path.resolve(workingDirectoryOf(name), entry!)), `${entry} is not there from ${name}'s cwd`).toBe(
      true,
    );
  });
});

/**
 * The invariant underneath all of it, checked against the real Tailwind config rather than restated.
 *
 * Tailwind resolves relative `content` globs against the process working directory. If a launch
 * starts Next somewhere else, these stop matching and every utility class silently disappears.
 */
describe("Tailwind's content globs resolve from where the app is launched", () => {
  const tailwind = readFileSync(path.join(WEB, "tailwind.config.ts"), "utf8");
  const globs = [...(tailwind.match(/content:\s*\[([\s\S]*?)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]!);

  it("reads the globs from the config rather than hard-coding them", () => {
    expect(globs.length).toBeGreaterThan(0);
    expect(globs.some((g) => g.startsWith("./"))).toBe(true);
    expect(globs.some((g) => g.startsWith("../")), "a glob reaching out of the app is what makes cwd load-bearing").toBe(
      true,
    );
  });

  it.each(["web", "web-prod"])("every glob points at real files from the %s launch", (name) => {
    const cwd = workingDirectoryOf(name);
    for (const glob of globs) {
      // The literal directory prefix — everything before the first wildcard.
      const literal = glob.slice(0, glob.indexOf("*")).replace(/\/$/, "");
      const resolved = path.resolve(cwd, literal);
      expect(
        existsSync(resolved),
        `Tailwind's "${glob}" resolves to ${resolved} from ${name}'s working directory, which does not exist. ` +
          `Every utility class would be dropped from the generated CSS.`,
      ).toBe(true);
    }
  });

  /**
   * And the counter-case, so the test above cannot pass for the wrong reason: from the repository
   * root the same globs resolve to nothing. If that ever stops being true the assertion above has
   * lost its teeth and should be reconsidered rather than trusted.
   */
  it("would not resolve from the repository root, which is what made this a real bug", () => {
    const missing = globs.filter((glob) => !existsSync(path.resolve(repoRoot, glob.slice(0, glob.indexOf("*")))));
    expect(missing.length, "these globs are supposed to be root-relative-broken").toBe(globs.length);
  });
});
