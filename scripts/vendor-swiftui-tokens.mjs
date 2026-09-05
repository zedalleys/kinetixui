/**
 * Copy the generated SwiftUI-Color token enums into the ui-swiftui
 * package. Mirrors scripts/vendor-compose-tokens.mjs — a pure copy, no
 * value editing. Run after `pnpm build:tokens`:
 *
 *   pnpm build:tokens && pnpm vendor:swiftui
 *
 * Source of truth stays the DTCG files in tokens/; this just keeps the
 * package's vendored copy in sync (and CI-checkable).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = `${ROOT}/packages/tokens/dist/ios`;
const DEST = `${ROOT}/packages/ui-swiftui/Sources/KinetixUI`;

mkdirSync(DEST, { recursive: true });

const files = [
  "KinetixColorsSwiftUI.swift",
  "KinetixColorsSwiftUI.dark.swift",
  "KinetixType.swift", // KinetixTextStyle + KinetixType.<style>
];
for (const f of files) {
  copyFileSync(`${SRC}/${f}`, `${DEST}/${f}`);
  console.log(`vendor:swiftui — ${f}`);
}
