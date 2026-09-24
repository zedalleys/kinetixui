import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Loading state" block — see testimonial_block_test.dart for how block fixtures work.
//
// A skeleton is a picture of nothing: it says "wait" to someone who can see the shapes and nothing at all to
// anyone who cannot. One labelled live region says so, instead of leaving TalkBack to walk six meaningless
// grey rectangles.
//
// kx-block:start
class LoadingStateBlock extends StatelessWidget {
  const LoadingStateBlock({super.key});

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const KinetixCardHeader(children: <Widget>[KinetixCardTitle('Activity')]),
          KinetixCardContent(
            child: Semantics(
              label: 'Loading activity',
              liveRegion: true,
              excludeSemantics: true,
              child: Column(
                children: List<Widget>.generate(3, (int _) {
                  return const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Row(
                      children: <Widget>[
                        // The shapes match what replaces them, so nothing moves when the data arrives.
                        KinetixSkeleton(width: 40, height: 40, borderRadius: 20),
                        SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              KinetixSkeleton(width: 180, height: 16),
                              SizedBox(height: 8),
                              KinetixSkeleton(width: 80, height: 12),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ),
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              Expanded(
                child: KinetixButton(
                  onPressed: null,
                  variant: KinetixButtonVariant.outline,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: <Widget>[
                      // No second label on the spinner: the row already says "Loading".
                      const ExcludeSemantics(child: KinetixSpinner(size: KinetixSpinnerSize.sm)),
                      const SizedBox(width: 8),
                      const Text('Loading'),
                    ],
                  ),
                ),
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
  testWidgets('the placeholders announce as one thing that is loading', (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: LoadingStateBlock())),
        ),
      ),
    );

    expect(find.bySemanticsLabel('Loading activity'), findsOneWidget);

    handle.dispose();
  });
}
