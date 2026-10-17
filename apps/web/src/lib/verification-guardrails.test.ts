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
function workflow({ drop = [] as string[] } = {}) {
  const steps = ["pnpm build:web", "pnpm build:angular", ...extraEvidenceScripts().map((s) => `node ${s}`), `node ${RUNTIME_SCRIPT}`];
  return `jobs:\n  ci:\n    steps:\n${steps.filter((c) => !drop.some((d) => c.includes(d))).map((c) => `      - run: ${c}\n`).join("")}`;
}

function blockFixture(files: Record<string, string> = {}, { blocks = BLOCKS_MANIFEST, drop = [] as string[] } = {}) {
  return fixture({
    "blocks.manifest.json": JSON.stringify(blocks),
    "package.json": JSON.stringify({ scripts: {} }),
    "apps/web/src/examples/blocks/sign-in.tsx": "export function SignInBlock() { return null }\n",
    "apps/web/src/examples/blocks/stat-cards.tsx": "export function StatCardsBlock() { return null }\n",
    "packages/ui-angular/src/examples/blocks/sign-in.ts": "export class SignInBlock {}\n",
    ".github/workflows/ci.yml": workflow({ drop }),
    [RUNTIME_SCRIPT]: "// no markers\n",
    ...files,
  });
}

type BlockOut = Record<string, { platforms: Record<string, { level: string; interaction?: unknown[]; accessibility?: unknown[] }> }>;
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
    const dir = blockFixture({}, { drop: ["build:angular"] });
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    expect(blocksOut(dir)["sign-in"]!.platforms.Angular!.level).toBe("source");
    expect(blocksOut(dir)["sign-in"]!.platforms.React!.level).toBe("build");
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
    expect(angular.level).toBe("build");
    expect(angular.interaction).toBeUndefined();
    expect(angular.accessibility).toBeUndefined();
  });

  it("6b. keeps headless evidence below runtime even when it covers both kinds", () => {
    const dir = blockFixture({ "packages/ui-angular/src/x.spec.ts": `// kx-verify-block: interaction, accessibility\nmount(SignInBlock);\n` });
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    const angular = blocksOut(dir)["sign-in"]!.platforms.Angular!;
    expect(angular.interaction).toEqual([{ ref: "packages/ui-angular/src/x.spec.ts:1-3", environment: "jsdom" }]);
    expect(angular.level).toBe("build");
  });

  it("7. keeps component evidence and block evidence apart, in both directions", () => {
    const dir = blockFixture({
      // a component test that happens to render the block: evidence for Button, none for the block
      "packages/ui/src/x.test.tsx": `// kx-verify: interaction\n<Button /><SignInBlock />\n`,
      // a block test that happens to render Button: evidence for the block, none for Button
      "packages/ui-angular/src/y.spec.ts": `// kx-verify-block: interaction\nmount(SignInBlock); KxButton;\n`,
    });
    expect(run(script, [`--root=${dir}`]).ok).toBe(true);
    expect(blocksOut(dir)["sign-in"]!.platforms.React!.interaction).toBeUndefined();
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
    expect(unrun.output).toMatch(/blocks-runtime-browser\.mjs: a React block evidence source that no workflow/);
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
