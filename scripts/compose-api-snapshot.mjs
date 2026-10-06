/**
 * compose-api-snapshot.mjs — the ordered constructor of Compose's `KinetixColors`, as a snapshot.
 *
 *   node scripts/compose-api-snapshot.mjs            rewrite the snapshot
 *   node scripts/compose-api-snapshot.mjs --check    fail if it has drifted
 *
 * Why this file exists. `KinetixColors` is a Kotlin `data class`, so its parameter LIST is its public
 * API in three ways a reader of the diff will not see:
 *
 *   positional callers  `KinetixColors(a, b, …)` binds by position, so a field inserted in the middle
 *                       silently re-points every argument after it (or stops compiling).
 *   destructuring       `component1()`…`componentN()` are generated in declaration order, so an
 *                       inserted field renumbers the ones after it.
 *   defaults            a parameter with a default declared BEFORE one without it can only be
 *                       defaulted by name, so the default it advertises is unusable positionally.
 *
 * `chart` stays the last parameter, because the Create exporter's contract puts the chart list last and
 * `compose.test.ts` reads this file to hold the two in step. New Color roles therefore land before it,
 * which means a NAMED-argument caller is unaffected (every call site in and out of this repo writes a
 * 35-field colour set by name) while a positional caller and `componentN()` destructuring are not. Nor
 * is JVM BINARY compatibility, which no placement could keep: the primary constructor and `copy` gain
 * parameters, so an already-compiled consumer needs recompiling.
 *
 * That cost is accepted rather than hidden. `com.kinetixui:ui-compose` has never been published
 * (platform-parity.json records `published: false`; publish-compose.yml is manual-dispatch and defaults
 * to a dry run), so nothing is compiled against any earlier signature, and the changeset states the
 * consequence for the day it is. What this snapshot adds is that the next role cannot arrive silently:
 * a parameter added, removed or moved shows up here as a diff a reviewer has to approve.
 */
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const SOURCE = "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui/Theme.kt";
const SNAPSHOT = "packages/ui-compose/colors-api.json";

const source = readFileSync(`${root}${SOURCE}`, "utf8");
const open = source.indexOf("data class KinetixColors(");
if (open < 0) throw new Error(`${SOURCE} no longer declares \`data class KinetixColors(\``);
const body = source.slice(open, source.indexOf("\n)", open));

/** Each `val <name>: <Type>[ = default]` of the constructor, in declaration order. */
const params = [...body.matchAll(/^\s{4}val ([A-Za-z0-9_]+): ([^=\n]+?)(?: = (.+))?,$/gm)].map((m) => ({
  name: m[1],
  type: m[2].trim(),
  defaulted: m[3] !== undefined,
}));
if (params.length < 30) throw new Error(`parsed only ${params.length} parameters from ${SOURCE} — the parser has drifted`);

// One invariant, checked rather than trusted.
const problems = [];
// `chart` is last: the Create exporter emits it last and `compose.test.ts` asserts this file agrees.
if (params[params.length - 1]?.name !== "chart") {
  problems.push(
    "`chart` is no longer the last parameter. The Compose exporter emits it last and " +
      "packages/create-theme/src/exporters/compose.test.ts reads this file to keep the two in step.",
  );
}
if (problems.length) {
  console.error(`${problems.join("\n")}\n\nFix the declaration, then run \`pnpm gen:compose-api\`.`);
  process.exit(1);
}

const serialised = `${JSON.stringify({ source: SOURCE, parameters: params }, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let current = null;
  try {
    current = readFileSync(`${root}${SNAPSHOT}`, "utf8");
  } catch {
    console.error(`${SNAPSHOT} is missing. Run \`pnpm gen:compose-api\` and commit the result.`);
    process.exit(1);
  }
  if (current !== serialised) {
    console.error(
      `Compose's KinetixColors constructor has changed and ${SNAPSHOT} is stale.\n` +
        "Run `pnpm gen:compose-api` and review the diff: a reordered or inserted parameter is a source-breaking\n" +
        "change for positional callers and for destructuring, and any added parameter is a JVM binary break that\n" +
        "the changeset has to state.",
    );
    process.exit(1);
  }
  console.log(`compose colours api ok — ${params.length} parameters, ${params.filter((p) => p.defaulted).length} defaulted.`);
} else {
  writeFileSync(`${root}${SNAPSHOT}`, serialised);
  console.log(`wrote ${SNAPSHOT} — ${params.length} parameters, ${params.filter((p) => p.defaulted).length} defaulted.`);
}
