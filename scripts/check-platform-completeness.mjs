/**
 * check-platform-completeness.mjs — every catalogue/platform pair has a truthful, verified resolution.
 *
 *   node scripts/check-platform-completeness.mjs
 *
 * 98 entries x 5 platforms is 490 cells, and each one must be exactly one of four things: an implementation,
 * a native equivalent, a deliberate composition, or planned work. The existing checks each prove one edge of
 * that — `check:platform-source` that a declared implementation has source, `check:platform-code` that it has
 * a usable snippet, `check:manifest` that the file is well-formed. None of them prints the matrix, and none
 * of them catches the two failures that matter most to a reader deciding whether to adopt a platform:
 *
 *   A cell with no resolution at all. Not implemented and not classified reads on the website as a blank,
 *   which a developer interprets as "no" when it may mean "nobody has decided".
 *
 *   A planned entry that already has an implementation. The work landed and the manifest was not updated, so
 *   the catalogue under-reports a platform and the component page tells people to come back later for
 *   something that shipped. This is the inverse of the over-claim the rest of the system guards against, and
 *   it had no check at all.
 *
 * It also closes a gap in how Angular presence is proved. `check:platform-source` resolves an Angular
 * component by looking for its symbol in `public-api.ts`, which is a regex over an export list: a name
 * exported from a file that defines nothing would satisfy it. Here the symbol must be DEFINED with an
 * `@Component` or `@Directive` decorator in a lib file, which is the smallest thing that cannot be faked by
 * an empty wrapper or a documentation stub.
 *
 * What it deliberately does not do is fail because legitimate planned work remains. Angular is Preview at 43
 * of 98 and that is a true statement about a roadmap, not a defect. This fails on untruths, not on progress.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(`${root}/${p}`, "utf8");

const manifest = JSON.parse(read("components.manifest.json"));
const components = manifest.components;
const PLATFORMS = Object.keys(manifest.platformDefinitions);
const GUIDANCE_TYPES = new Set(["native-equivalent", "composition", "planned"]);

const pascal = (slug) => slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");
/**
 * The symbol a platform actually spells this component with. `sourceNames` is the manifest's own escape
 * hatch for the cases where the file is not named after the slug — Sonner ships as `Toaster` on SwiftUI and
 * Flutter — and honouring it here is what stops this check inventing gaps that do not exist.
 */
const sourceName = (slug, platform) => components[slug]?.sourceNames?.[platform] ?? slug;

/* ── what each platform's source actually looks like ──────────────────────────────────────────────── */

/** The one documented recipe. It is deliberately not a component on any platform — see RULE below. */
const RECIPE = Object.entries(components).filter(([, e]) => e.composition).map(([s]) => s);

/** Angular: `Kx<Pascal>` must be DECORATED in a lib file, not merely named in the export list. */
const angularDefined = (() => {
  const dir = `${root}/packages/ui-angular/src/lib`;
  if (!existsSync(dir)) return () => false;
  const src = readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".spec.ts"))
    .map((f) => readFileSync(`${dir}/${f}`, "utf8"))
    .join("\n");
  // `@Component({...}) export class KxBanner` / `@Directive({...}) export class KxList`
  const decorated = new Set([...src.matchAll(/@(?:Component|Directive)\s*\(\{[\s\S]*?\}\)\s*export\s+class\s+(Kx[A-Za-z0-9]+)/g)].map((m) => m[1]));
  return (slug) => decorated.has(`Kx${pascal(sourceName(slug, "Angular"))}`);
})();

/** The native platforms are file-per-component, which is what check:platform-source already resolves. */
const nativeFile = (dir, ext) => {
  if (!existsSync(`${root}/${dir}`)) return () => false;
  const names = [];
  const walk = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      if (f.isDirectory()) walk(`${d}/${f.name}`);
      else if (f.name.endsWith(ext)) names.push(f.name.toLowerCase());
    }
  };
  walk(`${root}/${dir}`);
  return (slug, platform) => {
    const name = sourceName(slug, platform);
    const p = pascal(name).toLowerCase();
    const snake = name.replace(/-/g, "_").toLowerCase();
    return names.some((n) => n === `${p}${ext}` || n === `kinetix${p}${ext}` || n === `${snake}${ext}` || n === `kinetix_${snake}${ext}`);
  };
};

const reactIndex = read("packages/ui/src/index.ts");
const DEFINED = {
  // React re-exports several components from one file (AvatarGroup lives in avatar.tsx) and several under a
  // different symbol (Sonner ships as Toaster, Resizable as ResizablePanelGroup), so the test is the same
  // symbol-or-path one `check:platform-source` uses rather than a stricter spelling this file invents.
  React: (slug) => {
    const name = pascal(sourceName(slug, "React"));
    return new RegExp(`\\b(Kx|Kinetix)?${name}`).test(reactIndex) || new RegExp(`["'./]${slug}["'/]`).test(reactIndex);
  },
  Angular: angularDefined,
  SwiftUI: nativeFile("packages/ui-swiftui/Sources/KinetixUI", ".swift"),
  Compose: nativeFile("packages/ui-compose/ui/src/main/kotlin/com/kinetixui/ui", ".kt"),
  Flutter: nativeFile("packages/ui-flutter/lib/src", ".dart"),
};

/* ── the matrix ───────────────────────────────────────────────────────────────────────────────────── */

