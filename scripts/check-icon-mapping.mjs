/**
 * check-icon-mapping.mjs — drift check for icons/mapping.json.
 *
 *   node scripts/check-icon-mapping.mjs
 *
 * icons/mapping.json records, per component, which icon (or glyph, or
 * custom-drawn shape) each platform's port renders for a React component's
 * own internally-hardcoded icons (its expand chevron, its checkmark, its
 * close button — NOT a caller-supplied icon prop, which is out of scope).
 * That data was hand-verified once by reading source; this script re-checks
 * it stays true, so a component whose native icon changes gets caught in CI
 * instead of the doc silently going stale.
 *
 * Only entries with a "file" + "value" (types icon-ref / glyph / shape) are
 * checked — the literal value must still appear in that file. "absent"
 * entries (no hardcoded icon found on that platform) are informational only
 * in this version: re-verifying a negative reliably, for an arbitrary icon
 * concept, risks false failures on incidental text/wording changes elsewhere
 * in the file, which is worse than not checking it. Positive claims are the
 * ones worth gating CI on.
 *
 * Three rules from the 2026-10-05 icon audit (docs/audits/ICON-ARCHITECTURE-AUDIT.md) ride on the same data:
 *
 *  1. Direction. An icon recorded as `"rtl": "mirrors"` (Back, Previous, Next, a breadcrumb separator, a
 *     collapsed disclosure) must use each platform's direction-aware variant: an SF Symbol ending in
 *     `.backward` / `.forward`, a Material icon whose Flutter glyph has matchTextDirection, a Compose
 *     KinetixIcons vector with autoMirror, or a Bidi_Mirrored character. An exception is allowed only with an
 *     `rtlException` saying why. A `"fixed"` icon must not use a direction-aware variant.
 *  2. The Compose glyph ratchet. Component-owned icons on Compose are vectors now; each Unicode glyph still
 *     rendered as text is listed in `composeGlyphs` with its reason. A glyph not listed fails, and so does a
 *     listed one that is gone (delete the entry, so the list only shrinks).
 *  3. No emoji. A string literal in a native component source must not contain an Emoji_Presentation
 *     character: it renders as a colour emoji that ignores the theme's tint and disabled state.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const mapping = JSON.parse(readFileSync(`${root}/icons/mapping.json`, "utf8"));

let checked = 0;
let failures = 0;

/** value may be a plain string, or (the severity cluster) an object of {IconName: value}. */
function valuesOf(value) {
  return typeof value === "object" && value !== null ? Object.values(value) : [value];
}

for (const icon of mapping.icons) {
  for (const comp of icon.components ?? []) {
    for (const platform of ["flutter", "swiftui", "compose"]) {
      const entry = comp[platform];
      if (!entry || entry.type === "absent") continue;
      if (!entry.file || entry.value === undefined) continue;

      const path = `${root}/${entry.file}`;
      const label = `${icon.name} / ${comp.component} / ${platform}`;
      checked += 1;

      if (!existsSync(path)) {
        console.log(`  ${label.padEnd(48)} ** FAIL ** — file no longer exists: ${entry.file}`);
        failures += 1;
        continue;
      }

      const content = readFileSync(path, "utf8");
      const missing = valuesOf(entry.value).filter((v) => !content.includes(v));
      if (missing.length) {
        console.log(
          `  ${label.padEnd(48)} ** FAIL ** — ${entry.file} no longer contains: ${missing.join(", ")}`,
        );
        failures += 1;
      }
    }
  }
}

// 1. Direction ---------------------------------------------------------------------------------------------
const AWARE = {
  swiftui: (v) => /\.(backward|forward)(\.|$)/.test(v),
  flutter: (v) => ["Icons.chevron_left", "Icons.chevron_right", "Icons.arrow_back", "Icons.arrow_forward"].includes(v),
  compose: (v) => ["KinetixIcons.ChevronStart", "KinetixIcons.ChevronEnd"].includes(v),
};
const BIDI_MIRRORED = new Set(["‹", "›", "«", "»", "<", ">", "(", ")", "[", "]"]);
const bare = (v) => String(v).replace(/^"|"$/g, "");
let directional = 0;
for (const icon of mapping.icons) {
  if (icon.rtl !== "mirrors" && icon.rtl !== "fixed") {
    console.log(`  ${icon.name.padEnd(48)} ** FAIL ** — rtl must be "mirrors" or "fixed", got ${JSON.stringify(icon.rtl)}`);
    failures += 1;
    continue;
  }
  for (const comp of icon.components ?? []) {
    for (const platform of ["flutter", "swiftui", "compose"]) {
      const entry = comp[platform];
      if (!entry || entry.type === "absent" || entry.value === undefined || typeof entry.value === "object") continue;
      const label = `${icon.name} / ${comp.component} / ${platform}`;
      const aware = entry.type === "glyph" ? [...bare(entry.value)].every((c) => BIDI_MIRRORED.has(c)) : AWARE[platform](entry.value);
      directional += 1;
      if (icon.rtl === "mirrors" && !aware && !entry.rtlException) {
        console.log(`  ${label.padEnd(48)} ** FAIL ** — ${entry.value} does not turn around in right-to-left layouts; use the direction-aware variant or record an rtlException`);
        failures += 1;
      } else if (icon.rtl === "fixed" && aware && entry.type !== "glyph") {
        console.log(`  ${label.padEnd(48)} ** FAIL ** — ${entry.value} mirrors in right-to-left layouts, but ${icon.name} means the same thing in both directions`);
        failures += 1;
      }
    }
  }
}

