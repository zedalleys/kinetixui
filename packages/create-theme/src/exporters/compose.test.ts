import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRESET, decodePreset, encodePreset, type PresetConfig } from "@kinetixui/create-preset";
import { contrastRatio, guaranteedContrast, hexToRgb } from "../color-math";
import { oklchToHex } from "../oklch";
import { resolveCreateTheme } from "../resolve";
import {
  COMPOSE_CHART_STOPS,
  COMPOSE_COLOR_FIELDS,
  COMPOSE_UNMAPPED_TOKENS,
  DEFAULT_COMPOSE_SYMBOL,
  composeColor,
  exportCompose,
  kotlinFieldName,
  kotlinSymbolError,
} from "./compose";

/**
 * The Jetpack Compose exporter.
 *
 * Structurally the SwiftUI exporter's twin, so most of these mirror its tests. The one that is genuinely
 * different is the representation proof: Compose writes exact 8-bit ARGB, which means it introduces no
 * quantization at all and needs no term of its own in `guaranteedContrast`. That claim is load-bearing —
 * the previous exporter shipped a wrong one about its own format — so it is proved here rather than
 * asserted in a comment.
 */

const design = (over: Partial<PresetConfig> = {}): PresetConfig => ({ ...DEFAULT_PRESET, ...over });
const kotlin = (over: Partial<PresetConfig> = {}, symbol?: string) =>
  exportCompose(resolveCreateTheme(design(over)), symbol === undefined ? {} : { symbol });

const CUSTOM = { brand: "#c2410c", neutral: "warm", radius: "soft", surface: "elevated", chartPalette: "warm" } as const;

/** The light block, so a test can assert a field without matching its dark twin. */
const lightBlock = (source: string) => source.slice(source.indexOf("val light"), source.indexOf("val dark"));

/* ------------------------------------------------------------------ the Compose package contract */

