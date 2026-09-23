import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Empty state" block — see testimonial_block_test.dart for how block fixtures work.
//
// The web version draws a dashed rule. Flutter has no dashed Border, so this uses a solid one; a dashed edge
// needs a CustomPainter or a package, which is a lot of machinery for an example about layout.
//
// kx-block:start
class EmptyStateBlock extends StatelessWidget {
  const EmptyStateBlock({super.key, this.onStart});

  final VoidCallback? onStart;

  @override
  Widget build(BuildContext context) {
    final KinetixColors c = KinetixTheme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 64),
      decoration: BoxDecoration(
        border: Border.all(color: c.border),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(Icons.inbox_outlined, size: 32, color: c.mutedForeground),
          const SizedBox(height: 8),
          const Text('No messages yet', style: TextStyle(fontWeight: FontWeight.w500)),
          Text(
            "When someone messages you, it'll show up here.",
            style: TextStyle(fontSize: 14, color: c.mutedForeground),
          ),
          const SizedBox(height: 16),
          KinetixButton(onPressed: onStart, child: const Text('Start a conversation')),
        ],
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('renders the explanation and the way out of it', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: EmptyStateBlock())),
        ),
      ),
    );

    expect(find.text('No messages yet'), findsOneWidget);
    expect(find.text("When someone messages you, it'll show up here."), findsOneWidget);
    expect(find.text('Start a conversation'), findsOneWidget);
  });
}
