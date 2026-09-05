/**
 * Copy the generated Flutter-Color token classes into the ui-flutter
 * package. Mirrors scripts/vendor-swiftui-tokens.mjs — a pure copy, no
 * value editing. Run after `pnpm build:tokens`:
 *
 *   pnpm build:tokens && pnpm vendor:flutter
 *
 * Source of truth stays the DTCG files in tokens/; this keeps the
 * package's vendored copy in sync (and CI-checkable).
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = `${ROOT}/packages/tokens/dist/flutter`;
const DEST = `${ROOT}/packages/ui-flutter/lib/src`;

mkdirSync(DEST, { recursive: true });

const files = ["kinetix_color_scheme.dart", "kinetix_color_scheme.dark.dart"];
for (const f of files) {
  copyFileSync(`${SRC}/${f}`, `${DEST}/${f}`);
  console.log(`vendor:flutter — ${f}`);
}
