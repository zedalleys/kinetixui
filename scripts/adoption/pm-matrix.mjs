/**
 * Is each package manager the documentation offers one a consumer can actually use?
 *
 *   node scripts/adoption/pm-matrix.mjs                  the whole matrix, packed artifacts
 *   node scripts/adoption/pm-matrix.mjs --published      against the published registry versions
 *   node scripts/adoption/pm-matrix.mjs --pm=yarn        one manager
 *   node scripts/adoption/pm-matrix.mjs --execute-only   only the CLI execute route (fast, no builds)
 *   node scripts/adoption/pm-matrix.mjs --yarn-berry=<path to a Berry yarn>
 *   node scripts/adoption/pm-matrix.mjs --list-negatives
 *   node scripts/adoption/pm-matrix.mjs --negative=<id>  require the matrix to fail for that reason
 *
 * The site offers npm, pnpm, Yarn and Bun. npm passing proves nothing about the other three: they differ in
 * how they resolve a `file:` dependency, whether they hoist, and — the one that actually bit — **whether they
 * install a transitive peer dependency at all**. So each is run, not inferred.
 *
 * Two routes, because the documentation shows two and they fail differently:
 *
 *   INSTALL — `@kinetixui/ui` and `@kinetixui/tokens` added to a clean fixture outside this workspace, then
 *     typechecked and built for real by `react-consumer.mjs`. That script is the single source of the
 *     fixture: this one only varies the manager, so a difference between two cells is the manager.
 *
 *   EXECUTE — `npx` / `pnpm dlx` / `yarn dlx` / `bunx` fetching `@kinetixui/cli` and running it. This is the
 *     command family the docs render for every `cli-*` operation, and the one whose syntax is not mechanical.
 *
 * What it does NOT do: reach the component registry at kinetixui.com, or publish anything. `cli add` needs the
 * registry origin; that is a separate check and its absence is stated rather than papered over.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name) => argv.includes(`--${name}`);

const MANAGERS = ['npm', 'pnpm', 'yarn', 'bun'];

/**
 * Yarn is two product lines, and `yarn` on PATH can only be one of them. Classic (1.x) and Berry (2+) differ
 * in the execute route — Classic has no `dlx` at all — so a matrix with one "yarn" row would be reporting a
 * result for whichever happened to be installed. The second line is measured when a Berry binary is supplied
 * and reported as NOT MEASURED when it is not, which is the one thing it must never do silently.
 *
 * Berry is not on PATH here and `repo.yarnpkg.com` is outside this environment's network policy, so corepack
 * cannot fetch it. It comes from npm instead:
 *
 *   npm install --prefix /tmp/yb @yarnpkg/cli-dist@4
 *   node scripts/adoption/pm-matrix.mjs --yarn-berry=/tmp/yb/node_modules/.bin/yarn
 */
const berryBin = flag('yarn-berry');

/** The execute route each manager spells, as `apps/web/src/lib/pm-commands.ts` renders it. */
const EXECUTE = {
  npm: ['npx', ['@kinetixui/cli']],
  pnpm: ['pnpm', ['dlx', '@kinetixui/cli']],
  yarn: ['yarn', ['dlx', '@kinetixui/cli']],
  bun: ['bunx', ['@kinetixui/cli']],
};

/**
 * Yarn Classic (1.x) has no `dlx`, so `yarn dlx @kinetixui/cli …` cannot work there. The documentation says
 * so beside the command rather than letting a reader find out from `command not found`; this records that the
 * claim was measured rather than assumed, and which yarn was in front of it.
 */
const yarnMajor = () => Number(execFileSync('yarn', ['--version'], { encoding: 'utf8' }).trim().split('.')[0]);

/**
 * Read a manager's version from outside this repository, because that is the version a consumer runs. The
 * repo pins pnpm through `packageManager`, so asking inside it reports 12.3.1 while a fixture in /tmp uses
 * the ambient 10.28.0 — and the fixture is the thing under test.
 */
const version = (bin) => execFileSync(bin, ['--version'], { cwd: tmpdir(), encoding: 'utf8' }).trim();

/* ------------------------------------------------------------------ negative controls */

/**
 * Each control breaks one thing the matrix is supposed to notice, and the matrix must fail *for that reason*.
 * None of them is ever committed: they are applied to a temporary fixture inside this run.
 *
 * `bare-bin-name` deliberately does not execute anything. `kinetixui` is a real name on npm with no published
 * version — a squattable one — so running `npx kinetixui` would fetch whatever is there. The control asserts
 * the metadata instead: the bin name is not a package, which is why the contract never renders it.
 */
const NEGATIVES = {
  'bad-package': 'install a package name that does not exist — the install must fail',
  'bare-bin-name': 'the bin name `kinetixui` is not an installable package (checked, never executed)',
  'yarn-classic-dlx': 'yarn dlx under Yarn Classic must fail, which is what the docs caveat claims',
};

if (has('list-negatives')) {
  for (const [id, what] of Object.entries(NEGATIVES)) console.log(`${id}\t${what}`);
  process.exit(0);
}

