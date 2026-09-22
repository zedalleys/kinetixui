import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Stat cards" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class StatCardsBlock extends StatelessWidget {
  const StatCardsBlock({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: <Widget>[
        Expanded(
          child: KinetixMetric(
            label: 'Revenue',
            value: r'$45,231',
            trend: KinetixMetricTrend.up,
            change: '12.5%',
            icon: Icon(Icons.trending_up, size: 16),
          ),
        ),
        SizedBox(width: 16),
        Expanded(
          child: KinetixMetric(
            label: 'Active users',
            value: '2,420',
            trend: KinetixMetricTrend.up,
            change: '8.1%',
            icon: Icon(Icons.group_outlined, size: 16),
          ),
        ),
        SizedBox(width: 16),
        Expanded(
          child: KinetixMetric(
            label: 'Churn',
            value: '1.2%',
            trend: KinetixMetricTrend.down,
            change: '0.3%',
            icon: Icon(Icons.trending_down, size: 16),
          ),
        ),
      ],
    );
  }
}
// kx-block:end

void main() {
  testWidgets('renders every metric with its value and change', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: StatCardsBlock()),
        ),
      ),
    );

    expect(find.text('Revenue'), findsOneWidget);
    expect(find.text('2,420'), findsOneWidget);
    expect(find.text('Churn'), findsOneWidget);
    expect(find.text('0.3%'), findsOneWidget);
  });
}
