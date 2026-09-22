/**
 * check-dist.mjs — runs after `ng-packagr`, so a packaging mistake fails the build instead of a consumer.
 *
 * The component classes are only half the package. The other half is `styles.css`, the stylesheet that spends
 * the generated token custom properties — without it every component renders unstyled. This asserts it is
 * actually in `dist`, reachable through the `exports` map (Node refuses any subpath the map does not list), and
 * not declared side-effect-free (a bundler may drop a CSS import from a package that claims it has none).
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const pkg = JSON.parse(readFileSync(`${dist}package.json`, "utf8"));
const errors = [];

if (!existsSync(`${dist}styles.css`)) errors.push("dist/styles.css is missing — check the `assets` entry in ng-package.json");
if (!pkg.exports?.["./styles.css"]) errors.push('package.json `exports` has no "./styles.css" — `import "@kinetixui/angular/styles.css"` would be refused');
if (pkg.sideEffects === false) errors.push("`sideEffects: false` lets a bundler drop the stylesheet import — list the CSS as a side effect");
if (!pkg.exports?.["."]) errors.push('package.json `exports` has no "." entry');

if (errors.length) {
  console.error(errors.map((e) => `  ✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log("check-dist ok — entry point, styles.css export and side-effect declaration are all present.");
