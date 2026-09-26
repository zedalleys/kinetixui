import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, decodePreset, encodePreset, type PresetConfig } from "@kinetixui/create-preset";
import { guaranteedContrast, hexToRgb } from "../color-math";
import { oklchToHex } from "../oklch";
import { SHIPPED_COLORS, resolveCreateTheme } from "../resolve";
import {
  DEFAULT_FLUTTER_SYMBOL,
  FLUTTER_CHART_STOPS,
  FLUTTER_COLOR_FIELDS,
  dartColor,
  dartFieldName,
  dartSymbolError,
  exportFlutter,
} from "./flutter";

/**
 * The Flutter exporter.
 *
 * The third native target and the most complete: Flutter's `KinetixColors` has all 35 semantic fields,
 * including the three Compose lacks, so nothing is left behind. The tests that matter most here are the
 * two that caught real bugs while it was being written — the six fields Create does not model, which a
 * literals-only draft filled with black, and the exact-ARGB round trip that keeps `guaranteedContrast`
 * at three terms.
 */

const design = (over: Partial<PresetConfig> = {}): PresetConfig => ({ ...DEFAULT_PRESET, ...over });
const dart = (over: Partial<PresetConfig> = {}, symbol?: string) =>
  exportFlutter(resolveCreateTheme(design(over)), symbol === undefined ? {} : { symbol });

const CUSTOM = { brand: "#c2410c", neutral: "warm", radius: "soft", surface: "elevated", chartPalette: "warm" } as const;

/** The light block, so a test can assert a field without matching its dark twin. */
const lightBlock = (source: string) => source.slice(source.indexOf("static final KinetixColors light"), source.indexOf("static final KinetixColors dark"));

/** Tokens the Flutter contract needs that Create does not model — always shipped references. */
const UNMODELLED = [
  "tertiary",
  "tertiaryForeground",
  "warningForeground",
  "successForeground",
  "info",
  "infoForeground",
] as const;

/* ------------------------------------------------------------------ the Flutter package contract */