const errors = [];
const tally = Object.fromEntries(PLATFORMS.map((p) => [p, { implementation: 0, recipe: 0, "native-equivalent": 0, composition: 0, planned: 0 }]));
const promotable = [];

for (const [slug, entry] of Object.entries(components)) {
  const declared = new Set(entry.platforms ?? []);

  for (const p of declared) {
    if (!PLATFORMS.includes(p)) {
      errors.push(`${slug}: declares the platform "${p}", which is not in platformDefinitions.`);
      continue;
    }
    if (RECIPE.includes(slug)) {
      // RULE (§ combobox): a recipe is documentation, not an export. Counting it as an implementation
      // would make the catalogue read 98 components when it is 97 components and one recipe.
      tally[p].recipe++;
      if (DEFINED[p]?.(slug, p)) {
        errors.push(
          `${slug}: is a documented recipe (composition: "${components[slug].composition}") but ${p} exports a component named after it.\n` +
            `      A recipe must stay a recipe on every platform — an export here makes the matrix symmetrical by inventing a component.`,
        );
      }
      continue;
    }
    tally[p].implementation++;
    if (!DEFINED[p]?.(slug, p)) {
      errors.push(
        `${slug}: declared as a ${p} implementation, but no source defines it.\n` +
          `      Angular needs an @Component/@Directive-decorated Kx${pascal(slug)} in packages/ui-angular/src/lib;\n` +
          `      the native platforms need a file named after the component. An export with nothing behind it is not an implementation.`,
      );
    }
    if (entry.platformGuidance?.[p]) {
      errors.push(`${slug}: is declared as a ${p} implementation AND carries ${p} guidance. It cannot be both — delete the guidance.`);
    }
  }

  for (const p of PLATFORMS) {
    if (declared.has(p)) continue;
    const g = entry.platformGuidance?.[p];
    if (!g) {
      errors.push(
        `${slug}: has no ${p} implementation and no ${p} guidance, so the cell has no resolution.\n` +
          `      Add platformGuidance.${p} with a type of native-equivalent, composition or planned — a blank cell reads as "no" to a developer when it may only mean "undecided".`,
      );
      continue;
    }
    if (!GUIDANCE_TYPES.has(g.type)) {
      errors.push(`${slug}: ${p} guidance type "${g.type}" is not one of ${[...GUIDANCE_TYPES].join(", ")}.`);
      continue;
    }
    tally[p][g.type]++;
    if (g.type === "planned" && !g.wave) {
      errors.push(`${slug}: ${p} is planned with no wave. Planned work that is not in a wave is not a roadmap, it is a gap.`);
    }
    if (g.type !== "planned" && !g.reason) {
      errors.push(`${slug}: ${p} is "${g.type}" with no reason. A non-port has to say why, or it is indistinguishable from an omission.`);
    }
    // The inverse of over-claiming: the work shipped and nobody updated the manifest.
    if (DEFINED[p]?.(slug, p) && !RECIPE.includes(slug)) {
      promotable.push(`${slug}: ${p} is marked "${g.type}", but source for it exists. Promote it to an implementation, or say in the reason why that source is not the component.`);
    }
  }
}

errors.push(...promotable);

/* ── generated parity must not be stale ───────────────────────────────────────────────────────────── */

if (existsSync(`${root}/platform-parity.json`)) {
  const parity = JSON.parse(read("platform-parity.json"));
  for (const p of PLATFORMS) {
    const got = parity.coverage?.[p]?.implemented ?? parity.coverage?.[p]?.count ?? parity.coverage?.[p];
    // The generated file counts DECLARED platforms, which includes the recipe's React entry. Comparing
    // against implementations alone would report drift that is only this file's finer-grained accounting.
    const want = tally[p].implementation + tally[p].recipe;
    if (typeof got === "number" && got !== want) {
      errors.push(`platform-parity.json reports ${got} ${p} implementations, the manifest declares ${want}. Run \`pnpm gen:manifest\` — do not edit the generated file.`);
    }
  }
}

/* ── report ───────────────────────────────────────────────────────────────────────────────────────── */

const total = Object.keys(components).length;
const pad = (n) => String(n).padStart(3);
console.log(`platform completeness — ${total} catalogue entries x ${PLATFORMS.length} platforms\n`);
console.log(`  ${"platform".padEnd(9)} ${"impl".padStart(4)} ${"recipe".padStart(6)} ${"native-eq".padStart(9)} ${"composition".padStart(11)} ${"planned".padStart(7)}   maturity`);
for (const p of PLATFORMS) {
  const t = tally[p];
  const def = manifest.platformDefinitions[p];
  const sum = t.implementation + t.recipe + t["native-equivalent"] + t.composition + t.planned;
  const complete = sum === total ? "" : `  ← ${sum} of ${total} resolved`;
  console.log(
    `  ${p.padEnd(9)} ${pad(t.implementation)} ${pad(t.recipe).padStart(6)} ${pad(t["native-equivalent"]).padStart(9)} ${pad(t.composition).padStart(11)} ${pad(t.planned).padStart(7)}   ${def.maturity}${def.catalogComplete ? "" : " · catalogue incomplete"}${complete}`,
  );
}

if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
const planned = PLATFORMS.reduce((n, p) => n + tally[p].planned, 0);
console.log(
  `\ncheck:platform-completeness ok — every cell resolved; ${planned} planned entr${planned === 1 ? "y" : "ies"} remain, which is a roadmap and not a failure.`,
);
