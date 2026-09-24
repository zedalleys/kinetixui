// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Mutation tests for the verification system.
 *
 * A guardrail nobody has watched fail is a guardrail nobody knows works. Every test here breaks something
 * deliberately and asserts the generator REJECTS it — because the failure this whole system exists to
 * prevent is silent over-claiming, and a check that quietly passes on bad input is worse than no check.
 *
 * Two levels. The passage and symbol rules are exercised directly against the generator's own exported
 * functions; the file-level rules run the real script against a small fixture repository via `--root=`, so
 * the thing under test is the script CI runs, not a re-implementation of it.
 */

const repoRoot = join(process.cwd(), "../..");
const script = join(repoRoot, "scripts/gen-verification.mjs");
const stories = join(repoRoot, "scripts/gen-stories.mjs");

/** Runs a generator and returns { ok, output }. Never throws — the failures are what is being asserted. */
function run(file: string, args: string[]) {
  try {
    return { ok: true, output: execFileSync(process.execPath, [file, ...args], { encoding: "utf8", stdio: "pipe" }) };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

/* ── a fixture repository, small enough to reason about ───────────────────── */

const MANIFEST = {
  platformDefinitions: {
    React: {
      family: "web",
      label: "React",
      abbr: "RE",
      maturity: "stable",
      catalogComplete: true,
      package: "@kinetixui/ui",
      dir: "packages/ui",
      distribution: { channel: "npm", coordinate: "@kinetixui/ui", published: true },
    },
    Angular: {
      family: "web",
      label: "Angular",
      abbr: "NG",
      maturity: "preview",
      catalogComplete: false,
      package: "@kinetixui/angular",
      dir: "packages/ui-angular",
      distribution: { channel: "npm", coordinate: "@kinetixui/angular", published: false },
    },
  },
  components: {
    button: { status: "stable", since: "0.1.0", platforms: ["React", "Angular"] },
    dialog: { status: "stable", since: "0.1.0", platforms: ["React"] },
    form: { status: "stable", since: "0.1.0", platforms: ["Angular"] },
  },
};

const temps: string[] = [];
function fixture(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), "kx-verify-"));
  temps.push(dir);
  writeFileSync(join(dir, "components.manifest.json"), JSON.stringify(MANIFEST));
  // the generator treats a missing declared evidence source as an error — a renamed suite must not silently
  // drop its evidence — so the fixture carries an empty stand-in for the one suite listed outside the test tree
  mkdirSync(join(dir, "scripts"), { recursive: true });
  writeFileSync(join(dir, "scripts/a11y-browser.mjs"), "// no markers\n");
  for (const [rel, body] of Object.entries(files)) {
    const full = join(dir, rel);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}
afterEach(() => {
  while (temps.length) rmSync(temps.pop()!, { recursive: true, force: true });
});

const reactTest = (body: string) => ({ "packages/ui/src/x.test.tsx": body });

/** The generated dataset the fixture run produced. */
const generated = (dir: string) =>
  JSON.parse(readFileSync(join(dir, "verification.json"), "utf8")) as {
    components: Record<string, Record<string, Record<string, string[]>>>;
  };

describe("a marker cannot claim what its passage does not exercise", () => {
  it("rejects a passage that names no KinetixUI component", () => {
    const dir = fixture(reactTest(`// kx-verify: rtl\nconst x = renderSomethingElse();\n`));
    const { ok, output } = run(script, [`--root=${dir}`]);
    expect(ok).toBe(false);
    expect(output).toMatch(/uses no KinetixUI component/);
  });

  it("rejects an unknown evidence kind rather than inventing a category", () => {
    const dir = fixture(reactTest(`// kx-verify: accesibility\n<Button />\n`));
    const { ok, output } = run(script, [`--root=${dir}`]);
    expect(ok).toBe(false);
    expect(output).toMatch(/unknown kind\(s\) accesibility/);
  });

  it("refuses a test claiming the two kinds that are repository facts", () => {
    for (const kind of ["build", "published"]) {
      const dir = fixture(reactTest(`// kx-verify: ${kind}\n<Button />\n`));
      const { ok, output } = run(script, [`--root=${dir}`]);
      expect(ok, kind).toBe(false);
      expect(output).toMatch(/derived from the repository, not claimed by a test/);
    }
  });

  it("rejects kx-verify-covers pointing at something that does not exist", () => {
    const dir = fixture(reactTest(`// kx-verify: accessibility\n// kx-verify-covers: packages/ui/src/nowhere/*.stories.tsx\n`));
    const { ok, output } = run(script, [`--root=${dir}`]);
    expect(ok).toBe(false);
    expect(output).toMatch(/which does not exist/);
  });
});