describe("it targets the real Compose API", () => {
  const themeKt = readFileSync(
    new URL("../../../ui-compose/ui/src/main/kotlin/com/kinetixui/ui/Theme.kt", import.meta.url),
    "utf8",
  );

  it("writes every field KinetixColors declares, in its order", () => {
    // The data class is hand-written Kotlin and COMPOSE_COLOR_FIELDS is hand-written here; this is the
    // only thing keeping them in step. A missing argument is a file that does not compile, and the
    // Android runner would say so — a long way from the cause.
    const body = themeKt.slice(themeKt.indexOf("data class KinetixColors("), themeKt.indexOf("private val LocalKinetixColors"));
    const declared = [...body.matchAll(/^ {4}val ([a-zA-Z0-9]+): (?:Color|List<Color>),$/gm)].map((m) => m[1]!);

    expect(declared).toEqual([...COMPOSE_COLOR_FIELDS.map(([field]) => field), "chart"]);
  });

  it("names the generated token objects the package actually vendors", () => {
    expect(kotlin()).toContain("com.kinetixui.tokens.KinetixTheme as KinetixTokensLight");
    expect(kotlin()).toContain("com.kinetixui.tokens.KinetixThemeDark as KinetixTokensDark");
    expect(themeKt).toContain("import com.kinetixui.tokens.KinetixTheme as GeneratedLight");
  });

  it("suggests a KinetixTheme signature that exists", () => {
    expect(kotlin()).toContain("KinetixTheme(light = light, dark = dark)");
    expect(themeKt).toMatch(/fun KinetixTheme\(\s*darkTheme: Boolean = isSystemInDarkTheme\(\),\s*light: KinetixColors = LightKinetixColors,\s*dark: KinetixColors = DarkKinetixColors,/);
  });

  it("names every Create token Compose has no field for, and no more", () => {
    // If a field is added to the Kotlin data class, this list should shrink — and the header stops
    // telling users something that is no longer true.
    const body = themeKt.slice(themeKt.indexOf("data class KinetixColors("), themeKt.indexOf("private val LocalKinetixColors"));
    for (const token of COMPOSE_UNMAPPED_TOKENS) {
      expect(body, token).not.toMatch(new RegExp(`^ {4}val ${kotlinFieldName(token)}:`, "m"));
    }
    // And they really are tokens Create resolves — otherwise the header names something imaginary.
    const resolved = resolveCreateTheme(design({ brand: "#c2410c" })).light.colors;
    for (const token of COMPOSE_UNMAPPED_TOKENS) expect(resolved[token], token).toMatch(/^#[0-9a-f]{6}$/);
  });
});

/* ------------------------------------------------------------------ representation */

describe("Compose adds no quantization", () => {
  /**
   * The claim that keeps `guaranteedContrast` at three terms instead of four.
   *
   * `Color(0xffRRGGBB)` is exact 8-bit ARGB, so the bytes Compose receives are the bytes the engine
   * resolved. If that were ever false — a float form, a colour space conversion, an alpha other than
   * `ff` — Compose would need its own term in the guarantee, exactly as SwiftUI's three-decimal channels
   * do. These tests are what would catch that.
   */
  const CORPUS = [
    "#000000",
    "#ffffff",
    "#1d4ed8", // the shipped blue
    "#c2410c", // the warm regression colour from the SwiftUI work
    "#f0f7ff",
    "#050c11",
    ...Array.from({ length: 36 }, (_, i) => oklchToHex({ l: 0.55, c: 0.2, h: i * 10 })),
    ...Array.from({ length: 12 }, (_, i) => oklchToHex({ l: 0.85, c: 0.08, h: i * 30 })),
    ...Array.from({ length: 12 }, (_, i) => oklchToHex({ l: 0.2, c: 0.08, h: i * 30 })),
  ];

  /** Parse `Color(0xffRRGGBB)` back to bytes — what the Kotlin literal means to the platform. */
  function parseComposeArgb(literal: string): { alpha: number; rgb: [number, number, number] } {
    const m = /^Color\(0x([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})\)$/.exec(literal);
    if (!m) throw new Error(`not a Compose colour literal: ${literal}`);
    return {
      alpha: parseInt(m[1]!, 16),
      rgb: [parseInt(m[2]!, 16), parseInt(m[3]!, 16), parseInt(m[4]!, 16)],
    };
  }

  it.each(CORPUS)("%s survives the round trip byte for byte", (hex) => {
    const parsed = parseComposeArgb(composeColor(hex)!);
    expect(parsed.rgb).toEqual(hexToRgb(hex));
    expect(parsed.alpha).toBe(0xff);
  });

  it("round-trips every byte value, not only a sample", () => {
    for (let v = 0; v <= 255; v++) {
      const hex = `#${v.toString(16).padStart(2, "0").repeat(3)}`;
      expect(parseComposeArgb(composeColor(hex)!).rgb).toEqual([v, v, v]);
    }
  });

  it("holds for the colours a real design actually generates", () => {
    // Action states, chart stops and a manual override, read out of a generated file rather than out of
    // the helper — so a template that reformatted a literal would fail here.
    const over = { ...CUSTOM, manualOverrides: { border: "#ff0000" } } as Partial<PresetConfig>;
    const resolved = resolveCreateTheme(design(over));
    const source = kotlin(over, "AcmeTheme");

    let checked = 0;
    for (const [field, token] of COMPOSE_COLOR_FIELDS) {
      const m = new RegExp(`^ {8}${field} = (Color\\(0x[0-9a-f]{8}\\)),$`, "m").exec(lightBlock(source));
      if (!m) continue; // written as a shipped reference — no literal to compare
      expect(parseComposeArgb(m[1]!).rgb, `${field} (${token})`).toEqual(hexToRgb(resolved.light.colors[token]!));
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it("therefore needs no term of its own in the contrast guarantee", () => {
    // Because the bytes are identical, Compose's contrast IS the exact term `guaranteedContrast` already
    // takes the minimum over. Adding a fourth identical term would be redundant maths pretending to be
    // rigour. This asserts the equality the argument rests on.
    for (const brand of ["#c2410c", "#1d4ed8", "#7e22ce", "#008758"]) {
      const c = resolveCreateTheme(design({ brand })).light.colors;
      const a = c.action!;
      const fg = c["action-foreground"]!;
      const asCompose = parseComposeArgb(composeColor(a)!).rgb;
      const fgAsCompose = parseComposeArgb(composeColor(fg)!).rgb;

      expect(asCompose).toEqual(hexToRgb(a));
      expect(fgAsCompose).toEqual(hexToRgb(fg));
      // And the engine's guarantee, which already includes this exact representation, clears AA.
      expect(guaranteedContrast(a, fg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(a, fg)).toBeGreaterThanOrEqual(guaranteedContrast(a, fg));
    }
  });
});

/* ------------------------------------------------------------------ determinism */

describe("determinism", () => {
  it("produces byte-identical output for the same design and options", () => {
    expect(new Set(Array.from({ length: 4 }, () => kotlin(CUSTOM, "AcmeTheme"))).size).toBe(1);
  });

  it("does not depend on how the design object was built", () => {
    const a = exportCompose(resolveCreateTheme(design({ brand: "#C2410C", manualOverrides: { border: "#00FF00", action: "#FF0000" } })));
    const b = exportCompose(resolveCreateTheme(design({ manualOverrides: { action: "#ff0000", border: "#00ff00" }, brand: "#c2410c" })));
    expect(a).toBe(b);
  });

  it("carries no timestamp, no preset code and no URL", () => {
    const source = kotlin(CUSTOM, "AcmeTheme");
    expect(source).not.toContain("KX1_");
    expect(source).not.toContain("http");
    expect(source).not.toMatch(/\b(19|20)\d{2}-\d{2}-\d{2}\b/);
    expect(source).not.toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it("ends in exactly one newline", () => {
    expect(kotlin().endsWith("}\n")).toBe(true);
    expect(kotlin().endsWith("\n\n")).toBe(false);
  });
});

/* ------------------------------------------------------------------ what it exports */

describe("the default design", () => {
  it("produces a complete theme rather than an empty file", () => {
    // Native artifacts are complete files, unlike the CSS exporter's diff. `preset css` emits nothing
    // here; a Kotlin file has to be usable on its own.
    const source = kotlin();
    expect(source).toContain(`object ${DEFAULT_COMPOSE_SYMBOL} {`);
    expect(source).toContain("val light = KinetixColors(");
    expect(source).toContain("val dark = KinetixColors(");
  });

  it("writes no literal colour, because it changes nothing", () => {
    expect(kotlin()).not.toContain("Color(0x");
  });

  it("omits the Color import it would not use", () => {
    // An unused import in a generated file is a warning someone else has to look at.
    expect(kotlin()).not.toContain("import androidx.compose.ui.graphics.Color");
    expect(kotlin(CUSTOM)).toContain("import androidx.compose.ui.graphics.Color");
  });
});

describe("a design's values reach the output", () => {
  it.each<[string, Partial<PresetConfig>, RegExp]>([
    ["brand", { brand: "#c2410c" }, /action = Color\(0xffc2410c\),/],
    ["neutral", { neutral: "warm" }, /background = Color\(0x/],
    ["chart palette", { chartPalette: "categorical" }, /chart = listOf\(\n\s+Color\(0x/],
    ["manual override", { manualOverrides: { border: "#ff0000" } }, /border = Color\(0xffff0000\),/],
  ])("%s", (_name, over, pattern) => {
    expect(lightBlock(kotlin(over))).toMatch(pattern);
  });

  it("leaves a role the design did not touch following the library", () => {
    const block = lightBlock(kotlin({ neutral: "warm" }));
    expect(block).toContain("secondary = KinetixTokensLight.colorSecondary,");
    expect(block).toMatch(/background = Color\(0x/);
  });

  it("carries the resolved interaction states, unchanged", () => {
    // The exporter must not recompute or repair these — the shared engine owns them.
    const resolved = resolveCreateTheme(design({ brand: "#c2410c" })).light.colors;
    const block = lightBlock(kotlin({ brand: "#c2410c" }));
    for (const [field, token] of [
      ["action", "action"],
      ["actionForeground", "action-foreground"],
      ["actionHover", "action-hover"],
      ["actionPressed", "action-pressed"],
    ] as const) {
      expect(block, field).toContain(`${field} = ${composeColor(resolved[token]!)},`);
    }
  });
});

describe("light and dark", () => {
  it("exports both appearances, not the one that happened to be on screen", () => {
    const source = kotlin({ brand: "#c2410c" });
    const dark = source.slice(source.indexOf("val dark"));
    expect(lightBlock(source)).toContain("action = Color(0xffc2410c),");
    expect(dark).toMatch(/action = Color\(0x/);
    expect(dark).not.toContain("action = Color(0xffc2410c),");
  });

  it("references the right generated object in each block", () => {
    const source = kotlin({ brand: "#c2410c" });
    expect(lightBlock(source)).not.toContain("KinetixTokensDark.");
    expect(source.slice(source.indexOf("val dark"))).not.toContain("KinetixTokensLight.");
  });
});

describe("the chart palette", () => {
  it("writes exactly five stops, in series order", () => {
    const resolved = resolveCreateTheme(design({ chartPalette: "cool" })).light.colors;
    const list = lightBlock(kotlin({ chartPalette: "cool" }));
    const stops = [...list.slice(list.indexOf("chart = listOf(")).matchAll(/Color\(0x[0-9a-f]{8}\)/g)].map((m) => m[0]);

    expect(stops).toHaveLength(COMPOSE_CHART_STOPS.length);
    expect(stops).toEqual(COMPOSE_CHART_STOPS.map((n) => composeColor(resolved[`chart-${n}`]!)));
  });

  it("keeps the shipped palette when the design did not choose one", () => {
    expect(lightBlock(kotlin())).toContain("KinetixTokensLight.colorChart1,");
  });

  it("uses a list rather than named fields, because the API does", () => {
    expect(kotlin({ chartPalette: "warm" })).toContain("chart = listOf(");
    expect(kotlin({ chartPalette: "warm" })).not.toMatch(/chart1 = /);
  });
});

describe("manual overrides", () => {
  it("changes the output", () => {
    expect(kotlin({ manualOverrides: { action: "#ff0000" } })).not.toBe(kotlin());
  });

  it("preserves a failing foreground exactly, with no silent repair", () => {
    // #c9c9c9 on white is 1.9:1. The engine reports it and does not fix it; neither does this.
    const block = lightBlock(kotlin({ manualOverrides: { card: "#ffffff", "card-foreground": "#c9c9c9" } }));
    expect(block).toContain("cardForeground = Color(0xffc9c9c9),");
  });

  it("does not leak the override map into the file", () => {
    const source = kotlin({ manualOverrides: { action: "#ff0000", border: "#00ff00" } });
    expect(source).not.toContain("manualOverrides");
  });
});

/* ------------------------------------------------------------------ what it must never be */

describe("what it refuses to be", () => {
  const source = kotlin(CUSTOM, "AcmeTheme");

  it("contains no CSS", () => {
    for (const fragment of ["var(--", "hsl(", ":root", "--shadow", "px;", "box-shadow"]) {
      expect(source, fragment).not.toContain(fragment);
    }
  });

  it("contains no Swift or Dart syntax", () => {
    for (const fragment of ["Color(red:", "public static let", "KinetixColorsSwiftUI", "ThemeData", "const Color(0xFF"]) {
      expect(source, fragment).not.toContain(fragment);
    }
  });

  it("claims no platform it cannot deliver", () => {
    const text = source.toLowerCase();
    for (const claim of ["swiftui", "flutter", "every platform", "all five", "android xml"]) {
      expect(text, claim).not.toContain(claim);
    }
  });

  it("says plainly that radius and elevation do not travel", () => {
    expect(source).toContain("COLOURS ONLY");
    expect(source).toMatch(/radius \(soft\) and surface treatment \(elevated\)/);
    expect(source).not.toMatch(/KinetixRadius|\.shadow\(|elevation =/);
  });

  it("names the two tokens it cannot carry", () => {
    for (const token of COMPOSE_UNMAPPED_TOKENS) expect(source).toContain(`\`${token}\``);
  });
});

/* ------------------------------------------------------------------ identifiers */

describe("token names become Kotlin field names", () => {
  it.each([
    ["background", "background"],
    ["primary-foreground", "primaryForeground"],
    ["action-hover", "actionHover"],
    ["chart-1", "chart1"],
  ])("%s → %s", (token, field) => {
    expect(kotlinFieldName(token)).toBe(field);
  });

  it("matches what the vendored token object generates", () => {
    const generated = readFileSync(
      new URL("../../../ui-compose/ui/src/main/kotlin/com/kinetixui/tokens/Theme.kt", import.meta.url),
      "utf8",
    );
    for (const [field] of COMPOSE_COLOR_FIELDS) {
      const capitalised = field.replace(/^./, (c) => c.toUpperCase());
      expect(generated, field).toContain(`val color${capitalised} = `);
    }
  });
});

describe("the symbol is untrusted input", () => {
  it.each(["AcmeTheme", "acmeTheme", "Theme2", "_Theme", "A"])("%s is accepted", (symbol) => {
    expect(kotlinSymbolError(symbol)).toBeNull();
    expect(kotlin({}, symbol)).toContain(`object ${symbol} {`);
  });

  it.each([
    ["a digit first", "123Theme"],
    ["a hyphen", "Theme-Name"],
    ["a space", "My Theme"],
    ["a statement", "Theme; import java.io.File"],
    ["a brace", "Theme } fun evil() {"],
    ["a backtick escape", "`class`"],
    ["a comment", "Theme // }"],
    ["a tab", "Theme\tName"],
    ["emoji", "Theme🎨"],
    ["non-ASCII letters", "Tëma"],
    ["empty", ""],
    ["too long", "A".repeat(65)],
  ])("%s is refused", (_name, symbol) => {
    expect(kotlinSymbolError(symbol)).toMatch(/^[A-Z"].*\.$/);
    expect(kotlinSymbolError(symbol)).not.toContain("\n");
    expect(() => kotlin({}, symbol)).toThrow();
  });

  it("refuses a name carrying a newline, without echoing it back", () => {
    const injected = "Theme\nimport java.io.File";
    expect(kotlinSymbolError(injected)).toBe("A theme name cannot contain control characters.");
    expect(() => kotlin({}, injected)).toThrow();
  });

  it.each(["class", "object", "fun", "val", "var", "when", "typealias", "interface", "package", "is", "in"])(
    "the Kotlin keyword %s is refused rather than backtick-escaped",
    (keyword) => {
      expect(kotlinSymbolError(keyword)).toContain("keyword");
      expect(() => kotlin({}, keyword)).toThrow(/keyword/);
    },
  );

  it("accepts a soft keyword, because Kotlin does", () => {
    // `data`, `value`, `sealed` and friends are identifiers outside their one grammatical position.
    // Refusing them would be inventing a rule the language does not have.
    for (const soft of ["data", "value", "sealed", "open", "operator", "suspend"]) {
      expect(kotlinSymbolError(soft), soft).toBeNull();
    }
  });

  it("puts exactly one declaration in the file, whatever the name was", () => {
    for (const symbol of ["AcmeTheme", "_x", "Theme2"]) {
      const source = kotlin(CUSTOM, symbol);
      expect([...source.matchAll(/^object /gm)]).toHaveLength(1);
      expect([...source.matchAll(/^package /gm)]).toHaveLength(1);
      expect([...source.matchAll(/^import /gm)]).toHaveLength(4);
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
        expect(exportCompose(resolveCreateTheme(decoded.config))).toBe(exportCompose(resolveCreateTheme(design(over))));
      }
    }
  });

  it("derives nothing of its own — every colour is one the resolver produced", () => {
    // The claim that keeps three exporters honest: a literal in this file always appears in the resolved
    // theme. If the exporter ever computed a colour, it would show up here as one that does not.
    const resolved = resolveCreateTheme(design(CUSTOM));
    const known = new Set(
      (["light", "dark"] as const).flatMap((mode) =>
        Object.values(resolved[mode].colors).map((hex) => composeColor(hex)),
      ),
    );
    for (const match of kotlin(CUSTOM, "AcmeTheme").matchAll(/= (Color\(0x[0-9a-f]{8}\)),/g)) {
      const literal = match[1]!;
      expect(known.has(literal), `${literal} is not in the resolved theme`).toBe(true);
    }
  });
});
