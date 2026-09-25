// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCEPTED_TOKENS, encodePreset, presetUrl, type PresetConfig } from "@kinetixui/create-preset";
import { DEFAULT_PRESET } from "@kinetixui/create-preset";
import { presetDecode, presetUrlCommand } from "../../../../../packages/cli/src/commands/preset";

/**
 * The CLI side of the preset contract.
 *
 * The command modules are imported directly rather than spawning a built binary: it tests the code that
 * ships, needs no build ordering in CI, and the thing worth asserting is behaviour — what it prints, and
 * that a bad code is a message and a non-zero exit rather than a stack trace.
 */

const preset = (over: Partial<PresetConfig> = {}): PresetConfig => ({ ...DEFAULT_PRESET, ...over });

let out: string[];
let err: string[];

beforeEach(() => {
  out = [];
  err = [];
  vi.spyOn(console, "log").mockImplementation((...args) => void out.push(args.join(" ")));
  vi.spyOn(console, "error").mockImplementation((...args) => void err.push(args.join(" ")));
});

afterEach(() => vi.restoreAllMocks());

const printed = () => out.join("\n");
/** picocolors emits escapes when the stream looks like a TTY; compare on the text. */
const plain = () => printed().replace(/\u001b\[\d+m/g, "");

describe("preset decode", () => {
  it("prints what the preset actually says", () => {
    presetDecode(encodePreset(preset({ brand: "#c2410c", neutral: "warm", radius: "soft" })), { json: false });

    expect(plain()).toContain("#c2410c");
    expect(plain()).toContain("warm");
    expect(plain()).toContain("soft");
    // Defaults are shown too — "what is this preset" includes the parts it did not change.
    expect(plain()).toContain("kinetix");
  });

  it("accepts a full share URL, not only a bare code", () => {
    presetDecode(presetUrl(preset({ brand: "#7e22ce" }), "https://kinetixui.com"), { json: false });
    expect(plain()).toContain("#7e22ce");
  });

  it("prints machine-readable JSON on request", () => {
    presetDecode(encodePreset(preset({ brand: "#15803d", manualOverrides: { action: "#ff0000" } })), { json: true });

    const parsed = JSON.parse(printed());
    expect(parsed.brand).toBe("#15803d");
    expect(parsed.manualOverrides).toEqual({ action: "#ff0000" });
    // No colour escapes in the JSON path — it is meant to be piped.
    expect(printed()).not.toMatch(/\u001b\[/);
  });

  it("lists manual overrides, and says when there are none", () => {
    presetDecode(encodePreset(preset({ manualOverrides: { action: "#ff0000", border: "#00ff00" } })), { json: false });
    expect(plain()).toContain("Manual overrides (2)");
    expect(plain()).toContain("#00ff00");

    out = [];
    presetDecode(encodePreset(preset({ brand: "#c2410c" })), { json: false });
    expect(plain()).toContain("No manual overrides");
  });

  it("says when a preset changes nothing", () => {
    presetDecode(encodePreset(preset()), { json: false });
    expect(plain()).toContain("shipped Kinetix default");
  });

  it("does not imply it can produce native themes", () => {
    presetDecode(encodePreset(preset({ brand: "#c2410c" })), { json: false });
    const text = plain().toLowerCase();
    for (const claim of ["swiftui", "compose", "flutter", "native", "every platform", "all five"]) {
      expect(text, claim).not.toContain(claim);
    }
  });

  it("points at the tools that do produce CSS", () => {
    presetDecode(encodePreset(preset({ brand: "#c2410c" })), { json: false });
    expect(plain()).toContain("theme build");
    expect(plain()).toContain("preset url");
  });
});

describe("preset url", () => {
  it("prints the canonical share URL and nothing else", () => {
    presetUrlCommand(encodePreset(preset({ brand: "#c2410c" })), { site: "https://kinetixui.com" });

    expect(out).toHaveLength(1);
    expect(printed()).toBe(presetUrl(preset({ brand: "#c2410c" }), "https://kinetixui.com"));
  });

  it("honours a different origin, so a preview deployment can be linked", () => {
    presetUrlCommand(encodePreset(preset()), { site: "http://localhost:3000" });
    expect(printed().startsWith("http://localhost:3000/create?preset=KX1_")).toBe(true);
  });

  it("round-trips: its output decodes back to the same preset", () => {
    presetUrlCommand(encodePreset(preset({ brand: "#7e22ce", surface: "flat" })), { site: "https://kinetixui.com" });
    const url = printed();
    out = [];

    presetDecode(url, { json: true });
    expect(JSON.parse(printed())).toEqual(preset({ brand: "#7e22ce", surface: "flat" }));
  });
});

describe("bad input is a message, not a crash", () => {
  it.each([
    ["nonsense", "not-a-preset"],
    ["bad base64", "KX1_!!!!"],
    ["unknown version", "KX9_eyJ2Ijo5fQ"],
    ["empty", ""],
    ["a URL with no preset", "https://kinetixui.com/create"],
  ])("%s throws a readable Error", (_name, input) => {
    // The command layer turns a thrown Error into `✖ message` and exit code 1 — what it must never do is
    // let a decoder exception reach the user as a stack trace.
    expect(() => presetDecode(input, { json: false })).toThrow(/^[A-Z].*\.$/);
    expect(() => presetUrlCommand(input, { site: "https://kinetixui.com" })).toThrow();
  });

  it("prints nothing when it fails", () => {
    expect(() => presetDecode("KX1_!!!!", { json: false })).toThrow();
    expect(out).toEqual([]);
  });
});

describe("one codec, two consumers", () => {
  it("the CLI imports the shared module rather than porting it", () => {
    const source = readFileSync(new URL("../../../../../packages/cli/src/commands/preset.ts", import.meta.url), "utf8");
    expect(source).toContain('from "@kinetixui/create-preset"');
    // The failure this guards against is a helpful second implementation appearing here later.
    expect(source).not.toMatch(/function (decodePreset|encodePreset|canonicalize)\b/);
  });

  it("the CLI's older theme port still agrees on the token list", () => {
    // `packages/cli/src/lib/theme.ts` predates the codec and keeps its own 1:1 copy of the accepted
    // tokens. It is allowed to — it is a documented port — but the two lists have to stay the same, or
    // `theme build` and a preset would disagree about what a valid token name is.
    const source = readFileSync(new URL("../../../../../packages/cli/src/lib/theme.ts", import.meta.url), "utf8");
    const block = source.slice(source.indexOf("ACCEPTED_TOKENS = ["), source.indexOf("] as const;"));
    const names = [...block.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]);

    expect(names).toEqual([...ACCEPTED_TOKENS]);
  });
});
