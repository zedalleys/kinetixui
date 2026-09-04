/**
 * vendor-compose-tokens.mjs — copies the generated Android token output into
 * packages/ui-compose so it can build as a standalone Gradle project.
 *
 * Single source of truth stays packages/tokens/dist/android/** (built by
 * `pnpm build:tokens` from style-dictionary/ — see sd.config.mjs's
 * 'android-compose' / 'android-compose-theme' / 'android-xml' platforms).
 * This script only copies; it never edits token values. Re-run it after
 * `pnpm build:tokens` any time the tokens change.
 *
 *   node scripts/vendor-compose-tokens.mjs
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_ANDROID = `${ROOT}/packages/tokens/dist/android`;
const DEST_PKG = `${ROOT}/packages/ui-compose/ui/src/main`;

const KOTLIN_FILES = ["Color.kt", "Theme.kt", "Theme.dark.kt"];
const RES_FILES = ["colors.xml", "dimens.xml"];

function copy(from, to) {
  if (!existsSync(from)) {
    console.error(`missing source file: ${from}`);
    process.exitCode = 1;
    return;
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`✔︎ ${to.replace(ROOT + "/", "")}`);
}

for (const f of KOTLIN_FILES) {
  copy(`${SRC_ANDROID}/${f}`, `${DEST_PKG}/kotlin/com/kinetixui/tokens/${f}`);
}
for (const f of RES_FILES) {
  copy(`${SRC_ANDROID}/res/values/${f}`, `${DEST_PKG}/res/values/${f}`);
}

console.log("vendored Android tokens → packages/ui-compose/ui/src/main");