// 2 + 3. Compose glyphs and emoji in native sources ----------------------------------------------------------
const COMPOSE_DIR = "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui";
const NATIVE = [
  [COMPOSE_DIR, ".kt"],
  ["packages/ui-swiftui/Sources/KinetixUI", ".swift"],
  ["packages/ui-flutter/lib/src", ".dart"],
  ["packages/ui-angular/src/lib", ".ts"],
];
const GLYPH = /[\p{So}\p{Sm}\p{Pi}\p{Pf}\p{Po}]/u;
const EMOJI = /\p{Emoji_Presentation}/u;
const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);
// Double-quoted (Kotlin, Swift, TypeScript) and single-quoted (Dart, TypeScript) literals; Dart and Angular
// sources use the single-quoted form almost exclusively.
const literals = (line) => [...line.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1] ?? m[2]);

const found = new Map(); // "file\u0000glyph" -> count
let emoji = 0;
for (const [dir, ext] of NATIVE) {
  if (!existsSync(`${root}/${dir}`)) continue;
  for (const name of readdirSync(`${root}/${dir}`).filter((f) => f.endsWith(ext) && !f.includes(".spec.") && !f.includes("ComponentPreviews"))) {
    const file = `${dir}/${name}`;
    readFileSync(`${root}/${file}`, "utf8").split("\n").forEach((line, i) => {
      if (isComment(line)) return;
      for (const text of literals(line)) {
        if (EMOJI.test(text)) {
          console.log(`  ${`${file}:${i + 1}`.padEnd(48)} ** FAIL ** — emoji ${JSON.stringify(text)} in a component source`);
          failures += 1;
          emoji += 1;
        }
        // A glyph is a short literal made of symbols, not a sentence that happens to contain one.
        if (ext !== ".kt" || text.length > 6 || text.includes("${")) continue;
        if (![...text].some((c) => c === "×" || (c.codePointAt(0) > 0x2000 && GLYPH.test(c)))) continue;
        const key = `${file}\u0000${text.trim()}`;
        found.set(key, (found.get(key) ?? 0) + 1);
      }
    });
  }
}
const allowed = new Map();
for (const g of mapping.composeGlyphs ?? []) {
  if (!g.why) {
    console.log(`  ${`${g.file} ${g.glyph}`.padEnd(48)} ** FAIL ** — composeGlyphs entries need a "why"`);
    failures += 1;
  }
  const key = `${g.file}\u0000${g.glyph}`;
  allowed.set(key, (allowed.get(key) ?? 0) + 1);
}
for (const [key, n] of found) {
  const [file, glyph] = key.split("\u0000");
  if (n > (allowed.get(key) ?? 0)) {
    console.log(`  ${`${file.split("/").pop()} ${glyph}`.padEnd(48)} ** FAIL ** — a Unicode glyph used as an icon; draw it with KinetixIcons (KinetixIcon / KinetixIconControl), or record it in composeGlyphs with why`);
    failures += 1;
  }
}
for (const [key, n] of allowed) {
  const [file, glyph] = key.split("\u0000");
  if (n > (found.get(key) ?? 0)) {
    console.log(`  ${`${file.split("/").pop()} ${glyph}`.padEnd(48)} ** FAIL ** — listed in composeGlyphs but no longer in the source; delete the entry`);
    failures += 1;
  }
}

console.log(
  `\n${directional} direction rules, ${[...found.values()].reduce((a, b) => a + b, 0)} Compose glyphs against ${(mapping.composeGlyphs ?? []).length} recorded, ${emoji} emoji.`,
);
console.log(
  `\n${failures === 0 ? "PASS" : `FAIL (${failures})`} — ${checked} recorded icon mappings` +
    (failures === 0 ? " still match source." : "; icons/mapping.json or the source is out of line, see above."),
);
process.exit(failures === 0 ? 0 : 1);
