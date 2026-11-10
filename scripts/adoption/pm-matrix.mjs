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
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
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

/*
 * The version this tree expects the CLI to report. The execute route fetches `@kinetixui/cli` from the
 * REGISTRY, so what comes back is whatever is published — which is not automatically what this tree
 * says. Until now the cell only tested that the output had the SHAPE of a version
 * (`/^\d+\.\d+\.\d+/`) and never read the manifest at all, so an `npx` resolving a stale release
 * passed: measured with a shim reporting `0.0.1` against a manifest of `0.27.0`, the cell printed
 * PASS and exited 0. The PR body nevertheless claimed this cell "asserts the CLI reports the
 * repository's own version, read from the manifest rather than a literal". That claim was false, and
 * it was repeated as evidence that the 0.26.1 -> 0.27.0 bump had been checked. It had not: the two
 * numbers agreed by coincidence, because npm serves the newest publication.
 *
 * So the comparison is now made rather than described. It is strict equality, deliberately:
 * a mismatch in EITHER direction is worth a red cell. Registry newer than the tree means the tree is
 * stale; tree newer than the registry means this version has not published yet, which is a real and
 * legitimate state during a Version PR — and the right place to record a legitimate failure is the
 * expectation file (`pm-matrix-expectations.json`, added by #482), whose whole purpose is to carry a
 * known failure with its named diagnostic. Guessing from the direction or the size of the gap would
 * be a heuristic, and a heuristic here is how a false pass gets back in.
 */
