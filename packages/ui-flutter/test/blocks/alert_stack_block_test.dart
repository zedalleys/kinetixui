import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Alert stack" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class AlertStackBlock extends StatelessWidget {
  const AlertStackBlock({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        KinetixAlert(
          children: <Widget>[
            KinetixAlertTitle('Heads up'),
            KinetixAlertDescription('You can add components to your app using the CLI.'),
          ],
        ),
        SizedBox(height: 12),
        KinetixAlert(
          variant: KinetixAlertVariant.destructive,
          children: <Widget>[
            KinetixAlertTitle('Payment failed'),
            KinetixAlertDescription('Update your billing details to keep your subscription active.'),
          ],
        ),
        SizedBox(height: 12),
        KinetixAlert(
          variant: KinetixAlertVariant.success,
          children: <Widget>[KinetixAlertTitle('Changes saved')],
        ),
      ],
    );
  }
}
// kx-block:end

void main() {
  testWidgets('renders every variant with its own copy', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: AlertStackBlock())),
        ),
      ),
    );

    expect(find.text('Heads up'), findsOneWidget);
    expect(find.text('Payment failed'), findsOneWidget);
    expect(find.text('Changes saved'), findsOneWidget);
  });
}
