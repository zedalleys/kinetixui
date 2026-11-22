/**
 * build.mjs — compile the React browser harness into a static page.
 *
 *   node packages/ui/browser/build.mjs [outDir]      default: packages/ui/browser/dist
 *
 * React's gates have ridden Storybook until now, and Storybook renders exactly the stories the generator
 * writes: one `Default` per demo. That is why the vertical carousel had no browser coverage on any branch —
 * there is no vertical demo, so there was no story, so no gate could mount one. This harness mounts a
 * fixture from the package's own source with the props a gate needs, which is what `@kinetixui/angular`
 * has had since it was written (`packages/ui-angular/browser/build.mjs`).
 *
 * Vite is resolved through vitest — the package's declared test runner — rather than added as a second
 * copy, exactly as the Angular harness does it. No new dependency.
 *
 * The TOKEN CSS is not put through Vite, for the reason the Angular harness gives: its CSS pipeline lowers
 * modern selectors, and a measurement of rewritten CSS is evidence about a stylesheet no consumer loads. It
 * is copied byte for byte. The Tailwind layer, by contrast, HAS to be compiled — the component's layout is
 * `flex`, `basis-full`, `shrink-0` and `overflow-hidden`, and a carousel whose utilities never resolved
 * lays every slide in the view, which would make `slidesInView` report everything and every off-screen
 * assertion pass over nothing. It is compiled with the package's own preset, the same one
 * `apps/docs/tailwind.config.ts` feeds Storybook.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const repo = resolve(here, "../../..");
const outDir = resolve(process.argv[2] ?? join(here, "dist"));

export const STYLES = {
  "globals.css": "packages/tokens/dist/web/globals.css",
  "extras.css": "packages/tokens/dist/web/extras.css",
};
for (const from of Object.values(STYLES)) {
  if (!existsSync(join(repo, from))) {
    console.error(`react harness: ${from} is missing — run \`pnpm build:tokens\` first`);
    process.exit(2);
  }
}

/**
 * Vite comes with vitest, so it is resolved THROUGH vitest's own entry rather than named as a dependency
 * of this package: `vitest/package.json` is not an exported path, so the require has to start from a file
 * inside vitest that is. The harness then compiles with the same Vite the jsdom suites compile with, and
 * a version skew between the two is impossible by construction.
 */
const require = createRequire(join(repo, "packages/ui/package.json"));
const vite = await import(pathToFileURL(createRequire(require.resolve("vitest/node")).resolve("vite")).href);
const react = (await import(pathToFileURL(require.resolve("@vitejs/plugin-react")).href)).default;

// Tailwind is handed the config's PATH, not an imported object: its own loader reads a TypeScript config,
// and the preset this one extends imports `tailwindcss/plugin`, which node cannot resolve from here.
const tailwind = (await import(pathToFileURL(require.resolve("tailwindcss")).href)).default;

// Tailwind v3 resolves its `content` globs against the PROCESS's working directory, not against the
// directory its config sits in. Run from the repo root, `./*.html` matched nothing and `../src/**` pointed
// outside the repo, so the build emitted preflight and no utilities — and a carousel with no `flex`,
// `basis-full` or `overflow-hidden` lays every slide in the view, which is the one state in which every
// off-screen assertion passes over nothing. Entering the harness directory is what makes those globs mean
// what they read as.
process.chdir(here);

await vite.build({
  configFile: false,
  root: here,
  plugins: [react()],
  logLevel: "warn",
  css: {
    postcss: {
      plugins: [
        tailwind(join(here, "tailwind.config.ts")),
      ],
    },
  },
  // Relative asset URLs: the fixture pages are served from a directory, not from a domain root.
  base: "./",
  build: { outDir, emptyOutDir: true, rollupOptions: { input: join(here, "index.html") } },
});

for (const [to, from] of Object.entries(STYLES)) copyFileSync(join(repo, from), join(outDir, to));
copyFileSync(join(here, "harness.css"), join(outDir, "harness.css"));

/**
 * One page per fixture, each a copy of the built index with the fixture named on <html>. Written here
 * rather than chosen by a query string so a gate's URL names the subject it measures.
 */
const index = readFileSync(join(outDir, "index.html"), "utf8");
const PAGES = {
  "horizontal.html": { axis: "horizontal", slides: 5 },
  "vertical.html": { axis: "vertical", slides: 5 },
  "horizontal-rtl.html": { axis: "horizontal", slides: 5, dir: "rtl" },
  "vertical-rtl.html": { axis: "vertical", slides: 5, dir: "rtl" },
  "named.html": { axis: "horizontal", slides: 5, label: "Featured work" },
  // The engine's OWN `inViewThreshold`, not the pinned 0.5 the other pages use. An animated move changes
  // the in-view set more than once here, which is the condition a single-notification fixture hides.
  "horizontal-engine-threshold.html": { axis: "horizontal", slides: 5, threshold: "engine" },
  // `slidesToScroll: 2`, under which a scroll SNAP index is not a slide index.
  "horizontal-grouped.html": { axis: "horizontal", slides: 5, group: 2 },
};
for (const [file, { axis, slides, dir, label, threshold, group }] of Object.entries(PAGES)) {
  writeFileSync(
    join(outDir, file),
    index.replace(
      '<html lang="en">',
      `<html lang="en" data-kx-axis="${axis}" data-kx-slides="${slides}"${dir ? ` dir="${dir}"` : ""}${label ? ` data-kx-label="${label}"` : ""}${threshold ? ` data-kx-threshold="${threshold}"` : ""}${group ? ` data-kx-group="${group}"` : ""}>`,
    ),
  );
}
if (!existsSync(join(outDir, "vertical.html"))) {
  console.error("react harness: the fixture pages were not written");
  process.exit(2);
}
console.log(`react harness → ${outDir} (${Object.keys(PAGES).length} fixture pages)`);
