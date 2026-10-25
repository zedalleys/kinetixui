/**
 * check-variant-parity.mjs — a spec that claims five platforms must mean it.
 *
 *   node scripts/check-variant-parity.mjs
 *
 * The defect this exists for. `specs/components/<name>.json` carries a `variants` block and a
 * `platforms` list, and the two have nothing to do with each other. `platforms` comes from
 * `components.manifest.json`; `variants` comes from `extractVariants()` in
 * `gen-component-specs.mjs`, which reads the **React** file's `cva()` calls and nothing else. So
 * `badge.json` states five platforms and one variant set, and that set is React's — never checked
 * against Angular, SwiftUI, Compose or Flutter, three of which the generator cannot even read.
 *
 * Worse than "React-derived": `extractVariants` merges **every** `cva()` in the file, so a
 * sub-part's axes are attributed to the component. `sidebar.json` claims
 * `variant: [default, outline]` on all five platforms; that axis belongs to
 * `sidebarMenuButtonVariants`, the menu-button sub-part, and no platform declares anything like it.
 *
 * This gate is a proof of concept, deliberately scoped: it reads each platform's own variant
 * declaration out of its own source and compares the option set with the React claim the spec
 * already publishes. It changes no generator. Where the sets genuinely differ, the pair must be
 * listed in KNOWN with the reason — reported on every run, so the list reads as the debt it is
 * rather than as a pass.
 *
 * Extraction, one shape per platform, all four verified against Badge by hand before this was
 * written:
 *
 *   Angular   `export type Kx<Name>Variant = 'a' | 'b';`
 *   SwiftUI   `public enum Kinetix<Name>Variant { case a, b }`   (multi-line, backticked `default`)
 *   Compose   `enum class Kinetix<Name>Variant { A, B }`
 *   Flutter   `enum Kinetix<Name>Variant { a, b }`
 *
 * Two things are declared rather than inferred:
 *
 *   ENUM_NAMES   a component whose platforms name the enum after a sub-part or share another
 *                component's alias. `empty` declares `EmptyMediaVariant`; Angular's Banner reuses
 *                `KxInformVariant`. Content agrees in both cases; only the name differs.
 *   FLUTTER_DEFAULT_ALIASES
 *                Flutter spells the first option `primary`, `normal` or `standard` rather than
 *                `default`. That is this repository's established Flutter naming strategy, so it is
 *                a rule here and not five separate exceptions.
 *
 * A KNOWN entry is pinned to the exact delta measured when it was recorded, so it excuses that
 * divergence and no other. A pair that drifts further fails and names both shapes; negative
 * control NC-6 proves it.
 *
 * What this cannot tell, stated rather than discovered later. The pin cannot distinguish a
 * divergence that happens to produce the identical delta string for a different underlying
 * reason. It compares option NAMES, not rendering. Two platforms can agree on `warning` and draw different colours, and nothing here
 * would notice. It also only reads a declared enum or union — a platform that takes its variant as
 * a free string is invisible to it.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const SPECS = join(root, "specs/components");

const SOURCES = {
  Angular: { dir: "packages/ui-angular/src/lib", ext: ".ts", prefix: "Kx" },
  SwiftUI: {
    dir: "packages/ui-swiftui/Sources/KinetixUI",
    ext: ".swift",
    prefix: "Kinetix",
  },
  Compose: {
    dir: "packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui",
    ext: ".kt",
    prefix: "Kinetix",
  },
  Flutter: {
    dir: "packages/ui-flutter/lib/src",
    ext: ".dart",
    prefix: "Kinetix",
  },
};

/** Flutter's first option, by this repository's established naming strategy. */
const FLUTTER_DEFAULT_ALIASES = new Set(["primary", "normal", "standard"]);

/** component → the enum base name its platforms actually use, where it is not the component's. */
const ENUM_NAMES = {
  empty: "EmptyMedia",
  banner: { Angular: "Inform" },
};

/** `component/platform` → why the option sets differ. Every entry is a measured gap, not a waiver. */
const NO_ENUM = "declares no variant enum";

const KNOWN = {
  "badge/Angular": {
    delta: "missing subtle; extra success, warning",
    why: "Angular Badge carries success and warning and has no subtle; React, SwiftUI and Compose have subtle and neither status colour. WP-3 records Angular's set as the reference the others should move to.",
  },
  "toggle/Angular": {
    delta: "missing pill",
    why: "No pill option. WP-3 gap, not yet reconciled.",
  },
  "toggle/SwiftUI": {
    delta: "missing pill",
    why: "No pill option. WP-3 gap, not yet reconciled.",
  },
  "toggle/Compose": {
    delta: "missing pill",
    why: "No pill option. WP-3 gap, not yet reconciled.",
  },
  "toggle/Flutter": {
    delta: "missing pill",
    why: "No pill option. Flutter spells the first option standard, which the alias rule normalises to default, so that is not part of the delta. WP-3 gap, not yet reconciled.",
  },
  "sidebar/Angular": {
    delta: NO_ENUM,
    why: "The React axis belongs to sidebarMenuButtonVariants, a sub-part, and is attributed to the component by extractVariants. No platform declares it. Generator defect, recorded.",
  },
  "sidebar/SwiftUI": { delta: NO_ENUM, why: "As sidebar/Angular." },
  "sidebar/Compose": { delta: NO_ENUM, why: "As sidebar/Angular." },
  "sidebar/Flutter": { delta: NO_ENUM, why: "As sidebar/Angular." },
};

