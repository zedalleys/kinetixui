/**
 * build.mjs — compile the browser harness (main.ts + every fixture) into a static page.
 *
 *   node packages/ui-angular/browser/build.mjs [outDir]      default: packages/ui-angular/browser/dist
 *
 * The Angular compiler runs through the same Vite plugin the unit suites use (@analogjs/vite-plugin-angular),
 * in full AOT mode with strict templates, so the fixtures are type-checked exactly as the package is. Vite is
 * resolved through vitest, the package's declared test runner, rather than added as a second copy: the
 * harness then compiles with the Vite the jsdom suites already compile with.
 *
 * CSS is deliberately NOT put through Vite. Its CSS pipeline lowers modern selectors for older targets (it
 * rewrote `:dir()` into a `:lang()` guess in Storybook — see TOKENS.md, "Switch direction"), and a measurement
 * of rewritten CSS would be evidence about a stylesheet no consumer loads. The token CSS and styles.css are
 * copied byte for byte and linked into the built page afterwards.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import angular from '@analogjs/vite-plugin-angular';

const here = fileURLToPath(new URL('.', import.meta.url));
const pkg = resolve(here, '..');
const repo = resolve(pkg, '../..');
const outDir = resolve(process.argv[2] ?? join(here, 'dist'));

export const STYLES = {
  'globals.css': 'packages/tokens/dist/web/globals.css',
  'globals.dark.css': 'packages/tokens/dist/web/globals.dark.css',
  'extras.css': 'packages/tokens/dist/web/extras.css',
  'extras.dark.css': 'packages/tokens/dist/web/extras.dark.css',
  'styles.css': 'packages/ui-angular/src/styles.css',
  'harness.css': 'packages/ui-angular/browser/harness.css',
};
for (const from of Object.values(STYLES)) {
  if (!existsSync(join(repo, from))) {
    console.error(`angular harness: ${from} is missing — run \`pnpm build:tokens\` first`);
    process.exit(2);
  }
}

const require = createRequire(import.meta.url);
const vite = await import(pathToFileURL(createRequire(require.resolve('vitest/package.json')).resolve('vite')).href);
await vite.build({
  configFile: false,
  root: here,
  base: './',
  logLevel: 'error',
  plugins: [angular({ tsconfig: join(here, 'tsconfig.json'), workspaceRoot: pkg })],
  build: { outDir, emptyOutDir: true, minify: false, target: 'es2022', reportCompressedSize: false },
});

for (const [file, from] of Object.entries(STYLES)) copyFileSync(join(repo, from), join(outDir, file));
const links = Object.keys(STYLES).map((f) => `<link rel="stylesheet" href="./${f}" />`).join('\n    ');
const index = join(outDir, 'index.html');
writeFileSync(index, readFileSync(index, 'utf8').replace('<!-- kx:styles -->', links));
console.log(`angular harness built — ${outDir}`);
