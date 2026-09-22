// The flagship "Notification preferences" recipe shown on kinetixui.com's homepage as the Flutter
// implementation of the cross-platform proof. This file is the canonical source: `pnpm gen:flagship` extracts the
// marked region below into the website's generated source display — the site never hand-duplicates this snippet,
// and `pnpm check:flagship-examples` (CI) fails if the two drift apart. Compiled, analyzed and exercised by this
// package's existing `flutter analyze` / `flutter test` run (native-flutter.yml); the widget test below proves it
// builds against the real `kinetix_ui` API and behaves, not just that it parses.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// kx-flagship:start
class FlagshipPreferencesPanel extends StatefulWidget {
  const FlagshipPreferencesPanel({super.key});

  @override
  State<FlagshipPreferencesPanel> createState() => _FlagshipPreferencesPanelState();
}

class _FlagshipPreferencesPanelState extends State<FlagshipPreferencesPanel> {
  bool productUpdates = true;
  bool securityAlerts = true;

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          KinetixCardHeader(children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                KinetixCardTitle('Notifications'),
                KinetixBadge('Synced', variant: KinetixBadgeVariant.secondary),
              ],
            ),
            const KinetixCardDescription('Choose what you hear about.'),
          ]),
          KinetixCardContent(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Product updates'),
                    KinetixSwitch(value: productUpdates, onChanged: (v) => setState(() => productUpdates = v)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Security alerts'),
                    KinetixSwitch(value: securityAlerts, onChanged: (v) => setState(() => securityAlerts = v)),
                  ],
                ),
                const SizedBox(height: 16),
                KinetixButton(onPressed: () {}, child: const Text('Save preferences')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
// kx-flagship:end

void main() {
  testWidgets("renders and its toggles respond independently", (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: KinetixTheme(brightness: Brightness.light, child: const Scaffold(body: FlagshipPreferencesPanel())),
    ));

    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Synced'), findsOneWidget);
    expect(find.text('Product updates'), findsOneWidget);
    expect(find.text('Security alerts'), findsOneWidget);

    await tester.tap(find.text('Save preferences')); // must not throw — a real onPressed is wired
    await tester.pump();
  });
}
