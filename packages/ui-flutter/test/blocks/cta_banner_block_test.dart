import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "CTA banner" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class CtaBannerBlock extends StatelessWidget {
  const CtaBannerBlock({super.key, this.onStart, this.onDocs});

  final VoidCallback? onStart;
  final VoidCallback? onDocs;

  @override
  Widget build(BuildContext context) {
    final KinetixColors c = KinetixTheme.of(context);
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: c.muted.withValues(alpha: 0.4),
        border: Border.all(color: c.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                const Text(
                  'Ship with one token architecture',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
                ),
                Text(
                  'Built from the same design-token contract on every supported platform.',
                  style: TextStyle(fontSize: 14, color: c.mutedForeground),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              KinetixButton(onPressed: onStart, child: const Text('Get started')),
              const SizedBox(width: 8),
              KinetixButton(
                onPressed: onDocs,
                variant: KinetixButtonVariant.outline,
                child: const Text('Read the docs'),
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
  testWidgets('renders the pitch and both actions', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: CtaBannerBlock()),
        ),
      ),
    );

    expect(find.text('Ship with one token architecture'), findsOneWidget);
    expect(find.text('Built from the same design-token contract on every supported platform.'), findsOneWidget);
    expect(find.text('Get started'), findsOneWidget);
    expect(find.text('Read the docs'), findsOneWidget);
  });
}
