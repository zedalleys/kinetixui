// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET } from "@kinetixui/create-preset";
import {
  ACCEPTED_TOKENS,
  NOTHING_TO_OVERRIDE,
  exportCompose,
  exportCss,
  exportFlutter,
  exportSwiftUi,
  resolveCreateTheme,
} from "@kinetixui/create-theme";
import { DEFAULT_CREATE_CONFIG, type CreateConfig } from "./config";
import { configToPreset } from "./preset";
import { resolveTheme } from "./theme-adapter";
import { EXPORT_TARGETS, TARGETS, generateExport, type ExportTarget } from "./export-targets";

/**
 * The website must not grow its own exporters.
 *
 * Create's engine is shared with `kinetixui preset <target>`, and the one failure that would matter
 * is the website quietly diverging from it — a colour mapped differently, a field renamed, a native
 * limitation described in the UI but not enforced in the output. These assert the workspace's output
 * *is* the canonical exporter's output rather than something that currently agrees with it.
 *
 * `cli-preset.test.ts` asserts the other half: that the CLI prints the same text. Together the
 * browser, the CLI and the exporter are one implementation.
 */

const cfg = (over: Partial<CreateConfig> = {}): CreateConfig => ({ ...DEFAULT_CREATE_CONFIG, ...over });
const themeOf = (config: CreateConfig) => resolveTheme(config);
const canonical = (config: CreateConfig) => resolveCreateTheme(configToPreset(config));

