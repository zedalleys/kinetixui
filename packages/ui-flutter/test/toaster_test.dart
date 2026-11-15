import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

Widget _host({
  KinetixToast? toast,
  required VoidCallback onDismiss,
  bool reduceMotion = false,
}) {
  return MaterialApp(
    home: MediaQuery(
      data: MediaQueryData(disableAnimations: reduceMotion),
      child: KinetixTheme(
        child: Scaffold(
          body: Stack(
            children: [
              KinetixToaster(
                toast: toast,
                duration: const Duration(seconds: 1),
                onDismiss: onDismiss,
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

void main() {
  const saved = KinetixToast('Saved', intent: KinetixToastIntent.success);

  testWidgets('an initially visible toast dismisses once with the current callback', (tester) async {
    var oldDismissals = 0;
    var dismissals = 0;
    await tester.pumpWidget(_host(toast: saved, onDismiss: () => oldDismissals++));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpWidget(_host(toast: saved, onDismiss: () => dismissals++));
    await tester.pump(const Duration(milliseconds: 500));
    expect(oldDismissals, 0);
    expect(dismissals, 1);
    await tester.pump(const Duration(seconds: 1));
    expect(dismissals, 1);
  });

  testWidgets('clearing, replacing and unmounting cancel stale dismissals', (tester) async {
    var dismissals = 0;
    void dismiss() => dismissals++;
    await tester.pumpWidget(_host(onDismiss: dismiss));
    await tester.pumpWidget(_host(toast: saved, onDismiss: dismiss));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpWidget(_host(onDismiss: dismiss));
    await tester.pump(const Duration(milliseconds: 500));
    expect(dismissals, 0);
    expect(find.text('Saved'), findsNothing);

    await tester.pumpWidget(_host(toast: saved, onDismiss: dismiss));
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpWidget(_host(
      toast: const KinetixToast('Saved', intent: KinetixToastIntent.error),
      onDismiss: dismiss,
    ));
    await tester.pump(const Duration(milliseconds: 500));
    expect(dismissals, 0);
    await tester.pump(const Duration(milliseconds: 500));
    expect(dismissals, 1);

    await tester.pumpWidget(_host(toast: const KinetixToast('Retrying'), onDismiss: dismiss));
    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pump(const Duration(seconds: 1));
    expect(dismissals, 1);
  });

  testWidgets('the toast is announced during its entrance fade and live Reduce Motion settles it',
      (tester) async {
    void dismiss() {}
    final toaster = find.byType(KinetixToaster);
    final fade = find.descendant(of: toaster, matching: find.byType(FadeTransition));
    double opacity() => tester.widget<FadeTransition>(fade).opacity.value;

    await tester.pumpWidget(_host(toast: saved, onDismiss: dismiss));
    final bounds = tester.getRect(find.text('Saved'));
    expect(opacity(), closeTo(0.7, 0.001));
    expect(tester.getSemantics(find.text('Saved')).getSemanticsData().flagsCollection.isLiveRegion, isTrue);
    await tester.pump(const Duration(milliseconds: 35));
    expect(opacity(), allOf(greaterThan(0.7), lessThan(1.0)));
    expect(tester.getRect(find.text('Saved')), bounds);

    await tester.pumpWidget(_host(toast: saved, onDismiss: dismiss, reduceMotion: true));
    expect(opacity(), 1);
    await tester.pumpWidget(_host(toast: saved, onDismiss: dismiss));
    await tester.pump(const Duration(milliseconds: 35));
    expect(opacity(), 1);

    await tester.pumpWidget(_host(
      toast: const KinetixToast('New message'),
      onDismiss: dismiss,
      reduceMotion: true,
    ));
    expect(opacity(), 1);
    expect(find.text('Saved'), findsNothing);
    expect(find.text('New message'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
