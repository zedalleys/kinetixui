// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_TOKENS,
  CHART_PALETTES,
  DEFAULT_PRESET,
  LIMITS,
  NEUTRALS,
  RADII,
  SURFACES,
  canonicalize,
  decodePreset,
  encodePreset,
  extractCode,
  isDefaultPreset,
  presetUrl,
  validate,
  type PresetConfig,
} from "@kinetixui/create-preset";
import { ACCEPTED_TOKENS as WEB_TOKENS } from "@kinetixui/create-theme";
import { CHART_PALETTES as E_CHARTS, NEUTRALS as E_NEUTRALS, RADII as E_RADII, SURFACES as E_SURFACES } from "@kinetixui/create-theme";

/**
 * The codec, tested as what it is: a parser for untrusted input that also has to be perfectly stable for
 * the input it produces itself. A code someone shared last month has to mean the same thing today.
 */

const preset = (over: Partial<PresetConfig> = {}): PresetConfig => ({ ...DEFAULT_PRESET, ...over });

/* ------------------------------------------------------------------ one vocabulary */

describe("the codec and the engine agree on the vocabulary", () => {
  // The codec validates against its own lists because it must decode without the app. These assert the
  // lists are the same ones, so a new neutral cannot be addable in the app and unencodable in a preset.
  it.each([
    ["neutral", NEUTRALS, E_NEUTRALS],
    ["radius", RADII, E_RADII],
    ["surface", SURFACES, E_SURFACES],
    ["chart palette", CHART_PALETTES, E_CHARTS],
  ])("%s options match", (_name, codec, engine) => {
    expect([...codec]).toEqual([...engine]);
  });

  it("uses one accepted-token list, not a copy", () => {
    // theme-builder re-exports the codec's list rather than declaring its own.
    expect(WEB_TOKENS).toBe(ACCEPTED_TOKENS);
  });
});

/* ------------------------------------------------------------------ round trip */

describe("round trip", () => {
  const CASES: [string, PresetConfig][] = [
    ["the default", preset()],
    ["a brand only", preset({ brand: "#c2410c" })],
    ["every dimension", preset({ brand: "#7e22ce", neutral: "warm", radius: "soft", surface: "elevated", chartPalette: "cool" })],
    ["one override", preset({ manualOverrides: { action: "#ff0000" } })],
    ["many overrides", preset({ brand: "#15803d", manualOverrides: Object.fromEntries(ACCEPTED_TOKENS.map((t, i) => [t, `#${(i * 111111).toString(16).padStart(6, "0").slice(0, 6)}`])) })],
    ["an override equal to the default brand", preset({ manualOverrides: { brand: DEFAULT_PRESET.brand } })],
  ];

  it.each(CASES)("%s survives config → code → config", (_name, config) => {
    const result = decodePreset(encodePreset(config));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.config).toEqual(config);
  });

  it("survives a full share URL, not just a bare code", () => {
    const config = preset({ brand: "#c2410c", neutral: "cool" });
    const url = presetUrl(config, "https://kinetixui.com");
    const result = decodePreset(url);
    expect(result.ok && result.config).toEqual(config);
  });

  it("keeps an override that happens to equal what would be generated", () => {
    // Pinned and generated are different states — the pinned one survives a brand change — so the code
    // has to carry the difference even when the two values look identical today.
    const config = preset({ manualOverrides: { action: DEFAULT_PRESET.brand } });
    const result = decodePreset(encodePreset(config));
    expect(result.ok && result.config.manualOverrides.action).toBe(DEFAULT_PRESET.brand);
  });

  it("drops an override that was removed", () => {
    const result = decodePreset(encodePreset(preset({ manualOverrides: {} })));
    expect(result.ok && result.config.manualOverrides).toEqual({});
  });
});

/* ------------------------------------------------------------------ determinism */

