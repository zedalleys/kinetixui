/** Compile real block sources outside the pnpm workspace, against freshly packed artifacts.
 *
 * `scripts/adoption/react-consumer.mjs` already proves the documented installation example compiles for a
 * consumer. It says nothing about a block, and a block is the thing people actually copy: a whole
 * composition, pasted into a project that has `@kinetixui/ui` installed from the registry and nothing else
 * of ours. The two failures that matters most are invisible inside the workspace, where every path
 * resolves through it:
 *
 *   - a block composes a primitive that is implemented but NOT exported from the package's entry point, so
 *     the import resolves in the repository and fails for everyone else;
 *   - a block relies on a type that is internal, so it typechecks here and not there.
 *
 * So the block sources are copied in verbatim — not extracted between the `kx-block` markers, because the
 * imports live above `kx-block:start` and are part of what a consumer needs — and typechecked and built.
 *
 * One block per implemented industry is the unit, which is what M5.26 §15 asks for. `--published` checks
 * the registry releases instead of packed artifacts. Never publishes.
 */
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const published = process.argv.includes('--published');
const web = json('apps/web/package.json');
const manifest = json('blocks.manifest.json');

/* One block per industry M5.26 implements, named by the domain each one reaches through its capability
 * evidence rather than by a guess from its title. A block is listed here only if it is published: a draft
 * is not something a consumer can copy from the website, because the website never shows one. */
const SUBJECTS = [
  { slug: 'appointment-booking', industry: 'healthcare' },
  { slug: 'shipment-tracking', industry: 'logistics' },
];

const sources = SUBJECTS.map(({ slug, industry }) => {
  const entry = manifest.blocks[slug];
  assert.ok(entry, `${slug} is not in blocks.manifest.json`);
  assert.ok(
    ['beta', 'stable'].includes(entry.status),
    `${slug} is "${entry.status}" — only a published block is something a consumer can copy`,
  );
  const ref = entry.sources.React;
  assert.ok(ref, `${slug} declares no React source`);
  return { slug, industry, ref, file: basename(ref) };
});

const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-block-consumer-'));
const artifacts = join(fixture, 'artifacts');
mkdirSync(artifacts);
const packages = {};
for (const dir of ['tokens', 'ui']) {
  const pkg = json(`packages/${dir}/package.json`);
  if (published) packages[pkg.name] = pkg.version;
  else {
    execFileSync('pnpm', ['pack', '--pack-destination', artifacts], {
      cwd: join(root, 'packages', dir),
      stdio: 'inherit',
    });
    const tar = readdirSync(artifacts).find((name) => name.startsWith(`kinetixui-${dir}-`));
    assert.ok(tar, `Missing ${dir} tarball`);
    packages[pkg.name] = `file:${join(artifacts, tar)}`;
  }
}

writeFileSync(
  join(fixture, 'package.json'),
  JSON.stringify(
    {
      private: true,
      type: 'module',
      dependencies: {
        ...packages,
        react: web.dependencies.react,
        'react-dom': web.dependencies['react-dom'],
      },
      devDependencies: {
        vite: '8.0.3',
        typescript: web.devDependencies.typescript,
        '@types/react': web.devDependencies['@types/react'],
        '@types/react-dom': web.devDependencies['@types/react-dom'],
      },
    },
    null,
    2,
  ),
);

mkdirSync(join(fixture, 'src/blocks'), { recursive: true });
for (const { ref, file } of sources) copyFileSync(join(root, ref), join(fixture, 'src/blocks', file));

/* Every block is rendered, not merely imported. An unused import is erased by the bundler, so importing a
 * block and never using it would prove that its module parses and nothing about whether its own tree of
 * primitives resolves. */
const named = sources.map(({ file }) => ({
  file,
  export: readFileSync(join(fixture, 'src/blocks', file), 'utf8').match(/export function (\w+)/)?.[1],
}));
for (const n of named) assert.ok(n.export, `No exported component found in ${n.file}`);

writeFileSync(
  join(fixture, 'src/App.tsx'),
  [
    ...named.map((n) => `import { ${n.export} } from "./blocks/${n.file.replace(/\.tsx$/, '')}";`),
    '',
    'export default function App() {',
    '  return (',
    '    <main>',
    ...named.map((n) => `      <${n.export} />`),
    '    </main>',
    '  );',
    '}',
  ].join('\n'),
);
writeFileSync(
  join(fixture, 'src/main.tsx'),
  'import { createRoot } from "react-dom/client";\nimport App from "./App";\ncreateRoot(document.getElementById("root")!).render(<App />);\n',
);
writeFileSync(
  join(fixture, 'index.html'),
  '<html lang="en"><head><title>Block consumer fixture</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
);
writeFileSync(
  join(fixture, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'react-jsx',
      strict: true,
      // The package's own .d.ts files are not what this gate is about; the block's use of them is.
      skipLibCheck: true,
      noEmit: true,
      esModuleInterop: true,
      lib: ['DOM', 'ES2022'],
    },
    include: ['src'],
  }),
);

console.log(`Clean ${published ? 'published' : 'packed'} block consumer: ${fixture}`);
for (const s of sources) console.log(`  ${s.industry.padEnd(12)} ${s.slug}  ←  ${s.ref}`);
execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: fixture, stdio: 'inherit' });
execFileSync(resolve(fixture, 'node_modules/.bin/tsc'), [], { cwd: fixture, stdio: 'inherit' });
execFileSync(resolve(fixture, 'node_modules/.bin/vite'), ['build'], { cwd: fixture, stdio: 'inherit' });

/* The build succeeding is not quite the claim. A bundle that contains none of the block's own words would
 * mean the block was tree-shaken away and the build proved nothing, so one distinctive string per block is
 * required to survive into the output. */
const bundles = readdirSync(join(fixture, 'dist/assets'))
  .filter((name) => name.endsWith('.js'))
  .map((name) => readFileSync(join(fixture, 'dist/assets', name), 'utf8'))
  .join('\n');
const WITNESS = {
  'appointment-booking': 'Choose a time to continue',
  'shipment-tracking': 'Delivery needs a new date',
};
for (const { slug } of sources) {
  const witness = WITNESS[slug];
  assert.ok(witness, `No witness string registered for ${slug}`);
  assert.ok(
    bundles.includes(witness),
    `${slug} left no trace in the bundle — it was tree-shaken, so this run proved nothing`,
  );
}

console.log(
  `PASS: ${sources.length} blocks (${sources.map((s) => s.industry).join(', ')}) typecheck and bundle ` +
    `against ${published ? 'published' : 'packed'} @kinetixui/ui, outside the workspace, and survive into the output.`,
);
if (!process.argv.includes('--keep')) rmSync(fixture, { recursive: true });
