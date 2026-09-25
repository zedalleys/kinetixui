// @vitest-environment node
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACCEPTED_TOKENS, encodePreset, presetUrl, type PresetConfig } from "@kinetixui/create-preset";
import { DEFAULT_PRESET } from "@kinetixui/create-preset";
import { exportCompose, exportCss, exportSwiftUi, resolveCreateTheme } from "@kinetixui/create-theme";
import {
  presetCompose,
  presetCss,
  presetDecode,
  presetSwiftUi,
  presetUrlCommand,
} from "../../../../../packages/cli/src/commands/preset";

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
/** `preset swiftui` writes to stdout directly, so a file redirect gets no extra newline. */
let written: string[];

beforeEach(() => {
  out = [];
  err = [];
  written = [];
  vi.spyOn(console, "log").mockImplementation((...args) => void out.push(args.join(" ")));
  vi.spyOn(console, "error").mockImplementation((...args) => void err.push(args.join(" ")));
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    written.push(String(chunk));
    return true;
  });
});

afterEach(() => vi.restoreAllMocks());

const printed = () => out.join("\n");
const stdout = () => written.join("");
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

  it("names only the platforms that exist", () => {
    // This has narrowed twice, each time a real exporter landed — first "swiftui", now "compose". What
    // it guards has not changed: a command must not name an output that does not exist. Flutter and
    // Android XML have no exporter, and nothing here may suggest a general "native" or five-platform
    // export, so those are what remain forbidden.
    presetDecode(encodePreset(preset({ brand: "#c2410c" })), { json: false });
    const text = plain().toLowerCase();
    for (const claim of ["flutter", "android", "native", "every platform", "all five"]) {
      expect(text, claim).not.toContain(claim);
    }
  });

  it("points at the tools that do produce something", () => {
    presetDecode(encodePreset(preset({ brand: "#c2410c" })), { json: false });
    expect(plain()).toContain("theme build");
    expect(plain()).toContain("preset css");
    expect(plain()).toContain("preset swiftui");
    expect(plain()).toContain("preset compose");
  });
});