describe("determinism", () => {
  it("gives the same code every time", () => {
    const config = preset({ brand: "#c2410c", neutral: "warm", manualOverrides: { action: "#ff0000" } });
    expect(new Set(Array.from({ length: 5 }, () => encodePreset(config))).size).toBe(1);
  });

  it("ignores the order the object was built in", () => {
    const a: PresetConfig = { brand: "#c2410c", neutral: "warm", radius: "soft", surface: "flat", chartPalette: "cool", manualOverrides: { action: "#ff0000", border: "#00ff00" } };
    const b: PresetConfig = { manualOverrides: { border: "#00ff00", action: "#ff0000" }, chartPalette: "cool", surface: "flat", radius: "soft", neutral: "warm", brand: "#c2410c" };
    expect(encodePreset(a)).toBe(encodePreset(b));
  });

  it("ignores hex casing", () => {
    expect(encodePreset(preset({ brand: "#C2410C" }))).toBe(encodePreset(preset({ brand: "#c2410c" })));
    expect(encodePreset(preset({ manualOverrides: { action: "#FF0000" } }))).toBe(
      encodePreset(preset({ manualOverrides: { action: "#ff0000" } })),
    );
  });

  it("omits fields left at their default", () => {
    expect(canonicalize(preset())).toEqual({ v: 1 });
    expect(canonicalize(preset({ neutral: "warm" }))).toEqual({ v: 1, neutral: "warm" });
    expect(isDefaultPreset(preset())).toBe(true);
    expect(isDefaultPreset(preset({ radius: "soft" }))).toBe(false);
  });

  it("stays short for a realistic preset", () => {
    // Measured rather than assumed: the encoding was chosen to be inspectable, so the sizes have to be
    // small enough that inspectable is affordable. A regression here means the payload grew a field.
    const sizes = {
      default: encodePreset(preset()).length,
      brandOnly: encodePreset(preset({ brand: "#c2410c" })).length,
      everything: encodePreset(preset({ brand: "#7e22ce", neutral: "warm", radius: "soft", surface: "elevated", chartPalette: "cool" })).length,
    };
    expect(sizes.default).toBeLessThan(20);
    expect(sizes.brandOnly).toBeLessThan(50);
    expect(sizes.everything).toBeLessThan(140);
  });
});

/* ------------------------------------------------------------------ malformed input */

