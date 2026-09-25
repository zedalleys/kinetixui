import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, type PresetConfig } from "@kinetixui/create-preset";
import { contrastOfNormalized, guaranteedContrast, swiftUiChannels } from "../color-math";
import { oklchToHex } from "../oklch";
import { resolveCreateTheme } from "../resolve";
import {
  DEFAULT_SWIFT_SYMBOL,
  SWIFT_CHART_STOPS,
  SWIFT_COLOR_FIELDS,
  exportSwiftUi,
  swiftColor,
  swiftFieldName,
  swiftSymbolError,
} from "./swiftui";

/**
 * The SwiftUI exporter.
 *
 * Two things carry most of the weight here. The first is that the output is Swift someone checks into
 * their app, so the tests care about what it says as much as what it contains — a value that is not the
 * design's, or a claim the platform cannot honour, is worse than a missing feature. The second is that
 * the symbol is the first user-controlled string this repo has ever put into generated code, so it gets
 * the treatment untrusted input gets.
 */

const design = (over: Partial<PresetConfig> = {}): PresetConfig => ({ ...DEFAULT_PRESET, ...over });
const swift = (over: Partial<PresetConfig> = {}, symbol?: string) =>
  exportSwiftUi(resolveCreateTheme(design(over)), symbol === undefined ? {} : { symbol });

const CUSTOM = { brand: "#c2410c", neutral: "warm", radius: "soft", surface: "elevated", chartPalette: "warm" } as const;

/** The light block, so a test can assert a field without matching its dark twin. */
function lightBlock(source: string): string {
  return source.slice(source.indexOf("static let light"), source.indexOf("static let dark"));
}

/* ------------------------------------------------------------------ the Swift package contract */

