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

/**
 * The standalone gates the generator cites as evidence sources, read from its own `extra` lists so the
 * fixture cannot drift out of step with them.
 */
function extraEvidenceScripts(): string[] {
  const src = readFileSync(script, "utf8");
  const found = new Set<string>();
  for (const list of src.matchAll(/extra:\s*\[([^\]]*)\]/g)) {
    for (const m of list[1].matchAll(/["']([^"']+)["']/g)) found.add(m[1]);
  }
  if (found.size === 0) throw new Error("no `extra` evidence sources found in gen-verification.mjs");
  return [...found];
}

const temps: string[] = [];
function fixture(files: Record<string, string>, manifest: unknown = MANIFEST) {
  const dir = mkdtempSync(join(tmpdir(), "kx-verify-"));
  temps.push(dir);
  writeFileSync(join(dir, "components.manifest.json"), JSON.stringify(manifest));
  // the generator treats a missing declared evidence source as an error — a renamed suite must not silently
  // drop its evidence — so the fixture carries empty stand-ins for the suites listed outside the test tree.
  // Read out of the generator rather than restated here: a hardcoded pair went stale the moment a third
  // gate was cited as evidence, and every file-level test then failed on the missing stand-in instead of
  // the rule it was asserting.
  mkdirSync(join(dir, "scripts"), { recursive: true });
  for (const script of extraEvidenceScripts()) {
    writeFileSync(join(dir, script), "// no markers\n");
  }
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

describe("the extractor reads the manifest of the tree being scanned", () => {
  /**
   * `--root=<dir>` exists so these tests can scan a fixture instead of the repository, and the symbol
   * extractor has to follow it there. Built from this repository's manifest instead, it answers questions
   * about the fixture with the wrong vocabulary in both directions: blind to the fixture's own components,
   * and credulous about names the fixture has never declared.
   */
  it("credits a component only the scanned tree declares", () => {
    const manifest = {
      ...MANIFEST,
      components: { ...MANIFEST.components, "fixture-widget": { status: "stable", since: "0.1.0", platforms: ["React"] } },
    };
    const dir = fixture(reactTest(`// kx-verify: interaction\n<FixtureWidget />\n`), manifest);
    const { ok, output } = run(script, [`--root=${dir}`]);
    expect(ok, output).toBe(true);
    expect(generated(dir).components["fixture-widget"].React.interaction).toBeTruthy();
  });

  it("ignores a component only this repository declares", () => {
    // `accordion` is real here and absent from the fixture; matching it would attach evidence to a slug the
    // scanned manifest does not have.
    const dir = fixture(reactTest(`// kx-verify: interaction\n<Button />\n<Accordion />\n`));
    const { ok, output } = run(script, [`--root=${dir}`]);
    expect(ok, output).toBe(true);
    const data = generated(dir);
    expect(data.components.button.React.interaction).toBeTruthy();
    expect(data.components.accordion).toBeUndefined();
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

/* ── blocks ────────────────────────────────────────────────────────────────────────────────────────
 *
 * The block records are built by the same script, so they are broken the same way: a fixture repository
 * with one block, and each test removes or forges one piece of evidence and asserts the level that results
 * — or that the generator refuses. A block may only be as verified as ITS OWN file and ITS OWN tests show.
 */
const BLOCKS_MANIFEST = {
  blocks: {
    "sign-in": {
      title: "Sign in",
      status: "stable",
      sources: { React: "apps/web/src/examples/blocks/sign-in.tsx", Angular: "packages/ui-angular/src/examples/blocks/sign-in.ts" },
    },
    "stat-cards": { title: "Stat cards", status: "stable", sources: { React: "apps/web/src/examples/blocks/stat-cards.tsx" } },
  },
};
const RUNTIME_SCRIPT = "scripts/blocks-runtime-browser.mjs";

/** A workflow that really runs both builds and every standalone evidence script, unless told to drop one. */
function workflow({ drop = [] as string[], runtimeStep = `node ${RUNTIME_SCRIPT}`, buildWeb = "pnpm build:web", extraSteps = [] as string[] } = {}) {
  const steps = [buildWeb, "pnpm build:angular", ...extraSteps, "pnpm --filter @kinetixui/web test", "pnpm test:angular", ...extraEvidenceScripts().map((s) => `node ${s}`), runtimeStep];
  // a path filter naming the runtime script, as a real workflow has: a mention that is not a step
  const on = `on:\n  pull_request:\n    paths:\n      - "${RUNTIME_SCRIPT}"\n`;
  return `${on}jobs:\n  ci:\n    steps:\n${steps.filter((c) => !drop.some((d) => c.includes(d))).map((c) => `      - run: ${c}\n`).join("")}`;
}

function blockFixture(
  files: Record<string, string> = {},
  {
    blocks = BLOCKS_MANIFEST,
    drop = [] as string[],
    runtimeStep = undefined as string | undefined,
    buildWeb = undefined as string | undefined,
    scripts = {} as Record<string, string>,
    extraSteps = [] as string[],
  } = {},
) {
  return fixture({
    "blocks.manifest.json": JSON.stringify(blocks),
    "package.json": JSON.stringify({ scripts }),
    "apps/web/src/examples/blocks/sign-in.tsx": "export function SignInBlock() { return null }\n",
    "apps/web/src/examples/blocks/stat-cards.tsx": "export function StatCardsBlock() { return null }\n",
    "packages/ui-angular/src/examples/blocks/sign-in.ts": "export class SignInBlock {}\n",
    ".github/workflows/ci.yml": workflow({ drop, extraSteps, ...(runtimeStep ? { runtimeStep } : {}), ...(buildWeb ? { buildWeb } : {}) }),
    [RUNTIME_SCRIPT]: "// no markers\n",
    ...files,
  });
}

type BlockOut = Record<string, { platforms: Record<string, { level: string; build?: unknown[]; interaction?: unknown[]; accessibility?: unknown[]; limitations?: string[] }> }>;
const blocksOut = (dir: string) => (JSON.parse(readFileSync(join(dir, "verification.json"), "utf8")) as { blocks: BlockOut }).blocks;

const chromium = (body: string) => ({ [RUNTIME_SCRIPT]: body });
const BOTH_OBSERVED = `// kx-verify-block: accessibility\nblock(page, "sign-in");\n// kx-verify-block: interaction\nblock(page, "sign-in");\n`;

describe("block evidence: negative controls", () => {
  it("1. refuses a block whose manifest source does not exist", () => {
    const blocks = structuredClone(BLOCKS_MANIFEST);
    blocks.blocks["sign-in"].sources.Angular = "packages/ui-angular/src/examples/blocks/missing.ts";
    const { ok, output } = run(script, [`--root=${blockFixture({}, { blocks })}`]);
    expect(ok).toBe(false);
    expect(output).toMatch(/sign-in: blocks\.manifest\.json names .*missing\.ts as its Angular source, which does not exist/);
  });

  it("2. records a platform the manifest does not implement as not implemented, and refuses a test that claims it", () => {
    const dir = blockFixture();
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    expect(blocksOut(dir)["stat-cards"]!.platforms.Angular!.level).toBe("not-implemented");
    const claim = blockFixture({ "packages/ui-angular/src/x.spec.ts": `// kx-verify-block: interaction\nmount(StatCardsBlock);\n` });
    const { ok, output } = run(script, [`--root=${claim}`]);
    expect(ok).toBe(false);
    expect(output).toMatch(/exercises stat-cards on Angular, which blocks\.manifest\.json does not implement there/);
  });

  it("3. gives no build record when the CI step that compiles the file is gone", () => {
    const built = blockFixture();
    expect(run(script, [`--root=${built}`]).ok).toBe(true);
    expect(blocksOut(built)["sign-in"]!.platforms.React!.level).toBe("build");
    const dir = blockFixture({}, { drop: ["build:web"] });
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    expect(blocksOut(dir)["sign-in"]!.platforms.React!.level).toBe("source");
    expect(blocksOut(dir)["sign-in"]!.platforms.React!.limitations).toContain("no CI step compiles this file");
    // the command has to be what the step executes, not text inside it
    for (const buildWeb of [
      "echo 'pnpm build:web'",
      "pnpm lint # pnpm build:web",
      "pnpm build:web-docs",
      "true || pnpm build:web", // skipped whenever the left side succeeds
      ">\n          echo preparing\n          pnpm build:web", // folded: one command, `echo preparing pnpm build:web`
      "pnpm build:web\n        if: false", // a step GitHub may skip
      "pnpm build:web\n        continue-on-error: true", // a step whose failure is ignored
      "pnpm build:web || true", // failure masked
      "pnpm build:web | tee build.log", // the pipe's status is tee's
      "pnpm build:web; true", // the sequence exits with the last command's status
      "|\n          if false\n          then\n          pnpm build:web\n          fi", // never runs, and the step passes
      "|\n          exit 0\n          pnpm build:web", // the step ends before it
      "|\n          builtin exit 0\n          pnpm build:web", // the same exit, prefixed
      "|\n          X=1 exit 0\n          pnpm build:web", // the same exit, behind an assignment
      "CI=1 pnpm build:web", // not one of the programs a build is read from
      "pnpm build:web --help", // an extra flag can make it a no-op
      "|\n          set +e\n          pnpm build:web\n          true", // failure no longer stops the step
      "|\n          pnpm build:web \\\n            --dry-run", // a continuation makes it another command
    ]) {
      const fake = blockFixture({}, { buildWeb });
      expect(run(script, [`--root=${fake}`]).ok).toBe(true);
      expect(blocksOut(fake)["sign-in"]!.platforms.React!.level, buildWeb).toBe("source");
    }
    // a condition on the job skips every step in it
    const skippedJob = blockFixture({
      ".github/workflows/ci.yml": `${workflow({ drop: ["build:web"] })}  web:\n    if: false\n    steps:\n      - run: pnpm build:web\n`,
    });
    expect(run(script, [`--root=${skippedJob}`]).ok).toBe(true);
    expect(blocksOut(skippedJob)["sign-in"]!.platforms.React!.level).toBe("source");
    const otherJob = blockFixture({ ".github/workflows/ci.yml": `${workflow({ drop: ["build:web"] })}  web:\n    steps:\n      - run: pnpm build:web\n` });
    expect(run(script, [`--root=${otherJob}`]).ok).toBe(true);
    expect(blocksOut(otherJob)["sign-in"]!.platforms.React!.level).toBe("build");
    for (const buildWeb of ["pnpm install --frozen-lockfile && pnpm build:web", "|\n          pnpm install\n          pnpm build:web"]) {
      const real = blockFixture({}, { buildWeb });
      expect(run(script, [`--root=${real}`]).ok).toBe(true);
      expect(blocksOut(real)["sign-in"]!.platforms.React!.level, buildWeb).toBe("build");
    }
  });

  it("3b. does not credit the Angular package build to blocks it never compiles", () => {
    // ng-packagr builds from public-api.ts, which imports no block: the step running is not evidence for them
    const dir = blockFixture();
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    expect(blocksOut(dir)["sign-in"]!.platforms.Angular!.level).toBe("source");
    expect(blocksOut(dir)["sign-in"]!.platforms.Angular!.build).toBeUndefined();
  });

  it("3c. credits the Angular block compile only to the blocks its program lists, and only while CI runs it", () => {
    const program = (tsconfig: object) => ({ "packages/ui-angular/tsconfig.blocks.json": JSON.stringify(tsconfig) });
    const COMPILE = "scripts/angular-package/compile-blocks.mjs";
    const wrapper = { "check:angular-blocks": `node ${COMPILE}` };
    const listed = { ...program({ files: ["src/examples/blocks/sign-in.ts"], include: [] }), [COMPILE]: "// compiles\n" };
    const angular = (files: Record<string, string>, extraSteps: string[], scripts: Record<string, string> = wrapper) => {
      const dir = blockFixture(files, { extraSteps, scripts });
      expect(run(script, [`--root=${dir}`]).ok).toBe(true);
      return blocksOut(dir)["sign-in"]!.platforms.Angular!;
    };
    const compiled = angular(listed, ["pnpm check:angular-blocks"]);
    expect(compiled.level).toBe("build");
    expect(JSON.stringify(compiled.build)).toMatch(/check:angular-blocks/);
    // omitted from the program: not compiled, whatever else the step compiles
    expect(angular(program({ files: ["src/examples/blocks/other.ts"], include: [] }), ["pnpm check:angular-blocks"]).level).toBe("source");
    // a glob include could let anything in; the program must name its files
    expect(angular(program({ include: ["src/**/*.ts"] }), ["pnpm check:angular-blocks"]).level).toBe("source");
    expect(angular({}, ["pnpm check:angular-blocks"]).level).toBe("source"); // no program at all
    // the step has to run, unconditionally and with its failure intact
    for (const step of [
      [],
      ["pnpm check:angular-blocks\n        if: github.event_name == 'push'"],
      ["pnpm check:angular-blocks\n        continue-on-error: true"],
      ["pnpm check:angular-blocks || true"],
      ["echo pnpm check:angular-blocks"],
      ["pnpm test:angular-blocks"],
    ]) {
      expect(angular(listed, step).level, step.join()).toBe("source");
    }
    // the step's wrapper has to run the compile itself: repointed, masked, flagged or missing, it proves nothing
    for (const cmd of ["echo skipped", "true", `node ${COMPILE}; true`, `node ${COMPILE} || true`, `node ${COMPILE} --help`, `pnpm build:angular && node ${COMPILE}`]) {
      expect(angular(listed, ["pnpm check:angular-blocks"], { "check:angular-blocks": cmd }).level, cmd).toBe("source");
    }
    expect(angular(listed, ["pnpm check:angular-blocks"], {}).level).toBe("source");
    const { [COMPILE]: _gone, ...noScript } = listed;
    expect(angular(noScript, ["pnpm check:angular-blocks"]).level).toBe("source");
  });

  it("4. is not runtime verified without observed interaction", () => {
    const dir = blockFixture(chromium(`// kx-verify-block: accessibility\nblock(page, "sign-in");\n`));
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    expect(blocksOut(dir)["sign-in"]!.platforms.React!.level).toBe("build");
  });

  it("5. is not runtime verified without observed accessibility", () => {
    const dir = blockFixture(chromium(`// kx-verify-block: interaction\nblock(page, "sign-in");\n`));
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    expect(blocksOut(dir)["sign-in"]!.platforms.React!.level).toBe("build");
    // and both observed IS runtime: the control above is not failing for an unrelated reason
    const both = blockFixture(chromium(BOTH_OBSERVED));
    expect(run(script, [`--root=${both}`]).ok).toBe(true);
    expect(blocksOut(both)["sign-in"]!.platforms.React!.level).toBe("runtime");
  });

  it("6. never reads a React test as Angular evidence", () => {
    const dir = blockFixture({ ...chromium(BOTH_OBSERVED), "apps/web/src/x.test.tsx": `// kx-verify-block: interaction, accessibility\n<SignInBlock />\n` });
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    const angular = blocksOut(dir)["sign-in"]!.platforms.Angular!;
    expect(angular.level).toBe("source");
    expect(angular.interaction).toBeUndefined();
    expect(angular.accessibility).toBeUndefined();
  });

  it("6b. keeps headless evidence below runtime even when it covers both kinds", () => {
    // React, which has a build record, so the only thing between this block and runtime is where the test ran
    const dir = blockFixture({ "apps/web/src/x.test.tsx": `// kx-verify-block: interaction, accessibility\n<SignInBlock />\n` });
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    const react = blocksOut(dir)["sign-in"]!.platforms.React!;
    expect(react.interaction).toEqual([{ ref: "apps/web/src/x.test.tsx:1-2", environment: "jsdom" }]);
    expect(react.accessibility).toEqual([{ ref: "apps/web/src/x.test.tsx:1-2", environment: "jsdom" }]);
    expect(react.build).toBeDefined();
    expect(react.level).toBe("build");
  });

  it("6c. records no test evidence from a suite that no workflow step runs", () => {
    const files = { "packages/ui-angular/src/x.spec.ts": `// kx-verify-block: interaction, accessibility\nmount(SignInBlock);\n` };
    const ran = blockFixture(files);
    expect(run(script, [`--root=${ran}`]).ok).toBe(true);
    expect(blocksOut(ran)["sign-in"]!.platforms.Angular!.interaction).toBeDefined();
    const unrun = blockFixture(files, { drop: ["test:angular"] });
    expect(run(script, [`--root=${unrun}`]).ok).toBe(true);
    expect(blocksOut(unrun)["sign-in"]!.platforms.Angular!.interaction).toBeUndefined();
    expect(blocksOut(unrun)["sign-in"]!.platforms.Angular!.accessibility).toBeUndefined();
    // its markers are still checked: a bad claim in a suite that is not run is still an error
    const bad = blockFixture({ "packages/ui-angular/src/x.spec.ts": `// kx-verify-block: interaction\nmount(StatCardsBlock);\n` }, { drop: ["test:angular"] });
    expect(run(script, [`--root=${bad}`]).ok).toBe(false);
  });

  it("7. keeps component evidence and block evidence apart, in both directions", () => {
    const dir = blockFixture({
      // a component test that happens to render the block: evidence for Button, none for the block
      "packages/ui/src/x.test.tsx": `// kx-verify: interaction\n<Button /><SignInBlock />\n`,
      // a block test that happens to render Button: evidence for the block, none for Button
      "packages/ui-angular/src/y.spec.ts": `// kx-verify-block: interaction\nmount(SignInBlock); KxButton;\n`,
      // the one tree both scanners read: a component marker in an Angular spec that mounts the block
      "packages/ui-angular/src/z.spec.ts": `// kx-verify: accessibility\nmount(SignInBlock); KxButton;\n`,
    });
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    expect(blocksOut(dir)["sign-in"]!.platforms.React!.interaction).toBeUndefined();
    expect(blocksOut(dir)["sign-in"]!.platforms.Angular!.accessibility).toBeUndefined();
    expect(blocksOut(dir)["sign-in"]!.platforms.Angular!.interaction).toEqual([{ ref: "packages/ui-angular/src/y.spec.ts:1-2", environment: "jsdom" }]);
    expect(generated(dir).components.button?.Angular?.interaction).toBeUndefined();
    expect(generated(dir).components.button?.React?.interaction).toBeDefined();
  });

  it("10. fails --check when a generated block level is inflated by hand", () => {
    const dir = blockFixture();
    run(script, [`--root=${dir}`]);
    const file = join(dir, "verification.json");
    const data = JSON.parse(readFileSync(file, "utf8"));
    data.blocks["sign-in"].platforms.Angular.level = "runtime";
    writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
    const { ok, output } = run(script, [`--root=${dir}`, "--check"]);
    expect(ok).toBe(false);
    expect(output).toMatch(/is stale/);
  });

  it("11. refuses stale or invalid evidence references", () => {
    const unknownKind = run(script, [`--root=${blockFixture({ "packages/ui-angular/src/x.spec.ts": `// kx-verify-block: rtl\nmount(SignInBlock);\n` })}`]);
    expect(unknownKind.ok).toBe(false);
    expect(unknownKind.output).toMatch(/kx-verify-block names rtl/);
    const badCovers = run(script, [`--root=${blockFixture(chromium(`// kx-verify-block: accessibility\n// kx-verify-covers: blocks/old.json\n`))}`]);
    expect(badCovers.ok).toBe(false);
    expect(badCovers.output).toMatch(/may only cover blocks\.manifest\.json/);
    const coversNothing = run(script, [`--root=${blockFixture(chromium(`// kx-verify-block: interaction\nconst x = 1;\n`))}`]);
    expect(coversNothing.ok).toBe(false);
    expect(coversNothing.output).toMatch(/for a block but uses no block/);
    // the browser suite is evidence only while a workflow runs it
    const unrun = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { drop: [RUNTIME_SCRIPT] })}`]);
    expect(unrun.ok).toBe(false);
    expect(unrun.output).toMatch(/blocks-runtime-browser\.mjs: a React block evidence source that no workflow step/);
    // through a package.json wrapper it counts, but only as that whole command
    const scripts = { "check:blocks-runtime": `node ${RUNTIME_SCRIPT} --base http://127.0.0.1:3000` };
    const wrapped = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { scripts, runtimeStep: "pnpm check:blocks-runtime" })}`]);
    expect(wrapped.ok, wrapped.output).toBe(true);
    const blockScalar = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { scripts, runtimeStep: "|\n          pnpm build:web\n          pnpm check:blocks-runtime" })}`]);
    expect(blockScalar.ok, blockScalar.output).toBe(true);
    const echoed = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { scripts, runtimeStep: "echo 'pnpm check:blocks-runtime'" })}`]);
    expect(echoed.ok).toBe(false);
    const commentedOut = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { scripts, runtimeStep: "|\n          # pnpm check:blocks-runtime\n          echo skipped" })}`]);
    expect(commentedOut.ok).toBe(false);
    // a wrapper that names the script without running it is not a run of it
    const noop = { "check:blocks-runtime": `echo ${RUNTIME_SCRIPT}` };
    const noopWrapper = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { scripts: noop, runtimeStep: "pnpm check:blocks-runtime" })}`]);
    expect(noopWrapper.ok).toBe(false);
    expect(noopWrapper.output).toMatch(/no workflow step/);
    const semicolon = { "check:blocks-runtime": `node ${RUNTIME_SCRIPT} --base http://127.0.0.1:3000; true` };
    const masked = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { scripts: semicolon, runtimeStep: "pnpm check:blocks-runtime" })}`]);
    expect(masked.ok).toBe(false);
    expect(masked.output).toMatch(/no workflow step/);
    const maskedStep = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { runtimeStep: `node ${RUNTIME_SCRIPT}; true` })}`]);
    expect(maskedStep.ok).toBe(false);
    const help = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { runtimeStep: `node ${RUNTIME_SCRIPT} --help` })}`]);
    expect(help.ok).toBe(false);
    const based = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { runtimeStep: `node ${RUNTIME_SCRIPT} --base http://127.0.0.1:3000` })}`]);
    expect(based.ok, based.output).toBe(true);
    const otherCommand = run(script, [`--root=${blockFixture(chromium(BOTH_OBSERVED), { scripts, runtimeStep: "pnpm check:blocks-runtime-old" })}`]);
    expect(otherCommand.ok).toBe(false);
    expect(otherCommand.output).toMatch(/no workflow step/);
  });

  it("12. fails --check when a block leaves the manifest but its evidence stays", () => {
    const dir = blockFixture();
    run(script, [`--root=${dir}`]);
    const blocks = structuredClone(BLOCKS_MANIFEST) as { blocks: Record<string, unknown> };
    delete blocks.blocks["stat-cards"];
    writeFileSync(join(dir, "blocks.manifest.json"), JSON.stringify(blocks));
    const { ok, output } = run(script, [`--root=${dir}`, "--check"]);
    expect(ok).toBe(false);
    expect(output).toMatch(/is stale/);
  });
});

describe("component evidence records where it ran", () => {
  const real = JSON.parse(readFileSync(join(repoRoot, "verification.json"), "utf8")) as {
    sources: Record<string, { file: string; environment?: string }[]>;
  };
  const HEADLESS = ["jsdom", "xctest", "robolectric", "flutter_test"];

  it("labels every evidence source with a known environment, browser suites as chromium", () => {
    for (const [platform, list] of Object.entries(real.sources)) {
      for (const s of list) {
        expect([...HEADLESS, "chromium"], `${platform} ${s.file}`).toContain(s.environment);
        // a browser suite is a script that drives a browser; a unit test is never one
        expect(s.environment === "chromium", s.file).toBe(s.file.startsWith("scripts/"));
      }
    }
    // no native suite is labelled as anything but its headless test host: there is no device evidence
    for (const platform of ["SwiftUI", "Compose", "Flutter"]) {
      expect(real.sources[platform]!.every((s) => HEADLESS.includes(s.environment!)), platform).toBe(true);
    }
  });
});