describe("preset css", () => {
  it("prints the override block, and nothing else", async () => {
    await presetCss(encodePreset(preset({ brand: "#c2410c" })), {});

    expect(out).toHaveLength(1);
    expect(printed()).toContain(":root {");
    expect(printed()).toContain("--action:");
  });

  it("is byte-identical to what the workspace's Copy CSS produces", async () => {
    // The claim the command makes. One resolve, one exporter, two front ends — asserted rather than
    // assumed, because the last time two implementations were kept in step by hand they drifted.
    for (const over of [
      { brand: "#7e22ce" },
      { neutral: "warm" as const, radius: "soft" as const },
      { surface: "elevated" as const },
      { chartPalette: "categorical" as const, manualOverrides: { border: "#ff0000" } },
    ]) {
      out = [];
      await presetCss(encodePreset(preset(over)), {});
      expect(printed(), JSON.stringify(over)).toBe(exportCss(resolveCreateTheme(preset(over))));
    }
  });

  it("accepts a share URL as readily as a bare code", async () => {
    await presetCss(presetUrl(preset({ neutral: "cool" }), "https://kinetixui.com"), {});
    expect(printed()).toBe(exportCss(resolveCreateTheme(preset({ neutral: "cool" }))));
  });

  it("writes a file when asked, and says where", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "kx-preset-")), "theme.css");
    await presetCss(encodePreset(preset({ radius: "soft" })), { output: file });

    expect(readFileSync(file, "utf8")).toBe(`${exportCss(resolveCreateTheme(preset({ radius: "soft" })))}\n`);
    expect(plain()).toContain(file);
  });

  it("prints nothing on stdout for a preset that changes nothing", async () => {
    // `preset css X > theme.css` has to produce an empty file, not a comment a stylesheet cannot use.
    await presetCss(encodePreset(preset()), {});
    expect(out).toEqual([]);
    expect(err.join(" ")).toContain("nothing to override");
  });

  it("does not imply it can produce native themes", async () => {
    await presetCss(encodePreset(preset({ brand: "#c2410c", surface: "elevated" })), {});
    const text = printed().toLowerCase();
    for (const claim of ["swiftui", "compose", "flutter", "struct", "themedata"]) {
      expect(text, claim).not.toContain(claim);
    }
  });

  it("refuses a bad code with a message, not a stack trace", async () => {
    await expect(presetCss("KX1_!!!!", {})).rejects.toThrow(/^[A-Z].*\.$/);
    expect(out).toEqual([]);
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

describe("preset swiftui", () => {
  it("prints a Swift theme, and nothing else", async () => {
    await presetSwiftUi(encodePreset(preset({ brand: "#c2410c" })), {});

    expect(stdout()).toContain("public enum CreateTheme {");
    expect(stdout()).toContain("import KinetixUI");
    expect(out).toEqual([]); // written to stdout directly, not through console.log
  });

  it("is byte-identical to the shared exporter", async () => {
    // The same claim `preset css` makes, for the second target: one resolve, one exporter, two front
    // ends. It is the property PR 4's seam exists to have, so it is asserted rather than assumed.
    for (const over of [
      {},
      { brand: "#7e22ce" },
      { neutral: "warm" as const, chartPalette: "cool" as const },
      { manualOverrides: { border: "#ff0000" } },
    ]) {
      written = [];
      await presetSwiftUi(encodePreset(preset(over)), {});
      expect(stdout(), JSON.stringify(over)).toBe(
        exportSwiftUi(resolveCreateTheme(preset(over)), { symbol: "CreateTheme" }),
      );
    }
  });

  it("accepts a share URL as readily as a bare code", async () => {
    await presetSwiftUi(presetUrl(preset({ neutral: "cool" }), "https://kinetixui.com"), {});
    expect(stdout()).toBe(exportSwiftUi(resolveCreateTheme(preset({ neutral: "cool" })), { symbol: "CreateTheme" }));
  });

  it("names the enum after --name", async () => {
    await presetSwiftUi(encodePreset(preset({ brand: "#c2410c" })), { name: "AcmeTheme" });
    expect(stdout()).toContain("public enum AcmeTheme {");
  });

  it("writes a file when asked, and says how to apply it", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "kx-swift-")), "AcmeTheme.swift");
    await presetSwiftUi(encodePreset(preset({ neutral: "warm" })), { output: file, name: "AcmeTheme" });

    expect(readFileSync(file, "utf8")).toBe(
      exportSwiftUi(resolveCreateTheme(preset({ neutral: "warm" })), { symbol: "AcmeTheme" }),
    );
    expect(plain()).toContain(file);
    expect(plain()).toContain("KinetixTheme(light: AcmeTheme.light, dark: AcmeTheme.dark)");
  });

  it("still produces a file for the default preset, unlike preset css", async () => {
    // A Swift file is a complete artifact rather than an override block, so "nothing to override" is not
    // an outcome this format has.
    await presetSwiftUi(encodePreset(preset()), {});
    expect(stdout()).toContain("public enum CreateTheme {");
    expect(stdout()).not.toContain("Color(red:");
  });

  it.each([
    ["a digit first", "123Theme"],
    ["a statement", "Theme; import Foundation"],
    ["a keyword", "class"],
    ["a hyphen", "Theme-Name"],
    ["emoji", "Theme🎨"],
  ])("refuses %s as a name, before it decodes anything", async (_name, symbol) => {
    // The message should be about the argument the user got wrong, so the name is checked first — a bad
    // name and a bad code together must not report the code.
    await expect(presetSwiftUi("KX1_!!!!", { name: symbol })).rejects.toThrow(/name|identifier|keyword|digit/i);
    expect(written).toEqual([]);
  });

  it("refuses a bad preset with a message, not a stack trace", async () => {
    await expect(presetSwiftUi("KX1_!!!!", {})).rejects.toThrow(/^[A-Z].*\.$/);
    expect(written).toEqual([]);
  });

  it("claims no platform it cannot deliver", async () => {
    await presetSwiftUi(encodePreset(preset({ brand: "#c2410c", surface: "elevated" })), {});
    const text = stdout().toLowerCase();
    for (const claim of ["compose", "flutter", "android", "every platform", "all five"]) {
      expect(text, claim).not.toContain(claim);
    }
  });
});