/**
 * A recorded divergence is pinned to the exact delta that was measured when it was
 * recorded, so the entry excuses that divergence and nothing else. If the same pair
 * drifts further — Angular's Badge also losing outline, say — the delta no longer
 * matches and the pair fails, naming both the recorded and the current shape.
 */
/**
 * One of three outcomes, kept in one place so the two call sites cannot drift: the delta is
 * exactly what KNOWN records (report it as debt), the pair is known but has drifted past that
 * record (fail with both shapes), or it was never recorded at all (fail with the unrecorded
 * message the call site supplies).
 */
function pushResult(known, failures, verdict, unrecorded) {
  if (verdict.ok) known.push(verdict.line);
  else failures.push(verdict.line ?? unrecorded);
}

function classify(key, delta) {
  const entry = KNOWN[key];
  if (!entry) return { ok: false, line: null };
  if (entry.delta === delta)
    return { ok: true, line: `${key} — ${delta}. ${entry.why}` };
  return {
    ok: false,
    line: `${key}: recorded divergence was "${entry.delta}", but it is now "${delta}". The pair drifted past what KNOWN excuses. Reconcile the platform, or update the entry to the new delta with the reason.`,
  };
}

function readAll({ dir, ext }) {
  const base = join(root, dir);
  if (!existsSync(base)) return "";
  return readdirSync(base)
    .filter((f) => f.endsWith(ext))
    .map((f) => readFileSync(join(base, f), "utf8"))
    .join("\n");
}

const CORPUS = Object.fromEntries(
  Object.entries(SOURCES).map(([p, s]) => [p, readAll(s)]),
);

function enumBase(component, platform) {
  const entry = ENUM_NAMES[component];
  const name = typeof entry === "string" ? entry : entry?.[platform];
  const base = name ?? component;
  return base.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

/** The option set a platform declares for a component, or null when it declares none. */
function optionsFor(component, platform) {
  const code = CORPUS[platform];
  if (!code) return null;
  const name = `${SOURCES[platform].prefix}${enumBase(component, platform)}Variant`;
  if (platform === "Angular") {
    const m = new RegExp(`type\\s+${name}\\s*=\\s*([^;]+);`).exec(code);
    return m
      ? m[1].split("|").map((o) =>
          o
            .trim()
            .replace(/^['"]|['"]$/g, "")
            .toLowerCase(),
        )
      : null;
  }
  const m = new RegExp(`enum(?:\\s+class)?\\s+${name}\\s*\\{([^}]*)\\}`).exec(
    code,
  );
  if (!m) return null;
  return m[1]
    .replace(/\bcase\b/g, " ")
    .split(/[,\n]/)
    .map((o) => o.trim().replace(/`/g, "").toLowerCase())
    .filter(Boolean);
}

const failures = [];
const known = [];
let compared = 0;

for (const file of readdirSync(SPECS)
  .filter((f) => f.endsWith(".json"))
  .sort()) {
  const spec = JSON.parse(readFileSync(join(SPECS, file), "utf8"));
  const react = spec.variants?.variant;
  if (!react) continue;
  const wanted = new Set(react.map((o) => String(o).toLowerCase()));
  for (const platform of Object.keys(SOURCES)) {
    if (!spec.platforms?.includes(platform)) continue;
    const key = `${spec.name}/${platform}`;
    const got = optionsFor(spec.name, platform);
    if (got === null) {
      pushResult(
        known,
        failures,
        classify(key, NO_ENUM),
        `${key}: the spec claims this platform, and no ${SOURCES[platform].prefix}…Variant declaration for it exists. Either the platform does not have the axis the spec publishes, or it names the enum differently — declare the name in ENUM_NAMES.`,
      );
      continue;
    }
    compared += 1;
    // Flutter's alias stands in for `default` only where React HAS a `default` and Flutter has
    // not: Button and Fab spell the first option `primary` on both sides, and rewriting Flutter's
    // would invent a divergence rather than find one.
    const aliasable =
      platform === "Flutter" &&
      wanted.has("default") &&
      !got.includes("default");
    const normalised = new Set(
      got.map((o) =>
        aliasable && FLUTTER_DEFAULT_ALIASES.has(o) ? "default" : o,
      ),
    );
    // Sorted, because the delta string is what the pin compares: without this, reordering a
    // union without changing its options would produce a different string and fail a pair whose
    // option set has not moved. The delta is a set difference, not a transcript of declaration
    // order.
    const missing = [...wanted].filter((o) => !normalised.has(o)).sort();
    const extra = [...normalised].filter((o) => !wanted.has(o)).sort();
    if (!missing.length && !extra.length) continue;
    const delta = [
      missing.length ? `missing ${missing.join(", ")}` : "",
      extra.length ? `extra ${extra.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("; ");
    pushResult(
      known,
      failures,
      classify(key, delta),
      `${key}: ${delta}. The spec publishes React's set for this platform without ever reading it. Reconcile the platform, or record the divergence in KNOWN with the reason.`,
    );
  }
}

for (const line of known) console.log(`  · ${line}`);
if (failures.length) {
  console.error(`\ncheck:variant-parity failed\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  `variant parity ok — ${compared} component/platform pair(s) compared against their own source, ${known.length} recorded divergence(s).`,
);