const expectedCliVersion = () =>
  JSON.parse(readFileSync(join(root, 'packages/cli/package.json'), 'utf8')).version;

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
  'bare-bin-lookup-failure': 'an unreachable registry must make bare-bin-name report NOT MEASURED, never a pass',
  'stale-cli-version': 'an execute route resolving a CLI version this tree does not declare must fail',
  'berry-cli-version': 'ambient and supplied Berry ignore progress but strictly compare the final CLI version',
  'berry-unmeasured-pass': 'an unmeasured yarn-berry must not read as a pass, nor let the run claim every route was exercised',
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
  if (failed) {
    record('execute', pm, false, out);
    return;
  }
  const want = expectedCliVersion();
  // Ambient Berry prints the same dlx progress as an explicitly supplied Berry binary.
  const reported = pm === 'yarn' ? out.split('\n').pop().trim() : out;
  const ok = reported === want;
  record('execute', pm, ok, ok
    ? `${bin} ${args.join(' ')} --version -> ${reported}, which is what packages/cli/package.json declares`
    : `${bin} ${args.join(' ')} --version -> ${JSON.stringify(reported)}, but this tree declares ${want} in packages/cli/package.json`);
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
  if (failed) {
    record('execute', 'yarn-berry', false, out);
    return;
  }
  // Berry's dlx prints progress before the version, so the version is the last line rather than the whole output
  const reported = out.split('\n').pop().trim();
  const want = expectedCliVersion();
  const ok = reported === want;
  record('execute', 'yarn-berry', ok, ok
    ? `yarn ${v} dlx @kinetixui/cli --version -> ${reported}, which is what packages/cli/package.json declares`
    : `yarn ${v} dlx @kinetixui/cli --version -> ${JSON.stringify(reported)}, but this tree declares ${want} in packages/cli/package.json`);
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
    /*
     * This is the supply-chain control: it asserts that the bin name the docs must never render is not an
     * installable package. So "I could not reach the registry" and "the registry serves no version" have to
     * be told apart. They were not: the catch handler reported `latest: null` and the verdict was
     * `latest === null`, so an offline runner printed PASS and exited 0 having consulted nothing — a false
     * pass on the one check whose whole job is to notice a name becoming installable. The `exists` field
     * needed to tell them apart was already being computed, and then discarded by the destructuring.
     *
     * A `--negative=` run is an explicit request to exercise one control. If it cannot be exercised, the
     * request failed, so an unreachable registry exits non-zero rather than claiming either outcome. That is
     * the opposite of the unmeasured Berry cell below, which exits 0 — Berry is optional on every runner,
     * whereas this control was asked for by name.
     */
    const res = execFileSync('node', ['-e', `
      const done = (o) => console.log(JSON.stringify(o));
      fetch('https://registry.npmjs.org/kinetixui', { signal: AbortSignal.timeout(15000) })
        .then(async (r) => {
          // 404 is a SUCCESSFUL lookup that says the name publishes nothing; 5xx and the rest are not answers
          if (r.status === 404) return done({ lookup: 'ok', status: 404, latest: null });
          if (!r.ok) return done({ lookup: 'failed', status: r.status, latest: null });
          const d = await r.json();
          done({ lookup: 'ok', status: r.status, latest: (d['dist-tags'] && d['dist-tags'].latest) || null });
        })
        .catch((e) => done({ lookup: 'failed', status: null, latest: null, why: String((e && e.message) || e) }));
    `], { encoding: 'utf8', timeout: 30000 }).trim();
    const { lookup, status, latest, why } = JSON.parse(res);
    if (lookup !== 'ok') {
      console.error(`NOT MEASURED  negative bare-bin-name: the registry lookup failed, so this run proves nothing about whether \`kinetixui\` is installable${status ? ` (HTTP ${status})` : ''}${why ? ` — ${why}` : ''}.`);
      console.error('A control that cannot run must not report a pass. Re-run it with registry access.');
      process.exit(2);
    }
    const ok = latest === null;
    console.log(ok
      ? `PASS  negative bare-bin-name: the registry answered (HTTP ${status}) and \`kinetixui\` publishes no version, so \`npx kinetixui\` cannot be the CLI`
      : `FAIL  negative bare-bin-name: npm now serves kinetixui@${latest} — re-check what the docs may render`);
    process.exit(ok ? 0 : 1);
  }
  if (negative === 'yarn-classic-dlx') {
    checkExecute('yarn');
    const ok = results.every((r) => r.ok);
    console.log(ok ? 'PASS  negative yarn-classic-dlx: the caveat matches this yarn' : 'FAIL  negative yarn-classic-dlx');
    process.exit(ok ? 0 : 1);
  }
  /*
   * The control for the control above. `bare-bin-name` used to report PASS when it could not reach the
   * registry at all, so asserting its fixed behaviour against a registry that happens to be reachable
   * proves nothing: the bug only ever showed when the lookup failed. This points a temp copy at an
   * unresolvable host and requires NOT MEASURED and a non-zero exit — the two things the broken version
   * got wrong.
   *
   * The anchor is assembled rather than written out, because a literal copy of the URL would also match
   * this control's own source and the rewrite would land here instead of on the statement under test. That
   * is not hypothetical: it is exactly how `berry-unmeasured-pass` first failed to test anything. Hence the
   * exact-occurrence guard.
   */
  /*
   * An environment control rather than a source mutation: it puts an `npx` on PATH that reports a
   * version this tree does not declare, and requires the execute cell to FAIL and to name both
   * numbers. Before the manifest comparison existed this shim passed at exit 0, which is how the
   * cell came to be described as checking something it never checked.
   */
  if (negative === 'berry-cli-version') {
    const want = expectedCliVersion();
    const dir = mkdtempSync(join(tmpdir(), 'kinetixui-neg-berry-version-'));
    const bin = join(dir, 'yarn');
    writeFileSync(bin, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo 4.14.1; exit 0; fi\nprintf "YN0000: installation progress\\n%s\\n" "$KX_CONTROL_CLI_VERSION"\n', { mode: 0o755 });
    let ok = true;
    try {
      for (const reported of [want, '0.0.1', `${want}-unexpected`]) {
        const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--pm=yarn', '--execute-only', `--yarn-berry=${bin}`], {
          encoding: 'utf8',
          env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, KX_CONTROL_CLI_VERSION: reported },
        });
        const out = `${run.stdout || ''}${run.stderr || ''}`;
        const matches = reported === want;
        const state = matches ? 'PASS' : 'FAIL';
        const held = run.status === (matches ? 0 : 1)
          && new RegExp(`^${state} {2}execute {2}yarn {2}`, 'm').test(out)
          && new RegExp(`^${state} {2}execute {2}yarn-berry `, 'm').test(out)
          && out.includes(want) && out.includes(reported);
        console.log(`  ${held ? 'ok  ' : 'FAIL'}  both Berry routes reporting ${reported} against ${want}`);
        if (!held) console.error(out);
        ok = held && ok;
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    console.log(`${ok ? 'PASS' : 'FAIL'}  negative berry-cli-version`);
    process.exit(ok ? 0 : 1);
  }
  if (negative === 'stale-cli-version') {
    const want = expectedCliVersion();
    const WRONG = '0.0.1';
    if (WRONG === want) {
      console.error(`FAIL  negative stale-cli-version: the tree declares ${WRONG}, the same version this control uses as its wrong one, so the control would prove nothing. Refusing.`);
      process.exit(1);
    }
    const dir = mkdtempSync(join(tmpdir(), 'kinetixui-neg-stalecli-'));
    writeFileSync(join(dir, 'npx'), `#!/bin/sh\necho "${WRONG}"\n`, { mode: 0o755 });
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--pm=npm', '--execute-only'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
    });
    rmSync(dir, { recursive: true, force: true });
    const out = `${run.stdout || ''}${run.stderr || ''}`;
    const checks = [
      ['a CLI version the tree does not declare must not pass', !/^PASS {2}execute {2}npm/m.test(out)],
      ['the cell must be recorded as FAILED', /FAIL {2}execute {2}npm/.test(out)],
      ['it must name the version the CLI reported', out.includes(WRONG)],
      ['it must name the version the manifest declares', out.includes(want)],
      ['the run must not exit 0', run.status !== 0],
    ];
    for (const [what, held] of checks) console.log(`  ${held ? 'ok  ' : 'FAIL'}  ${what}`);
    const ok = checks.every(([, held]) => held);
    console.log(ok ? `PASS  negative stale-cli-version: a CLI reporting ${WRONG} against a manifest of ${want} fails the cell` : 'FAIL  negative stale-cli-version');
    if (!ok) console.error(out);
    process.exit(ok ? 0 : 1);
  }
  if (negative === 'bare-bin-lookup-failure') {
    const REAL = `fetch('https://registry.` + `npmjs.org/kinetixui'`;
    const DEAD = `fetch('https://registry.` + `invalid.example/kinetixui'`;
    const self = fileURLToPath(import.meta.url);
    const source = readFileSync(self, 'utf8');
    const occurrences = source.split(REAL).length - 1;
    if (occurrences !== 1) {
      console.error(`FAIL  negative bare-bin-lookup-failure: the anchor occurs ${occurrences} times, not once, so the mutation would not land on the statement under test. Refusing rather than reporting a result.`);
      process.exit(1);
    }
    const dir = mkdtempSync(join(tmpdir(), 'kinetixui-neg-lookup-'));
    const copy = join(dir, 'pm-matrix.mjs');
    writeFileSync(copy, source.replace(REAL, DEAD));
    const run = spawnSync(process.execPath, [copy, '--negative=bare-bin-name'], { encoding: 'utf8' });
    rmSync(dir, { recursive: true, force: true });
    const out = `${run.stdout || ''}${run.stderr || ''}`;
    const checks = [
      ['an unreachable registry must not report a pass', !/^PASS/m.test(out)],
      ['it must say NOT MEASURED', /NOT MEASURED/.test(out)],
      ['it must say the lookup failed', /registry lookup failed/.test(out)],
      ['it must not exit 0', run.status !== 0],
    ];
    for (const [what, held] of checks) console.log(`  ${held ? 'ok  ' : 'FAIL'}  ${what}`);
    const ok = checks.every(([, held]) => held);
    console.log(ok ? 'PASS  negative bare-bin-lookup-failure' : `FAIL  negative bare-bin-lookup-failure (exit was ${run.status})`);
    if (!ok) console.error(out);
    process.exit(ok ? 0 : 1);
  }
  /*
   * The defect this guards is a FALSE PASS, so asserting the fixed behaviour alone would prove nothing: a
   * run that never reaches the claim at all would satisfy it. The control therefore mutates a temp copy of
   * this file back to the single line that caused it — `ok: true` for the unmeasured Berry row — and
   * requires the false sentence to REAPPEAR. If the mutation cannot be applied, or is a no-op, the control
   * aborts rather than reporting a pass: a control that silently measures nothing is the very thing the
   * matrix exists to catch.
   */
  if (negative === 'berry-unmeasured-pass') {
    const CLAIM = 'Every advertised route was exercised on this machine.';
    /*
     * Built from fragments on purpose. Written as plain literals, these two strings appear in THIS block as
     * well as in the statement under test, and `String.replace` takes the first match — so the control
     * rewrote its own anchor, left the real `results.push` untouched, and the mutation silently tested
     * nothing while still changing the file. The occurrence count below is what makes that unmissable;
     * `mutated !== source` is not, because the wrong edit also changes the file.
     */
    const pushLine = (v) => `results.push({ route: 'both', pm: 'yarn-berry', ok: ${v},`;
    const FIXED = pushLine('null');
    const BROKEN = pushLine('true');
    const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
    const occurrences = source.split(FIXED).length - 1;
    if (occurrences !== 1) {
      console.error(`FAIL  negative berry-unmeasured-pass: expected exactly 1 occurrence of the anchor, found ${occurrences}.`);
      console.error(`Anchor: ${JSON.stringify(FIXED)}`);
      console.error('A control that cannot name one unambiguous line refuses rather than reporting a pass.');
      process.exit(1);
    }
    const dir = mkdtempSync(join(tmpdir(), 'kinetixui-berry-control-'));
    // This mutation concerns only the unmeasured row. Never execute ambient Yarn or contact npm.
    writeFileSync(join(dir, 'yarn'), '#!/bin/sh\nif [ "$1" = "--version" ]; then echo 1.22.22; exit 0; fi\necho "Classic has no dlx" >&2\nexit 1\n', { mode: 0o755 });
    const run = (file) => {
      const r = spawnSync(process.execPath, [file, '--execute-only', '--pm=yarn'], {
        encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}` },
      });
      return `${r.stdout ?? ''}${r.stderr ?? ''}`;
    };
    const fixedFile = join(dir, 'fixed.mjs');
    const brokenFile = join(dir, 'broken.mjs');
    const mutated = source.replace(FIXED, BROKEN);
    if (mutated === source) {
      console.error('FAIL  negative berry-unmeasured-pass: the mutation was a no-op, so nothing was tested.');
      process.exit(1);
    }
    console.log(`  mutation: -${FIXED}\n            +${BROKEN}`);
    writeFileSync(fixedFile, source);
    writeFileSync(brokenFile, mutated);
    const fixedOut = run(fixedFile);
    const brokenOut = run(brokenFile);
    rmSync(dir, { recursive: true, force: true });

    const checks = [
      ['the fixed file must not claim every route was exercised', !fixedOut.includes(CLAIM)],
      ['the fixed file must name yarn-berry as unexercised', fixedOut.includes('claims nothing about: both/yarn-berry')],
      ['the fixed file must not print yarn-berry as ok', !/yarn-berry\s+ok\b/.test(fixedOut)],
      ['the mutation must bring the false claim back', brokenOut.includes(CLAIM)],
      ['the mutation must print yarn-berry as ok', /yarn-berry\s+ok\b/.test(brokenOut)],
    ];
    for (const [what, held] of checks) console.log(`  ${held ? 'ok  ' : 'FAIL'}  ${what}`);
    const ok = checks.every(([, held]) => held);
    console.log(ok
      ? 'PASS  negative berry-unmeasured-pass: an unmeasured Berry reads as NOT MEASURED, and the old line restores the false claim'
      : 'FAIL  negative berry-unmeasured-pass');
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
      results.push({ route: 'both', pm: 'yarn-berry', ok: null, detail: 'not measured — no Berry binary supplied' });
    }
  }
}

console.log('\nMatrix');
for (const r of results) {
  const state = r.ok === null ? 'NOT MEASURED' : r.ok ? 'ok' : 'FAILED';
  console.log(`  ${r.route.padEnd(8)} ${r.pm.padEnd(5)} ${state}`);
}

/*
 * `ok: null` is a third state, and it exists because `ok: true` was being used for it. With no Berry binary
 * to run, the yarn-berry row was pushed as a PASS: the matrix printed `both yarn-berry ok`, the failure
 * filter skipped it because `!true` is false, and the run still closed with "Every advertised route was
 * exercised on this machine" — a sentence that was false, about the one route most likely to be missing.
 * Yarn Berry IS advertised, so the claim shrinks to what was exercised instead of rounding up to all of it.
 *
 * It deliberately does NOT exit non-zero. Berry is optional precisely because `yarn` on a runner is only
 * ever Classic, so failing here would be red on every CI run forever, and a gate that is always red is a
 * gate someone turns off. The exit code is unchanged; what changes is the CLAIM the run is allowed to make.
 */
const failures = results.filter((r) => r.ok === false);
const unmeasured = results.filter((r) => r.ok === null);
if (failures.length) {
  console.error(`\n${failures.length} cell(s) failed. The documentation must not offer a route this says is broken.`);
  process.exit(1);
}
if (unmeasured.length) {
  const cells = unmeasured.map((r) => `${r.route}/${r.pm}`).join(', ');
  console.log(`\nEvery route this run exercised passed. NOT exercised, so this run claims nothing about: ${cells}.`);
} else {
  console.log('\nEvery advertised route was exercised on this machine.');
}