describe("every target is the canonical exporter", () => {
  const design = cfg({ brand: "#7e22ce", neutral: "warm", radius: "soft", surface: "elevated", chartPalette: "cool" });

  it("web CSS is exportCss", () => {
    expect(generateExport(themeOf(design), "web-css", "").code).toBe(exportCss(canonical(design)));
  });

  it("SwiftUI is exportSwiftUi", () => {
    expect(generateExport(themeOf(design), "swiftui", "AcmeTheme").code).toBe(
      exportSwiftUi(canonical(design), { symbol: "AcmeTheme" }),
    );
  });

  it("Compose is exportCompose", () => {
    expect(generateExport(themeOf(design), "compose", "AcmeTheme").code).toBe(
      exportCompose(canonical(design), { symbol: "AcmeTheme" }),
    );
  });

  it("Flutter is exportFlutter", () => {
    expect(generateExport(themeOf(design), "flutter", "AcmeTheme").code).toBe(
      exportFlutter(canonical(design), { symbol: "AcmeTheme" }),
    );
  });

  /**
   * The structural half. The equality tests above would still pass if someone reimplemented an
   * exporter in the website and got it right today; this fails the moment the website starts
   * formatting native output itself.
   */
  it("does not reimplement any of them in the website", () => {
    const source = readFileSync("src/lib/create/export-targets.ts", "utf8");
    for (const fn of ["exportCss", "exportSwiftUi", "exportCompose", "exportFlutter"]) {
      expect(source, `${fn} should be imported, not redefined`).toMatch(new RegExp(`\\b${fn}\\b`));
      expect(source).not.toMatch(new RegExp(`function ${fn}\\b`));
    }
    // No colour maths and no native field lists: those are the exporter's business.
    expect(source).not.toMatch(/Color\(0x|UIColor|hsl\(|#\{|toFixed\(3\)/);
    expect(source).not.toMatch(/KinetixColors\s*\(/);
  });
});

describe("the four targets", () => {
  it("are exactly the exporters that exist", () => {
    expect([...EXPORT_TARGETS]).toEqual(["web-css", "swiftui", "compose", "flutter"]);
  });

  it("each name a file, a description and a real capability sentence", () => {
    for (const id of EXPORT_TARGETS) {
      const t = TARGETS[id];
      expect(t.filename, id).toMatch(/\.(css|swift|kt|dart)$/);
      expect(t.description.length, id).toBeGreaterThan(10);
      expect(t.capability.length, id).toBeGreaterThan(10);
      expect(t.outputLabel, id).toMatch(/^Generated /);
    }
  });

  /**
   * Radius and surface are web-only on every native target, because no native package has a runtime
   * token for either. The UI has to keep saying so — a capability line that stopped mentioning it
   * would be the first step to implying native themes carry more than they do.
   */
  it("tell the truth about radius and surface on native targets", () => {
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      expect(TARGETS[id].capability, id).toMatch(/not runtime-themeable/i);
    }
    expect(TARGETS["web-css"].capability).toMatch(/radius and surface/i);
  });

  it("names Compose by its framework, not merely 'Android'", () => {
    expect(TARGETS.compose.label).toBe("Jetpack Compose");
  });

  /** Compose's KinetixColors has no field for these, and the UI says so rather than letting it surprise. */
  it("says which roles Compose cannot receive", () => {
    expect(TARGETS.compose.capability).toMatch(/input/);
    expect(TARGETS.compose.capability).toMatch(/ring/);
  });
});

describe("the default design", () => {
  const theme = themeOf(DEFAULT_CREATE_CONFIG);

  it("has nothing to override in CSS, and says so rather than showing an empty box", () => {
    expect(exportCss(canonical(DEFAULT_CREATE_CONFIG))).toBe("");
    expect(generateExport(theme, "web-css", "").code).toBe(NOTHING_TO_OVERRIDE);
  });

  /** Native targets are not disabled by a default design: a complete file referencing shipped values. */
  it("still produces a complete file for every native target", () => {
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      const { code } = generateExport(theme, id, TARGETS[id].symbol!.default);
      expect(code, id).toBeTruthy();
      expect(code!.length, id).toBeGreaterThan(400);
      expect(code, id).toContain("CreateTheme");
    }
  });
});

describe("a design change reaches every supported output", () => {
  const base = themeOf(DEFAULT_CREATE_CONFIG);
  const out = (theme: ReturnType<typeof themeOf>, id: ExportTarget) =>
    generateExport(theme, id, TARGETS[id].symbol?.default ?? "").code;

  it("brand changes all four", () => {
    const changed = themeOf(cfg({ brand: "#c2410c" }));
    for (const id of EXPORT_TARGETS) expect(out(changed, id), id).not.toBe(out(base, id));
  });

  it("neutral changes all four", () => {
    const changed = themeOf(cfg({ neutral: "warm" }));
    for (const id of EXPORT_TARGETS) expect(out(changed, id), id).not.toBe(out(base, id));
  });

  it("chart palette changes all four", () => {
    const changed = themeOf(cfg({ chartPalette: "warm" }));
    for (const id of EXPORT_TARGETS) expect(out(changed, id), id).not.toBe(out(base, id));
  });

  /**
   * Radius and surface are the honest asymmetry, and the exporters handle it better than silence
   * would: the *values* do not reach a native file, because there is nowhere in a native runtime
   * theme to put them — but the generated header names the design's radius and surface and says they
   * are not carried. So the declarations are byte-identical and the explanation is specific.
   */
  const declarations = (code: string | null) =>
    (code ?? "")
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");

  it("radius changes the CSS, and reaches native output only as an explanation", () => {
    const changed = themeOf(cfg({ radius: "square" }));
    expect(out(changed, "web-css")).not.toBe(out(base, "web-css"));
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      expect(declarations(out(changed, id)), id).toBe(declarations(out(base, id)));
      expect(out(changed, id), id).toContain("square");
      // Each exporter explains the limitation in its own package's terms, and the terms differ by
      // more than wording now: Compose and Flutter have nowhere to put a radius, while SwiftUI has
      // `KinetixRadii` and simply is not exported into it yet. So the shared assertion is the one
      // thing all three still say — this design's radius is not in this file.
      expect(out(changed, id), id).toMatch(/not carried|apply on the web/i);
    }
  });

  it("surface changes the CSS, and reaches native output only as an explanation", () => {
    const changed = themeOf(cfg({ surface: "elevated" }));
    expect(out(changed, "web-css")).not.toBe(out(base, "web-css"));
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      expect(declarations(out(changed, id)), id).toBe(declarations(out(base, id)));
      expect(out(changed, id), id).toContain("elevated");
    }
  });

  it("a manual override reaches every target that has the role", () => {
    const changed = themeOf(cfg({ manualOverrides: { primary: "#ff0000" } }));
    for (const id of EXPORT_TARGETS) expect(out(changed, id), id).not.toBe(out(base, id));
  });
});

