/** Prove the `react-is` recharts resolves agrees with the React it runs beside.
 *
 *   node scripts/adoption/react-is-agreement.mjs                  assert the predicate agrees
 *   node scripts/adoption/react-is-agreement.mjs --negative=<id>  break the agreement, require a failure
 *   node scripts/adoption/react-is-agreement.mjs --list-negatives
 *
 * recharts declares `react-is` as a REQUIRED peer (its peerDependenciesMeta is empty) over
 * `^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0`, and that range is a trap: react-is predicates are
 * NOT version-agnostic. React 19 renamed the element brand from `Symbol(react.element)` to
 * `Symbol(react.transitional.element)`, and react-is only recognises the brand of its own major.
 * So react-is 18 beside React 19 — and react-is 19 beside React 18, the mirror image — returns
 * `false` from `isFragment()` for a genuine Fragment, and `false` from `isElement()` for a
 * genuine element. Neither combination warns: the range is satisfied and the predicate just lies.
 *
 * That lie is load-bearing. recharts' `ReactUtils.toArray` flattens Fragments via `isFragment`
 * before `findAllByType(children, Cell)`, and five live series — Bar, Funnel, Scatter, RadialBar
 * and Pie — find their `<Cell>` children that way. When the predicate misclassifies a Fragment the
 * Fragment is pushed through unflattened, `findAllByType` cannot see the `<Cell>`s inside it, and
 * every cell-level `fill` is silently discarded: the chart renders in recharts' default grey with
 * no error, no warning and no console output. Measured in Chromium, not inferred.
 *
 * `@kinetixui/ui` does not declare `react-is` and must not: a fixed major would be wrong for one
 * of the two React majors its `react: ">=18"` peer admits. The resolution is therefore the
 * consumer's manager's to make, and this gate's job is to hold OUR tree to the combination that
 * actually works, so the website and every test here render charts the way a correctly-resolved
 * consumer does.
 *
 * What this gate asserts is behaviour, not version arithmetic: it builds a real Fragment with the
 * resolved React and asks the resolved react-is what it is. A version comparison would encode
 * today's symbol rename; the predicate encodes the thing that has to be true.
 *
 * What it does NOT prove: anything about a consumer's own tree. npm, pnpm and bun auto-install
 * recharts' peer and pick react-is 19 for a React 19 consumer, but a consumer whose tree already
 * holds react-is 18 for any other reason gets it deduped onto recharts and hits exactly this
 * defect. That exposure is documented for consumers; it cannot be fixed from inside this package.
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const uiManifest = path.join(repoRoot, 'packages', 'ui', 'package.json');

const NEGATIVES = {
  // A react-is of a different major than the resolved React. 17.0.2 is genuinely installed in this
  // tree (pretty-format depends on it), so the control substitutes a real package rather than a
  // sabotaged one, and proves the gate fails on the mismatch it exists to catch.
  'mismatched-major': 'resolve react-is from a different major than React',
  // A react-is-shaped module whose isFragment always returns false. Proves the gate reads the
  // predicate's answer and would not be satisfied by a version string that merely looks right.
  'lying-predicate': 'substitute a react-is whose isFragment() always returns false',
};

if (process.argv.includes('--list-negatives')) {
  console.log(Object.keys(NEGATIVES).join('\n'));
  process.exit(0);
}

const negativeId = process.argv.find(a => a.startsWith('--negative='))?.slice('--negative='.length);
if (negativeId && !(negativeId in NEGATIVES)) {
  console.error(`Unknown negative control ${negativeId}. --list-negatives shows them.`);
  process.exit(1);
}

/** Resolve recharts the way @kinetixui/ui does, then its peers the way recharts does. */
function resolveTriple() {
  const uiRequire = createRequire(uiManifest);
  const rechartsManifest = uiRequire.resolve('recharts/package.json');
  const rechartsRequire = createRequire(rechartsManifest);
  return {
    recharts: rechartsRequire('./package.json').version,
    rechartsRequire,
    reactIsVersion: rechartsRequire('react-is/package.json').version,
    reactVersion: rechartsRequire('react/package.json').version,
  };
}

const { recharts, rechartsRequire, reactIsVersion, reactVersion } = resolveTriple();
const React = rechartsRequire('react');

let reactIs = rechartsRequire('react-is');
let reactIsLabel = reactIsVersion;

if (negativeId === 'mismatched-major') {
  // Any react-is already in the virtual store whose major differs from the resolved React's. These
  // are real published packages other dependencies pulled in (prop-types wants 16, pretty-format
  // wants 17), so the control substitutes a genuine mismatch rather than a sabotaged module.
  const reactMajor = reactVersion.split('.')[0];
  const store = path.join(repoRoot, 'node_modules', '.pnpm');
  const candidate = fs
    .readdirSync(store)
    .filter(d => /^react-is@\d/.test(d))
    .map(d => ({ dir: d, version: d.slice('react-is@'.length) }))
    .find(c => c.version.split('.')[0] !== reactMajor);
  if (!candidate) {
    console.error(
      `Negative control mismatched-major cannot run: no react-is of a major other than ${reactMajor} ` +
        'is installed, so there is nothing real to substitute.',
    );
    process.exit(1);
  }
  const otherRequire = createRequire(
    path.join(store, candidate.dir, 'node_modules', 'react-is', 'package.json'),
  );
  reactIs = otherRequire('react-is');
  reactIsLabel = `${candidate.version} (negative control)`;
}
if (negativeId === 'lying-predicate') {
  reactIs = { ...reactIs, isFragment: () => false };
  reactIsLabel = `${reactIsVersion} with isFragment() stubbed false (negative control)`;
}

const fragment = React.createElement(React.Fragment, null, 'child');
const element = React.createElement('div', null, 'child');

const failures = [];
if (reactIs.isFragment(fragment) !== true) {
  failures.push(
    `react-is ${reactIsLabel} does not recognise a Fragment built by React ${reactVersion}: ` +
      `isFragment() returned ${String(reactIs.isFragment(fragment))}, expected true. ` +
      `The element brand is ${String(fragment.$$typeof)}.`,
  );
}
if (reactIs.isElement(element) !== true) {
  failures.push(
    `react-is ${reactIsLabel} does not recognise an element built by React ${reactVersion}: ` +
      `isElement() returned ${String(reactIs.isElement(element))}, expected true.`,
  );
}

const heading = `recharts ${recharts} -> react-is ${reactIsLabel}, beside React ${reactVersion}`;

if (failures.length > 0) {
  console.error(`react-is disagrees with React.\n  ${heading}\n`);
  for (const f of failures) console.error(`  ✕ ${f}`);
  console.error(
    '\n  Consequence: recharts flattens Fragments with isFragment() before findAllByType(children, Cell),\n' +
      '  so Fragment-wrapped <Cell> children are dropped and their fills are silently lost.\n' +
      '  Fix: pin recharts’ react-is peer to the major of the React this repo develops against\n' +
      '  (pnpm-workspace.yaml -> overrides -> "recharts>react-is").',
  );
  if (negativeId) {
    console.error(`\n  Negative control ${negativeId} fired as designed.`);
    process.exit(0);
  }
  process.exit(1);
}

if (negativeId) {
  console.error(
    `Negative control ${negativeId} did NOT fire: the gate passed while the agreement was broken.\n  ${heading}`,
  );
  process.exit(1);
}

console.log(`react-is agrees with React.\n  ${heading}`);
console.log('  isFragment(<></>) and isElement(<div/>) both true.');