describe("a marker is scoped to its passage, not to its file", () => {
  it("gives RTL to the components in the RTL block and to no others", () => {
    const dir = fixture(
      reactTest(
        [
          "// kx-verify: interaction",
          "<Button />",
          "<Dialog />",
          "// kx-verify: interaction, rtl",
          "<Dialog dir=\"rtl\" />",
        ].join("\n"),
      ),
    );
    const { ok } = run(script, [`--root=${dir}`]);
    expect(ok).toBe(true);
    const data = generated(dir);
    expect(data.components.dialog.React.rtl).toBeTruthy();
    expect(data.components.button.React.rtl).toBeUndefined();
    // and the earlier passage's claim still stands for both
    expect(data.components.button.React.interaction).toBeTruthy();
  });

  it("records the line range of the passage, so a positive result is traceable", () => {
    const dir = fixture(reactTest(`// kx-verify: interaction\n<Button />\n`));
    run(script, [`--root=${dir}`]);
    const data = generated(dir);
    expect(data.components.button.React.interaction[0]).toMatch(/packages\/ui\/src\/x\.test\.tsx:\d+-\d+/);
  });
});

describe("framework symbols cannot create KinetixUI evidence", () => {
  it("does not read Angular's FormControl as coverage of the form component", () => {
    const dir = fixture({
      "packages/ui-angular/src/x.spec.ts": `// kx-verify: interaction\nnew FormControl('');\nnew FormGroup({});\nKxButton;\n`,
    });
    const { ok } = run(script, [`--root=${dir}`]);
    expect(ok).toBe(true);
    const data = generated(dir);
    expect(data.components.button.Angular.interaction).toBeTruthy();
    expect(data.components.form?.Angular?.interaction).toBeUndefined();
  });
});

describe("evidence and the manifest cannot disagree", () => {
  it("rejects a test exercising a platform the manifest does not declare", () => {
    // `dialog` is React-only in the fixture; an Angular spec touching it is a contradiction
    const dir = fixture({ "packages/ui-angular/src/x.spec.ts": `// kx-verify: interaction\nKxDialog;\n` });
    const { ok, output } = run(script, [`--root=${dir}`]);
    expect(ok).toBe(false);
    expect(output).toMatch(/the manifest does not declare Angular/);
  });

  it("fails --check when the generated output is stale", () => {
    const dir = fixture(reactTest(`// kx-verify: interaction\n<Button />\n`));
    run(script, [`--root=${dir}`]);
    writeFileSync(join(dir, "verification.json"), "{}\n");
    const { ok, output } = run(script, [`--root=${dir}`, "--check"]);
    expect(ok).toBe(false);
    expect(output).toMatch(/is stale/);
  });
});

describe("story coverage drift fails CI", () => {
  /**
   * Run against the real repository, because the story generator reads the real demo registry. The file is
   * moved aside and restored in a finally block: the assertion is worthless if it cannot be undone.
   */
  it("fails when a generated story is deleted", () => {
    const path = join(repoRoot, "packages/ui/src/stories/Badge.stories.tsx");
    const aside = `${path}.moved`;
    renameSync(path, aside);
    try {
      const { ok, output } = run(stories, ["--check"]);
      expect(ok).toBe(false);
      expect(output).toMatch(/Badge\.stories\.tsx is missing|no Storybook story/);
    } finally {
      renameSync(aside, path);
    }
    // and the repository is left as it was
    expect(run(stories, ["--check"]).ok).toBe(true);
  });

  it("passes only while every manifest component has a story", () => {
    const { ok, output } = run(stories, ["--check"]);
    expect(ok).toBe(true);
    // the count is derived, so this asserts the shape rather than a number that would rot
    expect(output).toMatch(/(\d+)\/\1 components covered by a story/);
  });
});
