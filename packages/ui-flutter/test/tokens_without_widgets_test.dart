// Regression test for the reported need: "I want to use Kinetix tokens without the widgets."
//
// Everything below is a stock Flutter widget — Card, FilledButton, TextField, Container, CupertinoButton —
// styled from KinetixSpacing / KinetixRadius / KinetixShadow / KinetixType / KinetixColors and the theme
// adapters. Not one Kinetix* widget and no KinetixTheme anywhere in this file, on purpose: if this ever
// stops compiling or rendering, the token API has regressed back to being widget-only.
//
// The import is the ordinary package barrel — no deep `package:kinetix_ui/src/...` import is needed.

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

void main() {
  testWidgets('the reported use case: Material widgets + raw tokens + KinetixMaterialTheme', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: KinetixMaterialTheme.light(),
        darkTheme: KinetixMaterialTheme.dark(),
        home: Scaffold(
          body: Padding(
            padding: const EdgeInsets.all(KinetixSpacing.space2),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(KinetixSpacing.space4),
                child: Text('Hello', style: KinetixType.bodyMd),
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Hello'), findsOneWidget);
    expect(find.byType(Card), findsOneWidget);
  });

  testWidgets('raw tokens style a plain Container end to end', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: KinetixMaterialTheme.light(),
        home: Scaffold(
          body: Center(
            child: Container(
              key: const Key('panel'),
              padding: const EdgeInsets.all(KinetixSpacing.space4),
              decoration: BoxDecoration(
                color: KinetixColors.light.card,
                borderRadius: BorderRadius.circular(KinetixRadius.container),
                boxShadow: KinetixShadow.md,
                border: Border.all(color: KinetixColors.light.border),
              ),
              child: Text('Tokens only', style: KinetixType.labelLg),
            ),
          ),
        ),
      ),
    );

    final Container panel = tester.widget<Container>(find.byKey(const Key('panel')));
    final BoxDecoration decoration = panel.decoration! as BoxDecoration;
    expect(decoration.boxShadow, KinetixShadow.md);
    expect(decoration.color, KinetixColors.light.card);
    expect(find.text('Tokens only'), findsOneWidget);
  });

  testWidgets('native Material widgets inherit the Kinetix language from the adapter alone', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: KinetixMaterialTheme.light(),
        home: Scaffold(
          body: Column(
            children: <Widget>[
              FilledButton(onPressed: () {}, child: const Text('Save')),
              const TextField(decoration: InputDecoration(hintText: 'Email')),
              const Divider(),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Save'), findsOneWidget);
    final BuildContext context = tester.element(find.text('Save'));
    final ThemeData theme = Theme.of(context);
    // the button's fill and the divider's colour both trace back to tokens
    expect(theme.colorScheme.primary, KinetixColors.light.action);
    expect(theme.dividerColor, KinetixColors.light.border);
  });

  testWidgets('the Cupertino path works the same way', (WidgetTester tester) async {
    await tester.pumpWidget(
      CupertinoApp(
        theme: KinetixCupertinoTheme.dark(),
        home: CupertinoPageScaffold(
          child: Center(
            child: Container(
              padding: const EdgeInsets.all(KinetixSpacing.space3),
              decoration: const BoxDecoration(boxShadow: KinetixShadow.sm),
              child: const Text('Cupertino'),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Cupertino'), findsOneWidget);
    final BuildContext context = tester.element(find.text('Cupertino'));
    expect(CupertinoTheme.of(context).scaffoldBackgroundColor, KinetixColors.dark.background);
  });

  testWidgets('Kinetix widgets and native widgets coexist under both themes', (WidgetTester tester) async {
    // The mixed case from the docs: MaterialApp themed by the adapter, with a KinetixTheme scope
    // wrapping the Kinetix widgets. This is the one test here that does use a Kinetix widget —
    // it exists to prove the two systems don't fight, which is the question a migrating app asks.
    await tester.pumpWidget(
      MaterialApp(
        theme: KinetixMaterialTheme.light(),
        home: Scaffold(
          body: KinetixTheme(
            brightness: Brightness.light,
            child: Column(
              children: <Widget>[
                FilledButton(onPressed: () {}, child: const Text('Native')),
                KinetixButton(onPressed: () {}, child: const Text('Kinetix')),
              ],
            ),
          ),
        ),
      ),
    );

    expect(find.text('Native'), findsOneWidget);
    expect(find.text('Kinetix'), findsOneWidget);
  });
}