describe("it targets the real Flutter API", () => {
  const themeDart = readFileSync(new URL("../../../ui-flutter/lib/src/theme.dart", import.meta.url), "utf8");

  it("writes every field KinetixColors declares, in its order", () => {
    // The class is hand-written Dart and FLUTTER_COLOR_FIELDS is hand-written here; this is the only
    // thing keeping them in step. A missing named argument is a file that does not compile, and the
    // Flutter runner would say so a long way from the cause.
    const body = themeDart.slice(themeDart.indexOf("class KinetixColors {"), themeDart.indexOf("static const KinetixColors light"));
    const declared = [...body.matchAll(/^ {2}final (?:Color|List<Color>) ([a-zA-Z0-9]+);$/gm)].map((m) => m[1]!);

    expect(declared).toEqual([...FLUTTER_COLOR_FIELDS.map(([field]) => field), "chart"]);
  });

  it("has the three fields Compose lacks, which is why this exporter declares no unmapped roles", () => {
    for (const field of ["input", "ring", "tertiaryForeground"]) {
      expect(themeDart, field).toMatch(new RegExp(`^ {2}final Color ${field};$`, "m"));
    }
    // And the exporter carries two of them as real Create values rather than references.
    const block = lightBlock(dart({ brand: "#c2410c", neutral: "warm" }));
    expect(block).toMatch(/input: Color\(0xFF[0-9A-F]{6}\),/);
    expect(block).toMatch(/ring: Color\(0xFF[0-9A-F]{6}\),/);
  });

  it("suggests APIs that exist", () => {
    expect(dart()).toContain("KinetixTheme.custom(light: CreateTheme.light, dark: CreateTheme.dark");
    expect(dart()).toContain("KinetixMaterialTheme.fromColors(Brightness.light, CreateTheme.light)");
    expect(themeDart).toMatch(
      /const KinetixTheme\.custom\(\{\s*super\.key,\s*this\.brightness,\s*required KinetixColors light,\s*required KinetixColors dark,\s*required super\.child,/,
    );

    const material = readFileSync(new URL("../../../ui-flutter/lib/src/kinetix_material_theme.dart", import.meta.url), "utf8");
    expect(material).toContain("static ThemeData fromColors(Brightness brightness, KinetixColors colors)");
  });

  it("leaves the original KinetixTheme constructor untouched", () => {
    // Flutter's is a widget constructor, not a JVM descriptor, so the risk is different from Compose's —
    // but the promise is the same: an app already calling `KinetixTheme(child: …)` keeps working.
    expect(themeDart).toMatch(/const KinetixTheme\(\{\s*super\.key,\s*this\.brightness,\s*required super\.child,\s*\}\)/);
  });
});

/* ------------------------------------------------------------------ representation */

describe("Flutter adds no quantization", () => {
  const CORPUS = [
    "#000000",
    "#ffffff",
    "#1d4ed8", // the shipped action blue
    "#c2410c", // the warm regression colour
    "#f0f7ff",
    "#050c11",
    ...Array.from({ length: 36 }, (_, i) => oklchToHex({ l: 0.55, c: 0.2, h: i * 10 })),
    ...Array.from({ length: 12 }, (_, i) => oklchToHex({ l: 0.85, c: 0.08, h: i * 30 })),
    ...Array.from({ length: 12 }, (_, i) => oklchToHex({ l: 0.2, c: 0.08, h: i * 30 })),
  ];

  /** Parse `Color(0xFFRRGGBB)` back to bytes — what the Dart literal means to the framework. */
  function parseDartArgb(literal: string): { alpha: number; rgb: [number, number, number] } {
    const m = /^Color\(0x([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})([0-9A-F]{2})\)$/.exec(literal);
    if (!m) throw new Error(`not a Dart colour literal: ${literal}`);
    return {
      alpha: parseInt(m[1]!, 16),
      rgb: [parseInt(m[2]!, 16), parseInt(m[3]!, 16), parseInt(m[4]!, 16)],
    };
  }

  it.each(CORPUS)("%s survives the round trip byte for byte", (hex) => {
    const parsed = parseDartArgb(dartColor(hex)!);
    expect(parsed.rgb).toEqual(hexToRgb(hex));
    expect(parsed.alpha).toBe(0xff);
  });

  it("round-trips every byte value, not only a sample", () => {
    for (let v = 0; v <= 255; v++) {
      const hex = `#${v.toString(16).padStart(2, "0").repeat(3)}`;
      expect(parseDartArgb(dartColor(hex)!).rgb).toEqual([v, v, v]);
    }
  });

  it("holds for action states, charts and manual overrides in a real design", () => {
    const over = { ...CUSTOM, manualOverrides: { border: "#ff0000" } } as Partial<PresetConfig>;
    const resolved = resolveCreateTheme(design(over));
    const source = dart(over, "AcmeTheme");

    let checked = 0;
    for (const [field, token] of FLUTTER_COLOR_FIELDS) {
      const m = new RegExp(`^ {4}${field}: (Color\\(0x[0-9A-F]{8}\\)),$`, "m").exec(lightBlock(source));
      if (!m) continue; // a shipped reference — no literal to compare
      expect(parseDartArgb(m[1]!).rgb, `${field} (${token})`).toEqual(hexToRgb(resolved.light.colors[token]!));
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("therefore needs no term of its own in the contrast guarantee", () => {
    // The bytes are identical, so Flutter's contrast IS the exact term `guaranteedContrast` already takes
    // a minimum over. A fourth identical term would be redundant maths pretending to be rigour.
    for (const brand of ["#c2410c", "#1d4ed8", "#7e22ce", "#008758"]) {
      const c = resolveCreateTheme(design({ brand })).light.colors;
      expect(parseDartArgb(dartColor(c.action!)!).rgb).toEqual(hexToRgb(c.action!));
      expect(guaranteedContrast(c.action!, c["action-foreground"]!)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/* ------------------------------------------------------------------ the six Create does not model */

describe("the fields Create does not model", () => {
  it("are references to the shipped palette, never invented values", () => {
    // The bug this replaced: a literals-only draft wrote Color(0xFF000000) — black — into all six,
    // because the resolved theme simply has no value for them.
    const block = lightBlock(dart(CUSTOM, "AcmeTheme"));
    for (const field of UNMODELLED) {
      expect(block, field).toContain(`${field}: KinetixColors.light.${field},`);
    }
  });

  it("never emit black anywhere in the file", () => {
    // The shape the bug took. Asserted over a design whose own colours are nowhere near black.
    const source = dart({ brand: "#f5f5f5", neutral: "cool", chartPalette: "cool" });
    expect(source).not.toContain("Color(0xFF000000)");
  });

  it("really are absent from the resolved theme, so the reference is necessary", () => {
    const resolved = resolveCreateTheme(design({ brand: "#c2410c" })).light.colors;
    for (const field of UNMODELLED) {
      const token = FLUTTER_COLOR_FIELDS.find(([f]) => f === field)![1];
      expect(resolved[token], token).toBeUndefined();
    }
  });

  it("are the only fields referenced for a reason other than 'unchanged'", () => {
    // Every OTHER reference must be a field whose resolved value genuinely equals the shipped one —
    // status colours the brand does not touch, for instance. A reference that is neither unmodelled nor
    // unchanged would mean the exporter silently lost a value the design set.
    const over = { brand: "#c2410c", neutral: "warm", chartPalette: "warm" } as Partial<PresetConfig>;
    const resolved = resolveCreateTheme(design(over)).light.colors;
    const shipped = SHIPPED_COLORS.light;
    const block = lightBlock(dart(over));

    for (const match of block.matchAll(/^ {4}([a-zA-Z0-9]+): KinetixColors\.light\./gm)) {
      const field = match[1]!;
      if (UNMODELLED.includes(field as (typeof UNMODELLED)[number])) continue;
      const token = FLUTTER_COLOR_FIELDS.find(([f]) => f === field)?.[1] ?? field.replace(/(\d)$/, "-$1");
      expect(resolved[token]?.toLowerCase(), `${field} is referenced but the design changed it`).toBe(
        shipped[token]?.toLowerCase(),
      );
    }
  });
});

/* ------------------------------------------------------------------ determinism */

describe("determinism", () => {
  it("produces byte-identical output for the same design and options", () => {
    expect(new Set(Array.from({ length: 4 }, () => dart(CUSTOM, "AcmeTheme"))).size).toBe(1);
  });

  it("does not depend on how the design object was built", () => {
    const a = exportFlutter(resolveCreateTheme(design({ brand: "#C2410C", manualOverrides: { border: "#00FF00", action: "#FF0000" } })));
    const b = exportFlutter(resolveCreateTheme(design({ manualOverrides: { action: "#ff0000", border: "#00ff00" }, brand: "#c2410c" })));
    expect(a).toBe(b);
  });

  it("carries no timestamp, no preset code and no URL", () => {
    const source = dart(CUSTOM, "AcmeTheme");
    expect(source).not.toContain("KX1_");
    expect(source).not.toContain("http");
    expect(source).not.toMatch(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
    expect(source).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("ends in exactly one newline", () => {
    expect(dart().endsWith("}\n")).toBe(true);
    expect(dart().endsWith("\n\n")).toBe(false);
  });
});

/* ------------------------------------------------------------------ what it exports */

describe("the default design", () => {
  it("produces a complete theme rather than an empty file", () => {
    const source = dart();
    expect(source).toContain(`abstract final class ${DEFAULT_FLUTTER_SYMBOL} {`);
    expect(source).toContain("static final KinetixColors light = KinetixColors(");
    expect(source).toContain("static final KinetixColors dark = KinetixColors(");
  });

  it("writes no literal colour, because it changes nothing", () => {
    expect(dart()).not.toContain("Color(0xFF");
  });
});

describe("a design's values reach the output", () => {
  it.each<[string, Partial<PresetConfig>, RegExp]>([
    ["brand", { brand: "#c2410c" }, /action: Color\(0xFFC2410C\),/],
    ["neutral", { neutral: "warm" }, /background: Color\(0xFF/],
    ["chart palette", { chartPalette: "categorical" }, /chart: <Color>\[\n\s+Color\(0xFF/],
    ["manual override", { manualOverrides: { border: "#ff0000" } }, /border: Color\(0xFFFF0000\),/],
  ])("%s", (_name, over, pattern) => {
    expect(lightBlock(dart(over))).toMatch(pattern);
  });

  it("carries the resolved interaction states, unchanged", () => {
    const resolved = resolveCreateTheme(design({ brand: "#c2410c" })).light.colors;
    const block = lightBlock(dart({ brand: "#c2410c" }));
    for (const [field, token] of [
      ["action", "action"],
      ["actionForeground", "action-foreground"],
      ["actionHover", "action-hover"],
      ["actionPressed", "action-pressed"],
    ] as const) {
      expect(block, field).toContain(`${field}: ${dartColor(resolved[token]!)},`);
    }
  });
});

describe("light and dark", () => {
  it("exports both appearances, not the one that happened to be on screen", () => {
    const source = dart({ brand: "#c2410c" });
    const darkBlock = source.slice(source.indexOf("static final KinetixColors dark"));
    expect(lightBlock(source)).toContain("action: Color(0xFFC2410C),");
    expect(darkBlock).toMatch(/action: Color\(0xFF/);
    expect(darkBlock).not.toContain("action: Color(0xFFC2410C),");
  });

  it("references the right shipped palette in each block", () => {
    const source = dart({ brand: "#c2410c" });
    expect(lightBlock(source)).not.toContain("KinetixColors.dark.");
    expect(source.slice(source.indexOf("static final KinetixColors dark"))).not.toContain("KinetixColors.light.");
  });
});

describe("the chart palette", () => {
  it("writes exactly five stops, in series order", () => {
    const resolved = resolveCreateTheme(design({ chartPalette: "cool" })).light.colors;
    const block = lightBlock(dart({ chartPalette: "cool" }));
    const stops = [...block.slice(block.indexOf("chart: <Color>[")).matchAll(/Color\(0x[0-9A-F]{8}\)/g)].map((m) => m[0]);

    expect(stops).toHaveLength(FLUTTER_CHART_STOPS.length);
    expect(stops).toEqual(FLUTTER_CHART_STOPS.map((n) => dartColor(resolved[`chart-${n}`]!)));
  });

  it("keeps the shipped palette when the design did not choose one", () => {
    expect(lightBlock(dart())).toContain("KinetixColors.light.chart1,");
  });

  it("uses a typed list literal, so the const constructor gets List<Color>", () => {
    expect(dart({ chartPalette: "warm" })).toContain("chart: <Color>[");
  });
});

describe("manual overrides", () => {
  it("changes the output", () => {
    expect(dart({ manualOverrides: { action: "#ff0000" } })).not.toBe(dart());
  });

  it("preserves a failing foreground exactly, with no silent repair", () => {
    const block = lightBlock(dart({ manualOverrides: { card: "#ffffff", "card-foreground": "#c9c9c9" } }));
    expect(block).toContain("cardForeground: Color(0xFFC9C9C9),");
  });

  it("does not leak the override map into the file", () => {
    expect(dart({ manualOverrides: { action: "#ff0000", border: "#00ff00" } })).not.toContain("manualOverrides");
  });
});

/* ------------------------------------------------------------------ what it must never be */

describe("what it refuses to be", () => {
  const source = dart(CUSTOM, "AcmeTheme");

  it("contains no CSS", () => {
    for (const fragment of ["var(--", "hsl(", ":root", "--shadow", "px;", "box-shadow"]) {
      expect(source, fragment).not.toContain(fragment);
    }
  });

  it("contains no Swift or Kotlin syntax", () => {
    for (const fragment of ["Color(red:", "public static let", "KinetixColorsSwiftUI", "Color(0xff", "object ", "val light"]) {
      expect(source, fragment).not.toContain(fragment);
    }
  });

  it("claims no platform it cannot deliver", () => {
    const text = source.toLowerCase();
    for (const claim of ["swiftui", "jetpack", "android xml", "every platform", "all five", "five-platform"]) {
      expect(text, claim).not.toContain(claim);
    }
  });

  it("says plainly that radius and elevation do not travel", () => {
    expect(source).toContain("COLOURS ONLY");
    expect(source).toMatch(/radius \(soft\) and surface treatment \(elevated\)/);
    // Scoped to the code: the header names `KinetixRadius` while explaining why radius cannot travel,
    // which is the opposite of emitting one.
    const code = source.slice(source.indexOf("import 'package:"));
    expect(code).not.toMatch(/KinetixRadius|KinetixShadow|BoxShadow|elevation:/);
  });

  it("declares no unmapped role, because Flutter has none", () => {
    // The Compose header names `input` and `ring` as roles that cannot travel. Flutter's contract has
    // fields for both, so saying the same thing here would be copied text rather than a fact.
    expect(source).not.toMatch(/`input` and `ring`/);
    expect(source).toContain("no role is left behind");
  });
});

/* ------------------------------------------------------------------ identifiers */

describe("token names become Dart field names", () => {
  it.each([
    ["background", "background"],
    ["primary-foreground", "primaryForeground"],
    ["action-hover", "actionHover"],
    ["tertiary-foreground", "tertiaryForeground"],
    ["chart-1", "chart1"],
  ])("%s → %s", (token, field) => {
    expect(dartFieldName(token)).toBe(field);
  });
});

describe("the symbol is untrusted input", () => {
  it.each(["AcmeTheme", "acmeTheme", "_Theme", "Theme2", "A"])("%s is accepted", (symbol) => {
    expect(dartSymbolError(symbol)).toBeNull();
    expect(dart({}, symbol)).toContain(`abstract final class ${symbol} {`);
  });

  it.each([
    ["a digit first", "123Theme"],
    ["a hyphen", "Theme-Name"],
    ["a space", "My Theme"],
    ["a statement", "Theme; import 'dart:io';"],
    ["a brace", "Theme } void evil() {"],
    ["a comment", "Theme // }"],
    ["a tab", "Theme\tName"],
    ["emoji", "Theme\u{1F3A8}"],
    ["non-ASCII letters", "Tëma"],
    ["empty", ""],
    ["too long", "A".repeat(65)],
  ])("%s is refused", (_name, symbol) => {
    expect(dartSymbolError(symbol)).toMatch(/^[A-Z"].*\.$/);
    expect(dartSymbolError(symbol)).not.toContain("\n");
    expect(() => dart({}, symbol)).toThrow();
  });

  it("refuses a name carrying a newline, without echoing it back", () => {
    const injected = "Theme\nimport 'dart:io';";
    expect(dartSymbolError(injected)).toBe("A theme name cannot contain control characters.");
    expect(() => dart({}, injected)).toThrow();
  });

  it.each(["class", "const", "final", "enum", "switch", "return", "var", "void", "true", "null", "extends", "with"])(
    "the Dart reserved word %s is refused",
    (word) => {
      expect(dartSymbolError(word)).toContain("reserved word");
      expect(() => dart({}, word)).toThrow(/reserved word/);
    },
  );

  it.each(["abstract", "import", "library", "part", "extension", "mixin", "static", "typedef", "async", "await"])(
    "the built-in identifier %s is accepted, because Dart accepts it",
    (word) => {
      // `class Import {}` compiles. Refusing these would be inventing a rule the language does not have —
      // and the list is easy to get backwards from memory, which is why both halves are asserted.
      expect(dartSymbolError(word), word).toBeNull();
    },
  );

  it("puts exactly one declaration in the file, whatever the name was", () => {
    for (const symbol of ["AcmeTheme", "_x", "Theme2"]) {
      const source = dart(CUSTOM, symbol);
      expect([...source.matchAll(/^abstract final class /gm)]).toHaveLength(1);
      expect([...source.matchAll(/^import /gm)]).toHaveLength(2);
    }
  });
});

/* ------------------------------------------------------------------ shared resolver */

describe("it consumes the shared resolved theme", () => {
  it("gives the same file for a decoded preset as for the design it was encoded from", () => {
    for (const over of [CUSTOM, { brand: "#7e22ce" }, { manualOverrides: { action: "#ff0000" } }]) {
      const decoded = decodePreset(encodePreset(design(over)));
      expect(decoded.ok).toBe(true);
      if (decoded.ok) {
        expect(exportFlutter(resolveCreateTheme(decoded.config))).toBe(exportFlutter(resolveCreateTheme(design(over))));
      }
    }
  });

  it("derives nothing of its own — every literal is one the resolver produced", () => {
    const resolved = resolveCreateTheme(design(CUSTOM));
    const known = new Set(
      (["light", "dark"] as const).flatMap((mode) => Object.values(resolved[mode].colors).map((hex) => dartColor(hex))),
    );
    for (const match of dart(CUSTOM, "AcmeTheme").matchAll(/: (Color\(0x[0-9A-F]{8}\)),/g)) {
      expect(known.has(match[1]!), `${match[1]} is not in the resolved theme`).toBe(true);
    }
  });
});