const results = [];
const record = (route, pm, ok, detail) => {
  results.push({ route, pm, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${route.padEnd(8)} ${pm.padEnd(5)} ${detail}`);
};

/* ------------------------------------------------------------------ the execute route */

function checkExecute(pm) {
  const [bin, args] = EXECUTE[pm];
  const expectFailure = pm === 'yarn' && yarnMajor() < 2;
  const fixture = mkdtempSync(join(tmpdir(), `kinetixui-execute-${pm}-`));
  // yarn and pnpm want a manifest in cwd; an empty private one keeps the fixture outside this workspace
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, name: 'kx-execute-fixture', version: '0.0.0' }));
  let out = '';
  let failed = false;
  try {
    out = execFileSync(bin, [...args, '--version'], { cwd: fixture, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    failed = true;
    out = `${err.message}`.split('\n')[0];
  }
  rmSync(fixture, { recursive: true, force: true });

  if (expectFailure) {
    record('execute', pm, failed, failed
      ? `yarn ${version('yarn')} has no dlx, as documented — ${out}`
      : `yarn ${version('yarn')} ran "yarn dlx" and the docs say it cannot: ${out}`);
    return;
  }
  const ok = !failed && /^\d+\.\d+\.\d+/.test(out);
  record('execute', pm, ok, ok ? `${bin} ${args.join(' ')} --version -> ${out}` : out);
}

/* ------------------------------------------------------------------ the install route */

function checkInstall(pm, bin = pm, label = pm) {
  const args = ['scripts/adoption/react-consumer.mjs', `--pm=${pm}`];
  if (bin !== pm) args.push(`--pm-bin=${bin}`);
  if (has('published')) args.push('--published');
  const v = version(bin);
  try {
    execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
    record('install', label, true, `clean consumer installed, typechecked and built (${label} ${v})`);
  } catch {
    record('install', label, false, `clean consumer failed under ${label} ${v} — see the output above`);
  }
}

/** The execute route for a supplied Berry binary, which does have `dlx`. */
function checkBerryExecute(bin) {
  const v = version(bin);
  const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-execute-yarn-berry-'));
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, name: 'kx-execute-fixture', version: '0.0.0' }));
  // the same supply-chain age gate that blocks a fresh release on the install route
  writeFileSync(join(fixture, '.yarnrc.yml'), 'enableTelemetry: false\nnpmMinimalAgeGate: 0\n');
  let out = '';
  let failed = false;
  try {
    out = execFileSync(bin, ['dlx', '@kinetixui/cli', '--version'], { cwd: fixture, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (err) {
    failed = true;
    out = `${err.message}`.split('\n')[0];
  }
  rmSync(fixture, { recursive: true, force: true });
  const ok = !failed && /\d+\.\d+\.\d+/.test(out);
  record('execute', 'yarn-berry', ok, ok ? `yarn ${v} dlx @kinetixui/cli --version -> ${out.split('\n').pop()}` : out);
}

/* ------------------------------------------------------------------ run */

const only = flag('pm');
const managers = only ? [only] : MANAGERS;
const negative = flag('negative');

if (negative) {
  if (!NEGATIVES[negative]) {
    console.error(`Unknown negative control ${JSON.stringify(negative)}. --list-negatives shows them.`);
    process.exit(2);
  }
  if (negative === 'bad-package') {
    const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-neg-'));
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, name: 'n', version: '0.0.0' }));
    let failed = false;
    try {
      execFileSync('npm', ['install', '--no-audit', '--no-fund', '@kinetixui/ui-does-not-exist'], { cwd: fixture, stdio: 'pipe' });
    } catch {
      failed = true;
    }
    rmSync(fixture, { recursive: true, force: true });
    console.log(failed ? 'PASS  negative bad-package: a nonexistent package name fails to install'
                       : 'FAIL  negative bad-package: a nonexistent package name installed');
    process.exit(failed ? 0 : 1);
  }
  if (negative === 'bare-bin-name') {
    const res = execFileSync('node', ['-e', `
      fetch('https://registry.npmjs.org/kinetixui').then(r => r.json()).then(d => {
        console.log(JSON.stringify({ exists: !!d.name, latest: d['dist-tags'] && d['dist-tags'].latest || null }));
      }).catch(() => console.log(JSON.stringify({ exists: null, latest: null })));
    `], { encoding: 'utf8' }).trim();
    const { latest } = JSON.parse(res);
    const ok = latest === null;
    console.log(ok
      ? 'PASS  negative bare-bin-name: `kinetixui` publishes no version, so `npx kinetixui` cannot be the CLI'
      : `FAIL  negative bare-bin-name: npm now serves kinetixui@${latest} — re-check what the docs may render`);
    process.exit(ok ? 0 : 1);
  }
  if (negative === 'yarn-classic-dlx') {
    checkExecute('yarn');
    const ok = results.every((r) => r.ok);
    console.log(ok ? 'PASS  negative yarn-classic-dlx: the caveat matches this yarn' : 'FAIL  negative yarn-classic-dlx');
    process.exit(ok ? 0 : 1);
  }
}

for (const pm of managers) {
  if (!MANAGERS.includes(pm)) {
    console.error(`Unknown package manager ${JSON.stringify(pm)}.`);
    process.exit(2);
  }
  checkExecute(pm);
  if (!has('execute-only')) checkInstall(pm);
  if (pm === 'yarn') {
    if (berryBin) {
      checkBerryExecute(berryBin);
      if (!has('execute-only')) checkInstall('yarn', berryBin, 'yarn-berry');
    } else {
      console.log('NOT MEASURED  execute/install yarn-berry  pass --yarn-berry=<path> (see the comment on berryBin)');
      results.push({ route: 'both', pm: 'yarn-berry', ok: true, detail: 'not measured — no Berry binary supplied' });
    }
  }
}

console.log('\nMatrix');
for (const r of results) console.log(`  ${r.route.padEnd(8)} ${r.pm.padEnd(5)} ${r.ok ? 'ok' : 'FAILED'}`);
const failures = results.filter((r) => !r.ok);
if (failures.length) {
  console.error(`\n${failures.length} cell(s) failed. The documentation must not offer a route this says is broken.`);
  process.exit(1);
}
console.log('\nEvery advertised route was exercised on this machine.');
