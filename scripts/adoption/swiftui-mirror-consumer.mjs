/** Rehearse the SwiftUI mirror publish, and install from it the way a real consumer would.
 *
 *   node scripts/adoption/swiftui-mirror-consumer.mjs                 rehearse the publish and install
 *   node scripts/adoption/swiftui-mirror-consumer.mjs --negative=<id> break one step, require a failure
 *   node scripts/adoption/swiftui-mirror-consumer.mjs --list-negatives
 *   node scripts/adoption/swiftui-mirror-consumer.mjs --layout-only   stop before the Swift toolchain
 *
 * scripts/adoption/swiftui-consumer.mjs already builds the documented first screen in a clean
 * consumer, but it resolves the package with `.package(path:)` — the vendored submodule the docs
 * tell a reader to use today. That is the right thing for it to check and it leaves the publish
 * path completely unexercised: packages/ui-swiftui does not reach a consumer as a path, it reaches
 * them as `git subtree split` pushed to a mirror repo, resolved by `.package(url:, from:)` against
 * a tag. Everything specific to that route — whether Package.swift lands at the mirror root,
 * whether the split carries the sources it declares, whether a version requirement resolves — is
 * only observable after the tag exists, and a pushed tag is what `from:` resolves against forever.
 *
 * So this does the whole thing locally: a real `git subtree split`, pushed to a real (bare, local)
 * git repository, tagged, and consumed through `.package(url: "file://…", from: "<tag>")`. The
 * mirror is a throwaway directory and no remote is contacted, so it rehearses the one-way door
 * without opening it.
 *
 * Two layers, deliberately reported apart:
 *
 *   layout     the split's shape — toolchain-free, runs anywhere, and is where the publish-time
 *              surprises live (a manifest below the root, a source tree the manifest declares but
 *              the split does not carry).
 *   toolchain  `swift package resolve` + `swift build` against the tag, which is the part that
 *              proves a version requirement actually resolves. Needs Swift, so it is skipped with
 *              a notice off macOS instead of being quietly counted as passed.
 */
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PREFIX = 'packages/ui-swiftui';
const TAG = '0.1.0-rehearsal';

/** Each control breaks one property of the publish route and names the failure that must be reported. */
const NEGATIVES = {
  // The realistic prefix mistake: splitting one level too high, so the mirror root holds
  // ui-swiftui/ as a subdirectory and the manifest is below it exactly as it is in the monorepo.
  'split-one-level-too-high': { prefix: 'packages', expect: /Package\.swift is not at the root of the split/ },
  // A manifest that declares a source directory the split does not carry.
  'manifest-declares-missing-target': { patch: 'extra-target', expect: /declares target "Ghost", but the split has no Sources\/Ghost/ },
  // The tag the consumer's `from:` requirement resolves against, missing.
  'tag-never-pushed': { skipTag: true, expect: /tag 0\.1\.0-rehearsal is not in the mirror/ },
};

if (process.argv.includes('--list-negatives')) {
  console.log(Object.keys(NEGATIVES).join('\n'));
  process.exit(0);
}
const layoutOnly = process.argv.includes('--layout-only');
const negativeId = process.argv.find(arg => arg.startsWith('--negative='))?.slice('--negative='.length);
const negative = negativeId ? NEGATIVES[negativeId] : undefined;
if (negativeId && !negative) {
  console.error(`Unknown negative control ${negativeId}. --list-negatives shows them.`);
  process.exit(1);
}

const root = fileURLToPath(new URL('../../', import.meta.url));
const git = (cwd, args, { allowFailure = false } = {}) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`git ${args.join(' ')} failed (exit ${result.status})\n${result.stdout}\n${result.stderr}`);
  }
  return result;
};

