import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Pricing tier" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class PricingTierBlock extends StatelessWidget {
  const PricingTierBlock({super.key, this.onUpgrade});

  static const List<String> features = <String>[
    'Unlimited projects',
    'Priority support',
    'Custom domains',
    'Analytics',
  ];

  final VoidCallback? onUpgrade;

  @override
  Widget build(BuildContext context) {
    final KinetixColors c = KinetixTheme.of(context);
    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const KinetixCardHeader(
            children: <Widget>[
              KinetixBadge('Most popular', variant: KinetixBadgeVariant.subtle),
              KinetixCardTitle('Pro'),
              KinetixCardDescription('For growing teams.'),
              Text(r'$29', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w600)),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                for (final String feature in features)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: <Widget>[
                        Icon(Icons.check, size: 16, color: c.primary),
                        const SizedBox(width: 8),
                        Text(feature),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              Expanded(
                child: KinetixButton(onPressed: onUpgrade, child: const Text('Upgrade to Pro')),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('renders the tier, its features and the call to action', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: PricingTierBlock())),
        ),
      ),
    );

    expect(find.text('Most popular'), findsOneWidget);
    expect(find.text('Pro'), findsOneWidget);
    expect(find.text('Unlimited projects'), findsOneWidget);
    expect(find.text('Analytics'), findsOneWidget);
    expect(find.text('Upgrade to Pro'), findsOneWidget);
  });
}
