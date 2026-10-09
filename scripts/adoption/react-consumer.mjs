/** Compile the actual installation-page example outside the pnpm workspace.
 * Local mode installs freshly packed artifacts; --published checks registry releases.
 * Never publishes. The fixture is retained in /tmp on failure for diagnosis.
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
console.log(`Clean ${published ? 'published' : 'packed'} consumer: ${fixture}`);
run('npm', ['install', '--no-audit', '--no-fund']);
run(resolve(fixture, 'node_modules/.bin/tsc'), []);
run(resolve(fixture, 'node_modules/.bin/vite'), ['build']);
const css = readdirSync(join(fixture, 'dist/assets')).filter(name => name.endsWith('.css')).map(name => readFileSync(join(fixture, 'dist/assets', name), 'utf8')).join('\n');
assert.match(css, /\.bg-action\b/, 'Button background utility missing: package source must be scanned');
assert.match(css, /\.text-action-foreground\b/, 'Button foreground utility missing');
assert.match(css, /--action:/, 'Token contract missing');
assert.doesNotMatch(css, /@import\s+["']@kinetixui/, 'Unresolved package CSS import');
console.log('PASS: documented component typechecks, bundles, and includes button utilities and tokens.');
if (!process.argv.includes('--keep')) rmSync(fixture, { recursive: true });