describe("the preview mode is not part of the export", () => {
  /** Selecting Dark must not produce a native file that lost its light palette. */
  it("exports both appearances whichever one is on screen", () => {
    const light = themeOf(cfg({ brand: "#c2410c" }));
    const dark = themeOf(cfg({ brand: "#c2410c", mode: "dark" }));
    for (const id of EXPORT_TARGETS) {
      const symbol = TARGETS[id].symbol?.default ?? "";
      expect(generateExport(light, id, symbol).code, id).toBe(generateExport(dark, id, symbol).code);
    }
  });
});

describe("the generated symbol name", () => {
  const theme = themeOf(cfg({ brand: "#c2410c" }));

  it("is reported, never repaired", () => {
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      const result = generateExport(theme, id, "My Theme!");
      expect(result.code, id).toBeNull();
      expect(result.error, id).toBeTruthy();
      // The reason comes from the exporter's own validator, so the UI cannot invent a different rule.
      expect(TARGETS[id].symbol!.validate("My Theme!"), id).toBe(result.error);
    }
  });

  /** Not sanitized into something adjacent: nothing at all is generated from a name it cannot use. */
  it("produces no code rather than a repaired name", () => {
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      for (const bad of ["My Theme!", "2Themes", "create theme", ""]) {
        expect(generateExport(theme, id, bad).code, `${id} / ${JSON.stringify(bad)}`).toBeNull();
      }
    }
  });

  /** Used verbatim, including casing a style guide might have opinions about. */
  it("is written out exactly as typed", () => {
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      const { code } = generateExport(theme, id, "acme_Theme2");
      expect(code, id).toContain("acme_Theme2");
    }
  });

  it("is accepted when valid, and appears in the output", () => {
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      const { code, error } = generateExport(theme, id, "AcmeTheme");
      expect(error, id).toBeNull();
      expect(code, id).toContain("AcmeTheme");
    }
  });

  it("is not a thing CSS has", () => {
    expect(TARGETS["web-css"].symbol).toBeUndefined();
    expect(generateExport(theme, "web-css", "anything at all").error).toBeNull();
  });
});

describe("exports are deterministic", () => {
  it("produce byte-identical text for the same design, target and symbol", () => {
    const design = cfg({ brand: "#7e22ce", neutral: "stone", surface: "elevated" });
    for (const id of EXPORT_TARGETS) {
      const symbol = TARGETS[id].symbol?.default ?? "";
      const once = generateExport(themeOf(design), id, symbol).code;
      const twice = generateExport(themeOf(design), id, symbol).code;
      expect(twice, id).toBe(once);
      // Nothing environment-specific leaked into a generated artifact.
      expect(once, id).not.toMatch(/\d{4}-\d{2}-\d{2}T|[A-Z]:\\|\/Users\/|\/home\//);
    }
  });
});

/**
 * Web CSS is framework-neutral, and that is why there is no Angular exporter.
 *
 * `@kinetixui/angular` has no token set of its own: its stylesheet spends the same
 * `@kinetixui/tokens` custom properties the React package does, which is why `@kinetixui/tokens` is
 * one of its peer dependencies. A Create theme is an override block over that contract, so it
 * applies to an Angular application exactly as it applies to a React one. Generating a separate
 * Angular artifact would be symmetry, not capability.
 */
describe("the Web CSS contract covers Angular", () => {
  const angularStyles = readFileSync("../../packages/ui-angular/src/styles.css", "utf8");
  const consumed = new Set([...angularStyles.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]!.slice(2)));

  it("declares @kinetixui/tokens as a peer rather than shipping its own token set", () => {
    const pkg = JSON.parse(readFileSync("../../packages/ui-angular/package.json", "utf8"));
    expect(Object.keys(pkg.peerDependencies ?? {})).toContain("@kinetixui/tokens");
  });

  it("consumes the semantic tokens a Create theme overrides", () => {
    const overlap = (ACCEPTED_TOKENS as readonly string[]).filter((token) => consumed.has(token));
    // Not all 25 — Angular's catalogue is a subset — but the core surface roles must be there, or
    // "Web CSS applies to Angular" would be a claim with nothing behind it.
    expect(overlap.length).toBeGreaterThan(12);
    for (const token of ["background", "foreground", "primary", "border"]) {
      expect(consumed, token).toContain(token);
    }
  });

  it("is described as serving both frameworks, without inventing an Angular target", () => {
    expect(TARGETS["web-css"].description).toMatch(/Angular/);
    expect([...EXPORT_TARGETS]).not.toContain("angular");
  });
});