describe("malformed input is refused, never guessed at", () => {
  const BAD: [string, string][] = [
    ["empty", ""],
    ["whitespace", "   "],
    ["no prefix", "eyJ2IjoxfQ"],
    ["wrong prefix", "ZZ1_eyJ2IjoxfQ"],
    ["prefix only", "KX1_"],
    ["not base64url", "KX1_!!!!not-base64!!!!"],
    ["base64 of nonsense", "KX1_bm90LWpzb24"],
    ["base64 of an array", "KX1_WzEsMiwzXQ"],
    ["base64 of a string", "KX1_ImhlbGxvIg"],
    ["base64 of null", "KX1_bnVsbA"],
  ];

  it.each(BAD)("%s", (_name, code) => {
    const result = decodePreset(code);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message.length).toBeGreaterThan(0);
      // A person pasted this. The message has to read like a sentence, not a stack frame.
      expect(result.error.message).not.toMatch(/undefined|\[object|SyntaxError|at Object/);
    }
  });

  it("names an unknown version and says what to do", () => {
    const result = decodePreset("KX9_eyJ2Ijo5fQ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("unsupported-version");
      expect(result.error.message).toMatch(/version 9/);
      expect(result.error.message).toMatch(/Update KinetixUI/);
    }
  });

  it("refuses an invalid enum by name", () => {
    const result = validate({ v: 1, neutral: "chartreuse" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("bad-field");
      expect(result.error.message).toMatch(/neutral/);
    }
  });

  it.each(["#12345", "red", "#gggggg", "", "#1234567", "rgb(1,2,3)"])("refuses %s as a colour", (value) => {
    expect(validate({ v: 1, brand: value }).ok).toBe(false);
  });

  it("never throws, whatever it is handed", () => {
    const nasty = ["KX1_" + "A".repeat(5000), "KX1_\u0000\u0001", "KX1_%%%%", "\u{1F4A9}", "KX1_" + "=".repeat(100), "KX", "KX1", "KX1_eyJ2IjoxLCJicmFuZCI6"];
    for (const input of nasty) expect(() => decodePreset(input)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ security */

describe("security", () => {
  it("refuses a token name that is not a semantic colour", () => {
    // §26: a preset is structured configuration, never a way to smuggle a custom property.
    for (const name of ["whatever", "--primary", "background-image", "primary;color:red", "PRIMARY"]) {
      const result = validate({ v: 1, manualOverrides: { [name]: "#ff0000" } });
      expect(result.ok, name).toBe(false);
    }
  });

  it("cannot carry a CSS value — only a hex colour", () => {
    for (const value of ["url(https://evil.example)", "red; background-image: url(x)", "var(--x)", "#ff0000 !important"]) {
      expect(validate({ v: 1, manualOverrides: { primary: value } }).ok, value).toBe(false);
    }
  });

  it("refuses prototype-shaped keys rather than assigning them", () => {
    for (const key of ["__proto__", "constructor", "prototype"]) {
      const result = validate({ v: 1, manualOverrides: { [key]: "#ff0000" } });
      expect(result.ok, key).toBe(false);
    }
    // And nothing leaked onto Object.prototype on the way.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("survives a payload built to pollute through JSON.parse", () => {
    const hostile = JSON.stringify({ v: 1, __proto__: { polluted: true }, brand: "#ff0000" });
    const result = validate(JSON.parse(hostile));
    expect(result.ok).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("caps the code length", () => {
    const result = decodePreset(`KX1_${"A".repeat(LIMITS.code)}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("too-long");
  });

  it("caps the number of overrides", () => {
    const many = Object.fromEntries(Array.from({ length: LIMITS.overrides + 1 }, (_, i) => [`t${i}`, "#ff0000"]));
    expect(validate({ v: 1, manualOverrides: many }).ok).toBe(false);
  });

  it("ignores unknown fields rather than carrying them through", () => {
    const result = validate({ v: 1, brand: "#ff0000", density: "compact", script: "alert(1)", nested: { a: { b: 1 } } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config).toEqual(preset({ brand: "#ff0000" }));
      expect(Object.keys(result.config)).toEqual(Object.keys(DEFAULT_PRESET));
    }
  });

  it("refuses non-ASCII in the payload instead of interpreting it", () => {
    expect(decodePreset("KX1_4pyT").ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ URLs */

describe("share URLs", () => {
  it("builds a canonical /create URL", () => {
    const url = presetUrl(preset({ brand: "#c2410c" }), "https://kinetixui.com");
    expect(url.startsWith("https://kinetixui.com/create?preset=KX1_")).toBe(true);
    // The code has to survive a URL untouched — no escaping, no re-encoding.
    expect(url).toBe(decodeURIComponent(url));
  });

  it("tolerates a trailing slash on the origin", () => {
    expect(presetUrl(preset(), "https://kinetixui.com/")).toBe(presetUrl(preset(), "https://kinetixui.com"));
  });

  it("takes the first value when ?preset is repeated", () => {
    const first = encodePreset(preset({ brand: "#ff0000" }));
    const second = encodePreset(preset({ brand: "#00ff00" }));
    const result = decodePreset(`https://kinetixui.com/create?preset=${first}&preset=${second}`);
    expect(result.ok && result.config.brand).toBe("#ff0000");
  });

  it("returns nothing for a URL with no preset", () => {
    expect(extractCode("https://kinetixui.com/create")).toBeNull();
    expect(decodePreset("https://kinetixui.com/create").ok).toBe(false);
  });

  it("does not treat a malformed URL as a bare code", () => {
    expect(extractCode("https://[not-a-url")).toBeNull();
  });
});
