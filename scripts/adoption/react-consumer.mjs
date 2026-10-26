/** Compile the actual installation-page example outside the pnpm workspace.
 * Local mode installs freshly packed artifacts; --published checks registry releases.
 * Never publishes. The fixture is retained in /tmp on failure for diagnosis.
 *
 * --pm=<npm|pnpm|yarn|bun> installs with that package manager instead of npm, and --pm-bin=<path> runs a
 * specific binary for it — which is how Yarn's two product lines are both measured: Classic from PATH and
 * Berry from a @yarnpkg/cli-dist checkout, since `yarn` on PATH can only be one of them. The documentation offers all
 * four, and npm passing says nothing about the other three: they differ in how they resolve a `file:`
 * dependency, how they lay out node_modules, and whether they hoist a transitive dependency that
 * `@kinetixui/ui` needs at all. Everything after the install — the typecheck, the real Vite build and the
 * CSS assertions — is identical, so a failure under one manager is a failure of that manager's resolution
 * and not of a differently written test.
 */
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-react-consumer-'));
const published = process.argv.includes('--published');
const MANAGERS = {
  // `--no-audit --no-fund` is noise reduction only. The rest are each manager's own clean-install route.
  npm: ['install', '--no-audit', '--no-fund'],
  // the fixture is outside any workspace; --ignore-workspace stops pnpm walking up to find one
  pnpm: ['install', '--ignore-workspace'],
  // Yarn Classic writes a lockfile into the fixture either way; nothing here consumes it
  yarn: ['install'],
  bun: ['install'],
};
const pm = (process.argv.find(a => a.startsWith('--pm=')) ?? '--pm=npm').slice('--pm='.length);
assert.ok(MANAGERS[pm], `--pm must be one of ${Object.keys(MANAGERS).join(', ')}, got ${JSON.stringify(pm)}`);
const pmBin = process.argv.find(a => a.startsWith('--pm-bin='))?.slice('--pm-bin='.length) ?? pm;
const run = (cmd, args, cwd = fixture) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const web = json('apps/web/package.json');
const docs = readFileSync(join(root, 'apps/web/src/app/docs/installation/page.mdx'), 'utf8');
const fence = (text, language) => {
  const match = text.match(new RegExp('```' + language + '\\n([\\s\\S]*?)\\n```'));
  assert.ok(match, `Missing ${language} example`);
  return match[1];
};
const artifacts = join(fixture, 'artifacts');
mkdirSync(artifacts);
const packages = {};
for (const dir of ['tokens', 'ui']) {
  const pkg = json(`packages/${dir}/package.json`);
  if (published) packages[pkg.name] = pkg.version;
  else {
    run('pnpm', ['pack', '--pack-destination', artifacts], join(root, 'packages', dir));
    const tar = readdirSync(artifacts).find(name => name.startsWith(`kinetixui-${dir}-`));
    assert.ok(tar, `Missing ${dir} tarball`);
    packages[pkg.name] = `file:${join(artifacts, tar)}`;
  }
}
writeFileSync(join(fixture, 'package.json'), JSON.stringify({
  private: true, type: 'module', dependencies: {
    ...packages, react: web.dependencies.react, 'react-dom': web.dependencies['react-dom'],
  }, devDependencies: {
    vite: '8.0.3', typescript: web.devDependencies.typescript,
    '@types/react': web.devDependencies['@types/react'], '@types/react-dom': web.devDependencies['@types/react-dom'],
    tailwindcss: web.devDependencies.tailwindcss, postcss: web.devDependencies.postcss,
    autoprefixer: web.devDependencies.autoprefixer,
  },
}, null, 2));
mkdirSync(join(fixture, 'src'));
writeFileSync(join(fixture, 'src/App.tsx'), fence(docs.split('## First working React component')[1], 'tsx'));
writeFileSync(join(fixture, 'src/style.css'), fence(docs.split('## First working React component')[1], 'css'));
writeFileSync(join(fixture, 'tailwind.config.ts'), fence(docs.slice(docs.indexOf('```ts\n// tailwind.config.ts')), 'ts'));
writeFileSync(join(fixture, 'postcss.config.cjs'), fence(docs.split('## First working React component')[1], 'js'));
writeFileSync(join(fixture, 'src/main.tsx'), 'import { createRoot } from "react-dom/client";\nimport App from "./App";\nimport "./style.css";\ncreateRoot(document.getElementById("root")!).render(<App />);\n');
writeFileSync(join(fixture, 'index.html'), '<html lang="en"><head><title>Consumer fixture</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
writeFileSync(join(fixture, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
  target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', jsx: 'react-jsx', strict: true,
  skipLibCheck: true, noEmit: true, esModuleInterop: true, lib: ['DOM', 'ES2022'],
}, include: ['src'] }));
console.log(`Clean ${published ? 'published' : 'packed'} consumer (${pm}): ${fixture}`);
const pmVersion = execFileSync(pmBin, ['--version'], { cwd: fixture, encoding: 'utf8' }).trim();
console.log(`${pm} ${pmVersion}${pmBin === pm ? '' : ` (${pmBin})`}`);
// Yarn Berry defaults to Plug'n'Play, which has no node_modules/.bin for the typecheck and build steps
// below to call. node-modules is the linker this fixture compares like-for-like with the other three; PnP
// is a different question and is recorded as not measured rather than quietly treated as covered.
const berry = pm === 'yarn' && Number(pmVersion.split('.')[0]) >= 2;
if (berry) {
  // npmMinimalAgeGate is Yarn 4's supply-chain guard: by default it refuses a version published inside the
  // last week. KinetixUI publishes more often than that, so a Berry consumer really is blocked from a fresh
  // release for a few days (YN0016 "quarantined") — a measured fact, recorded in the matrix report rather
  // than hidden. It is disabled here because this fixture is testing KinetixUI's packaging, not Yarn's gate.
  writeFileSync(
    join(fixture, '.yarnrc.yml'),
    'nodeLinker: node-modules\nenableTelemetry: false\nnpmMinimalAgeGate: 0\n',
  );
}
// A brand-new fixture has no lockfile, and Berry treats a CI environment as immutable by default, so the
// install it is asked to perform is the one it refuses (YN0028). This is a first install, not a CI replay.
run(pmBin, berry ? [...MANAGERS[pm], '--no-immutable'] : MANAGERS[pm]);
run(resolve(fixture, 'node_modules/.bin/tsc'), []);
run(resolve(fixture, 'node_modules/.bin/vite'), ['build']);
const css = readdirSync(join(fixture, 'dist/assets')).filter(name => name.endsWith('.css')).map(name => readFileSync(join(fixture, 'dist/assets', name), 'utf8')).join('\n');
assert.match(css, /\.bg-action\b/, 'Button background utility missing: package source must be scanned');
assert.match(css, /\.text-action-foreground\b/, 'Button foreground utility missing');
assert.match(css, /--action:/, 'Token contract missing');
assert.doesNotMatch(css, /@import\s+["']@kinetixui/, 'Unresolved package CSS import');
console.log(`PASS (${pm} ${pmVersion}): documented component typechecks, bundles, and includes button utilities and tokens.`);
if (!process.argv.includes('--keep')) rmSync(fixture, { recursive: true });
