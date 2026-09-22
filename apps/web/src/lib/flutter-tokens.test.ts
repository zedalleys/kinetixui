// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// hooks.mjs is plain ESM with no type declarations — imported the same way
// release-notes.test.ts imports scripts/release-notes.mjs.
import { shadowDartFormat, shadowHexToDartColor, shadowLayerToDart } from "../../../../style-dictionary/hooks.mjs";

/**
 * The Flutter token generator: the shadow transform itself, and proof that what
 * lands in packages/tokens/dist/flutter really is what the DTCG source says.
 *
 * The second half matters because a user reported spacing/radius as "missing"
 * when both had shipped for releases — they were just generated into a file
 * called kinetix_motion.dart. These assertions pin the values so the API can be
 * documented with confidence.
 */
const root = join(process.cwd(), "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const json = (p: string) => JSON.parse(read(p)) as Record<string, never>;

const FLUTTER_DIST = "packages/tokens/dist/flutter";
const shadowLight = read(`${FLUTTER_DIST}/kinetix_shadow.dart`);
const shadowDark = read(`${FLUTTER_DIST}/kinetix_shadow.dark.dart`);
const motion = read(`${FLUTTER_DIST}/kinetix_motion.dart`);

/* ------------------------------------------------------------------ the transform */

describe("shadowHexToDartColor — CSS #RRGGBBAA to Dart 0xAARRGGBB", () => {
  it("moves the alpha channel to the front", () => {
    // the real shadow.sm colour: black at 5%
    expect(shadowHexToDartColor("#0000000d")).toBe("Color(0x0D000000)");
    expect(shadowHexToDartColor("#676e7614")).toBe("Color(0x14676E76)");
  });

  it("treats a 6-digit hex as fully opaque", () => {
    expect(shadowHexToDartColor("#1d4ed8")).toBe("Color(0xFF1D4ED8)");
  });

  it("expands 3- and 4-digit shorthand", () => {
    expect(shadowHexToDartColor("#abc")).toBe("Color(0xFFAABBCC)");
    expect(shadowHexToDartColor("#abcd")).toBe("Color(0xDDAABBCC)");
  });

  it("rejects anything that is not a hex colour rather than emitting broken Dart", () => {
    for (const bad of ["", "rgb(0,0,0)", "transparent", "#12345", "{color.primary}"]) {
      expect(shadowHexToDartColor(bad)).toBeNull();
    }
  });
});

describe("shadowLayerToDart — one DTCG layer to one BoxShadow", () => {
  it("carries offset, blur and spread across without reinterpretation", () => {
    expect(shadowLayerToDart({ color: "#00000012", offsetX: "0", offsetY: "4", blur: "6", spread: "-1" })).toBe(
      "BoxShadow(color: Color(0x12000000), offset: Offset(0, 4), blurRadius: 6, spreadRadius: -1)",
    );
  });

  it("keeps a negative spread negative (lg relies on it to tuck the shadow in)", () => {
    expect(shadowLayerToDart({ color: "#0000000f", offsetX: "0", offsetY: "2", blur: "4", spread: "-2" })).toContain(
      "spreadRadius: -2",
    );
  });

  it("accepts px-suffixed and numeric inputs alike, and defaults a missing field to 0", () => {
    expect(shadowLayerToDart({ color: "#000000ff", offsetX: "2px", offsetY: 3, blur: "4px" })).toBe(
      "BoxShadow(color: Color(0xFF000000), offset: Offset(2, 3), blurRadius: 4, spreadRadius: 0)",
    );
  });

  it("emits no inner `const` — the layers sit in a const list, and unnecessary_const fails flutter analyze", () => {
    const layer = shadowLayerToDart({ color: "#00000012", offsetX: "0", offsetY: "1", blur: "2", spread: "0" })!;
    expect(layer).not.toContain("const");
  });

  it("returns null for an unusable colour instead of emitting an invalid layer", () => {
    expect(shadowLayerToDart({ color: "not-a-colour", offsetX: "0", offsetY: "0", blur: "0", spread: "0" })).toBeNull();
  });
});

describe("shadowDartFormat — the generated class", () => {
  const format = (tokens: unknown[], options?: Record<string, string>) =>
    shadowDartFormat.format({ dictionary: { allTokens: tokens }, options }) as string;

  const token = (name: string, value: unknown) => ({ $type: "shadow", path: ["shadow", name], $value: value });

  it("emits a single-layer token as a one-element const list", () => {
    const out = format([token("sm", [{ color: "#0000000d", offsetX: "0", offsetY: "1", blur: "2", spread: "0" }])]);
    expect(out).toContain("static const List<BoxShadow> sm = <BoxShadow>[");
    expect(out.match(/BoxShadow\(/g)).toHaveLength(1);
  });

  it("keeps a multi-layer token multi-layer, in source order (Flutter paints in list order)", () => {
    const out = format([
      token("md", [
        { color: "#0000001f", offsetX: "0", offsetY: "1", blur: "1", spread: "0" },
        { color: "#676e7614", offsetX: "0", offsetY: "2", blur: "5", spread: "0" },
      ]),
    ]);
    const layers = out.match(/BoxShadow\([^)]*\)/g)!;
    expect(layers).toHaveLength(2);
    expect(layers[0]).toContain("0x1F000000");
    expect(layers[1]).toContain("0x14676E76"); // the second layer stays second
  });

  it("accepts a bare (non-array) shadow value", () => {
    const out = format([token("one", { color: "#00000080", offsetX: "1", offsetY: "1", blur: "1", spread: "0" })]);
    expect(out).toContain("0x80000000");
  });

  it("camelCases kebab token names, so focus-destructive becomes focusDestructive", () => {
    const out = format([token("focus-destructive", [{ color: "#ec5047", offsetX: "0", offsetY: "0", blur: "0", spread: "1" }])]);
    expect(out).toContain("List<BoxShadow> focusDestructive");
  });

  it("honours the class name and file header the config passes in", () => {
    const out = format([token("focus", [{ color: "#60a5fa", offsetX: "0", offsetY: "0", blur: "0", spread: "1" }])], {
      className: "KinetixShadowDark",
      fileName: "kinetix_shadow.dark.dart",
    });
    expect(out).toContain("// kinetix_shadow.dark.dart — generated by Style Dictionary. Do not edit.");
    expect(out).toContain("class KinetixShadowDark {");
    expect(out).toContain("KinetixShadowDark._();");
  });

  it("ignores non-shadow tokens it is handed", () => {
    const out = format([{ $type: "color", path: ["color", "primary"], $value: "#1b3c53" }]);
    expect(out).not.toContain("BoxShadow(");
  });

  it("skips a token whose colour cannot be represented rather than emitting broken Dart", () => {
    const out = format([token("bad", [{ color: "{color.primary}", offsetX: "0", offsetY: "0", blur: "0", spread: "0" }])]);
    expect(out).not.toContain("List<BoxShadow> bad");
  });
});

/* ---------------------------------------------- generated output vs. the DTCG source */

describe("generated Flutter shadows match tokens/semantic/shadow*.json", () => {
  const source = json("tokens/semantic/shadow.json") as unknown as {
    shadow: Record<string, { $value: Array<Record<string, string>> }>;
  };
  const dark = json("tokens/semantic/shadow.dark.json") as unknown as {
    shadow: Record<string, { $value: Array<Record<string, string>> }>;
  };

  it("emits every token the source declares", () => {
    for (const name of Object.keys(source.shadow)) {
      const dartName = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      expect(shadowLight, `${name} missing from kinetix_shadow.dart`).toContain(`List<BoxShadow> ${dartName} =`);
    }
  });

  it("emits each layer of each token with the source's own colour and geometry", () => {
    for (const [name, def] of Object.entries(source.shadow)) {
      for (const layer of def.$value) {
        // `{interaction.focus.width}` is a reference — resolved by Style Dictionary, so skip the literal compare
        if (String(layer.spread).startsWith("{")) continue;
        expect(shadowLight, `${name} layer`).toContain(shadowLayerToDart(layer));
      }
    }
  });

  it("resolves the {interaction.focus.width} reference instead of shipping the placeholder", () => {
    expect(shadowLight).not.toContain("{interaction");
    const width = (json("tokens/primitives/interaction.json") as unknown as {
      interaction: { focus: { width: { $value: string | number } } };
    }).interaction.focus.width.$value;
    // the focus ring's crisp inner edge uses the token width as its spread
    expect(shadowLight).toContain(`spreadRadius: ${Number(width)}`);
  });

  it("dark overrides exactly the focus rings — and uses the dark source values", () => {
    expect(Object.keys(dark.shadow).sort()).toEqual(["focus", "focus-destructive", "focus-success", "focus-warning"]);
    for (const [name, def] of Object.entries(dark.shadow)) {
      const dartName = name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      expect(shadowDark).toContain(`List<BoxShadow> ${dartName} =`);
      for (const layer of def.$value) expect(shadowDark).toContain(shadowLayerToDart(layer));
    }
  });

  it("does not duplicate the theme-independent elevation scale into the dark class", () => {
    for (const name of ["sm", "md", "lg", "xl"]) {
      expect(shadowDark, `${name} should not be repeated in the dark file`).not.toContain(`List<BoxShadow> ${name} =`);
    }
  });

  it("gives the dark focus ring a genuinely different colour from light (not a copy)", () => {
    expect(shadowLight).toContain("0xFF1D4ED8"); // light ring
    expect(shadowDark).toContain("0xFF60A5FA"); // dark ring
    expect(shadowDark).not.toContain("0xFF1D4ED8");
  });
});

/* ------------- the families the user reported as missing, which already existed ------------- */

describe("generated Flutter foundation values match their DTCG source", () => {
  const dimension = json("tokens/primitives/dimension.json") as unknown as {
    spacing: Record<string, { $value: string | number }>;
    radius: Record<string, { $value: string | number }>;
  };
  const motionSource = json("tokens/primitives/motion.json") as unknown as {
    duration: Record<string, { $value: string }>;
  };

  it("KinetixSpacing carries every spacing step at its source value", () => {
    for (const [step, t] of Object.entries(dimension.spacing)) {
      expect(motion, `spacing.${step}`).toContain(`static const double space${step} = ${Number(t.$value)};`);
    }
  });

  it("KinetixRadius carries every radius step, including the role aliases", () => {
    for (const [name, t] of Object.entries(dimension.radius)) {
      const value = String(t.$value).startsWith("{")
        ? // a role alias like radius.container -> {radius.lg}; Style Dictionary resolves it
          Number(dimension.radius[String(t.$value).replace(/[{}]/g, "").split(".")[1]!]!.$value)
        : Number(t.$value);
      expect(motion, `radius.${name}`).toContain(`static const double ${name} = ${value};`);
    }
  });

  it("the radius role aliases resolve to the same number as the step they point at", () => {
    // documented mapping: field->sm, control->md, container->lg, surface->xl
    expect(motion).toContain(`static const double field = ${Number(dimension.radius.sm!.$value)};`);
    expect(motion).toContain(`static const double control = ${Number(dimension.radius.md!.$value)};`);
    expect(motion).toContain(`static const double container = ${Number(dimension.radius.lg!.$value)};`);
    expect(motion).toContain(`static const double surface = ${Number(dimension.radius.xl!.$value)};`);
  });

  it("KinetixDuration carries the motion scale in milliseconds", () => {
    for (const [name, t] of Object.entries(motionSource.duration)) {
      const ms = Number(String(t.$value).replace("ms", ""));
      expect(motion, `duration.${name}`).toContain(`Duration ${name} = Duration(milliseconds: ${ms});`);
    }
  });

  it("still emits the classes that existed before this change — nothing was displaced", () => {
    for (const cls of ["KinetixDuration", "KinetixEasing", "KinetixOpacity", "KinetixZIndex", "KinetixSpacing", "KinetixRadius"]) {
      expect(motion).toContain(`class ${cls} {`);
    }
  });
});

describe("generated Flutter colours and type match their DTCG source", () => {
  const colorScheme = read(`${FLUTTER_DIST}/kinetix_color_scheme.dart`);
  const colorSchemeDark = read(`${FLUTTER_DIST}/kinetix_color_scheme.dark.dart`);
  const text = read(`${FLUTTER_DIST}/app_text.dart`);

  it("light and dark semantic colours come from their own source files", () => {
    const light = json("tokens/semantic/color.light.json") as unknown as {
      color: Record<string, { $value: string }>;
    };
    const hex = (v: string) => `Color(0xFF${v.replace("#", "").toUpperCase()})`;
    const literal = Object.entries(light.color).find(([, t]) => /^#[0-9a-f]{6}$/i.test(String(t.$value)));
    expect(literal, "expected at least one literal hex in the light palette").toBeDefined();
    expect(colorScheme).toContain(hex(literal![1].$value));
  });

  it("dark is a genuinely different palette, not the light one relabelled", () => {
    expect(colorSchemeDark).toContain("class KinetixColorSchemeDark");
    expect(colorSchemeDark).not.toBe(colorScheme);
  });

  it("the type scale carries the source font sizes, resolved through the primitives", () => {
    // tokens/semantic/typography.json holds composites whose fontSize is a reference
    // ("{fontSize.display-lg}") into tokens/primitives/typography.json — Style Dictionary
    // resolves it, so this test follows the same hop to prove the emitted number is the source's.
    const semantic = json("tokens/semantic/typography.json") as unknown as {
      text: Record<string, { $value: { fontSize: string } }>;
    };
    const primitives = json("tokens/primitives/typography.json") as unknown as {
      fontSize: Record<string, { $value: string | number }>;
    };
    const roles = Object.entries(semantic.text).filter(([k]) => !k.startsWith("$"));
    expect(roles.length).toBeGreaterThan(5);
    for (const [name, t] of roles) {
      const ref = String(t.$value.fontSize);
      const size = ref.startsWith("{")
        ? Number(String(primitives.fontSize[ref.replace(/[{}]/g, "").split(".")[1]!]!.$value).replace("px", ""))
        : Number(ref.replace("px", ""));
      expect(text, `text.${name} fontSize`).toContain(`fontSize: ${size},`);
    }
  });
});
