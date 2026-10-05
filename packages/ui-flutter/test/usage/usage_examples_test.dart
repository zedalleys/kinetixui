import 'package:flutter/cupertino.dart';
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
        const SizedBox(height: 16),

        // kx-usage:icons-dismiss-icon
        // Default: Material's Icons.close.
        KinetixBanner('Changes saved.', onDismiss: save),

        // A Cupertino icon (add the cupertino_icons font package): sized to 14 and tinted by the banner.
        KinetixBanner('Changes saved.', onDismiss: save, dismissIcon: const Icon(CupertinoIcons.xmark_circle)),

        // Any widget — an SVG widget, your company's icon. Laid out at 14×14, named "Dismiss".
        KinetixBanner('Changes saved.', onDismiss: save, dismissIcon: const CompanyCloseIcon()),
        // kx-usage:end
      ],
    );
  }

  void save() => widget.save?.call();
}

/// Stands in for an application's own icon widget in the icons example: no KinetixUI, no icon font.
class CompanyCloseIcon extends StatelessWidget {
  const CompanyCloseIcon({super.key});

  @override
  Widget build(BuildContext context) =>
      DecoratedBox(decoration: BoxDecoration(color: IconTheme.of(context).color, shape: BoxShape.circle));
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
    // the icons example: three banners, the last two with the application's own icon in the dismiss slot
    expect(find.byIcon(CupertinoIcons.xmark_circle), findsOneWidget);
    expect(tester.getSize(find.byType(CompanyCloseIcon)), const Size(14, 14));
  });
}