/**
 * The terminal command has to be one that exists. The failure this prevents is quiet: a rename in the
 * CLI, a website still printing the old subcommand, and a copied command that reports an unknown
 * argument to someone who has no reason to doubt the page.
 */
describe("the terminal command", () => {
  const cli = readFileSync("../../packages/cli/src/index.ts", "utf8");
  const theme = themeOf(cfg({ brand: "#c2410c" }));
  const code = "KX1_EXAMPLE";
  const commandFor = (id: ExportTarget, symbol = TARGETS[id].symbol?.default ?? "") =>
    generateExport(theme, id, symbol, code).command!;

  it("names a subcommand the CLI actually registers", () => {
    for (const id of EXPORT_TARGETS) {
      expect(cli, id).toContain(`.command("${TARGETS[id].cliSubcommand}")`);
    }
  });

  it("maps web-css to `preset css`, which is not its id", () => {
    expect(TARGETS["web-css"].cliSubcommand).toBe("css");
    expect(commandFor("web-css")).toContain("kinetixui preset css ");
    expect(commandFor("web-css")).not.toContain("web-css");
  });

  it("passes the design, so the command writes this theme and not a default", () => {
    for (const id of EXPORT_TARGETS) expect(commandFor(id), id).toContain(code);
  });

  it("uses flags the CLI declares", () => {
    // `-o` on all four, `-n` only where the exporter takes a symbol — both as registered.
    expect(cli).toContain('"-o, --output <file>"');
    expect(cli).toContain('"-n, --name <symbol>"');
    for (const id of EXPORT_TARGETS) expect(commandFor(id), id).toContain(`-o ${TARGETS[id].filename}`);
  });

  it("spends -n only on a name that was actually chosen", () => {
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      expect(commandFor(id), id).not.toContain("-n ");
      expect(commandFor(id, "AcmeTheme"), id).toContain("-n AcmeTheme");
    }
    // CSS has no symbol, so no amount of typing puts a flag the command does not accept into it.
    expect(generateExport(theme, "web-css", "AcmeTheme", code).command).not.toContain("-n");
  });

  it("is safe to paste — nothing in it needs quoting", () => {
    // Every character a shell would treat as more than text, including whitespace that would split
    // one argument into two.
    const META = [...`"'\`$&;|<>(){}[]*?!#~^`, String.fromCharCode(92), String.fromCharCode(10), String.fromCharCode(9)];
    for (const id of EXPORT_TARGETS) {
      const command = commandFor(id, TARGETS[id].symbol ? "Acme_Theme2" : "");
      for (const meta of META) {
        expect(command.includes(meta), `${id} command contains ${JSON.stringify(meta)}`).toBe(false);
      }
    }
  });

  it("is withheld entirely when the symbol is invalid", () => {
    for (const id of ["swiftui", "compose", "flutter"] as const) {
      expect(generateExport(theme, id, "My Theme!", code).command, id).toBeNull();
    }
  });
});

