import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

Widget host(double value, {bool reduce = false}) => MediaQuery(
      data: MediaQueryData(disableAnimations: reduce),
      child: Directionality(
          textDirection: TextDirection.ltr,
          child: KinetixAnimatedNumber(
              value: value, format: (v) => v.toStringAsFixed(0))),
    );
void main() {
  testWidgets('increases and decreases from the current painted value',
      (tester) async {
    await tester.pumpWidget(host(20));
    expect(find.text('20'), findsOneWidget);
    await tester.pumpWidget(host(100));
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.text('60'), findsOneWidget);
    await tester.pumpWidget(host(-20));
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.text('20'), findsOneWidget);
    await tester.pumpAndSettle();
    expect(find.text('-20'), findsOneWidget);
  });
  testWidgets(
      'runtime reduced motion snaps and nonfinite recovery is immediate',
      (tester) async {
    await tester.pumpWidget(host(20));
    await tester.pumpWidget(host(100));
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pumpWidget(host(100, reduce: true));
    expect(find.text('100'), findsOneWidget);
    await tester.pumpWidget(host(double.infinity));
    expect(find.text('Infinity'), findsOneWidget);
    await tester.pumpWidget(host(50));
    expect(find.text('50'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
  testWidgets('semantics reports the target during interpolation',
      (tester) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(host(20));
    await tester.pumpWidget(host(100));
    await tester.pump(const Duration(milliseconds: 150));
    expect(find.bySemanticsLabel('100'), findsOneWidget);
    expect(find.bySemanticsLabel('60'), findsNothing);
    semantics.dispose();
  });
}
