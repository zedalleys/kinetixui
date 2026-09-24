import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Dashboard tabs" block — see testimonial_block_test.dart for how block fixtures work.
//
// The chart's box is reserved with KinetixAspectRatio before the chart exists. Without it the panel is
// short, then grows when the data lands, and everything under it jumps — worst on a phone, where the jump is
// most of the screen. That is a layout-stability bug, not a styling preference.
//
// kx-block:start
class DashboardMetric {
  const DashboardMetric(this.label, this.value, this.trend, this.change);
  final String label;
  final String value;
  final KinetixMetricTrend trend;
  final String change;
}

class DashboardPanel {
  const DashboardPanel(this.id, this.label, this.caption, this.metrics);
  final String id;
  final String label;
  final String caption;
  final List<DashboardMetric> metrics;
}

const List<DashboardPanel> kDashboardPanels = <DashboardPanel>[
  DashboardPanel('overview', 'Overview', 'Sessions, last 30 days', <DashboardMetric>[
    DashboardMetric('Sessions', '48,271', KinetixMetricTrend.up, '+12.4%'),
    DashboardMetric('Sign-ups', '1,204', KinetixMetricTrend.up, '+3.1%'),
    DashboardMetric('Churn', '1.8%', KinetixMetricTrend.down, '-0.4%'),
  ]),
  DashboardPanel('traffic', 'Traffic', 'Sources, last 30 days', <DashboardMetric>[
    DashboardMetric('Direct', '21,904', KinetixMetricTrend.up, '+8.0%'),
    DashboardMetric('Search', '18,442', KinetixMetricTrend.up, '+15.2%'),
    DashboardMetric('Referral', '7,925', KinetixMetricTrend.neutral, '0.0%'),
  ]),
];

class DashboardTabsBlock extends StatefulWidget {
  const DashboardTabsBlock({super.key});

  @override
  State<DashboardTabsBlock> createState() => _DashboardTabsBlockState();
}

class _DashboardTabsBlockState extends State<DashboardTabsBlock> {
  String _tab = 'overview';

  @override
  Widget build(BuildContext context) {
    final DashboardPanel panel = kDashboardPanels.firstWhere((DashboardPanel p) => p.id == _tab);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        KinetixTabsList(
          children: kDashboardPanels
              .map((DashboardPanel p) => KinetixTabsTrigger(
                    p.label,
                    selected: _tab == p.id,
                    onTap: () => setState(() => _tab = p.id),
                  ))
              .toList(),
        ),
        KinetixTabsContent(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              // One column, not three: three metric cards side by side on a phone is three unreadable
              // columns. The web version's grid is the same information, not the same geometry.
              ...panel.metrics.map((DashboardMetric m) => Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: KinetixMetric(label: m.label, value: m.value, trend: m.trend, change: m.change),
                  )),
              KinetixAspectRatio(
                ratio: 16 / 9,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    border: Border.all(color: KinetixTheme.of(context).border),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(child: KinetixFieldDescription(panel.caption)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
// kx-block:end

void main() {
  testWidgets('switching tab swaps the panel and its reserved chart caption', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: DashboardTabsBlock())),
        ),
      ),
    );

    expect(find.text('Sessions, last 30 days'), findsOneWidget);

    await tester.tap(find.text('Traffic'));
    await tester.pump();
    expect(find.text('Sources, last 30 days'), findsOneWidget);
  });
}