describe("preset compose", () => {
  it("prints a Kotlin theme, and nothing else", async () => {
    await presetCompose(encodePreset(preset({ brand: "#c2410c" })), {});

    expect(stdout()).toContain("object CreateTheme {");
    expect(stdout()).toContain("import com.kinetixui.ui.KinetixColors");
    expect(out).toEqual([]);
  });

  it("is byte-identical to the shared exporter", async () => {
    // The same claim `preset css` and `preset swiftui` make: one resolve, one exporter, two front ends.
    for (const over of [
      {},
      { brand: "#7e22ce" },
      { neutral: "warm" as const, chartPalette: "cool" as const },
      { manualOverrides: { border: "#ff0000" } },
    ]) {
      written = [];
      await presetCompose(encodePreset(preset(over)), {});
      expect(stdout(), JSON.stringify(over)).toBe(
        exportCompose(resolveCreateTheme(preset(over)), { symbol: "CreateTheme" }),
      );
    }
  });

  it("accepts a share URL as readily as a bare code", async () => {
    await presetCompose(presetUrl(preset({ neutral: "cool" }), "https://kinetixui.com"), {});
    expect(stdout()).toBe(exportCompose(resolveCreateTheme(preset({ neutral: "cool" })), { symbol: "CreateTheme" }));
  });

  it("names the object after --name", async () => {
    await presetCompose(encodePreset(preset({ brand: "#c2410c" })), { name: "AcmeTheme" });
    expect(stdout()).toContain("object AcmeTheme {");
  });

  it("writes a file when asked, and says how to apply it", async () => {
    const file = join(mkdtempSync(join(tmpdir(), "kx-compose-")), "AcmeTheme.kt");
    await presetCompose(encodePreset(preset({ neutral: "warm" })), { output: file, name: "AcmeTheme" });

    expect(readFileSync(file, "utf8")).toBe(
      exportCompose(resolveCreateTheme(preset({ neutral: "warm" })), { symbol: "AcmeTheme" }),
    );
    expect(plain()).toContain(file);
    expect(plain()).toContain("KinetixTheme(light = AcmeTheme.light, dark = AcmeTheme.dark)");
  });

  it("still produces a file for the default preset, unlike preset css", async () => {
    await presetCompose(encodePreset(preset()), {});
    expect(stdout()).toContain("object CreateTheme {");
    expect(stdout()).not.toContain("Color(0x");
  });

  it.each([
    ["a digit first", "123Theme"],
    ["a statement", "Theme; import java.io.File"],
    ["a Kotlin keyword", "object"],
    ["a hyphen", "Theme-Name"],
    ["emoji", "Theme\u{1F3A8}"],
  ])("refuses %s as a name, before it decodes anything", async (_name, symbol) => {
    await expect(presetCompose("KX1_!!!!", { name: symbol })).rejects.toThrow(/name|identifier|keyword|digit/i);
    expect(written).toEqual([]);
  });

  it("refuses a bad preset with a message, not a stack trace", async () => {
    await expect(presetCompose("KX1_!!!!", {})).rejects.toThrow(/^[A-Z].*\.$/);
    expect(written).toEqual([]);
  });

  it("claims no platform it cannot deliver", async () => {
    await presetCompose(encodePreset(preset({ brand: "#c2410c", surface: "elevated" })), {});
    const text = stdout().toLowerCase();
    for (const claim of ["swiftui", "flutter", "android xml", "every platform", "all five"]) {
      expect(text, claim).not.toContain(claim);
    }
  });
});

describe("the three exporters agree on the design", () => {
  it("all read the same resolved theme rather than deriving their own", async () => {
    // Web, SwiftUI and Compose render one design three ways. The colours are the same colours; only the
    // syntax differs. Compose writes the resolved hex verbatim, which is what makes it checkable here.
    const over = { brand: "#c2410c", neutral: "warm" as const };
    const theme = resolveCreateTheme(preset(over));
    const action = theme.light.colors.action!;

    written = [];
    await presetCompose(encodePreset(preset(over)), {});
    expect(stdout()).toContain(`action = Color(0xff${action.slice(1)}),`);

    out = [];
    await presetCss(encodePreset(preset(over)), {});
    expect(printed()).toBe(exportCss(theme));

    written = [];
    await presetSwiftUi(encodePreset(preset(over)), {});
    expect(stdout()).toBe(exportSwiftUi(theme, { symbol: "CreateTheme" }));
  });
});

describe("the other preset commands still work", () => {
  it("decode, url and css are unchanged by the new target", async () => {
    presetDecode(encodePreset(preset({ brand: "#c2410c" })), { json: false });
    expect(plain()).toContain("#c2410c");

    out = [];
    presetUrlCommand(encodePreset(preset()), { site: "https://kinetixui.com" });
    expect(printed().startsWith("https://kinetixui.com/create?preset=KX1_")).toBe(true);

    out = [];
    await presetCss(encodePreset(preset({ neutral: "warm" })), {});
    expect(printed()).toBe(exportCss(resolveCreateTheme(preset({ neutral: "warm" }))));
  });

  it("decode points at every exporter", () => {
    presetDecode(encodePreset(preset({ brand: "#c2410c" })), { json: false });
    expect(plain()).toContain("preset css");
    expect(plain()).toContain("preset swiftui");
    expect(plain()).toContain("preset compose");
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
