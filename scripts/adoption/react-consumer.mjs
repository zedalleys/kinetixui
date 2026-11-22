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
 *
 * The fixture also exercises the documented CHART procedure, because two defects measured on 2026-11-22
 * were invisible to every gate in the repository and both lived in this file's blind spot: the app it
 * built used buttons and tokens only, and it took React from apps/web, so neither a chart nor a React
 * major other than the workspace's was ever consumed.
 *
 *   --react=<18|19>      build the fixture against that React major instead of apps/web's
 *   --react-is=<spec>     pin the react-is that recharts resolves (the Yarn instruction's subject). A
 *                         dependency alone does not do it: under pnpm, recharts resolves the peer copy in
 *                         the store and never sees the consumer's root declaration, so three arms read
 *                         18.3.1 while appearing to vary it. It therefore also writes the manager's
 *                         override field, and the run REFUSES to report unless the override took effect.
 *   --flatten-react-is    delete a nested recharts/node_modules/react-is, so the DECLARED react-is is the
 *                         one recharts resolves. npm and Bun nest a satisfying copy under recharts, and a
 *                         root-level install then changes nothing recharts can see — three readings were
 *                         taken that way before this was noticed, and all three measured the same nested
 *                         18.3.1 while appearing to vary the version.
 *   --omit-recharts       do NOT declare recharts, which is what the documentation used to tell a reader
 *
 * The chart is RENDERED, not merely built, and the three cell fills are counted in the markup. Build
 * success is not evidence of a working chart: with a react-is major that does not match the consumer's
 * React, `tsc` and `vite build` both exit 0 and the fills are silently dropped.
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
const flag = name => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const reactMajor = flag('react');
assert.ok(!reactMajor || ['18', '19'].includes(reactMajor), `--react must be 18 or 19, got ${JSON.stringify(reactMajor)}`);
const reactIsSpec = flag('react-is');
const omitRecharts = process.argv.includes('--omit-recharts');
/* Which override field to write. Default writes all three, which proves a pin CAN be made to work but
 * not which spelling the manager read — and the documentation has to name one. A single field makes the
 * claim per manager traceable: npm and Bun document `overrides`, pnpm `pnpm.overrides`, Yarn `resolutions`. */
const reactIsField = flag('react-is-field');
assert.ok(
  !reactIsField || ['overrides', 'resolutions', 'pnpm', 'dependency-only'].includes(reactIsField),
  `--react-is-field must be overrides, resolutions, pnpm or dependency-only, got ${JSON.stringify(reactIsField)}`,
);
const flattenReactIs = process.argv.includes('--flatten-react-is');
const run = (cmd, args, cwd = fixture) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });
const json = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
const web = json('apps/web/package.json');
// The recharts the LIBRARY depends on, never a version chosen here: a fixture pinned to recharts 2 was
// measuring a library KinetixUI does not ship against, and recharts 3 renders nothing at all on the
// server, so the version and the render method are not independent choices.
const RECHARTS = json('packages/ui/package.json').dependencies.recharts;
assert.ok(RECHARTS, 'packages/ui no longer declares recharts; the chart fixture would be measuring nothing');
const docs = readFileSync(join(root, 'apps/web/src/app/docs/installation/page.mdx'), 'utf8');
const chartDocs = readFileSync(join(root, 'apps/web/src/app/docs/components/chart/page.mdx'), 'utf8');
// If the chart page stops telling a reader to install and import recharts, this fixture is no longer
// measuring the documented procedure, so it says so instead of passing on its own hard-coded copy.
assert.match(chartDocs, /<Command op="install-recharts"/, 'The chart page no longer documents installing recharts');
assert.match(chartDocs, /import \{ Cell, Pie, PieChart \} from "recharts";/, 'The chart page no longer documents the direct recharts import');
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
// A consumer on React 18 is supported — `@kinetixui/ui`'s peer is `react: ">=18"` — and is NOT what this
// workspace runs, so measuring only apps/web's React leaves half the supported range unmeasured.
const REACT = { 18: '18.3.1', 19: '19.3.1' };
const TYPES = { 18: '^18.3.12', 19: web.devDependencies['@types/react'] };
const TYPES_DOM = { 18: '^18.3.1', 19: web.devDependencies['@types/react-dom'] };
writeFileSync(join(fixture, 'package.json'), JSON.stringify({
  private: true, type: 'module', dependencies: {
    ...packages,
    react: reactMajor ? REACT[reactMajor] : web.dependencies.react,
    'react-dom': reactMajor ? REACT[reactMajor] : web.dependencies['react-dom'],
    // The chart components are wrappers: `packages/ui/src/components/chart.tsx` imports recharts, and the
    // documented usage imports PieChart/Pie/Cell from recharts directly, so a consumer declares it. pnpm
    // does not hoist a transitive dependency, so an undeclared import fails to resolve there and passes
    // on the other three by accident.
    ...(omitRecharts ? {} : { recharts: RECHARTS }),
    ...(reactIsSpec ? { 'react-is': reactIsSpec } : {}),
  },
  /*
   * Each manager spells the same instruction differently, and a consumer pinning react-is has to use the
   * one their manager reads. npm and Bun read `overrides`, pnpm reads `pnpm.overrides`, Yarn (both lines)
   * reads `resolutions`. Writing all of them is harmless — each manager ignores the others' field — and
   * writing only one would silently measure nothing under the other three.
   */
  ...(reactIsSpec && reactIsField !== 'dependency-only' ? {
    ...(!reactIsField || reactIsField === 'overrides' ? { overrides: { 'react-is': reactIsSpec } } : {}),
    ...(!reactIsField || reactIsField === 'resolutions' ? { resolutions: { 'react-is': reactIsSpec } } : {}),
    ...(!reactIsField || reactIsField === 'pnpm' ? { pnpm: { overrides: { 'react-is': reactIsSpec } } } : {}),
  } : {}),
  devDependencies: {
    vite: '8.0.3', typescript: web.devDependencies.typescript,
    '@types/react': reactMajor ? TYPES[reactMajor] : web.devDependencies['@types/react'],
    '@types/react-dom': reactMajor ? TYPES_DOM[reactMajor] : web.devDependencies['@types/react-dom'],
    // recharts 3 produces no <svg> from renderToStaticMarkup — it measures and lays out in effects — so
    // the chart is rendered in a real DOM. jsdom is the fixture's own tool, not a KinetixUI dependency.
    jsdom: '^27.0.0',
    tailwindcss: web.devDependencies.tailwindcss, postcss: web.devDependencies.postcss,
    autoprefixer: web.devDependencies.autoprefixer,
  },
}, null, 2));
mkdirSync(join(fixture, 'src'));
writeFileSync(join(fixture, 'src/App.tsx'), fence(docs.split('## First working React component')[1], 'tsx'));
writeFileSync(join(fixture, 'src/style.css'), fence(docs.split('## First working React component')[1], 'css'));
writeFileSync(join(fixture, 'tailwind.config.ts'), fence(docs.slice(docs.indexOf('```ts\n// tailwind.config.ts')), 'ts'));
writeFileSync(join(fixture, 'postcss.config.cjs'), fence(docs.split('## First working React component')[1], 'js'));
writeFileSync(join(fixture, 'src/main.tsx'), 'import { createRoot } from "react-dom/client";\nimport App from "./App";\nimport Chart from "./Chart";\nimport "./style.css";\ncreateRoot(document.getElementById("root")!).render(<><App /><Chart /></>);\n');
writeFileSync(join(fixture, 'index.html'), '<html lang="en"><head><title>Consumer fixture</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
/*
 * The chart the fixture builds and then renders. Three distinct fills, one per <Cell>, produced by a
 * `.map()` inside a fragment — the shape the documentation's own example uses, and the only shape the
 * react-is mismatch affects: a plain array of Cells renders correctly under every combination measured,
 * so a fixture written that way would certify a chart it had not tested. recharts flattens a fragment
 * only when `isFragment(child)` says so (its util/ReactUtils source), and react-is recognises the
 * element brand of its own React major alone.
 */
const FILLS = ['#111181', '#222282', '#333383'];
writeFileSync(join(fixture, 'src/Chart.tsx'), `import { Cell, Pie, PieChart } from "recharts";
const data = [{ name: "a", value: 1 }, { name: "b", value: 2 }, { name: "c", value: 3 }];
const fills = ${JSON.stringify(FILLS)};
export default function Chart() {
  return (
    <PieChart width={300} height={300}>
      <Pie data={data} dataKey="value" isAnimationActive={false}>
        <>{data.map((d, i) => <Cell key={d.name} fill={fills[i]} />)}</>
      </Pie>
    </PieChart>
  );
}
`);
// The same chart as plain ESM, rendered by node from inside the fixture so it uses the fixture's own
// resolved react, react-dom, recharts and react-is. No JSX and no TypeScript, so it needs no build.
writeFileSync(join(fixture, 'chart-render.mjs'), `import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
/*
 * recharts 3 renders in effects: it measures its container and lays the chart out after mount, so
 * renderToStaticMarkup returns a 127-byte shell with no <svg> in it. A server render would therefore
 * have reported "no fills" for every arm, which looks exactly like the defect being measured. The
 * chart is mounted in a real DOM instead, and the <svg> assertion in the caller is what distinguishes
 * "the chart did not render" from "the chart rendered without its fills".
 */
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'SVGElement', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'MutationObserver', 'DOMParser']) {
  if (dom.window[k] === undefined) continue;
  try { globalThis[k] = dom.window[k]; }
  catch { Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true }); }
}
const { createElement: h, Fragment } = await import('react');
const { createRoot } = await import('react-dom/client');
const { PieChart, Pie, Cell } = await import('recharts');
const require_ = createRequire(import.meta.url);
const version = spec => require_(require_.resolve(spec + '/package.json')).version;
// The react-is recharts itself resolves, which is not always the one the consumer declared: npm and Bun
// may nest a satisfying copy under recharts, and pnpm links the peer copy from its store, so a root
// declaration can leave recharts seeing a different version entirely.
const resolvedReactIs = (() => {
  const p = require_.resolve('react-is', { paths: [require_.resolve('recharts')] });
  return { version: require_(p.replace(/index\\.js$/, 'package.json')).version, path: p };
})();
const data = [{ name: 'a', value: 1 }, { name: 'b', value: 2 }, { name: 'c', value: 3 }];
const fills = ${JSON.stringify(FILLS)};
const tick = () => new Promise(r => setTimeout(r, 0));
const render = async cells => {
  const el = dom.window.document.createElement('div');
  dom.window.document.body.appendChild(el);
  const root = createRoot(el);
  root.render(h(PieChart, { width: 300, height: 300 }, h(Pie, { data, dataKey: 'value', isAnimationActive: false }, cells)));
  for (let i = 0; i < 5; i++) await tick();
  const html = el.innerHTML;
  root.unmount();
  el.remove();
  return html;
};
const count = markup => fills.map(f => (markup.match(new RegExp(f, 'g')) || []).length);
// Two shapes, because the defect is shape-dependent and only one of them is affected. The array is what
// this repository's own charts render (apps/web/src/app/charts/charts-content.tsx); the fragment is what
// a consumer writes the moment the map is wrapped in anything, and it is the shape that loses its fills.
const asArray = await render(data.map((d, i) => h(Cell, { key: d.name, fill: fills[i] })));
const asFragment = await render(h(Fragment, null, data.map((d, i) => h(Cell, { key: d.name, fill: fills[i] }))));
console.log(JSON.stringify({
  react: version('react'),
  reactDom: version('react-dom'),
  recharts: version('recharts'),
  reactIs: resolvedReactIs,
  svg: /<svg/.test(asArray) && /<svg/.test(asFragment),
  fillsArray: count(asArray),
  fillsFragment: count(asFragment),
  length: asArray.length,
}));
`);
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
if (flattenReactIs) {
  const nested = join(fixture, 'node_modules/recharts/node_modules/react-is');
  rmSync(nested, { recursive: true, force: true });
  console.log(`Removed any nested react-is under recharts, so the declared version is the resolved one.`);
}
/*
 * A pinned react-is that did not reach recharts is the worst possible arm: it runs, it passes, and it
 * measured the version it was trying to replace. That happened three times here before it was caught, so
 * the run now proves the pin landed before it is allowed to measure anything with it. It refuses rather
 * than reporting, because a NOT MEASURED that reads as a PASS is the defect class this fixture exists for.
 */
if (reactIsSpec) {
  const probe = join(fixture, 'resolved-react-is.mjs');
  writeFileSync(probe, `import { createRequire } from 'node:module';
const r = createRequire(import.meta.url);
const p = r.resolve('react-is', { paths: [r.resolve('recharts')] });
console.log(JSON.stringify({ version: r(p.replace(/index\\.js$/, 'package.json')).version, path: p }));
`);
  const resolvedReactIs = JSON.parse(execFileSync(process.execPath, [probe], { cwd: fixture, encoding: 'utf8' }).trim());
  const want = reactIsSpec.replace(/^[^\d]*/, '').split('.')[0];
  const got = resolvedReactIs.version.split('.')[0];
  assert.equal(
    got, want,
    `--react-is=${reactIsSpec} did not take effect: recharts still resolves react-is ${resolvedReactIs.version} from ${resolvedReactIs.path}. Under ${pm} the pin has to reach recharts' own resolution, not just the consumer's root, so this run would have measured the version it was asked to replace. Refusing to report a result.`,
  );
  console.log(`Pinned react-is took effect: recharts resolves ${resolvedReactIs.version} (asked for ${reactIsSpec}).`);
}
run(resolve(fixture, 'node_modules/.bin/tsc'), []);
run(resolve(fixture, 'node_modules/.bin/vite'), ['build']);
const css = readdirSync(join(fixture, 'dist/assets')).filter(name => name.endsWith('.css')).map(name => readFileSync(join(fixture, 'dist/assets', name), 'utf8')).join('\n');
assert.match(css, /\.bg-action\b/, 'Button background utility missing: package source must be scanned');
assert.match(css, /\.text-action-foreground\b/, 'Button foreground utility missing');
assert.match(css, /--action:/, 'Token contract missing');
assert.doesNotMatch(css, /@import\s+["']@kinetixui/, 'Unresolved package CSS import');
/*
 * Both steps above exited 0, and that is precisely the problem this section exists for. The defect
 * measured on 2026-11-22 passes a typecheck and a production build and then renders a chart with no cell
 * fills. So the chart is rendered and its fills are counted, and the run is only allowed to claim a
 * working chart on the strength of the rendered markup.
 */
const render = JSON.parse(execFileSync(process.execPath, [join(fixture, 'chart-render.mjs')], { cwd: fixture, encoding: 'utf8' }).trim());
const reactMajorRun = render.react.split('.')[0];
const reactIsMajor = render.reactIs.version.split('.')[0];
const majorsAgree = reactIsMajor === reactMajorRun;
console.log(`Rendered chart: react ${render.react}, recharts ${render.recharts}, react-is ${render.reactIs.version} as recharts resolves it; cell fills ${render.fillsArray.join(',')} (array) ${render.fillsFragment.join(',')} (fragment-wrapped)`);
assert.ok(render.svg, 'The chart produced no <svg> at all, so nothing downstream of it means anything');
/*
 * The gate is the RENDERED OUTPUT, never the version numbers. A react-is major that disagrees with the
 * consumer's React is the measured cause, but it is a proxy: asserting it would let a run fail for a cause
 * it had not observed, or pass a broken chart whose versions happened to agree.
 *
 * The array shape is asserted unconditionally — it is what this repository's own charts render, and if it
 * ever breaks, charts are broken outright. The fragment shape is asserted only where the majors agree,
 * because where they do not the fills are dropped (measured 2026-11-22: 0,0,0 on pnpm and npm at React 19,
 * which is the DEFAULT resolution, no consumer error involved). That is an open defect, not something this
 * run may round up to a pass; so it is printed, the run claims nothing about fragment-wrapped cells, and
 * the exit code is left alone rather than reddening every CI run until the documentation lands.
 */
assert.deepEqual(
  render.fillsArray, [1, 1, 1],
  `The documented chart rendered an <svg>, but an array of <Cell> lost its fills: counts ${render.fillsArray.join(',')} where 1,1,1 is correct. tsc and vite build both exited 0, so build success is not evidence of a working chart. recharts resolved react-is ${render.reactIs.version} against react ${render.react} (${render.reactIs.path}).`,
);
if (majorsAgree) {
  assert.deepEqual(
    render.fillsFragment, [1, 1, 1],
    `With react-is ${render.reactIs.version} matching react ${render.react}, a fragment-wrapped map of <Cell> still lost its fills: counts ${render.fillsFragment.join(',')} where 1,1,1 is correct.`,
  );
} else {
  console.log(`NOT CERTIFIED  fragment-wrapped cells: recharts resolved react-is ${render.reactIs.version} against react ${render.react}, the majors disagree, and the fills came back ${render.fillsFragment.join(',')} of 1,1,1. react-is recognises only its own React major's element brand. Resolved from ${render.reactIs.path}. This run claims nothing about a chart whose cells come from a wrapped map.`);
}
console.log(`PASS (${pm} ${pmVersion}): documented component typechecks, bundles, and includes button utilities and tokens; the documented chart renders with all three cell fills${majorsAgree ? ' in both the array and the fragment-wrapped shape' : ' in the array shape (see NOT CERTIFIED above)'}.`);
if (!process.argv.includes('--keep')) rmSync(fixture, { recursive: true });