const workspace = mkdtempSync(join(tmpdir(), 'kinetixui-swiftui-mirror-'));
let failed;
try {
  // --------------------------------------------------------------------- publish
  // The split runs in a throwaway clone: `git subtree split` writes a branch, and the repository
  // being checked is not the place to leave one.
  const clone = join(workspace, 'source');
  git(workspace, ['clone', '--quiet', '--no-local', root, clone]);
  git(clone, ['config', 'user.email', 'rehearsal@local']);
  git(clone, ['config', 'user.name', 'Mirror rehearsal']);

  const prefix = negative?.prefix ?? PREFIX;
  if (negative?.patch === 'extra-target') {
    // Patch the manifest inside the clone only, as a publisher's mistake would reach the split.
    const manifest = join(clone, PREFIX, 'Package.swift');
    const text = readFileSync(manifest, 'utf8');
    writeFileSync(manifest, text.replace('.target(name: "KinetixUI"),', '.target(name: "KinetixUI"),\n        .target(name: "Ghost"),'));
    git(clone, ['commit', '--quiet', '-am', 'rehearsal: declare a target the split will not carry']);
  }

  git(clone, ['subtree', 'split', `--prefix=${prefix}`, '-b', 'swiftui-dist']);
  const sha = git(clone, ['rev-parse', 'swiftui-dist']).stdout.trim();

  const mirror = join(workspace, 'mirror.git');
  git(workspace, ['init', '--quiet', '--bare', mirror]);
  git(clone, ['push', '--quiet', mirror, 'swiftui-dist:main']);
  if (!negative?.skipTag) git(clone, ['push', '--quiet', mirror, `${sha}:refs/tags/${TAG}`]);
  console.log(`Mirror rehearsed: split ${sha.slice(0, 12)} → ${mirror}`);

  // ---------------------------------------------------------------------- layout
  // Read back out of the mirror, not out of the clone: the mirror is what a consumer fetches.
  const inMirror = path => git(mirror, ['cat-file', '-e', `main:${path}`], { allowFailure: true }).status === 0;
  if (!inMirror('Package.swift')) {
    throw new Error(`Package.swift is not at the root of the split (--prefix=${prefix}). A .package(url:) consumer resolves the repository root and cannot find a manifest below it.`);
  }
  if (!negative?.skipTag) {
    const tags = git(mirror, ['tag', '--list']).stdout.split('\n').map(line => line.trim());
    if (!tags.includes(TAG)) throw new Error(`tag ${TAG} is not in the mirror; a \`from:\` requirement has nothing to resolve.`);
  } else if (git(mirror, ['tag', '--list']).stdout.trim() === '') {
    throw new Error(`tag ${TAG} is not in the mirror; a \`from:\` requirement has nothing to resolve.`);
  }

  // Every target the manifest declares must have sources inside the split. This is the failure the
  // mirror route invites and the monorepo hides: in-repo the directory may exist above the prefix.
  const manifest = git(mirror, ['show', 'main:Package.swift']).stdout;
  const declared = [...manifest.matchAll(/\.(?:testTarget|target)\(name:\s*"([^"]+)"/g)].map(match => match[1]);
  const tests = new Set([...manifest.matchAll(/\.testTarget\(name:\s*"([^"]+)"/g)].map(match => match[1]));
  for (const target of declared) {
    const dir = tests.has(target) ? `Tests/${target}` : `Sources/${target}`;
    const listing = git(mirror, ['ls-tree', '--name-only', `main:${dir}`], { allowFailure: true });
    if (listing.status !== 0 || !listing.stdout.trim()) {
      throw new Error(`Package.swift declares target "${target}", but the split has no ${dir}. The mirror would not build for a consumer.`);
    }
  }
  const sources = git(mirror, ['ls-tree', '-r', '--name-only', 'main']).stdout.split('\n').filter(line => line.endsWith('.swift'));
  console.log(`PASS layout: Package.swift at the mirror root, ${declared.length} declared target(s) all carried, ${sources.length} Swift file(s), tag ${negative?.skipTag ? '(skipped)' : TAG}.`);

  // ------------------------------------------------------------------- toolchain
  // The consumer resolves the mirror the published way: a URL and a version requirement.
  const consumer = join(workspace, 'consumer');
  mkdirSync(join(consumer, 'Sources/App'), { recursive: true });
  writeFileSync(join(consumer, 'Package.swift'), `// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "Consumer",
    platforms: [.iOS(.v16), .macOS(.v13)],
    dependencies: [
        .package(url: "file://${mirror}", from: "${TAG}"),
    ],
    targets: [
        .target(name: "App", dependencies: [.product(name: "KinetixUI", package: "mirror")]),
    ]
)
`);
  writeFileSync(join(consumer, 'Sources/App/Probe.swift'), `import SwiftUI
import KinetixUI

// Smallest thing that proves the product resolved and its symbols are visible.
struct Probe: View {
    var body: some View {
        KinetixTheme { KinetixButton(action: {}) { Text("Installed") } }
    }
}
`);

  if (layoutOnly || !spawnSync('swift', ['--version'], { encoding: 'utf8' }).stdout) {
    console.log(`::notice::Swift toolchain ${layoutOnly ? 'skipped (--layout-only)' : 'not available'} — the registry-shaped install was written to ${consumer} but not resolved or compiled. The layout layer above is proven; the resolve/build layer is not, and is what macos-latest runs.`);
  } else {
    for (const [args, step] of [[['package', 'resolve'], 'package resolve'], [['build'], 'build']]) {
      const result = spawnSync('swift', args, { cwd: consumer, encoding: 'utf8', maxBuffer: 1 << 28 });
      process.stdout.write(result.stdout ?? '');
      if (result.status !== 0) throw new Error(`swift ${step} failed against the mirror tag (exit ${result.status})\n${result.stdout}\n${result.stderr}`);
    }
    console.log(`PASS toolchain: \`.package(url:, from: "${TAG}")\` resolved against the mirror and the consumer compiled.`);
  }
} catch (error) {
  failed = error;
}

if (!negative) {
  if (failed) {
    console.error(String(failed.message));
    console.error(`\nFAIL: the SwiftUI mirror publish route is broken. Rehearsal kept at ${workspace}`);
    process.exit(1);
  }
  rmSync(workspace, { recursive: true, force: true });
  console.log('PASS: the SwiftUI mirror publish route rehearsed against a local throwaway mirror. Nothing was pushed to any remote. Which layers this proves is stated above — the toolchain layer is only proven where Swift ran.');
} else {
  if (!failed) {
    console.error(`FAIL: negative control ${negativeId}: the rehearsal PASSED with the publish route broken. Kept at ${workspace}`);
    process.exit(1);
  }
  if (!negative.expect.test(String(failed.message))) {
    console.error(`FAIL: negative control ${negativeId}: it failed, but not for the expected reason (${negative.expect}).\n${failed.message}`);
    process.exit(1);
  }
  rmSync(workspace, { recursive: true, force: true });
  console.log(`PASS: negative control ${negativeId} fails the rehearsal as expected (${negative.expect}).`);
}
