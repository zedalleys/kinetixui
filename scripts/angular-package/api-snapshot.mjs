/**
 * api-snapshot.mjs — the Angular package's public surface, as a reviewable file.
 *
 *   node scripts/angular-package/api-snapshot.mjs            write packages/ui-angular/public-api.json
 *   node scripts/angular-package/api-snapshot.mjs --check    fail if it has drifted
 *
 * `@kinetixui/angular` is Preview, so its API may still change. The risk this guards is different:
 * once a symbol is on npm, removing it is a breaking change whether or not anyone meant to export
 * it. A diffable snapshot makes every addition, removal and rename to the public surface show up in
 * review rather than in a consumer's build.
 *
 * It is generated from the built `.d.ts`, not from the source, so it records what the package
 * actually ships. For directives and components it captures the template contract Angular itself
 * encodes — selector, inputs, outputs, whether content is projected, standalone-ness — because that
 * is the part a consumer's templates bind to. Implementation details are deliberately absent: method
 * bodies, private members and internal types are not in here and are free to change.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dtsPath = `${root}packages/ui-angular/dist/types/kinetixui-angular.d.ts`;
const snapshotPath = `${root}packages/ui-angular/public-api.json`;

/**
 * Binding names out of a declaration's input or output map. The two are written differently:
 * inputs are `"variant": { "alias": "variant"; … }` and outputs are `"removed": "removed"`, so
 * matching only the object form silently reports every component as having no outputs.
 */
function bindingNames(block) {
  if (!block || block === "{}") return [];
  // Inputs:  { "ariaLabel": { "alias": "aria-label"; "required": false; … }; … }
  // Outputs: { "pressed": "pressedChange"; "toggled": "toggled"; }
  //
  // In both cases the recorded name is the ALIAS, because that is what a template binds —
  // `[aria-label]` and `(pressedChange)`, not the property names behind them. The property name is
  // implementation and is free to change; the alias is the contract.
  const aliased = [...block.matchAll(/"[^"]+"\s*:\s*\{\s*"alias"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
  if (aliased.length > 0) return [...new Set(aliased)].sort();
  return [...new Set([...block.matchAll(/"[^"]+"\s*:\s*"([^"]+)"/g)].map((m) => m[1]))].sort();
}

/**
 * Split a generic argument list at top level, so nested `{ … }` and `[ … ]` stay intact.
 * `ɵɵDirectiveDeclaration<A, "sel", never, {…}, {…}, never, never, true, never>`
 */
function splitGenerics(text) {
  const parts = [];
  let depth = 0;
  let quoted = false;
  let current = "";
  for (const char of text) {
    // A selector is a quoted string that can itself contain commas and brackets —
    // "button[kxButton], a[kxButton]" — so quotes have to suppress both.
    if (char === '"') quoted = !quoted;
    if (!quoted) {
      if ("<{[(".includes(char)) depth += 1;
      else if (">}])".includes(char)) depth -= 1;
      if (char === "," && depth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function buildSnapshot(dts) {
  // Angular records a binding on the class that declares it, so a subclass's own declaration does
  // not repeat what it inherits — `KxSwitch` carries `aria-label` and gets `checked` from
  // `KxToggleBase`. Following `extends` is what makes the recorded contract the one a template
  // actually sees.
  const inheritance = new Map(
    [...dts.matchAll(/^declare class (Kx[A-Za-z0-9]+) extends (Kx[A-Za-z0-9]+)/gm)].map(([, child, parent]) => [child, parent]),
  );

  const own = new Map();
  const pattern = /static ɵ(dir|cmp): i0\.ɵɵ(?:Directive|Component)Declaration<([\s\S]*?)>;/g;
  for (const match of dts.matchAll(pattern)) {
    const args = splitGenerics(match[2]);
    const [cls, selector, , inputs, outputs, , projection, standalone] = args;
    const name = cls.replace(/<.*$/, "");
    own.set(name, {
      name,
      kind: match[1] === "cmp" ? "component" : "directive",
      selector: selector === "never" ? null : (selector?.replace(/^"|"$/g, "") ?? null),
      inputs: bindingNames(inputs),
      outputs: bindingNames(outputs),
      projectsContent: Boolean(projection && projection !== "never"),
      standalone: standalone === "true",
    });
  }

  const inherited = (name, key, seen = new Set()) => {
    const parent = inheritance.get(name);
    if (!parent || seen.has(parent)) return [];
    seen.add(parent);
    const entry = own.get(parent);
    return [...(entry?.[key] ?? []), ...inherited(parent, key, seen)];
  };

  const declarations = [...own.values()]
    .map((entry) => ({
      ...entry,
      inputs: [...new Set([...entry.inputs, ...inherited(entry.name, "inputs")])].sort(),
      outputs: [...new Set([...entry.outputs, ...inherited(entry.name, "outputs")])].sort(),
      ...(inheritance.has(entry.name) ? { extends: inheritance.get(entry.name) } : {}),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Exported type aliases — the unions a consumer writes in their own code.
  const types = [...dts.matchAll(/^type (Kx[A-Za-z0-9]+) = ([^\n;]+);/gm)]
    .map(([, name, definition]) => ({ name, definition: definition.trim() }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // What the package actually re-exports at the end of the bundle.
  const tail = dts.slice(dts.lastIndexOf("export {"));
  const exported = [...new Set((tail.match(/\bKx[A-Za-z0-9]+\b/g) ?? []))].sort();

  // A base class is declared so TypeScript can resolve a subclass, but it is not importable. Saying
  // so keeps the file honest about what is actually public.
  const annotated = declarations.map((entry) => ({ ...entry, exported: exported.includes(entry.name) }));

  return {
    $description:
      "Generated by `pnpm gen:angular-api` from the built .d.ts. The public surface of " +
      "@kinetixui/angular: what a consumer can import and bind to. Inherited bindings are resolved " +
      "through `extends`, so each entry is the whole template contract. Do not edit by hand.",
    package: "@kinetixui/angular",
    exportedSymbols: exported,
    declarations: annotated,
    types,
  };
}

const dts = readFileSync(dtsPath, "utf8");
const snapshot = buildSnapshot(dts);
const serialised = `${JSON.stringify(snapshot, null, 2)}\n`;

if (process.argv.includes("--check")) {
  let current = null;
  try {
    current = readFileSync(snapshotPath, "utf8");
  } catch {
    console.error(
      "packages/ui-angular/public-api.json is missing. Run `pnpm gen:angular-api` and commit the result.",
    );
    process.exit(1);
  }
  if (current !== serialised) {
    console.error(
      "The Angular public API has changed and packages/ui-angular/public-api.json is stale.\n" +
        "Run `pnpm gen:angular-api` and review the diff: every line of it is a change a consumer can see.",
    );
    process.exit(1);
  }
  console.log(
    `angular public API ok — ${snapshot.exportedSymbols.length} exported symbols, ` +
      `${snapshot.declarations.length} directives/components, ${snapshot.types.length} types.`,
  );
} else {
  writeFileSync(snapshotPath, serialised);
  console.log(
    `wrote packages/ui-angular/public-api.json — ${snapshot.exportedSymbols.length} exported symbols, ` +
      `${snapshot.declarations.length} directives/components, ${snapshot.types.length} types.`,
  );
}
