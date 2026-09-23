import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The Flutter usage snippets shown on kinetixui.com's component pages.
//
// Each kx-usage:<demo-key> region is extracted by `pnpm gen:usage` into the website's generated module, and
// `pnpm check:platform-code` fails if what the site shows drifts from what is here. `flutter test` compiles
// and runs this file, so a snippet cannot name an API that does not exist.
class UsageExamples extends StatefulWidget {
  const UsageExamples({super.key, this.save});

  final VoidCallback? save;

  @override
  State<UsageExamples> createState() => _UsageExamplesState();
}

class _UsageExamplesState extends State<UsageExamples> {
  bool airplane = true;

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        // kx-usage:button-demo
        KinetixButton(
          onPressed: save,
          child: const Text('Button'),
        ),
        // kx-usage:end

        const SizedBox(height: 16),

        // kx-usage:badge-demo
        Row(
          mainAxisSize: MainAxisSize.min,
          children: const <Widget>[
            KinetixBadge('Default'),
            SizedBox(width: 8),
            KinetixBadge('Secondary', variant: KinetixBadgeVariant.secondary),
          ],
        ),
        // kx-usage:end

        const SizedBox(height: 16),

        // kx-usage:switch-demo
        Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            KinetixSwitch(value: airplane, onChanged: (bool v) => setState(() => airplane = v)),
            const SizedBox(width: 8),
            const Text('Airplane mode'),
          ],
        ),
        // kx-usage:end

        const SizedBox(height: 16),

        // kx-usage:direction-provider-demo
        // No provider to port: Directionality is inherited by every widget below it.
        Directionality(
          textDirection: TextDirection.rtl,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const KinetixInput(placeholder: 'Search'),
              KinetixButton(onPressed: save, child: const Text('Save')),
            ],
          ),
        ),
        // kx-usage:end
      ],
    );
  }

  void save() => widget.save?.call();
}

void main() {
  testWidgets('every usage snippet builds', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: UsageExamples())),
        ),
      ),
    );

    expect(find.text('Button'), findsOneWidget);
    expect(find.text('Default'), findsOneWidget);
    expect(find.text('Airplane mode'), findsOneWidget);
    expect(find.text('Save'), findsOneWidget);
  });
}
