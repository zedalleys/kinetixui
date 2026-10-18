/** Build the /docs/swiftui first screen in a clean SwiftPM consumer outside this repository.
 * Copies packages/ui-swiftui to Vendor/kinetixui/packages/ui-swiftui, where the docs' submodule step puts it, and
 * takes everything a reader adds from the docs: the `// Package.swift` dependency fence, the `ContentView` fence,
 * and the tools version and platform floor the Setup prose states. The fixture owns only what an existing package
 * already has (its name) plus a `WindowGroup` that shows `ContentView`, as the docs say to. `swift build` on macOS:
 * this compiles the sample in a consumer; it does not run it on a device or simulator.
 *
 *   node scripts/adoption/swiftui-consumer.mjs                 build the docs as written
 *   node scripts/adoption/swiftui-consumer.mjs --negative=<id> apply one documented-step mutation and
 *                                                              require the gate to fail for that reason
 *   node scripts/adoption/swiftui-consumer.mjs --list-negatives
 *   node scripts/adoption/swiftui-consumer.mjs --write-only    write the fixture and stop (no Swift toolchain)
 *
 * Needs Swift 6 (Xcode 16+). Never publishes. The fixture is retained in the temp directory on failure.
 */
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Each control breaks one thing a reader copies, and names the failure the gate must report.
// `from` must occur exactly once in that fence (or, for `prose`, on the page), so a control cannot become a no-op.
const NEGATIVES = {
  'missing-import': { fence: 'ContentView', from: 'import KinetixUI\n', to: '',
    expect: /cannot find '(KinetixTheme|KinetixButton)' in scope/ },
  'wrong-constructor': { fence: 'ContentView', from: 'size: .sm', to: 'size: .small',
    expect: /has no member 'small'/ },
  'wrong-argument': { fence: 'ContentView', from: 'KinetixButton(action: {}) { Text("Get started") }',
    to: 'KinetixButton(onTap: {}) { Text("Get started") }', expect: /incorrect argument label|extraneous argument label|no exact matches in call/ },
  'wrong-package': { fence: 'Package.swift', from: 'package: "ui-swiftui"', to: 'package: "kinetixui"',
    expect: /unknown package 'kinetixui'/ },
  'wrong-path': { fence: 'Package.swift', from: '.package(path: "Vendor/kinetixui/packages/ui-swiftui")',
    to: '.package(path: "Vendor/kinetixui")', expect: /swift package resolve failed[\s\S]*Vendor\/kinetixui/ },
  // A consumer below the package's floor: the docs' stated floor is what the fixture builds for.
  'platform-floor-too-low': { prose: true, from: '`.iOS(.v16)` / `.macOS(.v13)`', to: '`.iOS(.v16)` / `.macOS(.v12)`',
    expect: /requires macos 12\.0, but depends on the product 'KinetixUI' which requires macos 13\.0/i },
  'fence-missing': { fence: 'Package.swift', from: '// Package.swift', to: '// Manifest.swift',
    expect: /Missing documented Package\.swift example/ },
};

if (process.argv.includes('--list-negatives')) {
  console.log(Object.keys(NEGATIVES).join('\n'));
  process.exit(0);
}
const writeOnly = process.argv.includes('--write-only');
const negativeId = process.argv.find(arg => arg.startsWith('--negative='))?.slice('--negative='.length);
const negative = negativeId && NEGATIVES[negativeId];
assert.ok(!negativeId || negative, `Unknown negative control ${negativeId}`);

const root = fileURLToPath(new URL('../../', import.meta.url));
let docs = readFileSync(join(root, 'apps/web/src/app/docs/swiftui/page.mdx'), 'utf8');
// Fences are identified by their content: the dependency fence by its first-line comment, the sample by its type.
const MARKERS = {
  'Package.swift': text => text.split('\n')[0] === '// Package.swift',
  ContentView: text => /^struct ContentView: View \{$/m.test(text),
};
const once = (text, from) => assert.equal(text.split(from).length, 2, `Negative control ${negativeId}: ${JSON.stringify(from)} must occur exactly once`);
if (negative?.prose) {
  once(docs, negative.from);
  docs = docs.replace(negative.from, negative.to);
}
const blocks = [...docs.matchAll(/```swift\n([\s\S]*?)\n```/g)].map(m => m[1]);
if (negative?.fence) {
  const index = blocks.findIndex(MARKERS[negative.fence]);
  assert.ok(index >= 0, `Negative control ${negativeId}: no ${negative.fence} fence`);
  once(blocks[index], negative.from);
  blocks[index] = blocks[index].replace(negative.from, negative.to);
}

const run = (fixture, args, step) => {
  const result = spawnSync('swift', args, { cwd: fixture, encoding: 'utf8', maxBuffer: 1 << 28 });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0) throw new Error(`swift ${step} failed (exit ${result.status})\n${result.stdout}\n${result.stderr}`);
};

const gate = () => {
  const fence = marker => {
    const block = blocks.find(MARKERS[marker]);
    if (!block) throw new Error(`Missing documented ${marker} example`);
    return block;
  };
  const tools = docs.match(/`swift-tools-version: ([\d.]+)`/)?.[1];
  const floor = docs.match(/`\.iOS\(\.v(\d+)\)` \/ `\.macOS\(\.v(\d+)\)`/);
  if (!tools || !floor) throw new Error('Missing documented tools version or platform floor in Setup');

  const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-swiftui-consumer-'));
  const write = (path, text) => {
    mkdirSync(join(fixture, path, '..'), { recursive: true });
    writeFileSync(join(fixture, path), text);
  };
  // Where `git submodule add … Vendor/kinetixui` puts the package; .build is a local cache, not source.
  cpSync(join(root, 'packages/ui-swiftui'), join(fixture, 'Vendor/kinetixui/packages/ui-swiftui'),
    { recursive: true, filter: src => !/[\\/]\.build([\\/]|$)/.test(src) });
  // The fence is the `dependencies:` / `targets:` arguments of the reader's own Package(...).
  write('Package.swift', `// swift-tools-version: ${tools}
import PackageDescription

let package = Package(
    name: "Consumer",
    platforms: [.iOS(.v${floor[1]}), .macOS(.v${floor[2]})],
${fence('Package.swift').split('\n').slice(1).map(line => `    ${line}`).join('\n')}
)
`);
  write('Sources/App/ContentView.swift', `${fence('ContentView')}\n`);
  // "Show ContentView from your app's WindowGroup": the scene, without @main, so the library target compiles it.
  write('Sources/App/ConsumerScene.swift', `import SwiftUI

struct ConsumerScene: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}
`);
  console.log(`Clean SwiftUI consumer: ${fixture}`);
  if (writeOnly) return;
  run(fixture, ['package', 'resolve'], 'package resolve');
  run(fixture, ['build'], 'build');
  rmSync(fixture, { recursive: true });
};

if (!negative) {
  gate();
  if (!writeOnly) console.log('PASS: documented SwiftUI setup and first screen compile in a clean SwiftPM consumer (macOS; not run on a device or simulator).');
} else {
  let failure;
  try { gate(); } catch (error) { failure = error; }
  assert.ok(failure, `Negative control ${negativeId}: the gate PASSED with the documented step broken`);
  assert.match(String(failure.message), negative.expect,
    `Negative control ${negativeId}: the gate failed, but not for the expected reason`);
  console.log(`PASS: negative control ${negativeId} fails the gate as expected (${negative.expect}).`);
}
