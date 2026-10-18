/** Build and widget-test the /docs/flutter first screen in a clean Flutter app outside this repository.
 * Copies packages/ui-flutter to kinetixui/packages/ui-flutter beside the app, where the docs' "keep a checkout beside
 * your app" step puts it, and takes everything a reader adds from the docs: the path `kinetix_ui:` dependency fence,
 * the `Demo` fence, the documented `runApp(...)` line, and the SDK constraints the Setup prose states. The fixture
 * owns only what a new app already has (name, the Flutter SDK dependency, flutter_test) plus a headless widget test of
 * what the page says you should see. `flutter analyze` + `flutter test` on Linux: this compiles the sample and pumps it
 * headlessly; it does not run it on a device, emulator or simulator.
 *
 *   node scripts/adoption/flutter-consumer.mjs                 analyze and test the docs as written
 *   node scripts/adoption/flutter-consumer.mjs --negative=<id> apply one documented-step mutation and
 *                                                              require the gate to fail for that reason
 *   node scripts/adoption/flutter-consumer.mjs --list-negatives
 *   node scripts/adoption/flutter-consumer.mjs --write-only    write the fixture and stop (no Flutter toolchain)
 *
 * Needs Flutter on PATH. Never publishes. The fixture is retained in the temp directory on failure.
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
  'missing-import': { fence: 'Demo', from: "import 'package:kinetix_ui/kinetix_ui.dart';\n", to: '',
    expect: /flutter analyze failed[\s\S]*(isn't defined|Undefined name) [\s\S]*Kinetix/ },
  'wrong-constructor': { fence: 'Demo', from: 'KinetixButtonSize.sm', to: 'KinetixButtonSize.small',
    expect: /flutter analyze failed[\s\S]*no constant named 'small'/ },
  'wrong-argument': { fence: 'Demo', from: "KinetixButton(onPressed: () {}, child: const Text('Save'))",
    to: "KinetixButton(onTap: () {}, child: const Text('Save'))", expect: /flutter analyze failed[\s\S]*named parameter 'onTap' isn't defined/ },
  'wrong-dependency': { fence: 'pubspec', from: '  kinetix_ui:\n', to: '  kinetixui:\n',
    expect: /flutter pub get failed[\s\S]*kinetixui/ },
  // A stated SDK floor the toolchain cannot meet: the docs' constraint is what the app declares, so a wrong floor fails
  // resolution. (A Dart 2 range would not do: Dart 3 widens `<3.0.0` to `<4.0.0` for any floor of 2.12 or later.)
  'unsupported-sdk': { prose: true, from: '`sdk: ">=3.6.0 <4.0.0"`', to: '`sdk: ">=9.0.0 <10.0.0"`',
    expect: /flutter pub get failed[\s\S]*requires SDK version >=9\.0\.0 <10\.0\.0/ },
  'label-changed': { fence: 'Demo', from: "const Text('Cancel')", to: "const Text('Close')",
    expect: /flutter test failed[\s\S]*Demo shows Save above a smaller outlined Cancel/ },
  'run-line-missing': { prose: true, from: '`runApp(const MaterialApp(home: Scaffold(body: Center(child: Demo()))))`',
    to: '`showDemo()`', expect: /Missing documented runApp line/ },
  'fence-missing': { fence: 'Demo', from: 'class Demo extends StatelessWidget {', to: 'class Example extends StatelessWidget {',
    expect: /Missing documented Demo example/ },
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
let docs = readFileSync(join(root, 'apps/web/src/app/docs/flutter/page.mdx'), 'utf8');
// Fences are identified by their content: the path dependency (not the git one) and the Demo widget.
const MARKERS = {
  pubspec: { lang: 'yaml', match: text => /^\s+path: \.\.\/kinetixui\/packages\/ui-flutter$/m.test(text) },
  Demo: { lang: 'dart', match: text => /^class Demo extends StatelessWidget \{$/m.test(text) },
};
const fences = lang => [...docs.matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)\\n```', 'g'))].map(m => m[1]);
const once = (text, from) => assert.equal(text.split(from).length, 2, `Negative control ${negativeId}: ${JSON.stringify(from)} must occur exactly once`);
if (negative?.prose) {
  once(docs, negative.from);
  docs = docs.replace(negative.from, negative.to);
}
const blocks = { yaml: fences('yaml'), dart: fences('dart') };
if (negative?.fence) {
  const { lang, match } = MARKERS[negative.fence];
  const index = blocks[lang].findIndex(match);
  assert.ok(index >= 0, `Negative control ${negativeId}: no ${negative.fence} fence`);
  once(blocks[lang][index], negative.from);
  blocks[lang][index] = blocks[lang][index].replace(negative.from, negative.to);
}

const run = (cwd, args, step) => {
  const result = spawnSync('flutter', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 28 });
  process.stdout.write(result.stdout ?? '');
  process.stderr.write(result.stderr ?? '');
  if (result.status !== 0) throw new Error(`flutter ${step} failed (exit ${result.status})\n${result.stdout}\n${result.stderr}`);
};

const gate = () => {
  const fence = marker => {
    const { lang, match } = MARKERS[marker];
    const block = blocks[lang].find(match);
    if (!block) throw new Error(`Missing documented ${marker} example`);
    return block;
  };
  const sdk = docs.match(/`sdk: ("[^"`]+")` \/ `flutter: ("[^"`]+")`/);
  if (!sdk) throw new Error('Missing documented SDK constraints in Setup');
  const runApp = docs.match(/`(runApp\(.+?\));?`/)?.[1];
  if (!runApp) throw new Error('Missing documented runApp line');
  // The dependency fence is the reader's `dependencies:` section; it already has `dependencies:` as its first line.
  const dependency = fence('pubspec').split('\n').slice(1).join('\n');

  const fixture = mkdtempSync(join(tmpdir(), 'kinetixui-flutter-consumer-'));
  const app = join(fixture, 'app');
  const write = (path, text) => {
    mkdirSync(join(app, path, '..'), { recursive: true });
    writeFileSync(join(app, path), text);
  };
  // `path: ../kinetixui/packages/ui-flutter` resolves against the app, so the checkout sits beside it.
  cpSync(join(root, 'packages/ui-flutter'), join(fixture, 'kinetixui/packages/ui-flutter'),
    { recursive: true, filter: src => !/[\\/](\.dart_tool|build)([\\/]|$)/.test(src) });
  write('pubspec.yaml', `name: consumer
publish_to: none

environment:
  sdk: ${sdk[1]}
  flutter: ${sdk[2]}

dependencies:
  flutter:
    sdk: flutter
${dependency}

dev_dependencies:
  flutter_test:
    sdk: flutter
`);
  write('lib/demo.dart', `${fence('Demo')}\n`);
  write('lib/main.dart', `import 'package:flutter/material.dart';

import 'demo.dart';

void main() {
  ${runApp};
}
`);
  write('test/demo_test.dart', `import 'package:consumer/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

/// What /docs/flutter says you should see, pumped headlessly through the app's own main() (not a device).
void main() {
  Finder button(String label) => find.ancestor(of: find.text(label), matching: find.byType(KinetixButton));

  for (final brightness in Brightness.values) {
    testWidgets('Demo shows Save above a smaller outlined Cancel (\${brightness.name})', (tester) async {
      tester.platformDispatcher.platformBrightnessTestValue = brightness;
      addTearDown(tester.platformDispatcher.clearPlatformBrightnessTestValue);
      app.main();
      await tester.pumpAndSettle();

      expect(find.text('Save'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(tester.getTopLeft(button('Save')).dy, lessThan(tester.getTopLeft(button('Cancel')).dy));
      expect(tester.getSize(button('Cancel')).height, lessThan(tester.getSize(button('Save')).height));
      expect(tester.widget<KinetixButton>(button('Cancel')).variant, KinetixButtonVariant.outline);

      await tester.tap(button('Save'));
      await tester.tap(button('Cancel'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  }
}
`);
  console.log(`Clean Flutter consumer: ${app}`);
  if (writeOnly) return;
  run(app, ['pub', 'get'], 'pub get');
  run(app, ['analyze', '--no-fatal-infos'], 'analyze');
  run(app, ['test'], 'test');
  rmSync(fixture, { recursive: true });
};

if (!negative) {
  gate();
  if (!writeOnly) console.log('PASS: documented Flutter setup and first screen analyze and pass a headless widget test in a clean app (not run on a device, emulator or simulator).');
} else {
  let failure;
  try { gate(); } catch (error) { failure = error; }
  assert.ok(failure, `Negative control ${negativeId}: the gate PASSED with the documented step broken`);
  assert.match(String(failure.message), negative.expect,
    `Negative control ${negativeId}: the gate failed, but not for the expected reason`);
  console.log(`PASS: negative control ${negativeId} fails the gate as expected (${negative.expect}).`);
}