/**
 * The docs used to say native theme compilation was not implemented. It was true when written, and
 * `theme build` is still CSS-only — but Create exports three native targets, so a sentence that reads
 * as "KinetixUI cannot do this" is now the wrong kind of wrong: it talks a reader out of something
 * that works. These pin the corrected claims to the targets that exist.
 */
describe("the docs describe the targets that exist", () => {
  const page = (slug: string) => readFileSync(`src/app/docs/${slug}/page.mdx`, "utf8");
  const theming = page("theming");

  it("does not tell a reader that native theme output is unimplemented", () => {
    for (const claim of [
      /[Nn]ative theme compilation is not implemented/,
      /isn't built yet/,
      /no native .{0,40}output yet/i,
    ]) {
      expect(theming, String(claim)).not.toMatch(claim);
    }
  });

  it("names Create's four targets on the theming page", () => {
    for (const target of ["web CSS", "SwiftUI", "Jetpack Compose", "Flutter"]) {
      expect(theming, target).toContain(target);
    }
  });

  /** `theme build` really is web-only. Correcting Create's claim must not blur that one. */
  it("keeps theme build's own scope honest", () => {
    expect(theming).toMatch(/`kinetixui theme build`[^.]*web-only|theme build`[\s\S]{0,200}web-only/);
  });

  it("no longer points anyone at a Copy CSS button", () => {
    for (const slug of ["theming", "cli", "swiftui", "compose", "flutter"]) {
      expect(page(slug), slug).not.toContain("Copy CSS");
    }
  });

  it("gives each native platform the browser route as well as the command", () => {
    for (const [slug, label] of [
      ["swiftui", "SwiftUI"],
      ["compose", "Jetpack Compose"],
      ["flutter", "Flutter"],
    ] as const) {
      const text = page(slug);
      expect(text, slug).toContain("(/create)");
      expect(text, slug).toContain("**Export**");
      expect(text, slug).toContain(label);
      // The command is still there — the browser is an alternative, not a replacement.
      expect(text, slug).toContain(`kinetixui preset ${TARGETS[slug].cliSubcommand}`);
    }
  });

  /** Angular gets the Web CSS target, and the page says why that is the whole answer. */
  it("explains that Angular retheming is the Web CSS target", () => {
    const angular = page("angular");
    expect(angular).toContain("Web CSS");
    expect(angular).toMatch(/no Angular export target/);
  });
});

/**
 * A preset is the user's design. It never travels to analytics — not the code, not the brand hex, not
 * a manual override, not the symbol they typed. What is worth knowing is which target people choose,
 * and that is an id off a fixed list.
 *
 * The typed event shape and the adapter's key allowlist already enforce this; so does the "never
 * reads a value into an analytics call" rule in `analytics.architecture.test.ts`. This says it once
 * more at the callsite, because the cost of getting it wrong is not a failing test.
 */
describe("analytics sees the choice, never the design", () => {
  const panel = readFileSync("src/components/create/create-export.tsx", "utf8");
  const calls = [...panel.matchAll(/analytics\.track\(([\s\S]*?)\);/g)].map((m) => m[1]!);

  it("instruments the panel at all", () => {
    expect(calls.length).toBeGreaterThan(0);
  });

  it("passes only the target id and the source", () => {
    for (const call of calls) {
      expect(call).toMatch(/"create_export_(target_selected|copied)"/);
      const props = call.slice(call.indexOf("{"));
      for (const forbidden of ["presetCode", "symbol", "result.code", "theme", "code:"]) {
        expect(props, `${forbidden} must not reach analytics`).not.toContain(forbidden);
      }
    }
  });

  it("does not instrument the command, which contains the preset", () => {
    const copyCommand = panel.slice(panel.indexOf("const copyCommand"));
    const body = copyCommand.slice(0, copyCommand.indexOf("};"));
    expect(body).not.toContain("analytics.");
  });
});

describe("the default preset still resolves", () => {
  it("matches the engine's own default", () => {
    expect(configToPreset(DEFAULT_CREATE_CONFIG)).toEqual(DEFAULT_PRESET);
  });
});