describe("it targets the real SwiftUI API", () => {
  const themeSwift = readFileSync(new URL("../../../ui-swiftui/Sources/KinetixUI/Theme.swift", import.meta.url), "utf8");

  it("writes every field KinetixColors' initializer takes, in its order", () => {
    // The struct is hand-written in Swift and this list is hand-written here; the only thing keeping them
    // in step is this test. A missing argument is a file that does not compile, and the macOS runner
    // would say so — but it would say so a long way from the cause.
    const init = themeSwift.slice(themeSwift.indexOf("public init("), themeSwift.indexOf(") {"));
    const parameters = [...init.matchAll(/^\s{8}([a-zA-Z0-9]+):/gm)].map((m) => m[1]!);

    expect(parameters).toEqual([...SWIFT_COLOR_FIELDS.map(swiftFieldName), "chart"]);
  });

  it("names the enums the package actually generates", () => {
    const source = swift();
    for (const name of ["KinetixColorsSwiftUI.", "KinetixColorsSwiftUIDark."]) {
      expect(source).toContain(name);
    }
    expect(themeSwift).toContain("KinetixColorsSwiftUI.primary");
    expect(themeSwift).toContain("KinetixColorsSwiftUIDark.primary");
  });

  it("suggests an initializer KinetixTheme has", () => {
    expect(swift()).toContain("KinetixTheme(light: .light, dark: .dark)");
    expect(themeSwift).toMatch(/public init\(\s*light: KinetixColors = \.light,\s*dark: KinetixColors = \.dark,/);
  });
});

/* ------------------------------------------------------------------ determinism */

describe("determinism", () => {
  it("produces byte-identical output for the same design and options", () => {
    const runs = Array.from({ length: 4 }, () => swift(CUSTOM, "AcmeTheme"));
    expect(new Set(runs).size).toBe(1);
  });

  it("does not depend on how the design object was built", () => {
    const a = exportSwiftUi(resolveCreateTheme(design({ brand: "#C2410C", manualOverrides: { border: "#00FF00", action: "#FF0000" } })));
    const b = exportSwiftUi(resolveCreateTheme(design({ manualOverrides: { action: "#ff0000", border: "#00ff00" }, brand: "#c2410c" })));
    expect(a).toBe(b);
  });

  it("carries no timestamp, no preset code and no URL", () => {
    // A timestamp would make two exports of one design differ; the code and the URL are the user's
    // content, and a generated header is the least visible place to put something they will commit.
    const source = swift(CUSTOM, "AcmeTheme");
    expect(source).not.toContain("KX1_");
    expect(source).not.toContain("http");
    expect(source).not.toMatch(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
    expect(source).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("ends in exactly one newline", () => {
    const source = swift();
    expect(source.endsWith("}\n")).toBe(true);
    expect(source.endsWith("\n\n")).toBe(false);
  });
});

/* ------------------------------------------------------------------ what it exports */

describe("the default design", () => {
  it("still produces a complete, compilable theme rather than an empty file", () => {
    // Unlike CSS, a Swift file is not layered over one the consumer already imports, so "nothing to
    // override" is not an outcome this format can express.
    const source = swift();
    expect(source).toContain(`public enum ${DEFAULT_SWIFT_SYMBOL} {`);
    expect(source).toContain("public static let light = KinetixColors(");
    expect(source).toContain("public static let dark = KinetixColors(");
  });

  it("writes no literal colour at all, because it changes nothing", () => {
    // Every field references the shipped token. That is what "this design changes nothing" should look
    // like — and it is what stops a default export from freezing today's numbers into someone's app.
    expect(swift()).not.toContain("Color(red:");
  });

  it("does not write an approximation of a token Create only derives", () => {
    // `destructive-foreground` is not a row in the Create contract; the engine derives it by contrast, to
    // (1, 0.949, 0.937) where the shipped Swift token is (0.996, 0.953, 0.949). An earlier version of
    // this exporter wrote the derived value, which meant exporting a design that changes nothing changed
    // something.
    expect(lightBlock(swift())).toContain("destructiveForeground: KinetixColorsSwiftUI.destructiveForeground,");
  });
});

describe("a design's values reach the output", () => {
  it.each<[string, Partial<PresetConfig>, RegExp]>([
    ["brand", { brand: "#c2410c" }, /action: Color\(red: 0\.761, green: 0\.255, blue: 0\.047\)/],
    ["neutral", { neutral: "warm" }, /background: Color\(red:/],
    ["chart palette", { chartPalette: "categorical" }, /chart: \[\n\s+Color\(red:/],
    ["manual override", { manualOverrides: { border: "#ff0000" } }, /border: Color\(red: 1, green: 0, blue: 0\)/],
  ])("%s", (_name, over, pattern) => {
    expect(lightBlock(swift(over))).toMatch(pattern);
  });

  it("leaves a role the design did not touch following the library", () => {
    // A warm neutral moves the surfaces and nothing else; `secondary` is not a Create control.
    const block = lightBlock(swift({ neutral: "warm" }));
    expect(block).toContain("secondary: KinetixColorsSwiftUI.secondary,");
    expect(block).toMatch(/background: Color\(red:/);
  });
});

describe("light and dark", () => {
  it("exports both appearances, not the one that happened to be on screen", () => {
    // `mode` is deliberately not in a preset. A design resolves to two appearances and both travel.
    const source = swift({ brand: "#c2410c" });
    const dark = source.slice(source.indexOf("static let dark"));
    expect(lightBlock(source)).toMatch(/action: Color\(red: 0\.761/);
    expect(dark).toMatch(/action: Color\(red:/);
    expect(dark).not.toMatch(/action: Color\(red: 0\.761, green: 0\.255, blue: 0\.047\)/);
  });

  it("references the right shipped enum in each block", () => {
    const source = swift({ brand: "#c2410c" });
    expect(lightBlock(source)).not.toContain("KinetixColorsSwiftUIDark.");
    expect(source.slice(source.indexOf("static let dark"))).not.toMatch(/KinetixColorsSwiftUI\.[a-z]/);
  });
});

describe("the chart palette", () => {
  it("writes exactly five stops", () => {
    const stops = lightBlock(swift({ chartPalette: "cool" })).slice(
      lightBlock(swift({ chartPalette: "cool" })).indexOf("chart: ["),
    );
    expect([...stops.matchAll(/Color\(red:/g)]).toHaveLength(SWIFT_CHART_STOPS.length);
  });

  it("keeps the shipped palette when the design did not choose one", () => {
    expect(lightBlock(swift())).toContain("KinetixColorsSwiftUI.chart1,");
  });
});

describe("manual overrides", () => {
  it("changes the output", () => {
    expect(swift({ manualOverrides: { action: "#ff0000" } })).not.toBe(swift());
  });

  it("preserves a failing foreground exactly, with no silent repair", () => {
    // #c9c9c9 on white is 1.9:1. The engine reports that and does not fix it; neither does this.
    const block = lightBlock(swift({ manualOverrides: { card: "#ffffff", "card-foreground": "#c9c9c9" } }));
    expect(block).toContain("cardForeground: Color(red: 0.788, green: 0.788, blue: 0.788)");
  });

  it("does not leak the override map into the file", () => {
    // The values are in the theme already; a list of which ones a person pinned is workspace state.
    const source = swift({ manualOverrides: { action: "#ff0000", border: "#00ff00" } });
    expect(source).not.toContain("manualOverrides");
    expect(source).not.toContain("#ff0000");
  });
});

/* ------------------------------------------------------------------ what it must never write */

describe("what it refuses to be", () => {
  const source = swift(CUSTOM, "AcmeTheme");

  it("contains no CSS", () => {
    for (const fragment of ["var(--", "hsl(", ":root", "--shadow", "px;", "box-shadow"]) {
      expect(source, fragment).not.toContain(fragment);
    }
  });

  it("contains no hex colour in its code — the Swift convention is float components", () => {
    // The header names the design's theme colour as a hex, which is how a reader recognises which design
    // a file came from. Everything below it is `Color(red:…)`, matching the vendored token files.
    const code = source.slice(source.indexOf("import SwiftUI"));
    expect(code).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    expect(code).toMatch(/Color\(red: [\d.]+, green: [\d.]+, blue: [\d.]+\)/);
    expect(source.slice(0, source.indexOf("import SwiftUI"))).toContain("// Theme colour #c2410c");
  });

  it("claims no platform it cannot deliver", () => {
    const text = source.toLowerCase();
    for (const claim of ["compose", "flutter", "jetpack", "android", "themedata", "@composable", "every platform", "all five"]) {
      expect(text, claim).not.toContain(claim);
    }
  });

  it("says plainly that radius and elevation do not travel", () => {
    // The limitation belongs in the artifact, not only in the docs — this is the file someone reads six
    // months later when they wonder why their corners are not soft.
    expect(source).toContain("COLOURS ONLY");
    expect(source).toMatch(/radius\n\/\/ \(soft\) and surface treatment \(elevated\)/);
    expect(source).not.toMatch(/cornerRadius|\.shadow\(/);
  });
});

/* ------------------------------------------------------------------ identifiers */

describe("token names become Swift field names", () => {
  it.each([
    ["background", "background"],
    ["primary-foreground", "primaryForeground"],
    ["action-hover", "actionHover"],
    ["chart-1", "chart1"],
    ["popover-foreground", "popoverForeground"],
  ])("%s → %s", (token, field) => {
    expect(swiftFieldName(token)).toBe(field);
  });

  it("matches what style-dictionary generates for the same token", () => {
    const generated = readFileSync(
      new URL("../../../ui-swiftui/Sources/KinetixUI/KinetixColorsSwiftUI.swift", import.meta.url),
      "utf8",
    );
    for (const token of SWIFT_COLOR_FIELDS) {
      if (["tertiary", "tertiary-foreground", "info", "info-foreground"].includes(token)) continue;
      expect(generated, token).toContain(`static let ${swiftFieldName(token)} = `);
    }
  });
});

describe("the symbol is untrusted input", () => {
  it.each(["AcmeTheme", "acmeTheme", "Theme2", "_Theme", "A"])("%s is accepted", (symbol) => {
    expect(swiftSymbolError(symbol)).toBeNull();
    expect(swift({}, symbol)).toContain(`public enum ${symbol} {`);
  });

  it.each([
    ["a digit first", "123Theme"],
    ["a hyphen", "Theme-Name"],
    ["a space", "My Theme"],
    ["a statement", "Theme; import Foundation"],
    ["a brace", "Theme } func evil() {"],
    ["a backtick escape", "`class`"],
    ["a comment", "Theme // }"],
    ["a newline", "Theme\nimport Foundation"],
    ["emoji", "Theme🎨"],
    ["non-ASCII letters", "Tëma"],
    ["empty", ""],
    ["too long", "A".repeat(65)],
  ])("%s is refused", (_name, symbol) => {
    expect(swiftSymbolError(symbol)).toMatch(/^[A-Z"].*\.$/);
    expect(swiftSymbolError(symbol)).not.toContain("\n");
    // Refused at the exporter too, so no caller can route around the check.
    expect(() => swift({}, symbol)).toThrow();
  });

  it("refuses a name carrying a newline, without echoing it back", () => {
    // A message that quoted this verbatim would put "import Foundation" on its own line in the terminal,
    // which is a line someone chose the input to produce.
    const injected = "Theme\nimport Foundation";
    expect(swiftSymbolError(injected)).toBe("A theme name cannot contain control characters.");
    expect(() => swift({}, injected)).toThrow();
  });

  it.each(["class", "struct", "let", "var", "import", "extension", "func", "enum", "self", "Self"])(
    "the Swift keyword %s is refused rather than backtick-escaped",
    (keyword) => {
      expect(swiftSymbolError(keyword)).toContain("keyword");
      expect(() => swift({}, keyword)).toThrow(/keyword/);
    },
  );

  it("cannot inject code through a name that got past nothing", () => {
    // The belt-and-braces assertion: whatever a caller passes, the only thing that ever reaches the file
    // is a name that matched the identifier rule, so the file has exactly one type declaration.
    for (const symbol of ["AcmeTheme", "_x", "Theme2"]) {
      const source = swift({}, symbol);
      expect([...source.matchAll(/^public /gm)]).toHaveLength(1);
      expect([...source.matchAll(/^import /gm)]).toHaveLength(2);
    }
  });
});

/* ------------------------------------------------------------------ colour formatting */

describe("colour formatting matches the generated token files", () => {
  it.each([
    ["#1d4ed8", "Color(red: 0.114, green: 0.306, blue: 0.847)"],
    ["#ffffff", "Color(red: 1, green: 1, blue: 1)"],
    ["#000000", "Color(red: 0, green: 0, blue: 0)"],
    ["#050c11", "Color(red: 0.02, green: 0.047, blue: 0.067)"],
    ["#c2410c", "Color(red: 0.761, green: 0.255, blue: 0.047)"],
  ])("%s → %s", (hex, expected) => {
    expect(swiftColor(hex)).toBe(expected);
  });

  it("writes whole numbers without trailing zeros, as the generator does", () => {
    // `1`, never `1.000` — the vendored files read that way and a generated theme should look native
    // beside them.
    expect(swiftColor("#ffffff")).not.toContain("1.0");
  });

  it("returns null for anything that is not a six-digit hex", () => {
    for (const bad of ["", "nope", "#fff", "#1d4ed", "#1d4ed88", "rgb(1,2,3)"]) {
      expect(swiftColor(bad), bad).toBeNull();
    }
  });
});

/* ------------------------------------------------------------------ engine/exporter parity */

/**
 * The engine's model of this format IS this format.
 *
 * `guaranteedContrast` decides whether a generated pair clears AA, and one of the three representations
 * it scores is "what SwiftUI receives". If that model and this exporter ever disagree, the engine
 * approves a theme the exporter then emits differently — which is not hypothetical. It shipped: the
 * engine scored a pair at 4.50 on the exact hex, called it safe, and the exporter wrote channels that
 * rendered at 4.46.
 *
 * The two share `swiftUiChannels`, so they cannot drift. These assert that they still do, against the
 * literal text of the output rather than against the function that produced it.
 */
describe("what the engine measures is what this exporter emits", () => {
  it("formats exactly the channels guaranteedContrast scores", () => {
    for (let h = 0; h < 360; h += 7) {
      for (const l of [0.2, 0.45, 0.55, 0.75, 0.95]) {
        const hex = oklchToHex({ l, c: 0.15, h });
        const [r, g, b] = swiftUiChannels(hex);
        expect(swiftColor(hex), hex).toBe(`Color(red: ${r}, green: ${g}, blue: ${b})`);
      }
    }
  });

  it("parses back out of a generated file to the same channels", () => {
    // Through the real output, not the helper — if the template ever reformatted a number (extra
    // precision, a trailing zero, a locale separator) this is what would notice.
    const resolved = resolveCreateTheme(design(CUSTOM));
    const source = swift(CUSTOM, "AcmeTheme");

    for (const [name, hex] of Object.entries(resolved.light.colors)) {
      const field = swiftFieldName(name);
      const match = new RegExp(`^ {8}${field}: Color\\(red: ([\\d.]+), green: ([\\d.]+), blue: ([\\d.]+)\\),$`, "m").exec(source);
      if (!match) continue; // a field written as a shipped reference — no literal to compare
      expect([Number(match[1]), Number(match[2]), Number(match[3])], `${name} ${hex}`).toEqual(swiftUiChannels(hex));
    }
  });

  it("every literal in a generated file clears AA where the engine promised it would", () => {
    // The end-to-end version: read the numbers Swift will actually receive straight out of the file and
    // run WCAG over them, with no hex anywhere in the measurement.
    const source = swift(CUSTOM, "AcmeTheme");
    const block = lightBlock(source);
    const read = (field: string) => {
      const m = new RegExp(`${field}: Color\\(red: ([\\d.]+), green: ([\\d.]+), blue: ([\\d.]+)\\)`).exec(block);
      return m ? ([Number(m[1]), Number(m[2]), Number(m[3])] as [number, number, number]) : null;
    };
    const fg = read("actionForeground");
    expect(fg).not.toBeNull();
    for (const field of ["action", "actionHover", "actionPressed"]) {
      const surface = read(field);
      expect(surface, field).not.toBeNull();
      expect(contrastOfNormalized(surface!, fg!), field).toBeGreaterThanOrEqual(4.5);
    }
  });

  /**
   * The pair that proved exact-plus-web was not a guarantee.
   *
   * With the bar at `min(exact, web)`, this design's light `action-foreground` / `action-pressed` reached
   * 4.5 only because the CSS rounding happened to move it the helpful way. SwiftUI rounds differently, and
   * the committed fixture came out at 4.46 — caught by the Swift-side contrast suite, not by any
   * TypeScript test, because no TypeScript test modelled the format.
   */
  it("the #c2410c warm design, which fell to 4.46 in SwiftUI", () => {
    const theme = resolveCreateTheme(design({ brand: "#c2410c", neutral: "warm", chartPalette: "warm" }));
    const colors = theme.light.colors;
    const fg = colors["action-foreground"]!;

    for (const state of ["action", "action-hover", "action-pressed"] as const) {
      const asSwift = contrastOfNormalized(swiftUiChannels(colors[state]!), swiftUiChannels(fg));
      expect(asSwift, `${state} as SwiftUI receives it`).toBeGreaterThanOrEqual(4.5);
      expect(guaranteedContrast(colors[state]!, fg), state).toBeGreaterThanOrEqual(4.5);
    }
  });
});
